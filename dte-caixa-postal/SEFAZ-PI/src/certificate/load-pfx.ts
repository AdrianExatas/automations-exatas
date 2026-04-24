import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type PfxCertificateConfig = {
  pfxPath: string;
  passphrase: string;
};

export type LoadPfxOptions = {
  errorPrefix: string;
  /** Se não houver .pfx na pasta: lançar erro ou retornar null (ex.: network-trace). */
  whenNoPfxFiles: "throw" | "null";
};

export function loadPfxCertificateFromCode(
  certCode: string,
  options: LoadPfxOptions,
): PfxCertificateConfig | null {
  const code = certCode.trim();
  const certDir = join(process.cwd(), "certificados", code);

  let pfxFiles: string[];
  try {
    pfxFiles = readdirSync(certDir).filter((f) => f.endsWith(".pfx"));
  } catch {
    const folderHint = `certificados/${code}/`;
    const msg =
      options.errorPrefix === "[SEFAZ-PI HTTP]"
        ? `${options.errorPrefix} Pasta de certificado não encontrada: ${folderHint}`
        : `${options.errorPrefix} Pasta de certificado nao encontrada: ${folderHint}`;
    throw new Error(msg);
  }

  if (pfxFiles.length === 0) {
    if (options.whenNoPfxFiles === "null") {
      return null;
    }
    const folderHint = `certificados/${code}/`;
    const msg =
      options.errorPrefix === "[SEFAZ-PI HTTP]"
        ? `${options.errorPrefix} Nenhum arquivo .pfx encontrado em: ${folderHint}`
        : `${options.errorPrefix} Nenhum arquivo .pfx encontrado em: ${folderHint}`;
    throw new Error(msg);
  }

  const pfxPath = join(certDir, pfxFiles[0]!);
  const passphrase = readFileSync(join(certDir, "SENHA.txt"), "utf-8").trim();

  return { pfxPath, passphrase };
}

/** Certificado opcional: sem SEFAZ_PI_CERT_CODE retorna null; com código, exige pasta e .pfx válidos. */
export function tryLoadPfxCertificateForBrowser(): PfxCertificateConfig | null {
  const certCode = process.env.SEFAZ_PI_CERT_CODE?.trim();
  if (!certCode) {
    return null;
  }
  return loadPfxCertificateFromCode(certCode, {
    errorPrefix: "[SEFAZ-PI]",
    whenNoPfxFiles: "throw",
  });
}

/** Mesmo que tryLoad, mas pasta vazia de .pfx vira null (uso em ferramentas de diagnóstico). */
export function tryLoadPfxCertificateLenient(): PfxCertificateConfig | null {
  const certCode = process.env.SEFAZ_PI_CERT_CODE?.trim();
  if (!certCode) {
    return null;
  }
  return loadPfxCertificateFromCode(certCode, {
    errorPrefix: "[TRACE]",
    whenNoPfxFiles: "null",
  });
}

/** Modo HTTP: SEFAZ_PI_CERT_CODE obrigatório. */
export function requirePfxCertificateForHttp(): PfxCertificateConfig {
  const certCode = process.env.SEFAZ_PI_CERT_CODE?.trim();
  if (!certCode) {
    throw new Error(
      "[SEFAZ-PI HTTP] SEFAZ_PI_CERT_CODE não definido no .env. " +
        "Defina o código do certificado (ex.: 591).",
    );
  }
  const config = loadPfxCertificateFromCode(certCode, {
    errorPrefix: "[SEFAZ-PI HTTP]",
    whenNoPfxFiles: "throw",
  });
  return config!;
}
