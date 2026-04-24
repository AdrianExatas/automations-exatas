import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { EMBEDDED_SIEG_API_KEY } from "./generated/sieg-key";
import { messageOf } from "./errors";
import { SiegXmlClient, validateAccessKey } from "./sieg-client";
import type { Company, Competencia, XmlDownloadEntry } from "./types";

export type XmlDownloadProgress = {
  phase: "scan" | "download" | "report" | "done";
  current: number;
  total: number;
  message: string;
  successCount: number;
  errorCount: number;
  processedCount: number;
  outDir: string;
  jsonPath: string;
  excelPath: string;
  company?: Company;
  chave?: string;
};

export type XmlDownloadResult = {
  entries: XmlDownloadEntry[];
  successCount: number;
  errorCount: number;
  jsonPath: string;
  excelPath: string;
  outDir: string;
};

export type XmlDownloadConfig = {
  competencia: Competencia;
  outDir: string;
  threads?: number;
  apiKey?: string;
  timeoutMs?: number;
};

export type XmlDownloadCallbacks = {
  onLog?: (message: string) => void;
  onProgress?: (progress: XmlDownloadProgress) => void;
  signal?: AbortSignal;
};

type CompanyReport = {
  company: Company;
  companyDir: string;
  xlsPath: string;
  chaves: string[];
};

const CHAVE_REGEX = /(?<!\d)\d{44}(?!\d)/g;
const REPORT_CHECKPOINT_INTERVAL = 10;

export async function runXmlDownload(config: XmlDownloadConfig, callbacks: XmlDownloadCallbacks = {}): Promise<XmlDownloadResult> {
  const outDir = path.resolve(config.outDir, config.competencia.value);
  const reportPaths = buildXmlReportPaths(config);
  const entries: XmlDownloadEntry[] = [];

  emit(callbacks, config, reportPaths, entries, "scan", 0, 0, "Localizando relatorios XLS do DIA...");
  const reports = await findDiaXlsReports(config);
  if (reports.length === 0) {
    throw new Error("Nenhum relatorio XLS encontrado para a competencia selecionada.");
  }

  const total = reports.reduce((sum, report) => sum + report.chaves.length, 0);
  if (total === 0) {
    throw new Error("Nenhuma chave de acesso encontrada nos relatorios XLS.");
  }

  log(callbacks, `Relatorios XLS encontrados: ${reports.length}`);
  log(callbacks, `Chaves encontradas: ${total}`);

  const client = new SiegXmlClient({
    apiKey: resolveSiegApiKey(config),
    timeoutMs: config.timeoutMs,
  });
  const queue = buildDownloadQueue(reports);
  let current = 0;
  let nextIndex = 0;
  let reportSave = Promise.resolve<{ jsonPath: string; excelPath: string } | undefined>(undefined);
  const saveCheckpoint = () => {
    reportSave = reportSave.then(() => saveXmlReports(config, entries));
    return reportSave;
  };
  const workers = Array.from({ length: Math.min(Math.max(1, config.threads ?? 6), queue.length) }, async () => {
    while (nextIndex < queue.length) {
      throwIfAborted(callbacks.signal);
      const item = queue[nextIndex]!;
      nextIndex += 1;

      const currentBefore = current;
      emit(
        callbacks,
        config,
        reportPaths,
        entries,
        "download",
        currentBefore,
        total,
        `Baixando XML ${item.chave} - ${item.report.company.nome}`,
        item.report.company,
        item.chave,
      );

      const entry = await downloadOneXml(client, config, item.report, item.chave, callbacks.signal);
      entries.push(entry);
      current += 1;
      log(callbacks, entry.status === "sucesso" ? `  XML salvo em ${entry.path}` : `  XML ${entry.chave}: ${entry.mensagem}`);
      emit(callbacks, config, reportPaths, entries, "download", current, total, `${current}/${total} XMLs processados`, item.report.company, item.chave);
      if (shouldSaveXmlCheckpoint(current, total)) {
        await saveCheckpoint();
      }
    }
  });

  await Promise.all(workers);
  await reportSave;

  emit(callbacks, config, reportPaths, entries, "report", current, total, "Gerando relatorio de XMLs...");
  const { jsonPath, excelPath } = await saveXmlReports(config, entries);
  const successCount = entries.filter((entry) => entry.status === "sucesso").length;
  const errorCount = entries.length - successCount;
  emit(callbacks, config, reportPaths, entries, "done", total, total, `XMLs concluidos. Sucessos: ${successCount}. Erros: ${errorCount}.`);

  return { entries, successCount, errorCount, jsonPath, excelPath, outDir };
}

export async function findDiaXlsReports(config: Pick<XmlDownloadConfig, "competencia" | "outDir">): Promise<CompanyReport[]> {
  const competenciaDir = path.resolve(config.outDir, config.competencia.value);
  const dirents = await readdir(competenciaDir, { withFileTypes: true }).catch(() => []);
  const reports: CompanyReport[] = [];

  for (const dirent of dirents) {
    if (!dirent.isDirectory()) {
      continue;
    }
    const companyDir = path.join(competenciaDir, dirent.name);
    const files = await readdir(companyDir, { withFileTypes: true }).catch(() => []);
    const xls = files.find((file) => file.isFile() && /_dia\.xls$/i.test(file.name));
    if (!xls) {
      continue;
    }

    const company = parseCompanyFromDirName(dirent.name);
    const xlsPath = path.join(companyDir, xls.name);
    const chaves = extractAccessKeysFromWorkbook(xlsPath);
    reports.push({ company, companyDir, xlsPath, chaves });
  }

  return reports;
}

