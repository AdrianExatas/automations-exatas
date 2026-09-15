import path from "node:path";
import { chromium, type LaunchOptions } from "playwright";
import { processPortalRow } from "./portal.js";
import type { RunAutomationOptions, RunAutomationResult, RunResult } from "./types.js";
import { buildExecutionOutputDir } from "./utils.js";
import { readInputWorkbook, writeResultWorkbook } from "./workbook.js";

export const DEFAULT_OUTPUT_DIR = path.join("output", "downloads");

export async function runAutomation(options: RunAutomationOptions): Promise<RunAutomationResult> {
  const log = options.log ?? (() => undefined);
  const inputPath = path.resolve(options.cwd, options.inputPath);
  const outputBaseDir = path.resolve(options.cwd, options.outputDir ?? DEFAULT_OUTPUT_DIR);
  const outputRoot = buildExecutionOutputDir(outputBaseDir);
  const rows = readInputWorkbook(inputPath);

  log(`Planilha carregada: ${inputPath}`);
  log(`Pasta de downloads: ${outputRoot}`);
  log(`Total de empresas: ${rows.length}`);

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
      const label = `Processando ${row.empresa} na SEFAZ-AL...`;
      options.onProgress?.({ current: index + 1, total: rows.length, label });
      log(`\n[linha ${row.rowNumber}] ${label}`);

      try {
        const rowResults = await processPortalRow(browser, row, outputRoot);
        results.push(...rowResults);

        const successCount = rowResults.filter((result) => result.status === "sucesso").length;
        const errorCount = rowResults.filter((result) => result.status === "erro").length;
        log(
          `[linha ${row.rowNumber}] Concluido. Sucessos: ${successCount}. Erros: ${errorCount}.`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          rowNumber: row.rowNumber,
          empresa: row.empresa,
          usuario: row.usuario,
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

  log(`\nProcessamento AL concluido. Sucessos: ${successCount}. Erros: ${errorCount}.`);
  log(`Relatorio salvo em: ${reportPath}`);

  return {
    reportPath,
    successCount,
    errorCount,
    ignoredCount: 0,
    cancelled,
    results,
  };
}
