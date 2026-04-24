import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";
import { processPortalRow } from "./portal.js";
import type { CliOptions, RunResult } from "./types.js";
import { readInputWorkbook, writeResultWorkbook } from "./workbook.js";

async function main(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const inputPath = path.resolve(cwd, options.inputPath);
  const rows = readInputWorkbook(inputPath);

  console.log(`Planilha carregada: ${inputPath}`);
  console.log(`Total de linhas para processar: ${rows.length}`);

  const browser = await chromium.launch({
    headless: !options.headed,
    slowMo: options.headed ? 150 : 0,
  });

  const results: RunResult[] = [];

  try {
    for (const row of rows) {
      console.log(`\n[linha ${row.rowNumber}] Processando codigo ${row.codigo}...`);

      try {
        const rowResults = await processPortalRow(browser, row, cwd);
        results.push(...rowResults);

        const successCount = rowResults.filter((result) => result.status === "sucesso").length;
        const errorCount = rowResults.filter((result) => result.status === "erro").length;
        console.log(
          `[linha ${row.rowNumber}] Concluido. Sucesso: ${successCount}. Erros: ${errorCount}.`,
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
          vencimento: row.vencimento,
          status: "erro",
          mensagem: message,
        });
        console.error(`[linha ${row.rowNumber}] Erro: ${message}`);
      }
    }
  } finally {
    await browser.close();
  }

  const reportPath = await writeResultWorkbook(results, cwd);
  const successCount = results.filter((result) => result.status === "sucesso").length;
  const errorCount = results.filter((result) => result.status === "erro").length;

  console.log(`\nProcessamento concluido. Sucessos: ${successCount}. Erros: ${errorCount}.`);
  console.log(`Relatorio salvo em: ${reportPath}`);

  if (errorCount > 0) {
    process.exitCode = 1;
  }
}

function parseCliArgs(args: string[]): CliOptions {
  let inputPath = "model.xlsx";
  let headed = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--input") {
      inputPath = args[index + 1] ?? inputPath;
      index += 1;
      continue;
    }

    if (arg === "--headed") {
      headed = true;
      continue;
    }
  }

  return { inputPath, headed };
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
