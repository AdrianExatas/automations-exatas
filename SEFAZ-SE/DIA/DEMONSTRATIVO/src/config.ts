import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { resolveSefazAuthConfig, type SefazAuthMode } from "../../shared/sefaz-auth";
import { parseCompetencia, previousMonthCompetencia } from "./dates";
import type { ReportFormat, RunConfig } from "./types";

type CliOptions = {
  competencia?: string;
  limit?: number;
  headless?: boolean;
  formats?: ReportFormat[];
  outDir?: string;
  authMode?: SefazAuthMode;
  certPath?: string;
  certPasswordFile?: string;
};

export async function loadConfig(argv = process.argv.slice(2)): Promise<RunConfig> {
  await loadDotEnv();
  const cli = parseCli(argv);
  const auth = resolveSefazAuthConfig(process.env, {
    authMode: cli.authMode ?? "certificate",
    certPath: cli.certPath,
    certPasswordFile: cli.certPasswordFile,
  });
  const user = readEnv("SEFAZ_USER");
  const password = readEnv("SEFAZ_PASSWORD");
  if (!user) {
    throw new Error("Defina SEFAZ_USER no ambiente ou em .env (codigo do vinculo Contador).");
  }
  if (!auth.certificate) {
    throw new Error("Certificado digital A1 nao encontrado. Configure SEFAZ_CERT_PATH ou informe --cert-path.");
  }

  return {
    user,
    password,
    competencia: cli.competencia ? parseCompetencia(cli.competencia) : previousMonthCompetencia(),
    formats: cli.formats ?? ["pdf", "xls"],
    outDir: cli.outDir ?? "downloads",
    limit: cli.limit,
    headless: cli.headless ?? parseBoolean(readEnv("SEFAZ_HEADLESS"), true),
    timeoutMs: Number(readEnv("SEFAZ_TIMEOUT_MS") || "30000"),
    ...auth,
  };
}

function parseCli(argv: string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    const [name, inlineValue] = arg.split("=", 2);
    const value = inlineValue ?? argv[index + 1];
    if (!arg.startsWith("--")) {
      continue;
    }
    if (inlineValue === undefined) {
      index += 1;
    }

    switch (name) {
      case "--competencia":
        options.competencia = requiredValue(name, value);
        break;
      case "--limit":
        options.limit = Number(requiredValue(name, value));
        if (!Number.isInteger(options.limit) || options.limit < 1) {
          throw new Error("--limit deve ser um inteiro positivo.");
        }
        break;
      case "--headless":
        options.headless = parseBoolean(requiredValue(name, value), true);
        break;
      case "--formats":
        options.formats = parseFormats(requiredValue(name, value));
        break;
      case "--out":
        options.outDir = requiredValue(name, value);
        break;
      case "--auth-mode":
        options.authMode = parseAuthMode(requiredValue(name, value));
        break;
      case "--cert-path":
        options.certPath = path.resolve(requiredValue(name, value));
        break;
      case "--cert-password-file":
        options.certPasswordFile = path.resolve(requiredValue(name, value));
        break;
      default:
        throw new Error(`Opcao desconhecida: ${name}`);
    }
  }

  return options;
}

function parseFormats(value: string): ReportFormat[] {
  const formats = value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  const result = formats.map((format) => {
    if (format === "pdf" || format === "xls" || format === "excel") {
      return format === "excel" ? "xls" : format;
    }
    throw new Error(`Formato invalido: ${format}. Use pdf,xls.`);
  });

  return [...new Set(result)];
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) {
    return defaultValue;
  }

  return ["1", "true", "yes", "sim"].includes(value.toLowerCase());
}

function parseAuthMode(raw: string): SefazAuthMode {
  const value = raw.trim().toLowerCase();
  if (value === "password") {
    throw new Error("Login por senha nao e mais suportado. Use --auth-mode certificate.");
  }
  if (value === "auto" || value === "certificate") {
    return "certificate";
  }

  throw new Error("Use --auth-mode com certificate.");
}

function readEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

function requiredValue(name: string, value: string | undefined): string {
  if (!value || value.startsWith("--")) {
    throw new Error(`Valor ausente para ${name}.`);
  }

  return value;
}

async function loadDotEnv(): Promise<void> {
  if (!existsSync(".env")) {
    return;
  }

  const text = await readFile(".env", "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (!match) {
      continue;
    }

    const key = match[1]!;
    const value = unquote(match[2]!.trim());
    process.env[key] = value;
  }
}

function unquote(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}
