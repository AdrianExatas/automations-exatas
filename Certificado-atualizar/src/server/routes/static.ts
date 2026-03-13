/**
 * Módulo para servir arquivos estáticos.
 */

import type { IncomingMessage, ServerResponse } from "http";
import * as fs from "fs";
import * as path from "path";

/**
 * Mapeamento de extensões para Content-Type.
 */
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
};

/**
 * Obtém o Content-Type baseado na extensão do arquivo.
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

/**
 * Interface para configuração do handler de arquivos estáticos.
 */
export interface StaticHandlerOptions {
  /** Diretório raiz para servir arquivos. */
  root: string;
  /** Arquivo padrão quando a URL é um diretório. */
  index?: string;
  /** Se true, requisições que não encontrem arquivo servem index (SPA fallback). */
  spaFallback?: boolean;
}

/**
 * Cria um handler para servir arquivos estáticos.
 */
export function createStaticHandler(options: StaticHandlerOptions) {
  const { root, index = "index.html", spaFallback = false } = options;
  const rootPath = path.resolve(root);

  return async (
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<boolean> => {
    const url = new URL(req.url ?? "/", "http://localhost");
    let pathname = decodeURIComponent(url.pathname);

    // Remove leading slash e resolve o caminho
    if (pathname.startsWith("/")) {
      pathname = pathname.slice(1);
    }

    // Se for raiz ou diretório, adiciona index
    if (pathname === "" || pathname.endsWith("/")) {
      pathname = pathname + index;
    }

    const filePath = path.join(rootPath, pathname);

    // Verifica se o caminho está dentro do diretório raiz (segurança)
    if (!filePath.startsWith(rootPath)) {
      return false;
    }

    // Verifica se o arquivo existe
    if (!fs.existsSync(filePath)) {
      if (spaFallback) {
        const indexPath = path.join(rootPath, index);
        if (fs.existsSync(indexPath)) {
          return serveFile(indexPath, res);
        }
      }
      return false;
    }

    const stats = fs.statSync(filePath);

    // Se for diretório, tenta servir o index
    if (stats.isDirectory()) {
      const indexPath = path.join(filePath, index);
      if (!fs.existsSync(indexPath)) {
        return false;
      }
      return serveFile(indexPath, res);
    }

    return serveFile(filePath, res);
  };
}

/**
 * Serve um arquivo específico.
 */
function serveFile(filePath: string, res: ServerResponse): boolean {
  try {
    const content = fs.readFileSync(filePath);
    const mimeType = getMimeType(filePath);

    res.writeHead(200, { "Content-Type": mimeType });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

/**
 * Envia uma resposta 404.
 */
export function send404(res: ServerResponse): void {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404 - Recurso não encontrado");
}

/**
 * Envia uma resposta 405 - Method Not Allowed.
 */
export function send405(res: ServerResponse, allowed: string[]): void {
  res.writeHead(405, {
    "Content-Type": "text/plain; charset=utf-8",
    Allow: allowed.join(", "),
  });
  res.end("405 - Método não permitido");
}

/**
 * Envia uma resposta 500 - Internal Server Error.
 */
export function send500(res: ServerResponse, message?: string): void {
  res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(message ?? "500 - Erro interno do servidor");
}
