import fs from "node:fs";
import path from "node:path";
import { type EnvConfig, loadEnvConfig } from "../config";
import { OnvioHttpClientUsersProvider } from "../onvio-http-client-users-provider";
import { OnvioHttpCompaniesProvider } from "../onvio-companies-provider";
import { updatePlanilhaOperacional } from "../update-planilha-operacional";
import { loadDotenvFromProjectRoot } from "./cli-helpers";

interface UpdatePlanilhaOperacionalCliFlags {
  operacionalPath?: string;
  referenceMonth?: string;
  outputDir?: string;
  force?: boolean;
  headless?: boolean;
}

function parseValueArg(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index >= 0) {
    const raw = argv[index + 1];
    return raw && !raw.startsWith("--") ? raw.trim() : undefined;
  }

  const prefixed = argv.find((arg) => arg.startsWith(`${flag}=`));
  if (!prefixed) return undefined;
  const value = prefixed.slice(flag.length + 1).trim();
  return value || undefined;
}

function parseBooleanArg(argv: string[], flag: string): boolean | undefined {
  if (argv.includes(flag)) return true;
  const prefixed = argv.find((arg) => arg.startsWith(`${flag}=`));
  if (!prefixed) return undefined;
  const value = prefixed.slice(flag.length + 1).trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function parseCliArgs(argv: string[]): UpdatePlanilhaOperacionalCliFlags {
  return {
    operacionalPath: parseValueArg(argv, "--operacional"),
    referenceMonth: parseValueArg(argv, "--referencia"),
    outputDir: parseValueArg(argv, "--output-dir"),
    force: argv.includes("--force"),
    headless: parseBooleanArg(argv, "--headless"),
  };
}

function printUsage(): void {
  console.error(
    [
      "Uso:",
      "bun run update-planilha-operacional",
      "",
      "Opcionais:",
      '--operacional "assets/planilha/planilha-operacional-maio-atualizada.xlsx"',
      '--referencia "06/2026"',
      '--output-dir "runtime/planilhas-operacionais/2026-06"',
      "--force",
      "--headless=false",
    ].join("\n"),
  );
}

function resolveArtifactPathForRead(): string {
  const explicit = process.env.ONVIO_AUTH_ARTIFACT_PATH?.trim();
  if (explicit) {
    return path.isAbsolute(explicit) ? explicit : path.resolve(process.cwd(), explicit);
  }

  let current = path.resolve(process.cwd());
  while (true) {
    const candidateDir = path.join(current, "shared", "onvio-auth");
    if (fs.existsSync(path.join(candidateDir, "package.json"))) {
      return path.join(candidateDir, "runtime", "latest-auth.json");
    }

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return path.resolve(process.cwd(), "shared", "onvio-auth", "runtime", "latest-auth.json");
}

function readCachedUdsLongToken(): string {
  try {
    const artifactPath = resolveArtifactPathForRead();
    if (!fs.existsSync(artifactPath)) return "";
    const artifacts = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as {
      onvio?: { udsLongToken?: string };
    };
    return artifacts.onvio?.udsLongToken?.trim() ?? "";
  } catch {
    return "";
  }
}

async function refreshOnvioTokenForUpdate(): Promise<string> {
  const { refreshUdsLongTokenForUpload } = await import("../onvio-uds-refresh");
  return refreshUdsLongTokenForUpload();
}

function canRefreshOnvioToken(env: EnvConfig): boolean {
  return env.onvioAutoRefreshToken && Boolean(env.onvioEmail.trim() && env.onvioPassword.trim());
}

async function resolveInitialOnvioToken(env: EnvConfig): Promise<string> {
  const explicitToken = env.onvioUdsToken.trim();
  if (explicitToken) return explicitToken;

  const cachedToken = readCachedUdsLongToken();
  if (cachedToken) return cachedToken;

  if (canRefreshOnvioToken(env)) {
    console.log("[Onvio] Token ausente; renovando UDSLongToken antes da atualizacao.");
    return refreshOnvioTokenForUpdate();
  }

  return "";
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  loadDotenvFromProjectRoot();
  const env = loadEnvConfig();
  const flags = parseCliArgs(argv);

  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    return 0;
  }

  const onvioToken = await resolveInitialOnvioToken(env);
  if (!onvioToken) {
    console.error(
      "ONVIO_UDS_TOKEN e obrigatorio para buscar usuarios do cliente por HTTP. Defina no .env ou ative ONVIO_AUTO_REFRESH_TOKEN com ONVIO_EMAIL/ONVIO_PASSWORD.",
    );
    return 1;
  }

  if (!env.bitrixCompetenciasUrl.trim()) {
    console.error(
      "BITRIX_COMPETENCIAS_URL e obrigatoria para filtrar as empresas pela competencia de envio.",
    );
    return 1;
  }

  if (!env.bitrixAccountingUrl.trim()) {
    console.error(
      "BITRIX_CONTABIL_URL e obrigatoria para sincronizar os departamentos pelo Setor Contabil.",
    );
    return 1;
  }

  const clientUsersProvider = new OnvioHttpClientUsersProvider({
    token: onvioToken,
    baseUrl: env.onvioBaseUrl,
    firmCompanyId: env.onvioFirmCompanyId,
    cookie: env.onvioCookie,
    lookupPurpose: "settings",
    onUnauthorized: canRefreshOnvioToken(env)
      ? async () => {
          console.log("[Onvio] Resposta 401 na consulta de usuarios; renovando UDSLongToken.");
          return refreshOnvioTokenForUpdate();
        }
      : undefined,
  });
  const onvioCompaniesProvider = new OnvioHttpCompaniesProvider({
    token: onvioToken,
    baseUrl: env.onvioBaseUrl,
    firmCompanyId: env.onvioFirmCompanyId,
    cookie: env.onvioCookie,
    onUnauthorized: canRefreshOnvioToken(env)
      ? async () => {
          console.log("[Onvio] Resposta 401 na consulta de empresas; renovando UDSLongToken.");
          return refreshOnvioTokenForUpdate();
        }
      : undefined,
  });

  try {
    const result = await updatePlanilhaOperacional({
      credentials: {
        email: env.unecontEmail,
        senha: env.unecontSenha,
      },
      browser: {
        headless: flags.headless ?? env.headless,
      },
      operacionalPath: flags.operacionalPath,
      outputDir: flags.outputDir ? path.resolve(flags.outputDir) : undefined,
      referenceMonth: flags.referenceMonth,
      force: flags.force,
      empresasUrl: env.empresasUrl,
      empresasReportName: env.unecontEmpresasReportName,
      bitrixCompetenciasUrl: env.bitrixCompetenciasUrl,
      bitrixAccountingUrl: env.bitrixAccountingUrl,
      clientUsersProvider,
      onvioCompaniesProvider,
      logger: console,
      timeouts: {
        defaultTimeoutSeconds: env.defaultTimeout,
        shortTimeoutSeconds: env.shortTimeout,
        longTimeoutSeconds: env.longTimeout,
      },
      loginUrl: env.loginUrl,
    });

    console.log(`Saida: ${result.outputDir}`);
    console.log(`Base Unecont: ${result.baseUnecontPath}`);
    console.log(`Planilha Bitrix: ${result.bitrixCompetenciasPath}`);
    console.log(`Planilha Bitrix Contabil: ${result.bitrixAccountingPath}`);
    console.log(`Relatorio empresas Onvio: ${result.onvioCompaniesReportPath}`);
    console.log(`Relatorio: ${result.reportPath}`);
    console.log(`Planilha runtime: ${result.runtimePlanilhaPath}`);
    console.log(`Planilha publicada: ${result.publishedPlanilhaPath}`);
    console.log(
      `Resumo: ${result.summary.novas} novas, ${result.summary.removidas} removidas, ${result.summary.alteradas} alteradas, ${result.summary.excluidasPorCompetencia} excluidas (onboarding mes vigente), ${result.summary.conflitosCodigo} conflitos de codigo.`,
    );

    return 0;
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
