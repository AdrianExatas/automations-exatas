import path from "node:path";
import fs from "node:fs";
import { compareEmpresasPlanilhas } from "../compare-empresas";
import { type EnvConfig, loadEnvConfig } from "../config";
import { OnvioHttpClientUsersProvider } from "../onvio-http-client-users-provider";
import { loadDotenvFromProjectRoot } from "./cli-helpers";

interface CompareEmpresasCliFlags {
  atualizadaPath?: string;
  operacionalPath?: string;
  outputDir?: string;
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

function parseCliArgs(argv: string[]): CompareEmpresasCliFlags {
  return {
    atualizadaPath: parseValueArg(argv, "--atualizada"),
    operacionalPath: parseValueArg(argv, "--operacional"),
    outputDir: parseValueArg(argv, "--output-dir"),
  };
}

function printUsage(): void {
  console.error(
    [
      "Uso:",
      'bun run compare-empresas -- --atualizada "assets/planilha/UneCont - Empresas - EXATAS CONTABILIDADE - 2026-06-08.xlsx" --operacional "assets/planilha/Panilha-de-junho.xlsx"',
      "",
      "Opcional:",
      '--output-dir "runtime/comparisons/minha-comparacao"',
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

async function refreshOnvioTokenForCompare(): Promise<string> {
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
    console.log("[Onvio] Token ausente; renovando UDSLongToken antes da comparacao.");
    return refreshOnvioTokenForCompare();
  }

  return "";
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  loadDotenvFromProjectRoot();
  const env = loadEnvConfig();
  const flags = parseCliArgs(argv);

  if (!flags.atualizadaPath || !flags.operacionalPath) {
    printUsage();
    return 1;
  }

  const onvioToken = await resolveInitialOnvioToken(env);
  if (!onvioToken) {
    console.error(
      "ONVIO_UDS_TOKEN e obrigatorio para buscar usuarios do cliente por HTTP. Defina no .env ou ative ONVIO_AUTO_REFRESH_TOKEN com ONVIO_EMAIL/ONVIO_PASSWORD.",
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
          return refreshOnvioTokenForCompare();
        }
      : undefined,
  });

  try {
    const result = await compareEmpresasPlanilhas({
      atualizadaPath: path.resolve(flags.atualizadaPath),
      operacionalPath: path.resolve(flags.operacionalPath),
      outputDir: flags.outputDir ? path.resolve(flags.outputDir) : undefined,
      clientUsersProvider,
      logger: console,
    });

    console.log(`Saida: ${result.outputDir}`);
    console.log(`Relatorio: ${result.reportPath}`);
    console.log(`Planilha final: ${result.finalPlanilhaPath}`);
    console.log(
      `Resumo: ${result.summary.novas} novas, ${result.summary.removidas} removidas, ${result.summary.alteradas} alteradas, ${result.summary.conflitosCodigo} conflitos de codigo.`,
    );
    console.log(
      `Usuarios cliente: ${result.summary.usuariosConsultados} consultadas, ${result.summary.usuariosPreenchidos} preenchidas, ${result.summary.usuariosMultiplaEscolha} multipla escolha, ${result.summary.usuariosNaoEncontrados} sem usuarios, ${result.summary.usuariosComErro} erros.`,
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
