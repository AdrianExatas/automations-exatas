import { downloadUnecontBatch } from "../download-unecont";
import { loadEnvConfig } from "../config";
import { resolveRuntimePath } from "../project-paths";
import {
  getExcelPathArg,
  loadDotenvFromProjectRoot,
  openExcelFileDialog,
  resolveExcelPath,
} from "./cli-helpers";
import { getDefaultReportFormattingOptions } from "./report-formatting-defaults";

export async function main(): Promise<number> {
  loadDotenvFromProjectRoot();
  const env = loadEnvConfig();
  const selectedExcelPath = getExcelPathArg() ?? openExcelFileDialog();
  const excelPath = selectedExcelPath ? resolveExcelPath(selectedExcelPath) : resolveExcelPath(env.empresasExcelPath);

  if (!excelPath) {
    console.error(
      `Planilha nao encontrada. Selecione um arquivo valido ou verifique EMPRESAS_EXCEL_PATH (${env.empresasExcelPath}).`,
    );
    return 1;
  }

  try {
    const result = await downloadUnecontBatch({
      credentials: {
        email: env.unecontEmail,
        senha: env.unecontSenha,
      },
      input: { excelPath },
      browser: {
        headless: env.headless,
      },
      checkpointPath: resolveRuntimePath("checkpoints", "download-batch.json"),
      logger: console,
      timeouts: {
        defaultTimeoutSeconds: env.defaultTimeout,
        shortTimeoutSeconds: env.shortTimeout,
        longTimeoutSeconds: env.longTimeout,
      },
      loginUrl: env.loginUrl,
      servicosTomadosUrl: env.servicosTomadosUrl,
      reportFormatting: getDefaultReportFormattingOptions(),
    });

    console.log(`Downloads: ${result.downloadsDir}`);
    if (result.normalizedDir) {
      console.log(`Normalizadas: ${result.normalizedDir}`);
    }
    if (result.reportPath) {
      console.log(`Relatorio: ${result.reportPath}`);
    }
    console.log(
      `Resumo: ${result.summary.success} sucesso, ${result.summary.noNotas} sem notas, ${result.summary.notFound} nao encontradas, ${result.summary.failed} falhas, ${result.summary.skipped} puladas.`,
    );

    return result.summary.failed > 0 ? 1 : 0;
  } catch (error) {
    console.error("Erro na execucao:", error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (require.main === module) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error("Erro inesperado:", error);
      process.exit(1);
    });
}
