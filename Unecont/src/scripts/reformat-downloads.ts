import path from "node:path";
import { reformatDownloadedReports } from "../reformat-downloads";
import { findLatestDownloadsDir, loadDotenvFromProjectRoot } from "./cli-helpers";
import { getDefaultReportFormattingOptions } from "./report-formatting-defaults";

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  loadDotenvFromProjectRoot();

  const targetDir = argv[0] ? path.resolve(argv[0]) : findLatestDownloadsDir();
  if (!targetDir) {
    console.error(
      "Nenhum diretorio de downloads encontrado. Informe um caminho ou execute o download primeiro.",
    );
    return 1;
  }

  try {
    const formattingOptions = getDefaultReportFormattingOptions();
    const result = await reformatDownloadedReports({
      downloadsDir: targetDir,
      modelPath: formattingOptions.modelPath!,
      serviceMapPath: formattingOptions.serviceMapPath!,
      overwrite: formattingOptions.overwrite,
      logger: console,
    });

    console.log(`Origem: ${result.downloadsDir}`);
    console.log(`Normalizadas: ${result.outputDir}`);
    console.log(
      `Resumo: ${result.summary.success} sucesso, ${result.summary.failed} falhas, ${result.summary.total} total.`,
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
