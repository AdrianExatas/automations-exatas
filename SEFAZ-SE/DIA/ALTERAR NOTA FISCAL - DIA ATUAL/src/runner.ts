import { messageOf } from "./errors";
import { NotaFiscalPlaywrightClient } from "./nf-playwright";
import { buildReportPaths, saveExecutionReports } from "./nf-report";
import type { NotaFiscalAlteracaoEntry, NotaFiscalAlteracaoInput, RunAlterarNotaFiscalConfig } from "./nf-types";
import { readNotaFiscalSpreadsheet } from "./spreadsheet";

const REPORT_CHECKPOINT_INTERVAL = 5;

export type RunProgress = {
  phase: "starting" | "spreadsheet" | "login" | "process" | "report" | "done";
  current: number;
  total: number;
  message: string;
  successCount: number;
  errorCount: number;
  processedCount: number;
  outDir: string;
  jsonPath: string;
  excelPath: string;
  item?: NotaFiscalAlteracaoInput;
};

export type RunResult = {
  entries: NotaFiscalAlteracaoEntry[];
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

export async function runAlterarNotaFiscal(
  config: RunAlterarNotaFiscalConfig,
  callbacks: RunCallbacks = {},
): Promise<RunResult> {
  const entries: NotaFiscalAlteracaoEntry[] = [];
  const reportPaths = buildReportPaths(config);

  emit(callbacks, config, reportPaths, entries, "starting", 0, 0, "Preparando execucao...");
  throwIfAborted(callbacks.signal);

  emit(callbacks, config, reportPaths, entries, "spreadsheet", 0, 0, "Lendo planilha...");
  const allItems = readNotaFiscalSpreadsheet(config.spreadsheetPath);
  const items = config.limit ? allItems.slice(0, config.limit) : allItems;
  log(callbacks, `Linhas encontradas: ${items.length}`);
  log(callbacks, `Linhas para alterar no portal: ${items.filter((item) => item.acao !== "ignorar").length}`);
  if (config.dryRun) {
    log(callbacks, "Modo dry-run ativo: o Ok final de gravacao nao sera clicado.");
  }
  throwIfAborted(callbacks.signal);

  const client = new NotaFiscalPlaywrightClient(config);
  let clientStarted = false;
  try {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]!;
      throwIfAborted(callbacks.signal);
      emit(
        callbacks,
        config,
        reportPaths,
        entries,
        "process",
        index,
        items.length,
        `Processando linha ${item.rowNumber}: ${item.inscricaoMunicipal} - ${item.etiqueta}`,
        item,
      );

      const entry = item.acao === "ignorar"
        ? buildEntry(item, "ignorado", "Linha verde: sem alteracao no portal.")
        : await processItem(client, item, async () => {
          if (!clientStarted) {
            emit(callbacks, config, reportPaths, entries, "login", index, items.length, "Entrando no portal SEFAZ-SE...");
            await client.start();
            clientStarted = true;
          }
        });
      entries.push(entry);
      log(callbacks, logMessage(entry));

      emit(callbacks, config, reportPaths, entries, "process", index + 1, items.length, `${index + 1}/${items.length} linhas processadas`, item);
      if (shouldSaveCheckpoint(index + 1, items.length)) {
        await saveExecutionReports(config, entries);
      }
    }
  } finally {
    await client.close();
  }

  emit(callbacks, config, reportPaths, entries, "report", items.length, items.length, "Gerando relatorios de execucao...");
  const { jsonPath, excelPath } = await saveExecutionReports(config, entries);
  const successCount = entries.filter((entry) => entry.status === "sucesso").length;
  const errorCount = entries.filter((entry) => entry.status === "erro").length;
  const ignoredCount = entries.filter((entry) => entry.status === "ignorado").length;
  const result = { entries, successCount, errorCount, jsonPath, excelPath, outDir: config.outDir };
  emit(callbacks, config, { jsonPath, excelPath }, entries, "done", items.length, items.length, `Concluido. Sucessos: ${successCount}. Erros: ${errorCount}. Ignoradas: ${ignoredCount}.`);
  log(callbacks, `Relatorios: ${jsonPath} | ${excelPath}`);
  return result;
}

async function processItem(
  client: NotaFiscalPlaywrightClient,
  item: NotaFiscalAlteracaoInput,
  ensureStarted: () => Promise<void>,
): Promise<NotaFiscalAlteracaoEntry> {
  try {
    await ensureStarted();
    const mensagem = await client.process(item);
    return buildEntry(item, "sucesso", mensagem);
  } catch (error) {
    return buildEntry(item, "erro", messageOf(error));
  }
}

function buildEntry(
  item: NotaFiscalAlteracaoInput,
  status: NotaFiscalAlteracaoEntry["status"],
  mensagem?: string,
): NotaFiscalAlteracaoEntry {
  return {
    inscricaoMunicipal: item.inscricaoMunicipal,
    nomeEmpresa: item.nomeEmpresa,
    etiqueta: item.etiqueta,
    icmsNovo: item.icmsNovo,
    icmsAtual: item.icmsAtual,
    recolhimentoNovo: item.recolhimentoNovo,
    recolhimentoAtual: item.recolhimentoAtual,
    acao: item.acao,
    corRgb: item.corRgb,
    observacao: item.observacao,
    adiar: item.adiar,
    rowNumber: item.rowNumber,
    status,
    mensagem,
    timestamp: new Date().toISOString(),
  };
}

function logMessage(entry: NotaFiscalAlteracaoEntry): string {
  switch (entry.status) {
    case "sucesso":
      return `  sucesso: ${entry.etiqueta}`;
    case "ignorado":
      return `  ignorado: ${entry.etiqueta}`;
    case "erro":
      return `  erro: ${entry.mensagem}`;
  }
}

function emit(
  callbacks: RunCallbacks,
  config: RunAlterarNotaFiscalConfig,
  reportPaths: { jsonPath: string; excelPath: string },
  entries: NotaFiscalAlteracaoEntry[],
  phase: RunProgress["phase"],
  current: number,
  total: number,
  message: string,
  item?: NotaFiscalAlteracaoInput,
): void {
  callbacks.onProgress?.({
    phase,
    current,
    total,
    message,
    successCount: entries.filter((entry) => entry.status === "sucesso").length,
    errorCount: entries.filter((entry) => entry.status === "erro").length,
    processedCount: entries.length,
    outDir: config.outDir,
    jsonPath: reportPaths.jsonPath,
    excelPath: reportPaths.excelPath,
    item,
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
