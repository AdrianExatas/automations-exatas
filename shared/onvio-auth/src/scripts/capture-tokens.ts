import "dotenv/config";
import {
  captureOnvioAndGesttaTokens,
  resolveDefaultArtifactPath,
  resolveDefaultStorageStatePath,
} from "../index";

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === "") return defaultValue;
  return value.trim().toLowerCase() === "true";
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function main(): Promise<number> {
  const email = process.env.ONVIO_EMAIL ?? "";
  const password = process.env.ONVIO_PASSWORD ?? "";

  if (!email.trim()) {
    console.error("ONVIO_EMAIL e obrigatorio.");
    return 1;
  }

  if (!password.trim()) {
    console.error("ONVIO_PASSWORD e obrigatorio.");
    return 1;
  }

  try {
    const artifacts = await captureOnvioAndGesttaTokens({
      email,
      password,
      baseUrl: process.env.ONVIO_BASE_URL,
      browser: {
        headless: parseBoolean(process.env.HEADLESS, false),
      },
      mfa: {
        method: (process.env.ONVIO_MFA_METHOD as "E-mail" | "SMS" | "Telefonema" | undefined) ??
          "E-mail",
        code: process.env.ONVIO_MFA_CODE || undefined,
        timeoutMs: parseNumber(process.env.ONVIO_MFA_TIMEOUT_MS, 120_000),
      },
      artifactPath: process.env.ONVIO_AUTH_ARTIFACT_PATH || resolveDefaultArtifactPath(),
      storageStatePath:
        process.env.ONVIO_STORAGE_STATE_PATH || resolveDefaultStorageStatePath(),
      writeArtifact: true,
    });

    console.log(`Auth salvo em: ${artifacts.artifactPath}`);
    console.log(`Storage state salvo em: ${artifacts.storageStatePath}`);
    return 0;
  } catch (error) {
    console.error(
      "Falha ao capturar tokens:",
      error instanceof Error ? error.message : String(error),
    );
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
