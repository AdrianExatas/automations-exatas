import path from "node:path";
import process from "node:process";
import { resolveSefazAuthConfig, type SefazAuthMode } from "../../shared/sefaz-auth";
import type { DaeReferencia, GerarDaeConfig, PlaywrightBrowserChannel } from "./types";

type ParseState = Partial<Omit<GerarDaeConfig, "referencia">> & {
  ano?: number;
  mes?: number;
  authMode?: SefazAuthMode;
  certPath?: string;
  certPasswordFile?: string;
};

export function loadConfig(argv: string[], env: NodeJS.ProcessEnv = process.env): GerarDaeConfig {
  const cwd = process.cwd();
  const options: ParseState = {
    user: env.SEFAZ_USER,
    password: env.SEFAZ_PASSWORD,
    headless: env.HEADLESS !== "false",
    timeoutMs: Number(env.TIMEOUT_MS ?? 60_000),
    browserChannel: "chrome",
    modelDir: env.MODEL_DIR ?? path.resolve(cwd, "model"),
    outDir: env.DAE_OUTPUT_DIR ?? path.resolve(cwd, "downloads"),
    ano: env.DAE_ANO ? parseAno(env.DAE_ANO) : undefined,
    mes: env.DAE_MES ? parseMes(env.DAE_MES) : undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    const value = argv[index + 1];
    switch (arg) {
      case "--user":
        options.user = requiredValue(arg, value);
        index += 1;
        break;
      case "--password":
        options.password = requiredValue(arg, value);
        index += 1;
        break;
      case "--headed":
        options.headless = false;
        break;
      case "--headless":
        options.headless = true;
        break;
      case "--timeout-ms":
        options.timeoutMs = Number(requiredValue(arg, value));
        index += 1;
        break;
      case "--channel":
      case "--browser-channel":
        options.browserChannel = parseBrowserChannel(requiredValue(arg, value));
        index += 1;
        break;
      case "--auth-mode":
        options.authMode = parseAuthMode(requiredValue(arg, value));
        index += 1;
        break;
      case "--cert-path":
        options.certPath = path.resolve(cwd, requiredValue(arg, value));
        index += 1;
        break;
      case "--cert-password-file":
        options.certPasswordFile = path.resolve(cwd, requiredValue(arg, value));
        index += 1;
        break;
      case "--model-dir":
        options.modelDir = path.resolve(cwd, requiredValue(arg, value));
        index += 1;
        break;
      case "--out-dir":
        options.outDir = path.resolve(cwd, requiredValue(arg, value));
        index += 1;
        break;
      case "--ano":
        options.ano = parseAno(requiredValue(arg, value));
        index += 1;
        break;
      case "--mes":
        options.mes = parseMes(requiredValue(arg, value));
        index += 1;
        break;
      default:
        throw new Error(`Opcao desconhecida: ${arg}`);
    }
  }

  const user = options.user?.trim();
  const password = options.password;
  const timeoutMs = options.timeoutMs;
  const modelDir = options.modelDir;
  const outDir = options.outDir;
  const auth = resolveSefazAuthConfig(env, {
    authMode: options.authMode ?? "certificate",
    certPath: options.certPath,
    certPasswordFile: options.certPasswordFile,
  });

  if (!user) {
    throw new Error("Informe o login da SEFAZ (SEFAZ_USER / --user) para selecionar o vinculo Contador.");
  }
  if (!auth.certificate) {
    throw new Error("Certificado digital A1 nao encontrado. Configure SEFAZ_CERT_PATH ou informe --cert-path.");
  }
  if (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Timeout invalido.");
  }
  if (!modelDir) {
    throw new Error("Informe a pasta dos modelos (--model-dir).");
  }
  if (!outDir) {
    throw new Error("Informe a pasta de saida (--out-dir).");
  }

  const referencia = buildReferencia(options.ano, options.mes);

  return {
    user: user ?? "",
    password: password ?? "",
    headless: options.headless ?? true,
    timeoutMs,
    browserChannel: options.browserChannel,
    modelDir,
    outDir,
    referencia,
    ...auth,
  };
}

function requiredValue(name: string, value: string | undefined): string {
  if (!value || value.startsWith("--")) {
    throw new Error(`Informe um valor para ${name}.`);
  }

  return value;
}

function parseBrowserChannel(raw: string): PlaywrightBrowserChannel {
  if (raw === "chrome") {
    return raw;
  }

  throw new Error("Canal de navegador invalido. Use chrome.");
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

function parseAno(raw: string): number {
  const ano = Number(raw);
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2999) {
    throw new Error(`Ano invalido: ${raw}. Use formato YYYY (ex.: 2026).`);
  }

  return ano;
}

function parseMes(raw: string): number {
  const mes = Number(raw);
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new Error(`Mes invalido: ${raw}. Use 1-12.`);
  }

  return mes;
}

function buildReferencia(ano: number | undefined, mes: number | undefined): DaeReferencia | undefined {
  if (ano === undefined && mes === undefined) {
    return undefined;
  }
  if (ano === undefined || mes === undefined) {
    throw new Error("Informe ambos --ano e --mes (ou nenhum, para usar a competencia anterior).");
  }

  return { ano, mes };
}
