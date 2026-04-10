import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { chromium, type Request } from "playwright";
import {
  PORTAL_URL,
  calculateParcelaWithRetry,
  waitForConsolidacoesState,
  waitForLoginOutcome,
} from "../portal.js";
import { readInputWorkbook } from "../workbook.js";
import type { InputRow } from "../types.js";

const DEFAULT_INPUT = "EmpresasAlagoas.xlsx";
const DEFAULT_OUT = path.join("output", "spike", "network-capture.jsonl");

function parseArgs(argv: string[]): {
  inputPath: string;
  outPath: string;
  rowIndex: number;
  headed: boolean;
} {
  let inputPath = DEFAULT_INPUT;
  let outPath = DEFAULT_OUT;
  let rowIndex = 0;
  let headed = false;

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--input") {
      inputPath = argv[i + 1] ?? inputPath;
      i += 1;
      continue;
    }
    if (a === "--out") {
      outPath = argv[i + 1] ?? outPath;
      i += 1;
      continue;
    }
    if (a === "--row") {
      rowIndex = Math.max(0, Number.parseInt(argv[i + 1] ?? "0", 10) || 0);
      i += 1;
      continue;
    }
    if (a === "--headed") {
      headed = true;
    }
  }

  return { inputPath, outPath, rowIndex, headed };
}

function redactJsonBody(raw: string): string {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    for (const k of Object.keys(o)) {
      const lower = k.toLowerCase();
      if (lower.includes("password") || lower.includes("senha")) {
        o[k] = "[REDACTED]";
      }
      if (lower === "username" || lower === "usuario") {
        const v = o[k];
        o[k] = typeof v === "string" && v.length > 4 ? `${String(v).slice(0, 3)}…` : "[REDACTED]";
      }
      if (lower.includes("token") || lower === "authorization") {
        o[k] = "[REDACTED]";
      }
    }
    return JSON.stringify(o);
  } catch {
    return "[non-json or parse error]";
  }
}

function shouldLogRequest(request: Request): boolean {
  const t = request.resourceType();
  if (t !== "xhr" && t !== "fetch") {
    return false;
  }
  return request.url().includes("sefaz.al.gov.br");
}

async function appendCaptureLine(outPath: string, line: Record<string, unknown>): Promise<void> {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.appendFile(outPath, `${JSON.stringify(line)}\n`, "utf8");
}

async function loginAndOpenConsolidacoes(page: import("playwright").Page, row: InputRow): Promise<void> {
  await page.goto(PORTAL_URL, { waitUntil: "domcontentloaded" });
  await page.locator("#link-acesso-parcelamento").click();

  const loginModal = page.locator("ngb-modal-window");
  await loginModal.locator("#username").waitFor({ state: "visible", timeout: 30_000 });
  await loginModal.locator("#username").fill(row.usuario);
  await loginModal.locator("#password").fill(row.senha);
  await loginModal.getByRole("button", { name: /Acessar/i }).click();

  const outcome = await waitForLoginOutcome(page, row.usuario);
  if (outcome.status === "alert") {
    throw new Error(outcome.message);
  }
  if (outcome.status === "timeout") {
    throw new Error("Timeout aguardando resultado do login.");
  }

  const consolidacoesLink = page.locator('a.btn.btn-sq-lg.btn-primary[href="#/consolidacao"]').first();
  await consolidacoesLink.waitFor({ state: "visible", timeout: 30_000 });
  await consolidacoesLink.click();
}

async function openFirstParcelamentoModal(page: import("playwright").Page): Promise<void> {
  const listingState = await waitForConsolidacoesState(page);
  if (listingState === "empty") {
    throw new Error("Nenhuma consolidacao listada para a situacao selecionada.");
  }

  const firstRow = page.locator("table.data-table tbody tr.data-table-row").first();
  await firstRow.waitFor({ state: "visible", timeout: 30_000 });
  await firstRow.locator('td.column-opcoes button[title*="parcelas/Extrato"]').first().click();

  const modal = page.locator("ngb-modal-window .modal-content");
  await modal.locator("#quantidade").waitFor({ state: "visible", timeout: 30_000 });
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const { inputPath, outPath, rowIndex, headed } = parseArgs(argv);
  const cwd = process.cwd();
  const absoluteInput = path.resolve(cwd, inputPath);
  const rows = readInputWorkbook(absoluteInput);
  const row = rows[rowIndex];
  if (!row) {
    throw new Error(`Linha ${rowIndex} inexistente na planilha (total ${rows.length}).`);
  }

  console.log(`Captura: planilha=${absoluteInput}, linha indice=${rowIndex} (planilha linha ${row.rowNumber}), saida=${outPath}`);

  const browser = await chromium.launch({ headless: !headed, slowMo: headed ? 120 : 0 });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);

  page.on("requestfinished", async (request) => {
    if (!shouldLogRequest(request)) {
      return;
    }

    try {
      const response = await request.response();
      const postData = request.postData();
      const reqHeaders = await request.allHeaders();
      const safeHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(reqHeaders)) {
        const lk = k.toLowerCase();
        if (lk === "authorization" || lk === "cookie") {
          safeHeaders[k] = "[REDACTED]";
        } else {
          safeHeaders[k] = v;
        }
      }

      let requestBodyRedacted: string | undefined;
      if (postData) {
        const ct = (reqHeaders["content-type"] ?? "").toLowerCase();
        requestBodyRedacted = ct.includes("json") ? redactJsonBody(postData) : "[omitted-non-json]";
      }

      const ct = response?.headers()?.["content-type"] ?? "";
      let responseNote = "";
      if (!response) {
        responseNote = "[no response]";
      } else if (ct.includes("application/pdf") || ct.includes("octet-stream")) {
        responseNote = `binary status=${response.status()}`;
      } else {
        try {
          const text = await response.text();
          responseNote = text.length > 4_000 ? `${text.slice(0, 4_000)}…[truncated]` : text;
          if (responseNote.includes("token")) {
            responseNote = redactJsonBody(responseNote);
          }
        } catch {
          responseNote = "[unreadable]";
        }
      }

      await appendCaptureLine(outPath, {
        ts: new Date().toISOString(),
        method: request.method(),
        url: request.url(),
        resourceType: request.resourceType(),
        status: response?.status(),
        responseContentType: ct,
        requestHeaders: safeHeaders,
        requestBodyRedacted,
        responseBodyOrNote: responseNote,
      });
    } catch (err) {
      await appendCaptureLine(outPath, {
        ts: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
        url: request.url(),
      });
    }
  });

  try {
    await loginAndOpenConsolidacoes(page, row);
    await openFirstParcelamentoModal(page);

    const modal = page.locator("ngb-modal-window .modal-content");
    const calculationState = await calculateParcelaWithRetry(modal);
    if (calculationState.status !== "rows") {
      throw new Error(
        calculationState.status === "alert" || calculationState.status === "timeout"
          ? calculationState.message
          : "Calculo da parcela nao retornou linhas.",
      );
    }

    const downloadPromise = page.waitForEvent("download");
    await modal.locator("table.table-parcelas tbody tr button.btn.btn-primary").first().click();
    const download = await downloadPromise;
    console.log(`Download sugerido: ${download.suggestedFilename()}`);
  } finally {
    await browser.close();
  }

  console.log(`Captura concluida. Linhas em: ${path.resolve(cwd, outPath)}`);
}

const executedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (executedFilePath && pathToFileURL(executedFilePath).href === import.meta.url) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.stack ?? e.message : e);
    process.exitCode = 1;
  });
}
