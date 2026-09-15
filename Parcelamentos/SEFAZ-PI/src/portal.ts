import fs from "node:fs/promises";
import path from "node:path";
import type { Browser, Locator, Page } from "playwright";
import type { InputRow, ParcelCandidate, RunResult, SituacaoVencimento } from "./types.js";
import {
  buildPdfFileName,
  classifyDueDate,
  escapeRegex,
  extractBrazilianDates,
  normalizeWhitespace,
  resolveSaveDir,
  shouldEmitParcelByDueStatus,
} from "./utils.js";

const DARWEB_INDEX = "https://webas.sefaz.pi.gov.br/darweb/faces/views/index.xhtml";

function buildErrorResult(row: InputRow, message: string, extra?: Partial<RunResult>): RunResult {
  return {
    rowNumber: row.rowNumber,
    codigo: row.codigo,
    empresa: row.empresa,
    cnpj: row.cnpj,
    numeroParcelamento: extra?.numeroParcelamento ?? row.numeroParcelamento,
    parcela: extra?.parcela ?? row.parcela,
    vencimento: extra?.vencimento ?? row.vencimento ?? "",
    situacaoVencimento: extra?.situacaoVencimento,
    status: "erro",
    mensagem: message,
  };
}

function buildIgnoredResult(row: InputRow, candidate: ParcelCandidate): RunResult {
  return {
    rowNumber: row.rowNumber,
    codigo: row.codigo,
    empresa: row.empresa,
    cnpj: row.cnpj,
    numeroParcelamento: candidate.numeroParcelamento,
    parcela: candidate.parcela,
    vencimento: candidate.vencimento,
    situacaoVencimento: candidate.situacaoVencimento,
    status: "ignorado",
    mensagem: "Parcela futura ignorada conforme regra de emissao.",
  };
}

function buildSuccessResult(
  row: InputRow,
  candidate: ParcelCandidate,
  nomeOriginalPdf: string,
  pdfPath: string,
): RunResult {
  return {
    rowNumber: row.rowNumber,
    codigo: row.codigo,
    empresa: row.empresa,
    cnpj: row.cnpj,
    numeroParcelamento: candidate.numeroParcelamento,
    parcela: candidate.parcela,
    vencimento: candidate.vencimento,
    situacaoVencimento: candidate.situacaoVencimento,
    nomeOriginalPdf,
    pdfPath,
    status: "sucesso",
    mensagem: `PDF salvo em ${pdfPath}`,
  };
}

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
    "Nao foi possivel localizar o campo de numero do parcelamento na tela de consulta.",
  );
}

async function navigateToConsulta(page: Page, row: InputRow): Promise<void> {
  await page.goto(DARWEB_INDEX, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "ICMS" }).click();
  await page.getByRole("combobox").first().selectOption({ label: row.tipoReceita });
  await page.getByRole("button", { name: "Avançar" }).click();

  const inscricaoInput = page.locator("#inscricao");
  await inscricaoInput.click();
  await inscricaoInput.fill(row.inscricaoEstadual);
  await page.getByRole("button", { name: "Avançar" }).click();
}

async function downloadPdfFromCurrentPage(
  page: Page,
  row: InputRow,
  candidate: ParcelCandidate,
  saveDirResolved: string,
): Promise<RunResult> {
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
  const targetName = buildPdfFileName(
    row.codigo,
    candidate.parcela,
    row.empresa,
    candidate.vencimento,
  );
  const pdfPath = path.join(saveDirResolved, targetName);
  await download.saveAs(pdfPath);
  await popup.close().catch(() => undefined);

  return buildSuccessResult(row, candidate, suggested, pdfPath);
}

function parseCandidateFromRowText(text: string): ParcelCandidate | null {
  const normalized = normalizeWhitespace(text);
  if (!normalized || /cabe[cç]alho|header|selecione/i.test(normalized)) {
    return null;
  }

  const dates = extractBrazilianDates(normalized);
  if (dates.length === 0) {
    return null;
  }

  const vencimento = dates[dates.length - 1]!;
  const tokens = normalized.split(" ").filter(Boolean);
  const dateIndex = tokens.findIndex((token) => token === vencimento);
  const beforeDate = dateIndex > 0 ? tokens.slice(0, dateIndex) : tokens;

  const numericTokens = beforeDate.filter((token) => /^\d+$/.test(token.replace(/\D/g, "")) && token.replace(/\D/g, "").length > 0);
  if (numericTokens.length === 0) {
    return null;
  }

  const numeroParcelamento = numericTokens[0]!.replace(/\D/g, "");
  const parcela = (numericTokens[1] ?? "1").replace(/\D/g, "") || "1";

  let situacaoVencimento: SituacaoVencimento;
  try {
    situacaoVencimento = classifyDueDate(vencimento);
  } catch {
    return null;
  }

  return {
    numeroParcelamento,
    parcela,
    vencimento,
    situacaoVencimento,
    rowName: normalized,
  };
}

