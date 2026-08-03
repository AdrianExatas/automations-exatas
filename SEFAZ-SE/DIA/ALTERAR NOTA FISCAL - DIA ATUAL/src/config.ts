import path from "node:path";
import { readFile } from "node:fs/promises";
import { resolveSefazAuthConfig, type SefazAuthMode } from "../../shared/sefaz-auth";
import type { PlaywrightBrowserChannel, RunAlterarNotaFiscalConfig } from "./nf-types";

type CliOptions = {
  user?: string;
  password?: string;
  spreadsheetPath?: string;
  outDir?: string;
  headless?: boolean;
  dryRun?: boolean;
  browserChannel?: PlaywrightBrowserChannel;
  limit?: number;
  stepDelayMs?: number;
  authMode?: SefazAuthMode;
  certPath?: string;
  certPasswordFile?: string;
};

export async function loadConfig(argv = process.argv.slice(2)): Promise<RunAlterarNotaFiscalConfig> {
  await loadDotEnv();
  const cli = parseArgs(argv);
  const user = cli.user ?? process.env.SEFAZ_USER ?? "";
  const password = cli.password ?? process.env.SEFAZ_PASSWORD ?? "";
  const spreadsheetPath = cli.spreadsheetPath ?? process.env.PLANILHA_NOTAS ?? "";
  const auth = resolveSefazAuthConfig(process.env, {
    authMode: cli.authMode,
    certPath: cli.certPath,
    certPasswordFile: cli.certPasswordFile,
  });

  if (requiresPasswordCredentials(auth) && !user.trim()) {
    throw new Error("Informe --user ou SEFAZ_USER.");
  }
  if (requiresPasswordCredentials(auth) && !password) {
    throw new Error("Informe --password ou SEFAZ_PASSWORD.");
  }
  if (!spreadsheetPath.trim()) {
    throw new Error("Informe --planilha ou PLANILHA_NOTAS.");
  }

  return {
    user: user.trim(),
    password,
    spreadsheetPath: path.resolve(spreadsheetPath.trim()),
    outDir: path.resolve(cli.outDir ?? "downloads"),
    headless: cli.headless ?? isEnabled(process.env.SEFAZ_HEADLESS),
    dryRun: cli.dryRun ?? isEnabled(process.env.DRY_RUN),
    browserChannel: cli.browserChannel ?? browserChannelFromEnv(process.env.PLAYWRIGHT_CHANNEL),
    limit: cli.limit,
    stepDelayMs: cli.stepDelayMs ?? Number(process.env.STEP_DELAY_MS ?? 0),
    timeoutMs: Number(process.env.SEFAZ_TIMEOUT_MS ?? 30_000),
    ...auth,
  };
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    const [name, inlineValue] = arg.split("=", 2);
    const value = inlineValue ?? args[index + 1];
    switch (name) {
      case "--user":
        options.user = requiredValue(name, value);
        if (inlineValue === undefined) index += 1;
        break;
      case "--password":
        options.password = requiredValue(name, value);
        if (inlineValue === undefined) index += 1;
        break;
      case "--planilha":
      case "--spreadsheet":
        options.spreadsheetPath = requiredValue(name, value);
        if (inlineValue === undefined) index += 1;
        break;
      case "--out-dir":
        options.outDir = requiredValue(name, value);
        if (inlineValue === undefined) index += 1;
        break;
      case "--headless":
        options.headless = true;
        break;
      case "--headed":
        options.headless = false;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--channel":
      case "--browser-channel":
        options.browserChannel = parseBrowserChannel(requiredValue(name, value));
        if (inlineValue === undefined) index += 1;
        break;
      case "--limit":
        options.limit = Number(requiredValue(name, value));
        if (!Number.isInteger(options.limit) || options.limit < 1) {
          throw new Error("Informe um limite numerico maior que zero.");
        }
        if (inlineValue === undefined) index += 1;
        break;
      case "--step-delay-ms":
        options.stepDelayMs = Number(requiredValue(name, value));
        if (!Number.isFinite(options.stepDelayMs) || options.stepDelayMs < 0) {
          throw new Error("Informe um tempo de espera em milissegundos maior ou igual a zero.");
        }
        if (inlineValue === undefined) index += 1;
        break;
      case "--auth-mode":
        options.authMode = parseAuthMode(requiredValue(name, value));
        if (inlineValue === undefined) index += 1;
        break;
      case "--cert-path":
        options.certPath = path.resolve(requiredValue(name, value));
        if (inlineValue === undefined) index += 1;
        break;
      case "--cert-password-file":
        options.certPasswordFile = path.resolve(requiredValue(name, value));
        if (inlineValue === undefined) index += 1;
        break;
      default:
        throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }

  return options;
}

function requiredValue(name: string, value: string | undefined): string {
  if (!value || value.startsWith("--")) {
    throw new Error(`Informe um valor para ${name}.`);
  }

  return value;
}

function isEnabled(value: string | undefined): boolean {
  return ["1", "true", "yes", "sim"].includes((value ?? "").toLowerCase());
}

function browserChannelFromEnv(value: string | undefined): PlaywrightBrowserChannel | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return parseBrowserChannel(trimmed);
  } catch {
    return undefined;
  }
}

function parseBrowserChannel(raw: string): PlaywrightBrowserChannel {
  const value = raw.trim().toLowerCase();
  if (value === "chrome" || value === "msedge" || value === "chromium") {
    return value;
  }

  throw new Error("Use --channel com chrome, msedge ou chromium.");
}

function parseAuthMode(raw: string): SefazAuthMode {
  const value = raw.trim().toLowerCase();
  if (value === "auto" || value === "certificate" || value === "password") {
    return value;
  }

  throw new Error("Use --auth-mode com auto, certificate ou password.");
}

function requiresPasswordCredentials(auth: ReturnType<typeof resolveSefazAuthConfig>): boolean {
  return auth.authMode === "password" || !auth.certificate;
}

async function loadDotEnv(filePath = ".env"): Promise<void> {
  const content = await readFile(filePath, "utf8").catch(() => "");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    process.env[key] ??= value;
  }
}
