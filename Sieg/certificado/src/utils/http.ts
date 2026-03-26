/**
 * Utilitários HTTP compartilhados.
 */

import { IncomingMessage, ServerResponse } from "http";

export interface JsonResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

/**
 * Envia uma resposta JSON padronizada.
 */
export function sendJson(
  res: ServerResponse,
  status: number,
  data: JsonResponse
): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Envia uma resposta de sucesso com dados.
 */
export function sendSuccess(res: ServerResponse, data: unknown): void {
  sendJson(res, 200, { success: true, data });
}

/**
 * Envia uma resposta de erro.
 */
export function sendError(
  res: ServerResponse,
  status: number,
  message: string
): void {
  sendJson(res, status, { success: false, error: message });
}

/**
 * Lê o corpo completo de uma requisição como buffer.
 */
export function readRequestBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/**
 * Lê o corpo de uma requisição como string.
 */
export async function readRequestBodyAsString(
  req: IncomingMessage
): Promise<string> {
  const buffer = await readRequestBody(req);
  return buffer.toString("utf-8");
}

/**
 * Lê o corpo de uma requisição como JSON.
 */
export async function readRequestJson<T = unknown>(
  req: IncomingMessage
): Promise<T> {
  const text = await readRequestBodyAsString(req);
  return JSON.parse(text) as T;
}

/**
 * Obtém parâmetros de query string de uma URL.
 */
export function getQueryParams(
  url: string
): Record<string, string | undefined> {
  const urlObj = new URL(url, "http://localhost");
  const params: Record<string, string | undefined> = {};
  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}
