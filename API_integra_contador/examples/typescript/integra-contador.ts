import { readFile } from "node:fs/promises";
import { request as httpsRequest, type RequestOptions } from "node:https";
import type { OperationPath } from "../../src/types.ts";

export interface SerproTokens {
  access_token: string;
  jwt_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export interface Identification {
  numero: string;
  tipo: 1 | 2 | 3 | 4;
}

export interface IntegraEnvelope<T> {
  contratante: Identification;
  autorPedidoDados: Identification;
  contribuinte: Identification;
  pedidoDados: {
    idSistema: string;
    idServico: string;
    versaoSistema: string;
    dados: string;
  };
}

export interface IntegraResponse<T = unknown> extends IntegraEnvelope<unknown> {
  status: number;
  dados: string;
  mensagens: Array<{ codigo: string; texto: string }>;
  dadosParsed?: T;
}

export interface HttpRequest {
  url: URL;
  method: "POST";
  headers: Record<string, string>;
  body: string;
  pfx?: Uint8Array;
  passphrase?: string;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

export type HttpTransport = (request: HttpRequest) => Promise<HttpResponse>;

export class SerproHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly responseBody: string,
    public readonly responseId: string | null,
  ) {
    super(`SERPRO respondeu HTTP ${status}${responseId ? ` (responseId: ${responseId})` : ""}`);
    this.name = status === 504 ? "SerproIndeterminateOperationError" : "SerproHttpError";
  }
}

export const nodeHttpsTransport: HttpTransport = async (input) => new Promise((resolve, reject) => {
  const options: RequestOptions = {
    protocol: input.url.protocol,
    hostname: input.url.hostname,
    port: input.url.port || 443,
    path: `${input.url.pathname}${input.url.search}`,
    method: input.method,
    headers: { ...input.headers, "content-length": Buffer.byteLength(input.body).toString() },
    pfx: input.pfx ? Buffer.from(input.pfx) : undefined,
    passphrase: input.passphrase,
    minVersion: "TLSv1.2",
  };
  const request = httpsRequest(options, (response) => {
    const chunks: Buffer[] = [];
    response.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    response.on("end", () => resolve({
      status: response.statusCode ?? 0,
      headers: response.headers,
      body: Buffer.concat(chunks).toString("utf8"),
    }));
  });
  request.on("error", reject);
  request.end(input.body);
});

export async function authenticateSerpro(
  options: {
    consumerKey: string;
    consumerSecret: string;
    certificatePfxPath: string;
    certificatePassword: string;
  },
  transport: HttpTransport = nodeHttpsTransport,
): Promise<SerproTokens> {
  const basic = Buffer.from(`${options.consumerKey}:${options.consumerSecret}`, "utf8").toString("base64");
  const response = await transport({
    url: new URL("https://autenticacao.sapi.serpro.gov.br/authenticate"),
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
      "role-type": "TERCEIROS",
    },
    body: "grant_type=client_credentials",
    pfx: new Uint8Array(await readFile(options.certificatePfxPath)),
    passphrase: options.certificatePassword,
  });
  if (response.status < 200 || response.status >= 300) throw toHttpError(response);
  const parsed = JSON.parse(response.body) as Partial<SerproTokens>;
  if (!parsed.access_token || !parsed.jwt_token || typeof parsed.expires_in !== "number") {
    throw new Error("Resposta de autenticação sem access_token, jwt_token ou expires_in.");
  }
  return parsed as SerproTokens;
}

export function buildEnvelope<T>(input: {
  contratante: Identification;
  autorPedidoDados: Identification;
  contribuinte: Identification;
  idSistema: string;
  idServico: string;
  versaoSistema?: string;
  dados: T;
}): IntegraEnvelope<T> {
  if (input.contratante.tipo !== 2 || !/^\d{14}$/.test(input.contratante.numero)) {
    throw new Error("O contratante deve ser um CNPJ sem máscara com tipo 2.");
  }
  for (const [name, identification] of [["autorPedidoDados", input.autorPedidoDados], ["contribuinte", input.contribuinte]] as const) {
    if (![1, 2, 3, 4].includes(identification.tipo) || !/^\d+$/.test(identification.numero)) {
      throw new Error(`${name} possui identificação inválida.`);
    }
  }
  return {
    contratante: input.contratante,
    autorPedidoDados: input.autorPedidoDados,
    contribuinte: input.contribuinte,
    pedidoDados: {
      idSistema: input.idSistema,
      idServico: input.idServico,
      versaoSistema: input.versaoSistema ?? "1.0",
      dados: JSON.stringify(input.dados),
    },
  };
}

export async function callService<T>(
  input: {
    operationPath: OperationPath;
    tokens: SerproTokens;
    envelope: IntegraEnvelope<unknown>;
    procuratorToken?: string;
    requestTag?: string;
  },
  transport: HttpTransport = nodeHttpsTransport,
): Promise<IntegraResponse<T>> {
  if (input.requestTag && input.requestTag.length > 32) throw new Error("X-Request-Tag aceita no máximo 32 caracteres.");
  const headers: Record<string, string> = {
    accept: "application/json",
    authorization: `Bearer ${input.tokens.access_token}`,
    "content-type": "application/json",
    jwt_token: input.tokens.jwt_token,
  };
  if (input.procuratorToken) headers.autenticar_procurador_token = input.procuratorToken;
  if (input.requestTag) headers["x-request-tag"] = input.requestTag;
  const response = await transport({
    url: new URL(`https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/${input.operationPath}`),
    method: "POST",
    headers,
    body: JSON.stringify(input.envelope),
  });
  if (response.status < 200 || response.status >= 300) throw toHttpError(response);
  if (!response.body.trim()) {
    return { ...input.envelope, status: response.status, dados: "", mensagens: [] } as IntegraResponse<T>;
  }
  const parsed = JSON.parse(response.body) as IntegraResponse<T>;
  if (typeof parsed.dados === "string" && parsed.dados.trim()) parsed.dadosParsed = parseEscapedJson<T>(parsed.dados);
  return parsed;
}

export function parseEscapedJson<T>(value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new Error(`O campo dados não contém JSON válido: ${error instanceof Error ? error.message : error}`);
  }
}

export function decodeBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function toHttpError(response: HttpResponse): SerproHttpError {
  const header = response.headers.responseid ?? response.headers["response-id"] ?? response.headers["x-response-id"];
  const responseId = Array.isArray(header) ? header[0] ?? null : header ?? extractResponseId(response.body);
  return new SerproHttpError(response.status, response.body, responseId);
}

function extractResponseId(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    return typeof parsed.responseId === "string" ? parsed.responseId : null;
  } catch {
    return null;
  }
}
