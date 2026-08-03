import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type LaunchOptions, type Page, type Request, type Response } from "playwright";
import { processPortalRow } from "./portal.js";
import type { InputRow, RunResult } from "./types.js";
import { readInputWorkbook } from "./workbook.js";
import { normalizeDigits, timestampForFile } from "./utils.js";

const CAPTURED_RESOURCE_TYPES = new Set(["document", "fetch", "xhr"]);
const BODY_TEXT_LIMIT = 12_000;

export interface HttpMapOptions {
  inputPath: string;
  cwd: string;
  headed: boolean;
  browserChannel?: string;
  rowNumber?: number;
  log?: (message: string) => void;
}

export interface HttpMapResult {
  mapDir: string;
  networkMapPath: string;
  summaryPath: string;
  results: RunResult[];
}

export interface CapturedNetworkEntry {
  id: number;
  stage: "pending" | "complete" | "failed";
  resourceType: string;
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  requestPostData?: string;
  status?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  responseBodyKind?: "json" | "text" | "pdf" | "binary" | "unavailable";
  responseSize?: number;
  error?: string;
}

export interface NetworkMap {
  version: 1;
  capturedAt: string;
  row: {
    rowNumber: number;
    codigo: string;
    empresa?: string;
  };
  results: RunResult[];
  entries: CapturedNetworkEntry[];
  replayPlan?: unknown;
}

export class SensitiveRedactor {
  private readonly exactValues: string[];

  constructor(values: Array<string | undefined>) {
    this.exactValues = values
      .flatMap((value) => buildSensitiveVariants(value))
      .filter((value, index, all) => value.length >= 3 && all.indexOf(value) === index);
  }

  redactValue(value: unknown): unknown {
    if (typeof value === "string") {
      return this.redactText(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.redactValue(item));
    }

    if (value && typeof value === "object") {
      const output: Record<string, unknown> = {};
      for (const [key, nestedValue] of Object.entries(value)) {
        output[key] = this.isSensitiveKey(key) ? "[REDACTED]" : this.redactValue(nestedValue);
      }
      return output;
    }

    return value;
  }

  redactHeaders(headers: Record<string, string>): Record<string, string> {
    const output: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      output[key] = this.isSensitiveKey(key) ? "[REDACTED]" : this.redactText(value);
    }

    return output;
  }

  redactText(value: string): string {
    let output = value;

    for (const sensitiveValue of this.exactValues) {
      output = output.split(sensitiveValue).join("[REDACTED]");
    }

    output = output.replace(/(authorization|token|jwt|access_token|id_token|refresh_token)=([^&\s]+)/gi, "$1=[REDACTED]");
    output = output.replace(/\b(Bearer|JWT)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 [REDACTED]");
    return output;
  }

  private isSensitiveKey(key: string): boolean {
    return /^(authorization|cookie|set-cookie|x-xsrf-token|x-csrf-token)$/i.test(key)
      || /(token|jwt|secret|password|senha)/i.test(key);
  }
}

export class NetworkCapture {
  private readonly requestIds = new Map<Request, number>();
  private readonly entries: CapturedNetworkEntry[] = [];
  private nextId = 1;

  constructor(private readonly redactor: SensitiveRedactor) {}

  attachPage(page: Page): void {
    page.on("request", (request) => {
      if (!CAPTURED_RESOURCE_TYPES.has(request.resourceType())) {
        return;
      }

      const id = this.nextId;
      this.nextId += 1;
      this.requestIds.set(request, id);

      const postData = request.postData();
      this.entries.push({
        id,
        stage: "pending",
        resourceType: request.resourceType(),
        method: request.method(),
        url: this.redactor.redactText(request.url()),
        requestHeaders: this.redactor.redactHeaders(request.headers()),
        requestPostData: postData ? this.redactor.redactText(postData) : undefined,
      });
    });

    page.on("response", (response) => {
      void this.captureResponse(response);
    });

    page.on("requestfailed", (request) => {
      const entry = this.entryForRequest(request);
      if (!entry) {
        return;
      }

      entry.stage = "failed";
      entry.error = request.failure()?.errorText ?? "request failed";
    });
  }

  snapshot(): CapturedNetworkEntry[] {
    return this.entries.map((entry) => ({ ...entry }));
  }

