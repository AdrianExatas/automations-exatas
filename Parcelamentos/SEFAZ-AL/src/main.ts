import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { processPortalRow } from "./portal.js";
import type { CliOptions, RunResult } from "./types.js";
import { buildExecutionOutputDir } from "./utils.js";
import { readInputWorkbook, writeResultWorkbook } from "./workbook.js";

export const DEFAULT_INPUT_PATH = "model.xlsx";
export const DEFAULT_OUTPUT_DIR = path.join("output", "downloads");

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const options = parseCliArgs(argv);
  const cwd = process.cwd();
  const inputPath = path.resolve(cwd, options.inputPath);
  const outputBaseDir = resolveOutputDir(cwd, options.outputDir);
  const outputRoot = buildExecutionOutputDir(outputBaseDir);
  const rows = readInputWorkbook(inputPath);

  console.log(`Planilha carregada: ${inputPath}`);
  console.log(`Raiz de downloads: ${outputBaseDir}`);
  console.log(`Pasta desta execucao: ${outputRoot}`);
  console.log(`Total de empresas para processar: ${rows.length}`);

  const browser = await chromium.launch({
    headless: !options.headed,
    slowMo: options.headed ? 150 : 0,
  });

  const results: RunResult[] = [];

  try {
    for (const row of rows) {
      console.log(`\n[linha ${row.rowNumber}] Processando empresa ${row.empresa}...`);

      try {
        const rowResults = await processPortalRow(browser, row, outputRoot);
        results.push(...rowResults);

        const successCount = rowResults.filter((result) => result.status === "sucesso").length;
        const errorCount = rowResults.filter((result) => result.status === "erro").length;
        console.log(
          `[linha ${row.rowNumber}] Concluido. Parcelamentos com sucesso: ${successCount}. Parcelamentos com erro: ${errorCount}.`,
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

export function parseCliArgs(args: string[]): CliOptions {
  let inputPath = DEFAULT_INPUT_PATH;
  let outputDir = DEFAULT_OUTPUT_DIR;
  let headed = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--input") {
      inputPath = args[index + 1] ?? inputPath;
      index += 1;
      continue;
    }

    if (arg === "--output") {
      outputDir = args[index + 1] ?? outputDir;
      index += 1;
      continue;
    }

    if (arg === "--headed") {
      headed = true;
    }
  }

  return { inputPath, outputDir, headed };
}

export function resolveOutputDir(cwd: string, outputDir = DEFAULT_OUTPUT_DIR): string {
  return path.resolve(cwd, outputDir);
}

const executedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (executedFilePath && pathToFileURL(executedFilePath).href === import.meta.url) {
  main().catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
