import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type SefazAuthMode = "auto" | "certificate" | "password";

export type SefazCertificateConfig = {
  pfxPath: string;
  passphrase: string;
  origins: string[];
};

export type SefazAuthConfig = {
  authMode: SefazAuthMode;
  certificate?: SefazCertificateConfig;
};

export type SefazAuthOverrides = {
  authMode?: string;
  certPath?: string;
  certPassword?: string;
  certPasswordFile?: string;
  defaultCertDir?: string;
  defaultPasswordFile?: string;
};

export type SefazPlaywrightClientCertificate = {
  origin: string;
  pfxPath: string;
  passphrase: string;
};

export const SEFAZ_CERTIFICATE_ORIGINS = [
  "https://security.sefaz.se.gov.br",
  "https://www.sefaz.se.gov.br",
  "https://portais-fazendario.apps.sefaz.se.gov.br",
  "https://portal-cert.apps.sefaz.se.gov.br",
];

const SHARED_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CERT_DIR = path.resolve(SHARED_DIR, "..", "..", "..", "DIA", "shared", "certificado");
const DEFAULT_PASSWORD_FILE = path.join(DEFAULT_CERT_DIR, "SENHA.txt");

export function resolveSefazAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
  overrides: SefazAuthOverrides = {},
): SefazAuthConfig {
  const authMode = parseSefazAuthMode(overrides.authMode ?? env.SEFAZ_AUTH_MODE ?? "certificate");
  if (authMode === "password") {
    throw new Error("Login por senha nao e mais suportado. Use certificado digital (SEFAZ_AUTH_MODE=certificate).");
  }

  const configuredCertPath = firstNonBlank(overrides.certPath, env.SEFAZ_CERT_PATH);
  const defaultCertPath = configuredCertPath ? undefined : findDefaultPfx(overrides.defaultCertDir ?? DEFAULT_CERT_DIR);
  const certPath = configuredCertPath ?? defaultCertPath;

  if (!certPath) {
    throw new Error("Certificado digital A1 nao encontrado. Configure SEFAZ_CERT_PATH ou informe --cert-path.");
  }

  const resolvedPfxPath = path.resolve(certPath);
  if (!existsSync(resolvedPfxPath)) {
    throw new Error(`Certificado digital A1 nao encontrado em ${resolvedPfxPath}.`);
  }

  return {
    authMode: "certificate",
    certificate: {
      pfxPath: resolvedPfxPath,
      passphrase: resolveCertificatePassword(env, overrides),
      origins: SEFAZ_CERTIFICATE_ORIGINS,
    },
  };
}

export function parseSefazAuthMode(raw: string): SefazAuthMode {
  const value = raw.trim().toLowerCase();
  if (value === "auto" || value === "certificate" || value === "password") {
    return value;
  }

  throw new Error("Use SEFAZ_AUTH_MODE com certificate (auto e aceito como alias).");
}

export function assertCertificateAuth(config: SefazAuthConfig): asserts config is SefazAuthConfig & {
  certificate: SefazCertificateConfig;
} {
  if (!config.certificate) {
    throw new Error("Certificado digital A1 nao encontrado. Configure SEFAZ_CERT_PATH ou informe --cert-path.");
  }
}

export function isSefazCertificateAuthEnabled(config: SefazAuthConfig): boolean {
  return config.authMode !== "password" && Boolean(config.certificate);
}

export function buildClientCertificates(
  certificate: SefazCertificateConfig | undefined,
): SefazPlaywrightClientCertificate[] | undefined {
  if (!certificate) {
    return undefined;
  }

  return certificate.origins.map((origin) => ({
    origin,
    pfxPath: certificate.pfxPath,
    passphrase: certificate.passphrase,
  }));
}

export function describeClientCertificateError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/INCORRECT_PASSWORD/i.test(message)) {
    return "Senha do certificado PFX incorreta. Confira o campo Senha do certificado ou o arquivo shared/certificado/SENHA.txt.";
  }
  if (/Failed to load client certificate/i.test(message)) {
    return `Falha ao carregar o certificado digital A1: ${message}`;
  }
  return message;
}

function findDefaultPfx(certDir: string): string | undefined {
  if (!existsSync(certDir)) {
    return undefined;
  }

  return readdirSync(certDir)
    .filter((fileName) => fileName.toLowerCase().endsWith(".pfx"))
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => path.join(certDir, fileName))[0];
}

function resolveCertificatePassword(env: NodeJS.ProcessEnv, overrides: SefazAuthOverrides): string {
  const overridePassword = overrides.certPassword?.trim();
  if (overridePassword) {
    return overridePassword;
  }

  const envPassword = env.SEFAZ_CERT_PASSWORD;
  if (envPassword !== undefined && envPassword.trim()) {
    return envPassword.trim();
  }

  const passwordFile = firstNonBlank(
    overrides.certPasswordFile,
    env.SEFAZ_CERT_PASSWORD_FILE,
    overrides.defaultPasswordFile,
    DEFAULT_PASSWORD_FILE,
  );
  if (!passwordFile || !existsSync(passwordFile)) {
    return "";
  }

  return readFileSync(passwordFile, "utf8").trim();
}

function firstNonBlank(...values: Array<string | undefined>): string | undefined {
  return values.map((value) => value?.trim()).find((value): value is string => Boolean(value));
}
