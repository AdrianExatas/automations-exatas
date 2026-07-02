import { buildJsonReportPath, buildOutputPath, saveFile, saveReport } from "./downloads";
import { isNonRetriablePortalError, messageOf } from "./errors";
import { buildExcelReportPath, saveExcelReport } from "./excel-report";
import { SefazHttpClient } from "./sefaz-http";
import type { Company, ReportEntry, ReportFormat, RunConfig } from "./types";

const REPORT_CHECKPOINT_INTERVAL = 5;
const PLAYWRIGHT_FALLBACK_MODULE = "./playwright-fallback";

export type RunProgress = {
  phase: "starting" | "login" | "companies" | "download" | "report" | "done";
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
  format?: ReportFormat;
};

export type RunResult = {
  entries: ReportEntry[];
  successCount: number;
  errorCount: number;
  jsonPath: string;
  excelPath: string;
  outDir: string;
};

export type RunCallbacks = {
  onLog?: (message: string) => void;
  onProgress?: (progress: RunProgress) => void;
  signal?: AbortSignal;
};

export async function runSefazDia(config: RunConfig, callbacks: RunCallbacks = {}): Promise<RunResult> {
  const http = new SefazHttpClient(config.timeoutMs, callbacks.signal);
  const entries: ReportEntry[] = [];
  const reportPaths = buildReportPaths(config);

  emit(callbacks, config, reportPaths, entries, "starting", 0, 0, `Competencia: ${config.competencia.value}`);
  log(callbacks, `Formatos: ${config.formats.join(", ")}`);
  throwIfAborted(callbacks.signal);

  emit(callbacks, config, reportPaths, entries, "login", 0, 0, "Entrando no portal SEFAZ-SE...");
  await http.login(config.user, config.password);
  throwIfAborted(callbacks.signal);

  emit(callbacks, config, reportPaths, entries, "companies", 0, 0, "Listando empresas disponiveis...");
  const companies = await http.listCompanies();
  log(callbacks, `Empresas encontradas por HTTP: ${companies.length}`);

  const selectedCompanies = config.limit ? companies.slice(0, config.limit) : companies;
  const total = selectedCompanies.length * config.formats.length;
  let current = 0;

  for (let index = 0; index < selectedCompanies.length; index += 1) {
    const company = selectedCompanies[index]!;
    log(callbacks, `[${index + 1}/${selectedCompanies.length}] ${company.inscricao} - ${company.nome}`);

    for (const format of config.formats) {
      throwIfAborted(callbacks.signal);
      emit(callbacks, config, reportPaths, entries, "download", current, total, `Baixando ${format.toUpperCase()} de ${company.nome}`, company, format);
      const entry = await processItem(http, config, company, format, callbacks.signal);
      entries.push(entry);
      current += 1;

      if (entry.status === "sucesso") {
        log(callbacks, `  ${format}: salvo em ${entry.path}`);
      } else {
        log(callbacks, `  ${format}: ${entry.mensagem}`);
      }

      emit(callbacks, config, reportPaths, entries, "download", current, total, `${current}/${total} itens processados`, company, format);
      if (isCheckpointEnabled(config) && shouldSaveCheckpoint(current, total)) {
        await saveExecutionReports(config, entries);
      }
    }
  }

  emit(callbacks, config, reportPaths, entries, "report", current, total, "Gerando relatorios de execucao...");
  const { jsonPath, excelPath } = await saveExecutionReports(config, entries);
  const successCount = entries.filter((entry) => entry.status === "sucesso").length;
  const errorCount = entries.length - successCount;
  const result = { entries, successCount, errorCount, jsonPath, excelPath, outDir: config.outDir };

  emit(callbacks, config, reportPaths, entries, "done", total, total, `Concluido. Sucessos: ${successCount}. Erros: ${errorCount}.`);
  log(callbacks, `Relatorios: ${jsonPath} | ${excelPath}`);
  return result;
}

function buildReportPaths(config: RunConfig): { jsonPath: string; excelPath: string } {
  return {
    jsonPath: buildJsonReportPath(config),
    excelPath: buildExcelReportPath(config),
  };
}

