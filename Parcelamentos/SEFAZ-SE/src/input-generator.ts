import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { CurlExecutionResult, GeneratedInputRow, ParsedCurlRequest } from "./types.js";
import { formatCnpj, normalizeIe } from "./utils.js";
import { writePrefilledInputWorkbook } from "./workbook.js";

const CURL_STATUS_MARKER = "__SEFAZ_HTTP_STATUS__:";

export const DEFAULT_INPUT_SAVE_DIR =
  "C:\\Users\\Exatas\\Documents\\GitHub\\automations-exatas\\Parcelamentos\\SEFAZ-SE\\downloads";

interface CustomerPayload {
  customer?: {
    code?: unknown;
    name?: unknown;
    cnpj?: unknown;
    state_inscription?: unknown;
  };
}

interface InputGeneratorDeps {
  runCurlRequest: (request: ParsedCurlRequest) => Promise<CurlExecutionResult> | CurlExecutionResult;
  captureFreshGesttaJwt: (onvioAuthDir: string) => Promise<void> | void;
  loadLatestGesttaJwt: (onvioAuthDir: string) => Promise<string> | string;
}

interface GenerateInputWorkbookOptions {
  requestsPath: string;
  templatePath: string;
  cwd: string;
  saveDir?: string;
  onvioAuthDir?: string;
}

const defaultDeps: InputGeneratorDeps = {
  runCurlRequest: runCurlRequestWithBinary,
  captureFreshGesttaJwt: captureFreshGesttaJwt,
  loadLatestGesttaJwt: loadLatestGesttaJwt,
};

export async function generateInputWorkbook(
  options: GenerateInputWorkbookOptions,
  deps: Partial<InputGeneratorDeps> = {},
): Promise<string> {
  const requestsText = await fs.readFile(options.requestsPath, "utf8");
  const requests = parseRequestsFile(requestsText);
  const customersByRequest = await fetchCustomersForRequests(requests, {
    cwd: options.cwd,
    onvioAuthDir: options.onvioAuthDir,
    deps: { ...defaultDeps, ...deps },
  });
  const rows = buildInputRowsFromCustomers(customersByRequest, options.saveDir ?? DEFAULT_INPUT_SAVE_DIR);
  return writePrefilledInputWorkbook(rows, options.templatePath, options.cwd);
}

export function parseRequestsFile(content: string): ParsedCurlRequest[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const requests: ParsedCurlRequest[] = [];

  for (let index = 0; index < lines.length; ) {
    while (index < lines.length && lines[index]?.trim() === "") {
      index += 1;
    }

    if (index >= lines.length) {
      break;
    }

    const label = lines[index]?.trim();
    index += 1;

    while (index < lines.length && lines[index]?.trim() === "") {
      index += 1;
    }

    if (!label || index >= lines.length) {
      continue;
    }

    const currentLine = lines[index]?.trim();
    if (!currentLine?.startsWith("curl ")) {
      throw new Error(`Nao foi encontrado um comando curl apos o bloco "${label}".`);
    }

    const curlLines: string[] = [];

    while (index < lines.length) {
      const line = lines[index]?.trim();

      if (!line) {
        break;
      }

      curlLines.push(line);
      index += 1;

      if (!line.endsWith("\\")) {
        break;
      }
    }

    requests.push(parseCurlBlock(label, curlLines));
  }

  if (requests.length === 0) {
    throw new Error("Nenhuma requisicao curl valida foi encontrada em requisicoes.txt.");
  }

  return requests;
}

export async function fetchCustomersForRequests(
  requests: ParsedCurlRequest[],
  options: {
    cwd: string;
    onvioAuthDir?: string;
    deps?: Partial<InputGeneratorDeps>;
  },
): Promise<CustomerPayload[][]> {
  const deps = { ...defaultDeps, ...options.deps };
  const onvioAuthDir = options.onvioAuthDir ?? resolveOnvioAuthDir(options.cwd);
  let refreshedJwt: string | null = null;
  const results: CustomerPayload[][] = [];

  for (const request of requests) {
    let response = await deps.runCurlRequest(request);

    if (isUnauthorizedResponse(response)) {
      if (!refreshedJwt) {
        await deps.captureFreshGesttaJwt(onvioAuthDir);
        refreshedJwt = await deps.loadLatestGesttaJwt(onvioAuthDir);
      }

      response = await deps.runCurlRequest(replaceAuthorizationHeader(request, refreshedJwt));

      if (isUnauthorizedResponse(response)) {
        throw new Error(
          `A task ${request.taskId ?? request.label} continuou nao autorizada apos recapturar o JWT_GESTTA.`,
        );
      }
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(
        `A task ${request.taskId ?? request.label} retornou HTTP ${response.statusCode}. ${response.stderr.trim()}`.trim(),
      );
    }

    results.push(parseCustomerResponse(response.body, request));
  }

  return results;
}

export function buildInputRowsFromCustomers(
  customersByRequest: CustomerPayload[][],
  saveDir = DEFAULT_INPUT_SAVE_DIR,
): GeneratedInputRow[] {
  const seen = new Set<string>();
  const rows: GeneratedInputRow[] = [];

  for (const customerList of customersByRequest) {
    for (const item of customerList) {
      const row = mapCustomerToInputRow(item, saveDir);
      const dedupeKey = `${row.codigo}:${row.inscricaoEstadual}`;

      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);
      rows.push(row);
    }
  }

  return rows;
}

