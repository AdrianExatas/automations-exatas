/**
 * Smoke test: login SEFAZ com PFX de shared/certificado ate a tela de vinculos.
 * Uso: bun run scripts/smoke-cert-login.ts
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { buildClientCertificates, resolveSefazAuthConfig } from "../../shared/sefaz-auth";
import { loginSefazContabilista } from "../../shared/sefaz-playwright-login";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CERT_DIR = path.join(ROOT, "shared", "certificado");

async function main(): Promise<void> {
  const user = (process.env.SEFAZ_USER ?? "SE007829").trim();
  const auth = resolveSefazAuthConfig(process.env, {
    authMode: "certificate",
    defaultCertDir: CERT_DIR,
    defaultPasswordFile: path.join(CERT_DIR, "SENHA.txt"),
  });

  console.log(`PFX: ${auth.certificate?.pfxPath}`);
  console.log(`Origins: ${auth.certificate?.origins.join(", ")}`);
  console.log(`Vinculo: ${user}`);

  const browser = await chromium.launch({
    headless: true,
    timeout: 60_000,
  });
  try {
    const context = await browser.newContext({
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      viewport: { width: 1280, height: 900 },
      clientCertificates: buildClientCertificates(auth.certificate),
    });
    context.setDefaultTimeout(90_000);
    const page = await context.newPage();
    const portal = await loginSefazContabilista(page, {
      ...auth,
      user,
      timeoutMs: 90_000,
    });
    console.log(`OK login. URL final: ${portal.url()}`);
    await portal.waitForTimeout?.(5_000);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
