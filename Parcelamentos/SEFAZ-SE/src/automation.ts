import path from "node:path";
import { chromium, type LaunchOptions } from "playwright";
import { processPortalRow } from "./portal.js";
import type { RunAutomationOptions, RunAutomationResult, RunResult } from "./types.js";
import { readInputWorkbook, writeResultWorkbook } from "./workbook.js";

export async function runAutomation(options: RunAutomationOptions): Promise<RunAutomationResult> {
  const inputPath = path.resolve(options.cwd, options.inputPath);
  const rows = readInputWorkbook(inputPath);
  const log = options.log ?? (() => undefined);

  log(`Planilha carregada: ${inputPath}`);
  log(`Total de linhas para processar: ${rows.length}`);

  const launchOptions: LaunchOptions = {
    headless: !options.headed,
    slowMo: options.headed ? 150 : 0,
  };

  if (options.browserChannel) {
    launchOptions.channel = options.browserChannel;
  }

  const browser = await chromium.launch(launchOptions);
  const results: RunResult[] = [];

  try {
    for (const row of rows) {
      log(`\n[linha ${row.rowNumber}] Processando codigo ${row.codigo}...`);

      try {
        const rowResults = await processPortalRow(browser, row, options.cwd);
        results.push(...rowResults);

        const successCount = rowResults.filter((result) => result.status === "sucesso").length;
        const errorCount = rowResults.filter((result) => result.status === "erro").length;
        log(
          `[linha ${row.rowNumber}] Concluido. Parcelas com sucesso: ${successCount}. Parcelas com erro: ${errorCount}.`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          rowNumber: row.rowNumber,
          codigo: row.codigo,
          empresa: row.empresa,
          cnpj: row.cnpj,
          vencimento: "",
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

  log(`\nProcessamento concluido. Sucessos: ${successCount}. Erros: ${errorCount}.`);
  log(`Relatorio salvo em: ${reportPath}`);

  return {
    reportPath,
    successCount,
    errorCount,
  };
}
