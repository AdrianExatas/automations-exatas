import { loadEnvConfig } from "../config";
import { uploadOnvioBatch } from "../upload-onvio-batch";
import {
  findLatestNormalizedDir,
  loadDotenvFromProjectRoot,
  resolveExcelPath,
} from "./cli-helpers";

interface UploadCliFlags {
  skipAttachments: boolean;
  dryRun: boolean;
}

function parseUploadCliArgs(argv: string[]): UploadCliFlags {
  return {
    skipAttachments: argv.includes("--sem-anexos"),
    dryRun: argv.includes("--dry-run"),
  };
}

function formatEmpresaLabel(empresa: {
  codigo: string;
  nome: string;
  cnpj: string;
}): string {
  return [empresa.codigo, empresa.nome || empresa.cnpj].filter(Boolean).join(" - ");
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  loadDotenvFromProjectRoot();
  const env = loadEnvConfig();
  const cliFlags = parseUploadCliArgs(argv);
  const excelPath = resolveExcelPath(env.empresasExcelPath);
  const skipAttachments = cliFlags.skipAttachments || env.onvioSkipAttachments;
  const dryRun = cliFlags.dryRun || env.onvioDryRun;

  if (!excelPath) {
    console.error(
      `Planilha principal nao encontrada. Verifique EMPRESAS_EXCEL_PATH (${env.empresasExcelPath}).`,
    );
    return 1;
  }

  const attachmentsDir: string | undefined = skipAttachments
    ? undefined
    : env.unecontUploadDir || findLatestNormalizedDir() || undefined;
  if (!skipAttachments && !attachmentsDir) {
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
      attachmentsMode: skipAttachments ? "none" : "required",
      dryRun,
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

    if (dryRun) {
      for (const item of result.items) {
        const empresaLabel = formatEmpresaLabel(item.empresa);
        const prefix = item.status === "failed" ? "[ERRO]" : "[PREVIEW]";
        const detail = item.message ?? "Pre-validacao concluida.";
        console.log(`${prefix} ${empresaLabel}: ${detail}`);

        for (const warning of item.warnings ?? []) {
          console.warn(`[AVISO] ${empresaLabel}: ${warning}`);
        }
      }
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
