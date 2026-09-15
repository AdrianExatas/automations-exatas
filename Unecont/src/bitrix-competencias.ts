import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { findColumn, normalizeCodigo } from "./domain/empresa-normalization";
import type { DownloadLogger } from "./types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx");

const COMPETENCIAS_FILENAME = "competencias-bitrix.xlsx";
const ACCOUNTING_FILENAME = "contabil-bitrix.xlsx";

export interface DownloadBitrixCompetenciasOptions {
  url: string;
  outputDir: string;
  browser?: { headless?: boolean };
  logger?: DownloadLogger;
}

export interface DownloadBitrixCompetenciasResult {
  filePath: string;
  sizeBytes: number;
}

export interface DownloadBitrixWorkbookOptions extends DownloadBitrixCompetenciasOptions {
  fileName: string;
  label: string;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function referenceMonthSheetName(referenceMonth: string): string {
  const match = referenceMonth.match(/^(\d{2})\/\d{4}$/);
  if (!match) {
    throw new Error(`Referencia invalida para competencias Bitrix: ${referenceMonth}. Use MM/YYYY.`);
  }
  return match[1];
}

/** Competencia MM/YYYY do mes calendario vigente (onboarding em andamento). */
export function resolveCurrentMonthReference(now = new Date()): string {
  return `${pad2(now.getMonth() + 1)}/${now.getFullYear()}`;
}

export function readBitrixCompetenciaCodes(filePath: string, referenceMonth: string): string[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Planilha de competencias Bitrix nao encontrada: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = referenceMonthSheetName(referenceMonth);
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(
      `Aba de competencia "${sheetName}" nao encontrada na planilha Bitrix para ${referenceMonth}.`,
    );
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];
  const headers = (rows[0] ?? []).map((value) => String(value ?? ""));
  const codigoHeader = findColumn(headers, ["codigo", "cod"], "exact");
  const codigoColumn = codigoHeader ? headers.indexOf(codigoHeader) : -1;
  if (codigoColumn < 0) {
    throw new Error(
      `Aba de competencia "${sheetName}" da planilha Bitrix precisa conter a coluna CÓD.`,
    );
  }

  return Array.from(
    new Set(
      rows
        .slice(1)
        .map((row) => normalizeCodigo(row[codigoColumn]))
        .filter(Boolean),
    ),
  );
}

export async function downloadBitrixWorkbook(
  options: DownloadBitrixWorkbookOptions,
): Promise<DownloadBitrixCompetenciasResult> {
  const url = options.url.trim();
  if (!url) throw new Error(`URL da planilha Bitrix de ${options.label} e obrigatoria.`);

  fs.mkdirSync(options.outputDir, { recursive: true });
  const filePath = path.join(options.outputDir, options.fileName);
  const browser = await chromium.launch({ headless: options.browser?.headless ?? true });

  try {
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    options.logger?.info?.(`Abrindo planilha Bitrix de ${options.label}...`);
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "Baixar", exact: true }).click({ timeout: 30_000 });
    const download = await downloadPromise;
    const failure = await download.failure();
    if (failure) throw new Error(`Falha ao baixar planilha Bitrix de ${options.label}: ${failure}`);

    await download.saveAs(filePath);
    await context.close();
  } finally {
    await browser.close();
  }

  const sizeBytes = fs.statSync(filePath).size;
  if (sizeBytes === 0) throw new Error(`Download da planilha Bitrix de ${options.label} retornou arquivo vazio.`);
  options.logger?.info?.(`Planilha Bitrix de ${options.label} baixada: ${filePath}`);
  return { filePath, sizeBytes };
}

export async function downloadBitrixCompetencias(
  options: DownloadBitrixCompetenciasOptions,
): Promise<DownloadBitrixCompetenciasResult> {
  return downloadBitrixWorkbook({
    ...options,
    fileName: COMPETENCIAS_FILENAME,
    label: "competencias",
  });
}

export async function downloadBitrixAccountingCompanies(
  options: DownloadBitrixCompetenciasOptions,
): Promise<DownloadBitrixCompetenciasResult> {
  return downloadBitrixWorkbook({
    ...options,
    fileName: ACCOUNTING_FILENAME,
    label: "empresas contabeis",
  });
}
