import fs from "node:fs/promises";
import path from "node:path";
import type { Browser, Page } from "playwright";
import type { InputRow, RunResult } from "./types.js";
import {
  buildPdfFileName,
  escapeRegex,
  normalizeWhitespace,
  resolveSaveDir,
} from "./utils.js";

const DARWEB_INDEX = "https://webas.sefaz.pi.gov.br/darweb/faces/views/index.xhtml";

function buildErrorResult(row: InputRow, message: string): RunResult {
  return {
    rowNumber: row.rowNumber,
    codigo: row.codigo,
    empresa: row.empresa,
    cnpj: row.cnpj,
    numeroParcelamento: row.numeroParcelamento,
    parcela: row.parcela,
    vencimento: row.vencimento,
    status: "erro",
    mensagem: message,
  };
}

function buildSuccessResult(
  row: InputRow,
  nomeOriginalPdf: string,
  pdfPath: string,
  message: string,
): RunResult {
  return {
    rowNumber: row.rowNumber,
    codigo: row.codigo,
    empresa: row.empresa,
    cnpj: row.cnpj,
    numeroParcelamento: row.numeroParcelamento,
    parcela: row.parcela,
    vencimento: row.vencimento,
    nomeOriginalPdf,
    pdfPath,
    status: "sucesso",
    mensagem: message,
  };
}

/** Campo de consulta do parcelamento: evita ID JSF (ex.: j_idt64). */
async function fillNumeroParcelamento(page: Page, value: string): Promise<void> {
  const byLabel = page.getByRole("textbox", {
    name: /parcelamento|n[uú]mero|consulta|d[eé]bito|c[oó]digo/i,
  });
  if ((await byLabel.count()) > 0) {
    await byLabel.first().fill(value);
    return;
  }

  const visibleTextInputs = page.locator("input[type='text']:visible");
  const count = await visibleTextInputs.count();
  if (count === 1) {
    await visibleTextInputs.first().fill(value);
    return;
  }

  const excludingInscricao = page.locator("input[type='text']:visible:not(#inscricao)");
  if ((await excludingInscricao.count()) > 0) {
    await excludingInscricao.first().fill(value);
    return;
  }

  throw new Error(
    "Nao foi possivel localizar o campo de numero do parcelamento na tela de consulta. Ajuste os locators em portal.ts apos inspecionar o portal.",
  );
}

function rowNamePattern(row: InputRow): RegExp {
  const n = escapeRegex(normalizeWhitespace(row.numeroParcelamento));
  const p = escapeRegex(normalizeWhitespace(row.parcela));
  const v = escapeRegex(normalizeWhitespace(row.vencimento));
  return new RegExp(`${n}.*${p}.*${v}`, "i");
}

export async function processPortalRow(browser: Browser, row: InputRow, cwd: string): Promise<RunResult[]> {
  const context = await browser.newContext({
    acceptDownloads: true,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1280, height: 1080 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);

  const saveDirResolved = resolveSaveDir(cwd, row.saveDir);
  await fs.mkdir(saveDirResolved, { recursive: true });

  try {
    await page.goto(DARWEB_INDEX, { waitUntil: "domcontentloaded" });

    await page.getByRole("link", { name: "ICMS" }).click();

    await page.getByRole("combobox").first().selectOption({ label: row.tipoReceita });

    await page.getByRole("button", { name: "Avançar" }).click();

    const inscricaoInput = page.locator("#inscricao");
    await inscricaoInput.click();
    await inscricaoInput.fill(row.inscricaoEstadual);

    await page.getByRole("button", { name: "Avançar" }).click();

    await fillNumeroParcelamento(page, row.numeroParcelamento);

    await page.getByRole("button", { name: "Consultar", exact: true }).click();

    const grid = page.getByRole("grid");
    await grid.waitFor({ state: "visible" });
    await grid.click({ timeout: 5_000 }).catch(() => undefined);

    const targetRow = page.getByRole("row", { name: rowNamePattern(row) });
    await targetRow.waitFor({ state: "visible" });
    await targetRow.getByRole("link").first().click();

    const pdfTrigger = page.locator("#pdf").or(page.getByRole("link", { name: /pdf/i })).or(page.getByRole("button", { name: /pdf/i }));
    const popupPromise = page.waitForEvent("popup");
    await pdfTrigger.first().click();
    const popup = await popupPromise;
    popup.setDefaultTimeout(45_000);
    await popup.waitForLoadState("domcontentloaded");

    const iframeCount = await popup.locator("iframe").count();
    const frameLocator = iframeCount > 1 ? popup.frameLocator("iframe").last() : popup.frameLocator("iframe").first();

    const baixar = frameLocator.getByRole("button", { name: "Baixar" });
    await baixar.waitFor({ state: "visible" });

    const downloadPromise = popup.waitForEvent("download");
    await baixar.click();
    const download = await downloadPromise;

    const suggested = download.suggestedFilename();
    const targetName = buildPdfFileName(row.codigo, row.parcela, row.empresa, row.vencimento);
    const pdfPath = path.join(saveDirResolved, targetName);

    await download.saveAs(pdfPath);

    return [
      buildSuccessResult(
        row,
        suggested,
        pdfPath,
        `PDF salvo em ${pdfPath}`,
      ),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [buildErrorResult(row, message)];
  } finally {
    await context.close();
  }
}
