/**
 * Servidor web – proxy para todos os endpoints de Certificado da API SIEG.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");
const PORT = parseInt(process.env.PORT ?? "3000", 10);

// Handler para servir arquivos estáticos
const serveStatic = createStaticHandler({ root: PUBLIC_DIR });

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
  logger.info(`SIEG Certificado – interface web: http://localhost:${PORT}`);
});
