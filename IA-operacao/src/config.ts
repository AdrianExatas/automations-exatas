export const DEFAULT_UNECONT_LOGIN_URL = "https://app.unecont.com/_login/Login.aspx";
export const DEFAULT_UNECONT_SERVICOS_TOMADOS_URL =
  "https://app.unecont.com/Contador/ServicosTomados/Default.aspx";
export const DEFAULT_UNECONT_EMPRESAS_URL =
  "https://app.unecont.com/Contador/Empresas/Default.aspx";

export interface Config {
  unecontEmail: string;
  unecontSenha: string;
  headless: boolean;
  defaultTimeout: number;
  shortTimeout: number;
  longTimeout: number;
  loginUrl: string;
  servicosTomadosUrl: string;
  empresasUrl: string;
}

export interface EnvConfig extends Config {
  empresasExcelPath: string;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === "") return defaultValue;
  return value.trim().toLowerCase() === "true";
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadEnvConfig(env: NodeJS.ProcessEnv = process.env): EnvConfig {
  return {
    unecontEmail: env.UNECONT_EMAIL ?? env.UNECONT_LOGIN ?? "",
    unecontSenha: env.UNECONT_SENHA ?? "",
    headless: parseBoolean(env.HEADLESS, true),
    defaultTimeout: parseNumber(env.DEFAULT_TIMEOUT, 10),
    shortTimeout: parseNumber(env.SHORT_TIMEOUT, 3),
    longTimeout: parseNumber(env.LONG_TIMEOUT, 20),
    loginUrl: env.UNECONT_LOGIN_URL ?? DEFAULT_UNECONT_LOGIN_URL,
    servicosTomadosUrl: env.UNECONT_SERVICOS_TOMADOS_URL ?? DEFAULT_UNECONT_SERVICOS_TOMADOS_URL,
    empresasUrl: env.UNECONT_EMPRESAS_URL ?? DEFAULT_UNECONT_EMPRESAS_URL,
    empresasExcelPath: env.EMPRESAS_EXCEL_PATH ?? "assets/templates/empresas-template.xlsx",
  };
}

export function validateConfig(config: Pick<Config, "unecontEmail" | "unecontSenha">): void {
  if (!config.unecontEmail.trim()) {
    throw new Error("UNECONT_EMAIL e obrigatorio (UNECONT_LOGIN e alias legado)");
  }
  if (!config.unecontSenha.trim()) {
    throw new Error("UNECONT_SENHA e obrigatorio");
  }
}