  private async captureResponse(response: Response): Promise<void> {
    const entry = this.entryForRequest(response.request());
    if (!entry) {
      return;
    }

    entry.stage = "complete";
    entry.status = response.status();
    entry.responseHeaders = this.redactor.redactHeaders(response.headers());

    const contentType = headerValue(response.headers(), "content-type");
    const contentDisposition = headerValue(response.headers(), "content-disposition");
    const looksLikePdf = /application\/pdf/i.test(contentType) || /\.pdf\b/i.test(contentDisposition);
    const looksLikeJson = /application\/json/i.test(contentType);
    const looksLikeText = /^text\//i.test(contentType);

    if (looksLikePdf) {
      const body = await response.body().catch(() => null);
      entry.responseBodyKind = "pdf";
      entry.responseSize = body?.length;
      entry.responseBody = body ? { header: body.subarray(0, 16).toString("latin1") } : undefined;
      return;
    }

    if (!looksLikeJson && !looksLikeText) {
      entry.responseBodyKind = "binary";
      return;
    }

    const text = await response.text().catch(() => null);
    if (text === null) {
      entry.responseBodyKind = "unavailable";
      return;
    }

    entry.responseSize = Buffer.byteLength(text);
    const limitedText = text.length > BODY_TEXT_LIMIT ? `${text.slice(0, BODY_TEXT_LIMIT)}...[TRUNCATED]` : text;

    if (looksLikeJson) {
      entry.responseBodyKind = "json";
      try {
        entry.responseBody = this.redactor.redactValue(JSON.parse(limitedText));
      } catch {
        entry.responseBody = this.redactor.redactText(limitedText);
      }
      return;
    }

    entry.responseBodyKind = "text";
    entry.responseBody = this.redactor.redactText(limitedText);
  }

  private entryForRequest(request: Request): CapturedNetworkEntry | undefined {
    const id = this.requestIds.get(request);
    return id ? this.entries.find((entry) => entry.id === id) : undefined;
  }
}

export async function runHttpMap(options: HttpMapOptions): Promise<HttpMapResult> {
  const log = options.log ?? (() => undefined);
  const inputPath = path.resolve(options.cwd, options.inputPath);
  const rows = readInputWorkbook(inputPath);
  const row = selectMapRow(rows, options.rowNumber);
  const mapDir = path.join(options.cwd, "output", "http-map", timestampForFile());

  await fs.mkdir(mapDir, { recursive: true });
  log(`Mapeando requisicoes HTTP para a linha ${row.rowNumber} / codigo ${row.codigo}.`);
  log(`Artefatos serao gravados em: ${mapDir}`);

  const redactor = new SensitiveRedactor([row.codigo, row.empresa, row.cnpj, row.inscricaoEstadual, row.cpf]);
  const capture = new NetworkCapture(redactor);
  const launchOptions: LaunchOptions = {
    headless: !options.headed,
    slowMo: options.headed ? 150 : 0,
  };

  if (options.browserChannel) {
    launchOptions.channel = options.browserChannel;
  }

  const browser = await chromium.launch(launchOptions);
  let results: RunResult[];

  try {
    results = await processPortalRow(browser, row, options.cwd, {
      networkCapture: capture,
      resultTransport: "browser",
    });
  } finally {
    await browser.close();
  }

  const networkMap: NetworkMap = {
    version: 1,
    capturedAt: new Date().toISOString(),
    row: {
      rowNumber: row.rowNumber,
      codigo: redactor.redactText(row.codigo),
      empresa: row.empresa ? redactor.redactText(row.empresa) : undefined,
    },
    results: redactor.redactValue(results) as RunResult[],
    entries: capture.snapshot(),
  };

  const networkMapPath = path.join(mapDir, "network-map.json");
  const summaryPath = path.join(mapDir, "summary.txt");
  await fs.writeFile(networkMapPath, `${JSON.stringify(networkMap, null, 2)}\n`, "utf8");
  await fs.writeFile(summaryPath, buildSummary(networkMap), "utf8");

  log(`Mapa HTTP salvo em: ${networkMapPath}`);
  log(`Resumo salvo em: ${summaryPath}`);

  return {
    mapDir,
    networkMapPath,
    summaryPath,
    results,
  };
}

function selectMapRow(rows: InputRow[], rowNumber: number | undefined): InputRow {
  if (!rowNumber) {
    return rows[0]!;
  }

  const row = rows.find((candidate) => candidate.rowNumber === rowNumber);
  if (!row) {
    throw new Error(`Nao foi encontrada a linha ${rowNumber} na planilha de entrada.`);
  }

  return row;
}

function buildSummary(networkMap: NetworkMap): string {
  const lines = [
    `capturedAt: ${networkMap.capturedAt}`,
    `row: ${networkMap.row.rowNumber} / codigo ${networkMap.row.codigo}`,
    `entries: ${networkMap.entries.length}`,
    "",
  ];

  for (const entry of networkMap.entries) {
    const contentType = entry.responseHeaders ? headerValue(entry.responseHeaders, "content-type") : "";
    lines.push(`${entry.id}. ${entry.method} ${entry.status ?? "-"} ${entry.resourceType} ${entry.url}`);
    if (contentType) {
      lines.push(`   content-type: ${contentType}`);
    }
    if (entry.responseBodyKind === "pdf") {
      lines.push(`   pdf-size: ${entry.responseSize ?? "desconhecido"}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function buildSensitiveVariants(value: string | undefined): string[] {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return [];
  }

  const digits = normalizeDigits(trimmed);
  return [
    trimmed,
    encodeURIComponent(trimmed),
    digits,
    digits ? encodeURIComponent(digits) : "",
  ].filter(Boolean);
}

function headerValue(headers: Record<string, string>, name: string): string {
  return headers[name] ?? headers[name.toLowerCase()] ?? "";
}
