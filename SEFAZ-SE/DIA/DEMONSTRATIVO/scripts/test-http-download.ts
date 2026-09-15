/**
 * Teste de integracao: download do Demonstrativo 100% via HTTP.
 *
 * Login + abertura do formulario ainda usam Playwright (certificado A1).
 * Listagem e download PDF/XLS usam apenas context.request (sem fallback UI).
 *
 * Uso (Node — Bun trava no WebSocket do Playwright neste ambiente Windows):
 *   bun run test:http
 *   bun run test:http -- --formats=pdf --limit=1 --competencia=2026-07
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config";
import { DemonstrativoPlaywrightSession } from "../src/playwright-fallback";
import { isRealFormContract, saveHttpCaptureSummary } from "../src/sefaz-demonstrativo-api";
import { isPdf, isXls } from "../src/signatures";
import type { ReportFormat } from "../src/types";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = /[\\/]dist[\\/]scripts$/i.test(HERE) ? path.resolve(HERE, "../..") : path.resolve(HERE, "..");
const OUT_DIR = path.join(APP_ROOT, ".tmp-http-test-out");
const CERT_DIR = path.resolve(APP_ROOT, "../shared/certificado");

function cliArgs(): string[] {
  return process.argv.slice(2);
}

async function main(): Promise<void> {
  // Chromium completo (nao headless-shell) + evita conflito com Edge/Electron.
  process.env.SEFAZ_BROWSER = process.env.SEFAZ_BROWSER || "chromium";
  process.env.PLAYWRIGHT_CHROMIUM_USE_HEADLESS_SHELL = "0";
  if (!process.env.SEFAZ_CERT_PATH) {
    const { readdirSync, existsSync } = await import("node:fs");
    if (existsSync(CERT_DIR)) {
      const pfx = readdirSync(CERT_DIR).find((name) => name.toLowerCase().endsWith(".pfx"));
      if (pfx) {
        process.env.SEFAZ_CERT_PATH = path.join(CERT_DIR, pfx);
      }
    }
  }
  if (!process.env.SEFAZ_CERT_PASSWORD_FILE) {
    process.env.SEFAZ_CERT_PASSWORD_FILE = path.join(CERT_DIR, "SENHA.txt");
  }

  const args = cliArgs();
  const config = await loadConfig([
    ...args,
    "--out",
    OUT_DIR,
    ...(args.some((arg) => arg === "--headless" || arg.startsWith("--headless="))
      ? []
      : ["--headless", "true"]),
  ]);
  config.timeoutMs = Math.max(config.timeoutMs, 120_000);
  config.limit = config.limit ?? 1;

  await fs.mkdir(OUT_DIR, { recursive: true });

  console.log("=== Teste HTTP Demonstrativo ===");
  console.log(`Vinculo: ${config.user}`);
  console.log(`Competencia: ${config.competencia.value}`);
  console.log(`Formatos: ${config.formats.join(",")}`);
  console.log(`Limit empresas: ${config.limit}`);
  console.log(`Headless: ${Boolean(config.headless)}`);
  console.log(`Browser: ${process.env.SEFAZ_BROWSER}`);
  console.log(`Out: ${OUT_DIR}`);
  console.log("Obs: feche o desktop:dev se este passo travar (certificado/browser em uso).");

  console.log("\n[1/4] Login Playwright + abrir Demonstrativo...");
  const session = await DemonstrativoPlaywrightSession.start(config);
  console.log("[1/4] Sessao aberta.");
  const startedAt = Date.now();
  const results: Array<{
    company: string;
    format: ReportFormat;
    via: string;
    bytes: number;
    ok: boolean;
    ms: number;
    error?: string;
  }> = [];

  try {
    const companies = await session.listCompanies();
    const selected = companies.slice(0, config.limit ?? 1);
    console.log(`[2/4] Empresas no portal: ${companies.length}; bootstrap/http: ${selected[0]?.inscricao}`);

    const contract = session.getFormContract();
    if (!session.isHttpReady() || !isRealFormContract(contract)) {
      throw new Error(
        `Contrato HTTP nao pronto apos listCompanies (source=${contract?.source ?? "none"}). ` +
          "Sem contrato DOM/network o download HTTP e bloqueado de proposito.",
      );
    }

    console.log(
      `[3/4] Contrato inicial: source=${contract.source} submit=${contract.submitUrl} fields=${Object.keys(contract.baseFields).length}`,
    );

    const bootstrapCompany = selected[0]!;
    console.log(`\n[3b/4] Bootstrap UI (${bootstrapCompany.inscricao}) para capturar contrato network...`);
    const bootFormat: ReportFormat = config.formats.includes("xls") ? "xls" : config.formats[0]!;
    const boot = await session.bootstrapHttpFromUi(bootstrapCompany, config.competencia, bootFormat);
    const bootOk =
      boot.via === "playwright" &&
      (bootFormat === "pdf" ? isPdf(boot.bytes) : isXls(boot.bytes));
    if (!bootOk) {
      throw new Error(`Bootstrap UI falhou via=${boot.via} bytes=${boot.bytes.byteLength}`);
    }
    const bootName = `${bootstrapCompany.inscricao}_${config.competencia.value}.bootstrap.${bootFormat === "xls" ? "xls" : "pdf"}`;
    await fs.writeFile(path.join(OUT_DIR, bootName), boot.bytes);
    console.log(
      `  Bootstrap OK via=playwright bytes=${boot.bytes.byteLength} contract=${session.getFormContract()?.source}`,
    );

    const contractAfter = session.getFormContract();
    if (!session.isHttpReady() || !isRealFormContract(contractAfter)) {
      throw new Error("Contrato HTTP nao ficou pronto apos bootstrap UI.");
    }
    console.log(
      `[3c/4] Contrato apos bootstrap: source=${contractAfter.source} submit=${contractAfter.submitUrl} fields=${Object.keys(contractAfter.baseFields).length} token=${Boolean(contractAfter.baseFields.token)}`,
    );

    // Tenta HTTP na mesma empresa (sabemos que tem dados) e, se "sem dados", percorre mais empresas.
    const httpCandidates = companies.slice(0, Math.max(5, config.limit ?? 1));
    console.log(`[4/4] Downloads estritos via HTTP...`);
    for (const httpCompany of httpCandidates) {
      console.log(`\nEmpresa: ${httpCompany.inscricao} - ${httpCompany.nome}`);
      let companyFailedBusiness = false;
      for (const format of config.formats) {
        const t0 = Date.now();
        try {
          const download = await session.downloadHttpOnly(httpCompany, config.competencia, format);
          const ms = Date.now() - t0;
          const ok =
            download.via === "http" &&
            (format === "pdf" ? isPdf(download.bytes) : isXls(download.bytes));

          if (!ok) {
            throw new Error(
              `Validacao falhou via=${download.via} bytes=${download.bytes.byteLength} ` +
                `isPdf=${isPdf(download.bytes)} isXls=${isXls(download.bytes)}`,
            );
          }

          const fileName = `${httpCompany.inscricao}_${config.competencia.value}.${format === "xls" ? "xls" : "pdf"}`;
          await fs.writeFile(path.join(OUT_DIR, fileName), download.bytes);
          console.log(`  OK ${format.toUpperCase()} via=http bytes=${download.bytes.byteLength} ${ms}ms -> ${fileName}`);
          results.push({
            company: httpCompany.inscricao,
            format,
            via: "http",
            bytes: download.bytes.byteLength,
            ok: true,
            ms,
          });
        } catch (error) {
          const ms = Date.now() - t0;
          const message = error instanceof Error ? error.message : String(error);
          const isBusiness = /sem dados|referencia adiada|9 d[ií]gitos/i.test(message);
          console.error(`  FALHA ${format.toUpperCase()} ${ms}ms: ${message}`);
          results.push({
            company: httpCompany.inscricao,
            format,
            via: "http",
            bytes: 0,
            ok: false,
            ms,
            error: message,
          });
          if (isBusiness) {
            companyFailedBusiness = true;
            break;
          }
          throw error;
        }
      }
      if (results.some((item) => item.ok && item.via === "http")) {
        break;
      }
      if (!companyFailedBusiness) {
        break;
      }
    }

    const summaryPath = await saveHttpCaptureSummary([], contractAfter, {
      via: "test-http-download",
      competencia: config.competencia.value,
      results,
      elapsedMs: Date.now() - startedAt,
    });

    const hardFailed = results.filter(
      (item) => !item.ok && !/sem dados|referencia adiada/i.test(item.error ?? ""),
    );
    const httpOk = results.filter((item) => item.ok && item.via === "http");
    const summaryJson = path.join(OUT_DIR, "http-test-summary.json");
    await fs.writeFile(
      summaryJson,
      JSON.stringify(
        {
          ok: hardFailed.length === 0 && httpOk.length > 0,
          competencia: config.competencia.value,
          contract: {
            source: contractAfter.source,
            submitUrl: contractAfter.submitUrl,
            fieldKeys: Object.keys(contractAfter.baseFields).sort(),
          },
          results,
          httpDownloads: httpOk.length,
          elapsedMs: Date.now() - startedAt,
          captureSummary: summaryPath,
        },
        null,
        2,
      ),
      "utf8",
    );

    console.log(`\nSummary: ${summaryJson}`);
    console.log(`Capture: ${summaryPath}`);
    console.log(`Elapsed: ${Date.now() - startedAt}ms`);

    if (httpOk.length === 0) {
      throw new Error("Nenhum download HTTP confirmado (bootstrap UI sozinho nao basta).");
    }
    if (hardFailed.length > 0) {
      throw new Error(`${hardFailed.length} download(s) HTTP falharam.`);
    }
    console.log(`\nPASS: ${httpOk.length} download(s) via HTTP confirmado(s).`);
  } finally {
    await session.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
