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
];

const SHARED_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CERT_DIR = path.join(SHARED_DIR, "certificado");
const DEFAULT_PASSWORD_FILE = path.join(DEFAULT_CERT_DIR, "SENHA.txt");

export function resolveSefazAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
  overrides: SefazAuthOverrides = {},
): SefazAuthConfig {
  const authMode = parseSefazAuthMode(overrides.authMode ?? env.SEFAZ_AUTH_MODE ?? "auto");
  if (authMode === "password") {
    return { authMode };
  }

  const configuredCertPath = firstNonBlank(overrides.certPath, env.SEFAZ_CERT_PATH);
  const defaultCertPath = configuredCertPath ? undefined : findDefaultPfx(overrides.defaultCertDir ?? DEFAULT_CERT_DIR);
  const certPath = configuredCertPath ?? defaultCertPath;

  if (!certPath) {
    if (authMode === "certificate") {
      throw new Error("Certificado digital A1 nao encontrado. Configure SEFAZ_CERT_PATH ou informe --cert-path.");
    }
    return { authMode };
  }

  const resolvedPfxPath = path.resolve(certPath);
  if (!existsSync(resolvedPfxPath)) {
    throw new Error(`Certificado digital A1 nao encontrado em ${resolvedPfxPath}.`);
  }

  return {
    authMode,
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

  throw new Error("Use SEFAZ_AUTH_MODE com auto, certificate ou password.");
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
  const envPassword = env.SEFAZ_CERT_PASSWORD;
  if (envPassword !== undefined) {
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
