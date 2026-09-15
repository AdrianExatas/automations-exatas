import path from "node:path";
import { chromium, type LaunchOptions } from "playwright";
import { processPortalRow } from "./portal.js";
import type { RunAutomationOptions, RunAutomationResult, RunResult } from "./types.js";
import { readInputWorkbook, writeResultWorkbook } from "./workbook.js";

export async function runAutomation(options: RunAutomationOptions): Promise<RunAutomationResult> {
  const log = options.log ?? (() => undefined);
  const inputPath = path.resolve(options.cwd, options.inputPath);
  const rows = readInputWorkbook(inputPath);

  log(`Planilha carregada: ${inputPath}`);
  log(`Total de linhas: ${rows.length}`);

  const launchOptions: LaunchOptions = {
    headless: !options.headed,
    slowMo: options.headed ? 150 : 0,
  };

  if (options.browserChannel) {
    launchOptions.channel = options.browserChannel;
  }

  const browser = await chromium.launch(launchOptions);
  const results: RunResult[] = [];
  let cancelled = false;

  try {
    for (let index = 0; index < rows.length; index += 1) {
      if (options.shouldCancel?.()) {
        cancelled = true;
        log("Execucao cancelada pelo usuario.");
        break;
      }

      const row = rows[index]!;
      const label = `Processando IE ${row.inscricaoEstadual} na SEFAZ-PI...`;
      options.onProgress?.({ current: index + 1, total: rows.length, label });
      log(`\n[linha ${row.rowNumber}] ${label}`);

      try {
        const rowResults = await processPortalRow(browser, row, options.cwd);
        results.push(...rowResults);

        const successCount = rowResults.filter((result) => result.status === "sucesso").length;
        const errorCount = rowResults.filter((result) => result.status === "erro").length;
        const ignoredCount = rowResults.filter((result) => result.status === "ignorado").length;
        log(
          `[linha ${row.rowNumber}] Concluido. Sucessos: ${successCount}. Ignorados: ${ignoredCount}. Erros: ${errorCount}.`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          rowNumber: row.rowNumber,
          codigo: row.codigo,
          empresa: row.empresa,
          cnpj: row.cnpj,
          numeroParcelamento: row.numeroParcelamento,
          parcela: row.parcela,
          vencimento: row.vencimento ?? "",
          status: "erro",
          mensagem: message,
        });
        log(`[linha ${row.rowNumber}] Erro: ${message}`);
      }
    }
  } finally {
    await browser.close();
  }

  const reportPath = await writeResultWorkbook(results, options.cwd);
  const successCount = results.filter((result) => result.status === "sucesso").length;
  const errorCount = results.filter((result) => result.status === "erro").length;
  const ignoredCount = results.filter((result) => result.status === "ignorado").length;

  log(
    `\nProcessamento PI concluido. Sucessos: ${successCount}. Ignorados: ${ignoredCount}. Erros: ${errorCount}.`,
  );
  log(`Relatorio salvo em: ${reportPath}`);

  return {
    reportPath,
    successCount,
    errorCount,
    ignoredCount,
    cancelled,
    results,
  };
}
