/**
 * Servidor web unificado – proxy para API SIEG e automações Playwright.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { SIEG_API_KEY } from "./config.js";
import { sendJson } from "./utils/http.js";
import { createStaticHandler, send404 } from "./routes/static.js";
import { logger } from "./utils/logger.js";
import {
  extrairCnpjHandler,
  listarHandler,
  statusHandler,
  registrarHandler,
  editarHandler,
  habilitarHandler,
  desabilitarHandler,
} from "./routes/certificado.js";
import { executarHandler as unecontExecutarHandler } from "./routes/unecont.js";
import { executarHandler as onvioExecutarHandler } from "./routes/onvio.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Raiz do projeto (onde está package.json): cwd ao rodar server ou um nível acima de dist
const ROOT_DIR = process.cwd();
const PUBLIC_DIR = join(ROOT_DIR, "public");
const CLIENT_DIST = join(ROOT_DIR, "client", "dist");
const PORT = parseInt(process.env.PORT ?? "3000", 10);

// Em produção: preferir build do React (client/dist); senão servir public (legado)
const staticRoot = existsSync(CLIENT_DIST) ? CLIENT_DIST : PUBLIC_DIR;
const serveStatic = createStaticHandler({
  root: staticRoot,
  spaFallback: true,
});

/**
 * Roteador principal da API de certificados.
 */
async function routeApi(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  query: URLSearchParams
): Promise<boolean> {
  const method = req.method ?? "GET";

  // POST /api/certificado/extrair-cnpj – NÃO exige SIEG_API_KEY
  if (method === "POST" && path === "/api/certificado/extrair-cnpj") {
    await extrairCnpjHandler(req, res, query);
    return true;
  }

  // POST /api/unecont/executar – automação UNECONT (Playwright)
  if (method === "POST" && path === "/api/unecont/executar") {
    await unecontExecutarHandler(req, res);
    return true;
  }

  // GET /api/onvio – verificação de disponibilidade da API ONVIO
  if (method === "GET" && path.startsWith("/api/onvio")) {
    const base = path.replace(/\/+$/, "") || "/api/onvio";
    if (base === "/api/onvio") {
      sendJson(res, 200, { success: true, message: "API ONVIO disponível" });
      return true;
    }
  }

  // POST /api/onvio/executar – automação ONVIO (Playwright – NFe Import Receita Federal)
  if (method === "POST" && path.startsWith("/api/onvio") && path.includes("executar")) {
    await onvioExecutarHandler(req, res);
    return true;
  }

  // GET /api/defaults/unecont – valores padrão do .env para o formulário UNECONT
  if (method === "GET" && path === "/api/defaults/unecont") {
    sendJson(res, 200, {
      success: true,
      data: {
        email: (process.env.UNECONT_EMAIL ?? "").trim(),
        senha: (process.env.UNECONT_PASSWORD ?? "").trim(),
      },
    });
    return true;
  }

  // GET /api/defaults/onvio – valores padrão do .env para o formulário ONVIO
  if (method === "GET" && path === "/api/defaults/onvio") {
    sendJson(res, 200, {
      success: true,
      data: {
        email: (process.env.ONVIO_EMAIL ?? "").trim(),
        senha: (process.env.ONVIO_PASSWORD ?? "").trim(),
        cnpj: (process.env.ONVIO_CNPJ ?? "").replace(/\D/g, ""),
      },
    });
    return true;
  }

  // Demais rotas exigem SIEG_API_KEY
  if (!SIEG_API_KEY) {
    sendJson(res, 500, {
      success: false,
      error: "SIEG_API_KEY não configurada no servidor. Configure o .env.",
    });
    return true;
  }

  // GET /api/certificado/listar
  if (method === "GET" && path === "/api/certificado/listar") {
    await listarHandler(req, res, query);
    return true;
  }

  // GET /api/certificado/status
  if (method === "GET" && path === "/api/certificado/status") {
    await statusHandler(req, res, query);
    return true;
  }

  // POST /api/certificado/registrar
  if (method === "POST" && path === "/api/certificado/registrar") {
    await registrarHandler(req, res, query);
    return true;
  }

  // POST /api/certificado/editar
  if (method === "POST" && path === "/api/certificado/editar") {
    await editarHandler(req, res, query);
    return true;
  }

  // POST /api/certificado/habilitar
  if (method === "POST" && path === "/api/certificado/habilitar") {
    await habilitarHandler(req, res, query);
    return true;
  }

  // POST /api/certificado/desabilitar
  if (method === "POST" && path === "/api/certificado/desabilitar") {
    await desabilitarHandler(req, res, query);
    return true;
  }

  return false;
}

/**
 * Handler principal de requisições.
 */
async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = req.url ?? "/";
  const [pathRaw, search] = url.split("?");
  const path =
    (pathRaw ?? "/").replace(/\/+/g, "/").replace(/\/$/, "") || "/";
  const query = new URLSearchParams(search ?? "");

  // Rotas da API
  if (path.startsWith("/api/")) {
    const handled = await routeApi(req, res, path, query);
    if (!handled) {
      sendJson(res, 404, {
        success: false,
        error: "Endpoint da API não encontrado: " + path,
      });
    }
    return;
  }

  // Arquivos estáticos
  const served = await serveStatic(req, res);
  if (!served) {
    send404(res);
  }
}

// Cria e inicia o servidor
const server = createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    logger.error("Erro ao processar requisição:", err);
    sendJson(res, 500, { success: false, error: String(err) });
  });
});

server.listen(PORT, () => {
  logger.info(`Certificado Manager – interface web: http://localhost:${PORT}`);
  logger.info("API: /api/certificado/*, /api/unecont/executar, /api/onvio/executar");
});
