import { loadEnvConfig } from "../config";
import { uploadOnvioBatch } from "../upload-onvio-batch";
import {
  findLatestNormalizedDir,
  loadDotenvFromProjectRoot,
  resolveExcelPath,
} from "./cli-helpers";

export async function main(): Promise<number> {
  loadDotenvFromProjectRoot();
  const env = loadEnvConfig();
  const excelPath = resolveExcelPath(env.empresasExcelPath);

  if (!excelPath) {
    console.error(
      `Planilha principal nao encontrada. Verifique EMPRESAS_EXCEL_PATH (${env.empresasExcelPath}).`,
    );
    return 1;
  }

  const attachmentsDir = env.unecontUploadDir || findLatestNormalizedDir();
  if (!attachmentsDir) {
    console.error(
      "Nenhum diretorio normalizado encontrado. Configure UNECONT_UPLOAD_DIR ou execute a normalizacao antes do upload.",
    );
    return 1;
  }

  try {
    const result = await uploadOnvioBatch({
      token: env.onvioUdsToken,
      input: { excelPath },
      attachmentsDir,
      bdApiBaseUrl: env.bdApiBaseUrl,
      defaults: {
        clientId: env.onvioClientId || undefined,
        requesterId: env.onvioRequesterId || undefined,
        departmentId: env.onvioDepartmentId || undefined,
        departmentName: env.onvioDepartmentName || undefined,
      },
    });

    for (const warning of result.warnings) {
      console.warn(`[AVISO] ${warning}`);
    }

    console.log(
      `Resumo: ${result.summary.success} enviadas, ${result.summary.failed} falhas, ${result.summary.skipped} puladas.`,
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
