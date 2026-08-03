import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Download, type Page } from "playwright";
import { buildClientCertificates } from "../../shared/sefaz-auth";
import { loginSefazContabilista, openDiaModule } from "../../shared/sefaz-playwright-login";
import { saveFile } from "./downloads";
import { isPdf, isXls } from "./signatures";
import type { Company, Competencia, DownloadResult, ReportFormat, RunConfig } from "./types";

const DEMONSTRATIVO_TRANS_FRAGMENT = "TransId=T34693";

export async function listCompaniesViaPlaywright(config: RunConfig): Promise<Company[]> {
  const session = await createLoggedContext(config);
  try {
    const { context } = session;
    const page = context.pages()[0] ?? (await context.newPage());
    await openDemonstrativo(page, config);
    return page.locator("#cdPessoaLookup option").evaluateAll((options) =>
      options
        .map((option) => {
          const html = option as HTMLOptionElement;
          const inscricao = html.value.trim();
          const label = html.textContent?.replace(/\s+/g, " ").trim() ?? "";
          const nome = label.replace(new RegExp(`^${inscricao}\\s*-\\s*`), "").trim();
          return inscricao ? { inscricao, nome: nome || label || inscricao } : undefined;
        })
        .filter((company): company is Company => Boolean(company)),
    );
  } finally {
    await session.browser.close();
  }
}

export async function downloadViaPlaywright(
  config: RunConfig,
  company: Company,
  competencia: Competencia,
  format: ReportFormat,
): Promise<DownloadResult> {
  const tempDir = path.resolve(config.outDir, ".tmp-playwright");
  await fs.mkdir(tempDir, { recursive: true });

  const session = await createLoggedContext(config);
  try {
    const { context } = session;
    const page = context.pages()[0] ?? (await context.newPage());
    await openDemonstrativo(page, config);
    await page.locator("#cdPessoaLookup").selectOption(company.inscricao);
    await page.locator("#nrMesDia").waitFor({ state: "visible", timeout: config.timeoutMs });
    await page.locator("#nrMesDia").selectOption(competencia.monthSelectValue);
    await page.locator("#nrAno").selectOption(String(competencia.year));
    await page.locator("#tpFormato").selectOption(format === "xls" ? "1" : "0");

    const bytes = format === "xls" ? await downloadExcel(page, tempDir, config.timeoutMs) : await downloadPdf(page, tempDir, config.timeoutMs);
    if (format === "xls" && !isXls(bytes)) {
      throw new Error("Fallback Playwright baixou um arquivo que nao parece XLS.");
    }
    if (format === "pdf" && !isPdf(bytes)) {
      throw new Error("Fallback Playwright baixou um arquivo que nao parece PDF.");
    }

    return { bytes };
  } finally {
    await session.browser.close();
  }
}

async function createLoggedContext(config: RunConfig): Promise<{ browser: Browser; context: BrowserContext }> {
  const browser = await chromium.launch({ headless: config.headless });
  const context = await browser.newContext({
    acceptDownloads: true,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1280, height: 900 },
    clientCertificates: buildClientCertificates(config.certificate),
  });
  context.setDefaultTimeout(config.timeoutMs);
  const page = await context.newPage();
  await loginSefazContabilista(page, config);
  await openDiaModule(page, config.timeoutMs);
  return { browser, context };
}

async function openDemonstrativo(page: Page, config: RunConfig): Promise<void> {
  const direct = page.locator("#cdPessoaLookup");
  if (await direct.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  await page
    .locator(`a[href*="${DEMONSTRATIVO_TRANS_FRAGMENT}"]`)
    .or(page.getByRole("link", { name: /Demonstrativo\s*ICMS\s*Antecipado/i }))
    .first()
    .click({ timeout: config.timeoutMs });
  await page.locator("#cdPessoaLookup").waitFor({ state: "visible", timeout: config.timeoutMs });
}

async function downloadExcel(page: Page, tempDir: string, timeoutMs: number): Promise<Uint8Array> {
  const download = await waitForDownloadFromPage(page, async () => {
    await page.locator("#okButton").click();
  }, timeoutMs);
  return readDownload(download, tempDir);
}

async function downloadPdf(page: Page, tempDir: string, timeoutMs: number): Promise<Uint8Array> {
  const downloadPromise = page.waitForEvent("download", { timeout: timeoutMs }).catch(() => undefined);
  const popupPromise = page.waitForEvent("popup", { timeout: timeoutMs }).catch(() => undefined);
  await page.locator("#okButton").click();

  const first = await Promise.race([
    downloadPromise.then((download) => ({ kind: "download" as const, download })),
    popupPromise.then((popup) => ({ kind: "popup" as const, popup })),
  ]);
  if (first.kind === "download" && first.download) {
    return readDownload(first.download, tempDir);
  }

  const popup = first.kind === "popup" ? first.popup : undefined;
  if (!popup) {
    throw new Error("PDF nao gerou download nem popup no fallback Playwright.");
  }

  await popup.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => undefined);
  const pdfUrl = await waitForNonBlankUrl(popup, timeoutMs);
  const response = await popup.request.get(pdfUrl || "https://security.sefaz.se.gov.br/iBusinessPortal/jsp/templates/Pdf/JasperPDF.jsp?AppName=SIT&TransId=T34693", {
    timeout: timeoutMs,
  });
  const bytes = new Uint8Array(await response.body());
  await popup.close().catch(() => undefined);
  return bytes;
}

async function waitForDownloadFromPage(page: Page, action: () => Promise<void>, timeoutMs: number): Promise<Download> {
  const promise = page.waitForEvent("download", { timeout: timeoutMs });
  await action();
  return promise;
}

async function waitForNonBlankUrl(page: Page, timeoutMs: number): Promise<string | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = page.url();
    if (url && !url.toLowerCase().includes("about:blank")) {
      return url;
    }
    await page.waitForTimeout(250);
  }

  return undefined;
}

async function readDownload(download: Download, tempDir: string): Promise<Uint8Array> {
  const tempPath = path.join(tempDir, `${Date.now()}-${download.suggestedFilename()}`);
  await download.saveAs(tempPath);
  const bytes = await fs.readFile(tempPath);
  await fs.rm(tempPath, { force: true }).catch(() => undefined);
  return bytes;
}

export async function saveFallbackResult(filePath: string, result: DownloadResult): Promise<void> {
  await saveFile(filePath, result.bytes);
}
