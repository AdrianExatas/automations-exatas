/**
 * Rota para executar a automação ONVIO (Playwright – NFe Import Receita Federal) a partir da interface.
 */
import type { IncomingMessage, ServerResponse } from "http";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { writeFile, unlink } from "node:fs/promises";
import { sendJson } from "../utils/http.js";
import {
  parseMultipartRequest,
  getMultipartText,
  getMultipartFile,
} from "../utils/multipart.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Diretório raiz do projeto unificado
const PROJECT_ROOT = join(__dirname, "..", "..");

function onlyDigits(s: string): string {
  return (s || "").replace(/\D/g, "");
}

/**
 * POST /api/onvio/executar
 * Body: multipart com email, senha, cnpj, certificado (arquivo .pfx), senhaCertificado
 * Executa o teste Playwright de importação Receita Federal no ONVIO.
 */
export const executarHandler = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  if (req.method !== "POST") {
    sendJson(res, 405, { success: false, error: "Método não permitido." });
    return;
  }

  const parsed = await parseMultipartRequest(req);
  if (!parsed) {
    sendJson(res, 400, {
      success: false,
      error: "Content-Type multipart/form-data com boundary é obrigatório.",
    });
    return;
  }

  const { parts } = parsed;
  const email = getMultipartText(parts, "email");
  const senha = getMultipartText(parts, "senha");
  const cnpjRaw = getMultipartText(parts, "cnpj");
  const senhaCertificado = getMultipartText(parts, "senhaCertificado", "senhaCert");
  const file = getMultipartFile(parts, "certificado", "certificado");

  if (!email || !senha) {
    sendJson(res, 400, {
      success: false,
      error: "Campos 'email' e 'senha' (acesso ONVIO) são obrigatórios.",
    });
    return;
  }

  const cnpj = onlyDigits(cnpjRaw);
  if (cnpj.length !== 14) {
    sendJson(res, 400, {
      success: false,
      error: "CNPJ deve ter 14 dígitos.",
    });
    return;
  }

  if (!file?.data?.length) {
    sendJson(res, 400, {
      success: false,
      error: "Envie o arquivo do certificado (.pfx).",
    });
    return;
  }

  if (!senhaCertificado) {
    sendJson(res, 400, {
      success: false,
      error: "Campo 'senhaCertificado' (senha do PFX) é obrigatório.",
    });
    return;
  }

  const tempPfxPath = join(
    tmpdir(),
    `onvio-cert-${Date.now()}-${Math.random().toString(36).slice(2)}.pfx`
  );

  try {
    await writeFile(tempPfxPath, file.data);
  } catch (err) {
    sendJson(res, 500, {
      success: false,
      error: "Falha ao gravar arquivo temporário: " + String((err as Error).message),
    });
    return;
  }

  const env = {
    ...process.env,
    ONVIO_EMAIL: email,
    ONVIO_PASSWORD: senha,
    ONVIO_PFX_PATH: tempPfxPath,
    ONVIO_PFX_PASSWORD: senhaCertificado,
    ONVIO_CNPJ: cnpj,
    ONVIO_BASE_URL: "https://onvio.com.br",
  };

  const cleanup = (): void => {
    unlink(tempPfxPath).catch(() => {});
  };

  return new Promise((resolve) => {
    const isWin = process.platform === "win32";
    const cmd = isWin ? "npx.cmd" : "npx";
    // Executa usando o projeto onvio do playwright.config.js
    const args = ["playwright", "test", "--project=onvio"];
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
      cleanup();
      const success = code === 0;
      const log = stdout + (stderr ? "\n--- stderr ---\n" + stderr : "");
      const lastLines = log.trim().split(/\r?\n/).slice(-8).join("\n");
      const message = success
        ? "Automação ONVIO executada com sucesso (NFe Import Receita Federal)."
        : "Automação ONVIO falhou. Verifique credenciais, CNPJ e certificado."
          + (lastLines ? "\n\nÚltimas linhas do log:\n" + lastLines : "");
      sendJson(res, 200, {
        success,
        message,
        data: { exitCode: code ?? undefined, log },
      });
      resolve();
    });

    proc.on("error", (err) => {
      cleanup();
      sendJson(res, 500, {
        success: false,
        error: "Falha ao iniciar o Playwright: " + String((err as Error).message),
      });
      resolve();
    });
  });
};
