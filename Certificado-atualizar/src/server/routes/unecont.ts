/**
 * Rota para executar a automação UNECONT (Playwright) — atualizar certificado.
 * Aceita JSON ou multipart com email, senha, cnpj (14 dígitos), certificado (.pfx) e senhaCertificado.
 * Se CNPJ/certificado/senha não forem enviados, o teste Playwright é ignorado (skip).
 */
import type { IncomingMessage, ServerResponse } from "http";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { writeFile, unlink } from "node:fs/promises";
import { sendJson, readRequestJson } from "../utils/http.js";
import {
  parseMultipartRequest,
  getMultipartText,
  getMultipartFile,
} from "../utils/multipart.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");

function onlyDigits(s: string): string {
  return (s || "").replace(/\D/g, "");
}

type ExecutarBody = {
  email?: string;
  senha?: string;
  cnpj?: string;
  senhaCertificado?: string;
};

/**
 * POST /api/unecont/executar
 * Body JSON: { email, senha [, cnpj, senhaCertificado ] } — para atualizar, envie também cnpj e senhaCertificado (multipart com arquivo é o fluxo completo).
 * Body multipart: email, senha, cnpj, certificado (arquivo .pfx), senhaCertificado — atualizar certificado (buscar CNPJ, excluir, adicionar novo, salvar).
 */
export const executarHandler = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  if (req.method !== "POST") {
    sendJson(res, 405, { success: false, error: "Método não permitido." });
    return;
  }

  const contentType = (req.headers["content-type"] ?? "").toLowerCase();
  let email: string;
  let senha: string;
  let cnpj: string;
  let pfxPath: string | undefined;
  let senhaCertificado: string;
  let pastaCertificado = "";
  let cleanupTemp: (() => void) | undefined;

  if (contentType.includes("multipart/form-data")) {
    const parsed = await parseMultipartRequest(req);
    if (!parsed) {
      sendJson(res, 400, {
        success: false,
        error: "Multipart inválido. Use boundary em Content-Type.",
      });
      return;
      }
    const { parts } = parsed;
    email = getMultipartText(parts, "email").trim();
    senha = getMultipartText(parts, "senha").trim();
    cnpj = onlyDigits(getMultipartText(parts, "cnpj"));
    senhaCertificado = getMultipartText(parts, "senhaCertificado", "senhaCert");
    pastaCertificado = getMultipartText(parts, "pastaCertificado", "pastaCert").trim();
    const file = getMultipartFile(parts, "certificado", "certificado");

    if (!email || !senha) {
      sendJson(res, 400, {
        success: false,
        error: "Campos 'email' e 'senha' são obrigatórios.",
      });
      return;
    }

    if (cnpj.length >= 14 && file?.data?.length && senhaCertificado) {
      const tempPath = join(
        tmpdir(),
        `unecont-cert-${Date.now()}-${Math.random().toString(36).slice(2)}.pfx`
      );
      try {
        await writeFile(tempPath, file.data);
      } catch (err) {
        sendJson(res, 500, {
          success: false,
          error: "Falha ao gravar arquivo temporário: " + String((err as Error).message),
        });
        return;
      }
      pfxPath = tempPath;
      cleanupTemp = () => {
        unlink(tempPath).catch(() => {});
      };
    }
  } else {
    let body: ExecutarBody;
    try {
      body = (await readRequestJson(req)) as ExecutarBody;
    } catch {
      sendJson(res, 400, {
        success: false,
        error: "Corpo da requisição deve ser JSON com email e senha.",
      });
      return;
    }
    email = (body.email ?? "").trim();
    senha = (body.senha ?? "").trim();
    cnpj = onlyDigits(body.cnpj ?? "");
    senhaCertificado = (body.senhaCertificado ?? "").trim();
    pastaCertificado = (body as { pastaCertificado?: string }).pastaCertificado?.trim() ?? "";
  }

  if (!email || !senha) {
    sendJson(res, 400, {
      success: false,
      error: "Campos 'email' e 'senha' são obrigatórios.",
    });
    return;
  }

  const env: Record<string, string> = {
    ...process.env,
    UNECONT_EMAIL: email,
    UNECONT_PASSWORD: senha,
  };
  if (cnpj.length >= 14) env.UNECONT_CNPJ = cnpj;
  if (pfxPath) env.UNECONT_PFX_PATH = pfxPath;
  // Pasta do certificado: enviada pelo form (pastaCertificado) ou derivada do arquivo. Navegador não permite abrir o diálogo de arquivo nela; use para exibir na interface.
  if (pastaCertificado) env.UNECONT_PFX_DIR = pastaCertificado;
  else if (pfxPath) env.UNECONT_PFX_DIR = dirname(pfxPath);
  if (senhaCertificado) env.UNECONT_PFX_PASSWORD = senhaCertificado;
  if (contentType.includes("multipart/form-data") && senhaCertificado) {
    env.UNECONT_SELECAO_MANUAL = "true";
  }

  return new Promise((resolve) => {
    const isWin = process.platform === "win32";
    const cmd = isWin ? "npx.cmd" : "npx";
    const args = ["playwright", "test", "--project=unecont"];
    const proc = spawn(cmd, args, {
      cwd: PROJECT_ROOT,
      env,
      shell: isWin,
    });

    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    proc.on("close", (code) => {
      cleanupTemp?.();
      const success = code === 0;
      const log = stdout + (stderr ? "\n--- stderr ---\n" + stderr : "");
      const lines = log.trim().split(/\r?\n/);
      // Extrair trecho útil do log em caso de falha (erro do Playwright, não só trace.zip)
      let excerpt = "";
      if (!success && lines.length > 0) {
        const errIdx = lines.findIndex(
          (l) =>
            /^\s*Error:/.test(l) ||
            /Timeout \d+ms/.test(l) ||
            /failed|AssertionError/i.test(l)
        );
        if (errIdx >= 0) {
          excerpt = lines.slice(Math.max(0, errIdx - 2), errIdx + 8).join("\n");
        } else {
          excerpt = lines.slice(-25).join("\n");
        }
      }
      const message = success
        ? "Automação executada com sucesso. O navegador deve ter aberto e acessado o certificado."
        : "Automação falhou."
          + (excerpt ? "\n\nTrecho do log:\n" + excerpt : "\n\nVer log completo em data.log (na resposta).");
      sendJson(res, 200, {
        success,
        message,
        data: { exitCode: code ?? undefined, log, excerpt: excerpt || undefined },
      });
      resolve();
    });

    proc.on("error", (err) => {
      cleanupTemp?.();
      sendJson(res, 500, {
        success: false,
        error: "Falha ao iniciar o Playwright: " + String(err.message),
      });
      resolve();
    });
  });
};