export function extractAccessKeysFromWorkbook(filePath: string): string[] {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const keys: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      continue;
    }
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
    for (const row of rows) {
      for (const value of row) {
        for (const key of extractAccessKeysFromText(String(value ?? ""))) {
          if (!keys.includes(key)) {
            keys.push(key);
          }
        }
      }
    }
  }
  return keys;
}

export function extractAccessKeysFromText(text: string): string[] {
  const normalized = text.trim().replace(/[ .-]/g, "");
  return [...normalized.matchAll(CHAVE_REGEX)].map((match) => match[0]).filter((key) => {
    try {
      validateAccessKey(key);
      return true;
    } catch {
      return false;
    }
  });
}

export function buildXmlReportPaths(config: Pick<XmlDownloadConfig, "competencia" | "outDir">): { jsonPath: string; excelPath: string } {
  const baseDir = path.resolve(config.outDir, config.competencia.value);
  return {
    jsonPath: path.join(baseDir, "relatorio-xml.json"),
    excelPath: path.join(baseDir, "relatorio-xml.xlsx"),
  };
}

export async function saveXmlReports(config: XmlDownloadConfig, entries: XmlDownloadEntry[]): Promise<{ jsonPath: string; excelPath: string }> {
  const paths = buildXmlReportPaths(config);
  await mkdir(path.dirname(paths.jsonPath), { recursive: true });
  await writeFile(paths.jsonPath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");

  const workbook = XLSX.utils.book_new();
  const summary = XLSX.utils.json_to_sheet(buildXmlSummaryRows(config, entries));
  const details = XLSX.utils.json_to_sheet(buildXmlDetailRows(entries));
  summary["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
  details["!cols"] = [
    { wch: 8 },
    { wch: 14 },
    { wch: 14 },
    { wch: 48 },
    { wch: 46 },
    { wch: 12 },
    { wch: 90 },
    { wch: 90 },
    { wch: 90 },
  ];
  XLSX.utils.book_append_sheet(workbook, summary, "Resumo");
  XLSX.utils.book_append_sheet(workbook, details, "XMLs");
  XLSX.writeFile(workbook, paths.excelPath, { bookType: "xlsx", compression: true });
  return paths;
}

function buildDownloadQueue(reports: CompanyReport[]): Array<{ report: CompanyReport; chave: string }> {
  return reports.flatMap((report) => report.chaves.map((chave) => ({ report, chave })));
}

function resolveSiegApiKey(config: XmlDownloadConfig): string {
  return config.apiKey?.trim() || process.env.SIEG_API_KEY?.trim() || EMBEDDED_SIEG_API_KEY;
}

async function downloadOneXml(
  client: SiegXmlClient,
  config: XmlDownloadConfig,
  report: CompanyReport,
  chave: string,
  signal: AbortSignal | undefined,
): Promise<XmlDownloadEntry> {
  try {
    const xml = await client.downloadXml(chave, signal);
    const outputPath = path.join(report.companyDir, "XML", `${chave}.xml`);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, xml, "utf8");
    return {
      competencia: config.competencia.value,
      inscricao: report.company.inscricao,
      empresa: report.company.nome,
      xlsPath: report.xlsPath,
      chave,
      status: "sucesso",
      path: outputPath,
    };
  } catch (error) {
    return {
      competencia: config.competencia.value,
      inscricao: report.company.inscricao,
      empresa: report.company.nome,
      xlsPath: report.xlsPath,
      chave,
      status: "erro",
      mensagem: messageOf(error),
    };
  }
}

function buildXmlSummaryRows(config: XmlDownloadConfig, entries: XmlDownloadEntry[]): Array<Record<string, string | number>> {
  const successCount = entries.filter((entry) => entry.status === "sucesso").length;
  const errorCount = entries.length - successCount;
  return [{ Competencia: config.competencia.value, Sucessos: successCount, Erros: errorCount, Total: entries.length }];
}

function buildXmlDetailRows(entries: XmlDownloadEntry[]): Array<Record<string, string | number>> {
  return entries.map((entry, index) => ({
    Ordem: index + 1,
    Competencia: entry.competencia,
    Inscricao: entry.inscricao,
    Empresa: entry.empresa,
    Chave: entry.chave,
    Status: entry.status,
    Arquivo: entry.path ?? "",
    XLS: entry.xlsPath,
    Mensagem: entry.mensagem ?? "",
  }));
}

function parseCompanyFromDirName(name: string): Company {
  const match = name.match(/^(\d+)\s+-\s+(.+)$/);
  if (!match) {
    return { inscricao: name, nome: "" };
  }
  return { inscricao: match[1]!, nome: match[2]! };
}

function emit(
  callbacks: XmlDownloadCallbacks,
  config: XmlDownloadConfig,
  reportPaths: { jsonPath: string; excelPath: string },
  entries: XmlDownloadEntry[],
  phase: XmlDownloadProgress["phase"],
  current: number,
  total: number,
  message: string,
  company?: Company,
  chave?: string,
): void {
  const successCount = entries.filter((entry) => entry.status === "sucesso").length;
  const errorCount = entries.filter((entry) => entry.status === "erro").length;
  callbacks.onProgress?.({
    phase,
    current,
    total,
    message,
    successCount,
    errorCount,
    processedCount: entries.length,
    outDir: path.resolve(config.outDir, config.competencia.value),
    jsonPath: reportPaths.jsonPath,
    excelPath: reportPaths.excelPath,
    company,
    chave,
  });
  log(callbacks, message);
}

function log(callbacks: XmlDownloadCallbacks, message: string): void {
  callbacks.onLog?.(message);
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new Error("Execucao cancelada pelo usuario.");
  }
}

export function shouldSaveXmlCheckpoint(processed: number, total: number, interval = REPORT_CHECKPOINT_INTERVAL): boolean {
  return processed === 1 || processed === total || processed % interval === 0;
}