async function saveExecutionReports(config: RunConfig, entries: ReportEntry[]): Promise<{ jsonPath: string; excelPath: string }> {
  const jsonPath = await saveReport(config, entries);
  const excelPath = await saveExcelReport(config, entries);
  return { jsonPath, excelPath };
}

async function processItem(
  http: SefazHttpClient,
  config: RunConfig,
  company: Company,
  format: ReportFormat,
  signal: AbortSignal | undefined,
): Promise<ReportEntry> {
  const filePath = buildOutputPath(config, company, format);
  try {
    const result = await http.download(company, config.competencia, format);
    await saveFile(filePath, result.bytes);
    return {
      inscricao: company.inscricao,
      empresa: company.nome,
      competencia: config.competencia.value,
      formato: format,
      status: "sucesso",
      path: filePath,
      via: "http",
    };
  } catch (error) {
    if (isNonRetriablePortalError(error)) {
      return {
        inscricao: company.inscricao,
        empresa: company.nome,
        competencia: config.competencia.value,
        formato: format,
        status: "erro",
        mensagem: messageOf(error),
        via: "http",
      };
    }

    throwIfAborted(signal);
    const httpMessage = messageOf(error);
    const fallbackEntry = await tryPlaywrightFallback(config, company, format, filePath, signal);
    if (fallbackEntry) {
      return fallbackEntry;
    }

    return {
      inscricao: company.inscricao,
      empresa: company.nome,
      competencia: config.competencia.value,
      formato: format,
      status: "erro",
      mensagem: `Falha HTTP e fallback de navegador indisponivel: ${httpMessage}`,
      via: "http",
    };
  }
}

async function tryPlaywrightFallback(
  config: RunConfig,
  company: Company,
  format: ReportFormat,
  filePath: string,
  signal: AbortSignal | undefined,
): Promise<ReportEntry | undefined> {
  if (!isPlaywrightFallbackEnabled(config)) {
    return undefined;
  }

  try {
    throwIfAborted(signal);
    const { downloadViaPlaywright, saveFallbackResult } = await import(PLAYWRIGHT_FALLBACK_MODULE);
    const result = await downloadViaPlaywright(config, company, config.competencia, format);
    throwIfAborted(signal);
    await saveFallbackResult(filePath, result);
    return {
      inscricao: company.inscricao,
      empresa: company.nome,
      competencia: config.competencia.value,
      formato: format,
      status: "sucesso",
      path: filePath,
      via: "playwright",
    };
  } catch (fallbackError) {
    throwIfAborted(signal);
    return {
      inscricao: company.inscricao,
      empresa: company.nome,
      competencia: config.competencia.value,
      formato: format,
      status: "erro",
      mensagem: `Falha HTTP e fallback Playwright falhou: ${messageOf(fallbackError)}`,
      via: "playwright",
    };
  }
}

function emit(
  callbacks: RunCallbacks,
  config: RunConfig,
  reportPaths: { jsonPath: string; excelPath: string },
  entries: ReportEntry[],
  phase: RunProgress["phase"],
  current: number,
  total: number,
  message: string,
  company?: Company,
  format?: ReportFormat,
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
    outDir: config.outDir,
    jsonPath: reportPaths.jsonPath,
    excelPath: reportPaths.excelPath,
    company,
    format,
  });
  log(callbacks, message);
}

function log(callbacks: RunCallbacks, message: string): void {
  callbacks.onLog?.(message);
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new Error("Execucao cancelada pelo usuario.");
  }
}

export function shouldSaveCheckpoint(processed: number, total: number, interval = REPORT_CHECKPOINT_INTERVAL): boolean {
  return processed === 1 || processed === total || processed % interval === 0;
}

export function isCheckpointEnabled(config: Pick<RunConfig, "checkpointEnabled">): boolean {
  return config.checkpointEnabled ?? true;
}

export function isPlaywrightFallbackEnabled(config: RunConfig): boolean {
  return config.headless !== undefined;
}
