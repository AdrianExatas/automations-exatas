/**
 * Utilitários para parsing de multipart/form-data.
 */

import type { IncomingMessage } from "http";
import { readRequestBody } from "./http.js";

export interface MultipartPart {
  data: Buffer;
  filename?: string;
}

/**
 * Faz o parsing de um body multipart/form-data.
 */
export function parseMultipart(
  body: Buffer,
  boundary: string
): Map<string, MultipartPart> {
  const parts = new Map<string, MultipartPart>();
  const b = Buffer.from(`--${boundary}\r\n`);
  const bEnd = Buffer.from(`\r\n--${boundary}`);
  const bEndFinal = Buffer.from(`\r\n--${boundary}--`);

  let start = body.indexOf(b);
  if (start === -1) return parts;
  start += b.length;

  while (start < body.length) {
    const headEnd = body.indexOf(Buffer.from("\r\n\r\n"), start);
    if (headEnd === -1) break;

    const headers = body.subarray(start, headEnd).toString("utf-8");
    const contentStart = headEnd + 4;
    const nextBound = body.indexOf(bEnd, contentStart);
    const endBound = body.indexOf(bEndFinal, contentStart);

    let contentEnd: number;
    if (endBound === contentStart) break;
    if (nextBound === -1 && endBound === -1) contentEnd = body.length;
    else if (nextBound === -1) contentEnd = endBound;
    else if (endBound === -1) contentEnd = nextBound;
    else contentEnd = Math.min(nextBound, endBound);

    let content = body.subarray(contentStart, contentEnd);
    if (content.subarray(-2).equals(Buffer.from("\r\n"))) {
      content = content.subarray(0, -2);
    }

    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]*)"/);
    const name = nameMatch?.[1];

    if (name && content.length) {
      parts.set(name, {
        data: Buffer.from(content),
        filename: filenameMatch?.[1] || undefined,
      });
    }

    if (endBound !== -1 && contentEnd === endBound) break;
    start = (nextBound !== -1 ? nextBound : endBound) + bEnd.length;
  }

  return parts;
}

/**
 * Extrai o boundary do header Content-Type.
 */
export function extractBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/);
  const boundary = match?.[1] ?? match?.[2]?.trim();
  return boundary || null;
}

/**
 * Resultado do parsing de multipart/form-data.
 */
export interface ParsedMultipartRequest {
  parts: Map<string, MultipartPart>;
  boundary: string;
}

/**
 * Lê e faz parse de uma requisição multipart/form-data completa.
 * Retorna null se não for multipart ou não tiver boundary.
 */
export async function parseMultipartRequest(
  req: IncomingMessage
): Promise<ParsedMultipartRequest | null> {
  const contentType = req.headers["content-type"] ?? "";
  const boundary = extractBoundary(contentType);

  if (!boundary) {
    return null;
  }

  const body = await readRequestBody(req);
  const parts = parseMultipart(body, boundary);

  return { parts, boundary };
}

/**
 * Obtém o valor de texto de um campo multipart.
 */
export function getMultipartText(
  parts: Map<string, MultipartPart>,
  ...fieldNames: string[]
): string {
  for (const name of fieldNames) {
    const part = parts.get(name);
    if (part?.data) {
      return part.data.toString("utf-8").trim();
    }
  }
  return "";
}

/**
 * Obtém o arquivo de um campo multipart.
 */
export function getMultipartFile(
  parts: Map<string, MultipartPart>,
  ...fieldNames: string[]
): MultipartPart | undefined {
  for (const name of fieldNames) {
    const part = parts.get(name);
    if (part?.data?.length) {
      return part;
    }
  }
  return undefined;
}