async function listGridCandidates(page: Page): Promise<ParcelCandidate[]> {
  const grid = page.getByRole("grid");
  await grid.waitFor({ state: "visible", timeout: 20_000 });
  await grid.click({ timeout: 5_000 }).catch(() => undefined);

  const rows = grid.getByRole("row");
  const count = await rows.count();
  const candidates: ParcelCandidate[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    const text = normalizeWhitespace(await row.innerText().catch(() => ""));
    const candidate = parseCandidateFromRowText(text);
    if (!candidate) {
      continue;
    }

    const key = `${candidate.numeroParcelamento}|${candidate.parcela}|${candidate.vencimento}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    candidates.push(candidate);
  }

  return candidates;
}

async function openCandidateRow(page: Page, candidate: ParcelCandidate): Promise<void> {
  const grid = page.getByRole("grid");
  await grid.waitFor({ state: "visible" });

  const exact = page.getByRole("row", {
    name: new RegExp(
      `${escapeRegex(candidate.numeroParcelamento)}.*${escapeRegex(candidate.parcela)}.*${escapeRegex(candidate.vencimento)}`,
      "i",
    ),
  });

  if ((await exact.count()) > 0) {
    await exact.first().getByRole("link").first().click();
    return;
  }

  const byDate = page.getByRole("row", { name: new RegExp(escapeRegex(candidate.vencimento), "i") });
  if ((await byDate.count()) > 0) {
    await byDate.first().getByRole("link").first().click();
    return;
  }

  throw new Error(`Nao foi possivel abrir a parcela ${candidate.parcela} com vencimento ${candidate.vencimento}.`);
}

async function processLegacySingleParcel(
  page: Page,
  row: InputRow,
  saveDirResolved: string,
): Promise<RunResult[]> {
  const numeroParcelamento = row.numeroParcelamento ?? "";
  const parcela = row.parcela ?? "";
  const vencimento = row.vencimento ?? "";

  await fillNumeroParcelamento(page, numeroParcelamento);
  await page.getByRole("button", { name: "Consultar", exact: true }).click();

  const situacaoVencimento = classifyDueDate(vencimento);
  const candidate: ParcelCandidate = {
    numeroParcelamento,
    parcela,
    vencimento,
    situacaoVencimento,
    rowName: `${numeroParcelamento} ${parcela} ${vencimento}`,
  };

  if (!shouldEmitParcelByDueStatus(situacaoVencimento)) {
    return [buildIgnoredResult(row, candidate)];
  }

  await openCandidateRow(page, candidate);
  return [await downloadPdfFromCurrentPage(page, row, candidate, saveDirResolved)];
}

async function processAutoParcels(
  browser: Browser,
  row: InputRow,
  saveDirResolved: string,
): Promise<RunResult[]> {
  const discoveryContext = await browser.newContext({
    acceptDownloads: true,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1280, height: 1080 },
  });
  const discoveryPage = await discoveryContext.newPage();
  discoveryPage.setDefaultTimeout(45_000);

  let candidates: ParcelCandidate[] = [];

  try {
    await navigateToConsulta(discoveryPage, row);

    // Tenta listar sem numero; se o portal exigir, o botao Consultar ainda pode listar por IE.
    const consultar = discoveryPage.getByRole("button", { name: "Consultar", exact: true });
    if ((await consultar.count()) > 0) {
      await consultar.click().catch(() => undefined);
    }

    candidates = await listGridCandidates(discoveryPage);
  } finally {
    await discoveryContext.close();
  }

  if (candidates.length === 0) {
    return [
      buildErrorResult(row, "Sem parcelamentos ativos ou a grade de parcelas nao foi encontrada."),
    ];
  }

  const results: RunResult[] = [];

  for (const candidate of candidates) {
    if (!shouldEmitParcelByDueStatus(candidate.situacaoVencimento)) {
      results.push(buildIgnoredResult(row, candidate));
      continue;
    }

    const context = await browser.newContext({
      acceptDownloads: true,
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      viewport: { width: 1280, height: 1080 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(45_000);

    try {
      await navigateToConsulta(page, row);
      await fillNumeroParcelamento(page, candidate.numeroParcelamento);
      await page.getByRole("button", { name: "Consultar", exact: true }).click();
      await openCandidateRow(page, candidate);
      results.push(await downloadPdfFromCurrentPage(page, row, candidate, saveDirResolved));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push(
        buildErrorResult(row, message, {
          numeroParcelamento: candidate.numeroParcelamento,
          parcela: candidate.parcela,
          vencimento: candidate.vencimento,
          situacaoVencimento: candidate.situacaoVencimento,
        }),
      );
    } finally {
      await context.close();
    }
  }

  return results;
}

export async function processPortalRow(browser: Browser, row: InputRow, cwd: string): Promise<RunResult[]> {
  const saveDirResolved = resolveSaveDir(cwd, row.saveDir);
  await fs.mkdir(saveDirResolved, { recursive: true });

  const isLegacy = Boolean(row.numeroParcelamento && row.parcela && row.vencimento);

  if (isLegacy) {
    const context = await browser.newContext({
      acceptDownloads: true,
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      viewport: { width: 1280, height: 1080 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(45_000);

    try {
      await navigateToConsulta(page, row);
      return await processLegacySingleParcel(page, row, saveDirResolved);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [buildErrorResult(row, message)];
    } finally {
      await context.close();
    }
  }

  try {
    return await processAutoParcels(browser, row, saveDirResolved);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [buildErrorResult(row, message)];
  }
}

// Mantido para tipagem/debug de locators em evolucoes futuras.
export type _Locator = Locator;
