import path from "node:path";
import { chromium, type Browser, type LaunchOptions } from "playwright";
import { HttpPortalClient, HttpPortalUnsupportedError } from "./http-client.js";
import { processPortalRow } from "./portal.js";
import type { AutomationTransport, RunAutomationOptions, RunAutomationResult, RunResult } from "./types.js";
import { readInputWorkbook, writeResultWorkbook } from "./workbook.js";

export async function runAutomation(options: RunAutomationOptions): Promise<RunAutomationResult> {
  const inputPath = path.resolve(options.cwd, options.inputPath);
  const rows = readInputWorkbook(inputPath);
  const log = options.log ?? (() => undefined);
  const transport = options.transport ?? "browser";

  log(`Planilha carregada: ${inputPath}`);
  log(`Total de linhas para processar: ${rows.length}`);
  log(`Transporte: ${transport}`);

  const launchOptions: LaunchOptions = {
    headless: !options.headed,
    slowMo: options.headed ? 150 : 0,
  };

  if (options.browserChannel) {
    launchOptions.channel = options.browserChannel;
  }

  const browserHolder: { browser: Browser | null } = { browser: null };
  const getBrowser = async (): Promise<Browser> => {
    browserHolder.browser ??= await chromium.launch(launchOptions);
    return browserHolder.browser;
  };
  const httpClient = new HttpPortalClient({
    cwd: options.cwd,
    mapDir: options.mapDir,
  });
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
      const label = `Processando IE ${row.inscricaoEstadual} na SEFAZ-SE...`;
      options.onProgress?.({ current: index + 1, total: rows.length, label });
      log(`\n[linha ${row.rowNumber}] ${label}`);

      try {
        const rowResults = await processRowByTransport({
          transport,
          row,
          cwd: options.cwd,
          httpClient,
          getBrowser,
          log: (message) => log(`[linha ${row.rowNumber}] ${message}`),
        });
        results.push(...rowResults);

        const successCount = rowResults.filter((result) => result.status === "sucesso").length;
        const errorCount = rowResults.filter((result) => result.status === "erro").length;
        const ignoredCount = rowResults.filter((result) => result.status === "ignorado").length;
        log(
          `[linha ${row.rowNumber}] Concluido. Parcelas com sucesso: ${successCount}. Parcelas ignoradas: ${ignoredCount}. Parcelas com erro: ${errorCount}.`,
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
    const browserToClose = browserHolder.browser;
    if (browserToClose) {
      await browserToClose.close();
    }
  }

  const reportPath = await writeResultWorkbook(results, options.cwd);
  const successCount = results.filter((result) => result.status === "sucesso").length;
  const errorCount = results.filter((result) => result.status === "erro").length;
  const ignoredCount = results.filter((result) => result.status === "ignorado").length;

  log(`\nProcessamento concluido. Sucessos: ${successCount}. Ignorados: ${ignoredCount}. Erros: ${errorCount}.`);
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

async function processRowByTransport(options: {
  transport: AutomationTransport;
  row: ReturnType<typeof readInputWorkbook>[number];
  cwd: string;
  httpClient: HttpPortalClient;
  getBrowser: () => Promise<Browser>;
  log: (message: string) => void;
}): Promise<RunResult[]> {
  if (options.transport === "browser") {
    return processPortalRow(await options.getBrowser(), options.row, options.cwd, {
      resultTransport: "browser",
    });
  }

  if (options.transport === "http") {
    return options.httpClient.processRow(options.row);
  }

  try {
    const httpResults = await options.httpClient.processRow(options.row);
    const shouldFallback = httpResults.length > 0
      && httpResults.every((result) => result.status === "erro" && result.transport === "http");

    if (!shouldFallback) {
      return httpResults;
    }

    const message = httpResults.map((result) => result.mensagem).filter(Boolean).join(" | ");
    options.log(`HTTP falhou; usando fallback browser: ${message}`);
  } catch (error) {
    if (!(error instanceof HttpPortalUnsupportedError)) {
      options.log(`HTTP falhou; usando fallback browser: ${error instanceof Error ? error.message : String(error)}`);
    } else {
      options.log(`HTTP indisponivel; usando fallback browser: ${error.message}`);
    }
  }

  const fallbackResults = await processPortalRow(await options.getBrowser(), options.row, options.cwd, {
    resultTransport: "http_fallback_browser",
  });
  return fallbackResults.map((result) => ({ ...result, transport: result.transport ?? "http_fallback_browser" }));
}
