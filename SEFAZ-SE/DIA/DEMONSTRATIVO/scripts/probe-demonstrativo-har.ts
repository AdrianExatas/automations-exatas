/**
 * Probe: login unico + 1 PDF + 1 XLS com HAR para mapear requests do Demonstrativo.
 *
 * Uso:
 *   bun --env-file=.env run scripts/probe-demonstrativo-har.ts
 *
 * Gera:
 *   scripts/har/demonstrativo-probe.har
 *   scripts/har/demonstrativo-probe-summary.json
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSefazAuthConfig } from "../../shared/sefaz-auth";
import { previousMonthCompetencia } from "../src/dates";
import { DemonstrativoPlaywrightSession } from "../src/playwright-fallback";
import { isPdf, isXls } from "../src/signatures";
import type { RunConfig } from "../src/types";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CERT_DIR = path.join(ROOT, "shared", "certificado");
const HAR_DIR = path.join(APP_ROOT, "scripts", "har");
const HAR_PATH = path.join(HAR_DIR, "demonstrativo-probe.har");
const SUMMARY_PATH = path.join(HAR_DIR, "demonstrativo-probe-summary.json");
const OUT_DIR = path.join(APP_ROOT, ".tmp-probe-out");

async function main(): Promise<void> {
  const user = (process.env.SEFAZ_USER ?? "SE007829").trim();
  const auth = resolveSefazAuthConfig(process.env, {
    authMode: "certificate",
    defaultCertDir: CERT_DIR,
    defaultPasswordFile: path.join(CERT_DIR, "SENHA.txt"),
  });

  await fs.mkdir(HAR_DIR, { recursive: true });
  await fs.mkdir(OUT_DIR, { recursive: true });

  const config: RunConfig = {
    user,
    password: "",
    competencia: previousMonthCompetencia(),
    formats: ["pdf", "xls"],
    outDir: OUT_DIR,
    headless: true,
    timeoutMs: 120_000,
    ...auth,
  };

  console.log(`Vinculo: ${user}`);
  console.log(`Competencia: ${config.competencia.value}`);
  console.log(`HAR: ${HAR_PATH}`);

  const captured: Array<{
    step: string;
    url: string;
    method: string;
    status?: number;
    contentType?: string;
    resourceType?: string;
  }> = [];

  const session = await DemonstrativoPlaywrightSession.start(config, { recordHarPath: HAR_PATH });
  try {
    const page = session.getPage();
    page.on("response", (response) => {
      const url = response.url();
      if (!/sefaz\.se\.gov\.br|portais-fazendario|portal-cert|security\.sefaz/i.test(url)) {
        return;
      }
      if (/\.(css|js|png|jpg|svg|woff2?)(\?|$)/i.test(url)) {
        return;
      }
      captured.push({
        step: "response",
        url,
        method: response.request().method(),
        status: response.status(),
        contentType: response.headers()["content-type"],
        resourceType: response.request().resourceType(),
      });
    });

    const companies = await session.listCompanies();
    console.log(`Empresas: ${companies.length}`);
    const company = companies[0];
    if (!company) {
      throw new Error("Nenhuma empresa para probe.");
    }
    console.log(`Usando: ${company.inscricao} - ${company.nome}`);

    const pdf = await session.download(company, config.competencia, "pdf");
    console.log(`PDF bytes=${pdf.bytes.byteLength} isPdf=${isPdf(pdf.bytes)}`);
    await fs.writeFile(path.join(OUT_DIR, "probe.pdf"), pdf.bytes);

    const xls = await session.download(company, config.competencia, "xls");
    console.log(`XLS bytes=${xls.bytes.byteLength} isXls=${isXls(xls.bytes)}`);
    await fs.writeFile(path.join(OUT_DIR, "probe.xls"), xls.bytes);

    const interesting = captured.filter(
      (item) =>
        /process\.jsp|Downloader|JasperPDF|application\/pdf|excel|octet-stream|T34693|demonstrativo/i.test(
          `${item.url} ${item.contentType ?? ""}`,
        ),
    );

    await fs.writeFile(
      SUMMARY_PATH,
      JSON.stringify(
        {
          competencia: config.competencia.value,
          company,
          pdfBytes: pdf.bytes.byteLength,
          xlsBytes: xls.bytes.byteLength,
          pdfOk: isPdf(pdf.bytes),
          xlsOk: isXls(xls.bytes),
          interestingRequests: interesting,
          allSefazRequests: captured.slice(-80),
        },
        null,
        2,
      ),
      "utf8",
    );
    console.log(`Summary: ${SUMMARY_PATH}`);
  } finally {
    await session.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