function parseCurlBlock(label: string, curlLines: string[]): ParsedCurlRequest {
  if (curlLines.length === 0) {
    throw new Error(`O bloco "${label}" nao possui linhas curl para interpretar.`);
  }

  const firstLine = stripLineContinuation(curlLines[0] ?? "");
  const urlMatch = firstLine.match(/^curl\s+'([^']+)'$/);

  if (!urlMatch) {
    throw new Error(`Nao foi possivel interpretar a URL da requisicao "${label}".`);
  }

  const headers = curlLines
    .slice(1)
    .map((line) => stripLineContinuation(line))
    .map((line) => line.match(/^-H\s+'([^']+)'$/)?.[1] ?? null)
    .filter((header): header is string => header !== null)
    .filter((header) => !isConditionalCacheHeader(header));

  return {
    label,
    url: urlMatch[1],
    headers,
    taskId: extractTaskId(urlMatch[1]),
  };
}

function stripLineContinuation(line: string): string {
  const trimmed = line.trim();
  return trimmed.endsWith("\\") ? trimmed.slice(0, -1).trimEnd() : trimmed;
}

function extractTaskId(url: string): string | null {
  const match = url.match(/\/task\/([^/]+)\/customer$/i);
  return match?.[1] ?? null;
}

function isConditionalCacheHeader(header: string): boolean {
  return /^(if-none-match|if-modified-since)\s*:/i.test(header);
}

function parseCustomerResponse(body: string, request: ParsedCurlRequest): CustomerPayload[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`A resposta da task ${request.taskId ?? request.label} nao e um JSON valido: ${message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`A resposta da task ${request.taskId ?? request.label} nao retornou uma lista de clientes.`);
  }

  return parsed as CustomerPayload[];
}

function mapCustomerToInputRow(item: CustomerPayload, saveDir: string): GeneratedInputRow {
  const customer = item.customer ?? {};
  const codigo = String(customer.code ?? "").trim();
  const empresa = String(customer.name ?? "").trim();
  const inscricaoEstadual = normalizeIe(customer.state_inscription);

  if (!codigo) {
    throw new Error("Uma das respostas do Gestta nao trouxe customer.code.");
  }

  if (!inscricaoEstadual) {
    throw new Error(`O cliente de codigo ${codigo} nao trouxe state_inscription.`);
  }

  return {
    codigo,
    empresa,
    cnpj: formatCnpj(customer.cnpj),
    inscricaoEstadual,
    cpf: "",
    saveDir,
  };
}

function replaceAuthorizationHeader(request: ParsedCurlRequest, jwt: string): ParsedCurlRequest {
  let replaced = false;
  const headers = request.headers.map((header) => {
    const separatorIndex = header.indexOf(":");

    if (separatorIndex < 0) {
      return header;
    }

    const headerName = header.slice(0, separatorIndex).trim();
    if (headerName.toLowerCase() !== "authorization") {
      return header;
    }

    replaced = true;
    return `${headerName}: JWT ${jwt}`;
  });

  if (!replaced) {
    headers.push(`authorization: JWT ${jwt}`);
  }

  return {
    ...request,
    headers,
  };
}

function isUnauthorizedResponse(response: CurlExecutionResult): boolean {
  return response.statusCode === 401 || response.body.trim() === "Unauthorized";
}

function runCurlRequestWithBinary(request: ParsedCurlRequest): CurlExecutionResult {
  const args = ["-sS", "-w", `\n${CURL_STATUS_MARKER}%{http_code}`];

  for (const header of request.headers) {
    args.push("-H", header);
  }

  args.push(request.url);

  const result = spawnSync("curl.exe", args, {
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.error) {
    throw new Error(
      `Falha ao executar curl para a task ${request.taskId ?? request.label}: ${result.error.message}`,
    );
  }

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const markerIndex = stdout.lastIndexOf(CURL_STATUS_MARKER);

  if (markerIndex < 0) {
    const details = stderr.trim() || stdout.trim() || `curl saiu com codigo ${result.status ?? "desconhecido"}.`;
    throw new Error(`Nao foi possivel interpretar a resposta curl da task ${request.taskId ?? request.label}: ${details}`);
  }

  const body = stdout.slice(0, markerIndex).trimEnd();
  const statusCodeText = stdout.slice(markerIndex + CURL_STATUS_MARKER.length).trim();
  const statusCode = Number.parseInt(statusCodeText, 10);

  if (!Number.isFinite(statusCode)) {
    throw new Error(`Nao foi possivel interpretar o HTTP status da task ${request.taskId ?? request.label}.`);
  }

  return {
    statusCode,
    body,
    stderr,
  };
}

function captureFreshGesttaJwt(onvioAuthDir: string): void {
  console.log("\nJWT expirado. Recapturando tokens via shared/onvio-auth...");

  const command = process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "npm";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", "npm run capture-tokens"]
    : ["run", "capture-tokens"];
  const result = spawnSync(command, args, {
    cwd: onvioAuthDir,
    stdio: "inherit",
    windowsHide: false,
  });

  if (result.error) {
    throw new Error(`Falha ao iniciar a captura de tokens: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`A captura de tokens retornou codigo ${result.status}.`);
  }
}

async function loadLatestGesttaJwt(onvioAuthDir: string): Promise<string> {
  const artifactPath = path.join(onvioAuthDir, "runtime", "latest-auth.json");
  const artifactText = await fs.readFile(artifactPath, "utf8");
  const artifact = JSON.parse(artifactText) as {
    gestta?: {
      jwt?: unknown;
    };
  };
  const jwt = String(artifact.gestta?.jwt ?? "").trim();

  if (!jwt) {
    throw new Error(`O artefato ${artifactPath} nao contem gestta.jwt.`);
  }

  return jwt;
}

function resolveOnvioAuthDir(cwd: string): string {
  return path.resolve(cwd, "..", "..", "shared", "onvio-auth");
}
