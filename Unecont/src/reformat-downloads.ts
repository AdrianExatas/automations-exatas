import fs from "node:fs";
import path from "node:path";
import { resolveRuntimePath } from "./project-paths";
import { formatDownloadedReport } from "./report-formatter";
import type {
  ReformatDownloadedReportItemResult,
  ReformatDownloadedReportsOptions,
  ReformatDownloadedReportsResult,
  ReportValidationResult,
} from "./types";

function buildValidationSummary(result: ReportValidationResult): string {
  return `${result.filledCount} descricoes preenchidas, ${result.missingMappedCount} inconsistencias mapeaveis, ${result.missingUnmappedCount} sem mapa`;
}

function buildConsistencyMessage(fileName: string, result: ReportValidationResult): string {
  const lines = result.issues
    .filter((issue) => issue.reason === "missing_mapped")
    .slice(0, 3)
    .map((issue) => `linha ${issue.rowNumber} (${issue.serviceItem})`);
  const suffix =
    result.missingMappedCount > lines.length
      ? ` e mais ${result.missingMappedCount - lines.length}`
      : "";

  return `Falha de consistencia em ${fileName}: ${result.missingMappedCount} linhas mapeaveis sem descricao${lines.length ? ` [${lines.join(", ")}${suffix}]` : ""}.`;
}

function emptyResult(
  filePath: string,
  message: string,
): ReformatDownloadedReportItemResult {
  return {
    filePath,
    status: "failed",
    warnings: [],
    message,
    filledCount: 0,
    missingMappedCount: 0,
    missingUnmappedCount: 0,
    issues: [],
  };
}

function resolveOutputDir(downloadsDir: string, outputDir?: string): string {
  if (outputDir?.trim()) {
    return path.resolve(outputDir);
  }

  return resolveRuntimePath("normalized", path.basename(downloadsDir));
}

export async function reformatDownloadedReports(
  options: ReformatDownloadedReportsOptions,
): Promise<ReformatDownloadedReportsResult> {
  const downloadsDir = path.resolve(options.downloadsDir);
  const outputDir = resolveOutputDir(downloadsDir, options.outputDir);
  const logger = options.logger;

  if (!fs.existsSync(downloadsDir)) {
    throw new Error(`Diretorio de downloads nao encontrado: ${downloadsDir}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const files = fs
    .readdirSync(downloadsDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.toLowerCase().endsWith(".xlsx") &&
        !entry.name.startsWith("~$"),
    )
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const items: ReformatDownloadedReportItemResult[] = [];
  let success = 0;
  let failed = 0;

  logger?.info(`Iniciando reformatacao de ${files.length} planilhas em ${downloadsDir}`);
  logger?.info(`Diretorio de saida normalizada: ${outputDir}`);

  for (const fileName of files) {
    const sourcePath = path.join(downloadsDir, fileName);
    const targetPath = path.join(outputDir, fileName);

    try {
      logger?.info(`Formatando planilha: ${fileName}`);
      if (sourcePath !== targetPath) {
        fs.copyFileSync(sourcePath, targetPath);
      }

      const result = await formatDownloadedReport(targetPath, {
        enabled: true,
        modelPath: options.modelPath,
        serviceMapPath: options.serviceMapPath,
        overwrite: options.overwrite ?? true,
      });

      for (const warning of result.warnings) {
        logger?.warn(`Aviso na formatacao ${fileName}: ${warning}`);
      }

      logger?.info(`Planilha validada: ${fileName} (${buildValidationSummary(result)})`);

      if (result.missingMappedCount > 0) {
        const message = buildConsistencyMessage(fileName, result);
        logger?.error(message);
        failed++;
        items.push({
          filePath: result.outputPath,
          status: "failed",
          warnings: result.warnings,
          message,
          filledCount: result.filledCount,
          missingMappedCount: result.missingMappedCount,
          missingUnmappedCount: result.missingUnmappedCount,
          issues: result.issues,
        });
        continue;
      }

      success++;
      items.push({
        filePath: result.outputPath,
        status: "success",
        warnings: result.warnings,
        filledCount: result.filledCount,
        missingMappedCount: result.missingMappedCount,
        missingUnmappedCount: result.missingUnmappedCount,
        issues: result.issues,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Erro desconhecido ao reformatar ${fileName}`;
      logger?.error(`Falha ao reformatar ${fileName}: ${message}`);
      failed++;
      items.push(emptyResult(targetPath, message));
    }
  }

  logger?.info(
    `Resumo reformatacao: ${success} sucesso, ${failed} falhas, ${files.length} total.`,
  );

  return {
    downloadsDir,
    outputDir,
    summary: {
      total: files.length,
      success,
      failed,
    },
    items,
  };
}
