import fs from "node:fs";
import path from "node:path";
import { launchBrowser } from "./browser/launch";
import { Checkpoint } from "./checkpoint";
import {
  DEFAULT_UNECONT_LOGIN_URL,
  DEFAULT_UNECONT_SERVICOS_TOMADOS_URL,
  type Config,
  validateConfig,
} from "./config";
import { DownloadError, EmpresaNotFoundError, NoNotasError } from "./exceptions";
import { DownloadFlow } from "./flows/download-flow";
import { LoginFlow } from "./flows/login-flow";
import { resolveEmpresasInput } from "./input";
import { resolveRuntimePath } from "./project-paths";
import { ensureWorkbookReady, type WorkbookReadyResult } from "./workbook-ready";
import type {
  DownloadBatchItemResult,
  DownloadBatchResult,
  DownloadLogger,
  DownloadUnecontOptions,
  EmpresaBatchItem,
} from "./types";

function generateRunId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 8).replace(/:/g, "-");
  return `Unecont_${date}_${time}`;
}

function buildRuntimeConfig(options: DownloadUnecontOptions): Config {
  return {
    unecontEmail: options.credentials.email,
    unecontSenha: options.credentials.senha,
    headless: options.browser?.headless ?? true,
    defaultTimeout: options.timeouts?.defaultTimeoutSeconds ?? 10,
    shortTimeout: options.timeouts?.shortTimeoutSeconds ?? 3,
    longTimeout: options.timeouts?.longTimeoutSeconds ?? 20,
    loginUrl: options.loginUrl ?? DEFAULT_UNECONT_LOGIN_URL,
    servicosTomadosUrl: options.servicosTomadosUrl ?? DEFAULT_UNECONT_SERVICOS_TOMADOS_URL,
    empresasUrl: "",
  };
}

function resolveDownloadsDir(options: DownloadUnecontOptions, runId: string): string {
  const configuredDir = options.browser?.downloadDir;
  if (configuredDir && configuredDir.trim()) {
    return path.resolve(configuredDir);
  }
  return resolveRuntimePath("downloads", runId);
}

function formatEmpresaLabel(empresa: EmpresaBatchItem): string {
  return `${empresa.codigo} - ${empresa.nome} (${empresa.cnpj})`;
}

function logMessage(
  logger: DownloadLogger | undefined,
  level: keyof DownloadLogger,
  message: string,
): void {
  if (logger) {
    logger[level](message);
    return;
  }
  const line = `${message}\n`;
  if (level === "error") process.stderr.write(line);
  else process.stdout.write(line);
}

function buildWorkbookReadySummary(result: WorkbookReadyResult): string {
  return `${result.sizeBytes} bytes, ${result.attempts} verificacoes`;
}

async function ensureDownloadedWorkbookReady(
  filePath: string,
  config: Config,
): Promise<WorkbookReadyResult> {
  const readiness = await ensureWorkbookReady(filePath, {
    timeoutMs: Math.max(config.shortTimeout * 1000, 5_000),
    pollIntervalMs: 250,
  });

  if (!readiness.stable) {
    throw new DownloadError(
      `Planilha nao estabilizou apos ${readiness.attempts} verificacoes`,
      filePath,
      "workbook_not_ready",
    );
  }

  return readiness;
}

