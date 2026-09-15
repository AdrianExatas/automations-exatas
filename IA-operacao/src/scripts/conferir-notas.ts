import { conferirNotasUnecont } from "../conferir-notas-unecont";
import { loadEnvConfig } from "../config";
import { resolveRuntimePath } from "../project-paths";
import {
  getExcelPathArg,
  loadDotenvFromProjectRoot,
  openExcelFileDialog,
  resolveExcelPath,
} from "./cli-helpers";

function stripQuotes(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "");
}

function getMesesAnterioresArg(args: string[] = process.argv.slice(2)): number {
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--meses-anteriores") {
      const value = Number(args[index + 1]);
      return Number.isFinite(value) && value >= 0 ? value : 0;
    }
    if (arg.startsWith("--meses-anteriores=")) {
      const value = Number(arg.slice("--meses-anteriores=".length));
      return Number.isFinite(value) && value >= 0 ? value : 0;
    }
  }
  return 0;
}

function hasFlag(flag: string, args: string[] = process.argv.slice(2)): boolean {
  return args.includes(flag) || args.some((a) => a === `${flag}=true`);
}

export async function main(): Promise<number> {
  loadDotenvFromProjectRoot();
  const env = loadEnvConfig();

  const fromArg = getExcelPathArg();
  const fromEnv = stripQuotes(env.empresasExcelPath);
  const selectedExcelPath = fromArg ?? (fromEnv ? fromEnv : null) ?? openExcelFileDialog();
  const excelPath = selectedExcelPath
    ? resolveExcelPath(stripQuotes(selectedExcelPath))
    : null;

  if (!excelPath) {
    console.error(
      `Planilha nao encontrada. Selecione um arquivo valido ou verifique EMPRESAS_EXCEL_PATH (${env.empresasExcelPath}).`,
    );
    return 1;
  }

  const mesesAnteriores = getMesesAnterioresArg();
  const somenteNaoConferidos = !hasFlag("--detalhar-todas");
  const amostraCanceladas = hasFlag("--amostra-canceladas");
  // Flag documentada no plano: comportamento padrao do detalhe ja e so Nao Conferidos.
  void hasFlag("--somente-nao-conferidos");

  console.log(`Planilha: ${excelPath}`);
  console.log(`Modo: ${env.headless ? "headless" : "headful (navegador visivel)"}`);
  console.log(`Meses anteriores: ${mesesAnteriores}`);
  console.log(
    `Detalhe: ${somenteNaoConferidos ? "somente Nao Conferidos" : "todas as notas"}` +
      (amostraCanceladas ? " (+ amostra 1 cancelada)" : ""),
  );

  try {
    const result = await conferirNotasUnecont({
      credentials: {
        email: env.unecontEmail,
        senha: env.unecontSenha,
      },
      input: { excelPath },
      browser: {
        headless: env.headless,
      },
      checkpointPath: resolveRuntimePath("checkpoints", "conferencia-notas.json"),
      mesesAnteriores,
      somenteNaoConferidos,
      amostraCanceladas,
      logger: console,
      timeouts: {
        defaultTimeoutSeconds: env.defaultTimeout,
        shortTimeoutSeconds: env.shortTimeout,
        longTimeoutSeconds: env.longTimeout,
      },
      loginUrl: env.loginUrl,
      servicosTomadosUrl: env.servicosTomadosUrl,
    });

    console.log(`Saida: ${result.outputDir}`);
    console.log(`CSV: ${result.csvPath}`);
    console.log(`Nao Conferidos: ${result.naoConferidosCsvPath}`);
    console.log(`Eventos JSON: ${result.eventosJsonPath}`);
    console.log(`Eventos CSV: ${result.eventosCsvPath}`);
    console.log(`Checklist: ${result.checklistPath}`);
    console.log(
      `Resumo: ${result.summary.success} sucesso, ${result.summary.noNotas} sem notas, ` +
        `${result.summary.notFound} nao encontradas, ${result.summary.failed} falhas, ` +
        `${result.summary.skipped} puladas, ${result.summary.totalNotas} notas | ` +
        `naoConf=${result.summary.naoConferidos} canceladas=${result.summary.canceladas} ` +
        `bloqueadas=${result.summary.bloqueadasInteracao} ` +
        `R2010=${result.summary.candidatosR2010} R4020=${result.summary.candidatosR4020}`,
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