export async function downloadUnecontBatch(
  options: DownloadUnecontOptions,
): Promise<DownloadBatchResult> {
  const config = buildRuntimeConfig(options);
  validateConfig(config);

  const logger = options.logger;
  logMessage(logger, "info", "Carregando empresas da planilha...");
  const empresas = resolveEmpresasInput(options.input);
  const runId = generateRunId();
  const downloadsDir = resolveDownloadsDir(options, runId);
  fs.mkdirSync(downloadsDir, { recursive: true });
  logMessage(
    logger,
    "info",
    `${empresas.length} empresas carregadas. Abrindo navegador (headless=${config.headless})...`,
  );

  const checkpoint = options.checkpointPath
    ? new Checkpoint(path.resolve(options.checkpointPath))
    : null;
  checkpoint?.load();

  const items: DownloadBatchItemResult[] = [];
  let success = 0;
  let noNotas = 0;
  let notFound = 0;
  let failed = 0;
  let skipped = 0;

  const { browser, page } = await launchBrowser({
    headless: config.headless,
    downloadsPath: downloadsDir,
    logger,
  });
  logMessage(logger, "info", "Navegador aberto.");

  try {
    logMessage(
      logger,
      "info",
      `Iniciando download UNECONT: ${empresas.length} empresas. Diretorio: ${downloadsDir}`,
    );
    logMessage(logger, "info", "Realizando login no UNECONT...");

    const loginFlow = new LoginFlow(page, config);
    await loginFlow.execute();

    logMessage(logger, "info", "Login concluido.");

    const downloadFlow = new DownloadFlow(page, config);

    for (const [index, empresa] of empresas.entries()) {
      const prefix = `[${index + 1}/${empresas.length}]`;
      const empresaLabel = formatEmpresaLabel(empresa);

      if (checkpoint?.isProcessed(empresa.cnpj)) {
        skipped++;
        items.push({
          empresa,
          status: "skipped",
          message: "Empresa ja processada no checkpoint",
        });
        logMessage(logger, "info", `${prefix} Pulada: ${empresaLabel} (checkpoint)`);
        continue;
      }

      logMessage(logger, "info", `${prefix} Processando ${empresaLabel}`);

      try {
        await downloadFlow.selectEmpresa(empresa.cnpj);
        await downloadFlow.navigateToServicosTomados();
        const filePath = await downloadFlow.downloadReport(
          empresa.cnpj,
          downloadsDir,
          empresa.codigo,
        );
        logMessage(logger, "info", `${prefix} Arquivo baixado: ${path.basename(filePath)}`);

        const readiness = await ensureDownloadedWorkbookReady(filePath, config);
        logMessage(
          logger,
          "info",
          `${prefix} Arquivo estabilizado: ${path.basename(filePath)} (${buildWorkbookReadySummary(readiness)})`,
        );

        checkpoint?.markSuccess(empresa.cnpj);
        success++;
        items.push({
          empresa,
          status: "success",
          message: path.basename(filePath),
          filePath,
        });
        logMessage(
          logger,
          "info",
          `${prefix} Concluida: ${empresaLabel} -> ${path.basename(filePath)}`,
        );
      } catch (error) {
        if (error instanceof EmpresaNotFoundError) {
          checkpoint?.markNotFound(empresa.cnpj);
          notFound++;
          items.push({
            empresa,
            status: "not_found",
            message: error.message,
          });
          logMessage(logger, "warn", `${prefix} Empresa nao encontrada: ${empresaLabel}`);
          continue;
        }

        if (error instanceof NoNotasError) {
          checkpoint?.markNoNotas(empresa.cnpj);
          noNotas++;
          items.push({
            empresa,
            status: "no_notas",
            message: error.message,
          });
          logMessage(logger, "warn", `${prefix} Sem notas: ${empresaLabel}`);
          continue;
        }

        checkpoint?.markFailed(empresa.cnpj);
        failed++;
        items.push({
          empresa,
          status: "failed",
          message: error instanceof Error ? error.message : String(error),
        });
        logMessage(
          logger,
          "error",
          `${prefix} Falha: ${empresaLabel} -> ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (checkpoint) {
      const checkpointStats = checkpoint.getStats();
      const completedInCheckpoint =
        checkpointStats.processed + checkpointStats.no_notas + checkpointStats.not_found;
      if (checkpointStats.failed === 0 && completedInCheckpoint >= empresas.length) {
        checkpoint.clear();
      }
    }

    logMessage(
      logger,
      "info",
      `Resumo: ${success} sucesso, ${noNotas} sem notas, ${notFound} nao encontradas, ${failed} falhas, ${skipped} puladas.`,
    );

    return {
      runId,
      downloadsDir,
      summary: {
        total: empresas.length,
        success,
        noNotas,
        notFound,
        failed,
        skipped,
      },
      items,
    };
  } finally {
    await browser.close();
  }
}
