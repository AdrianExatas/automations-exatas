import fs from "node:fs/promises";
import path from "node:path";
import { Browser, Download, Locator, Page } from "playwright";
import type { InputRow, ParcelamentoDetalhe, ParcelamentoItem, RunResult } from "./types.js";
import { buildOutputPath, parseParcelasTotais } from "./utils.js";

export const PORTAL_URL = "https://contribuinte.sefaz.al.gov.br/parcelamento/#/";

export async function processPortalRow(browser: Browser, row: InputRow, outputRoot: string): Promise<RunResult[]> {
  const context = await browser.newContext({
    acceptDownloads: true,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);

  try {
    await login(page, row);
    await openConsolidacoes(page);

    const parcelamentos = await collectParcelamentos(page);
    if (parcelamentos.length === 0) {
      return [buildErrorResult(row, undefined, "Nenhum parcelamento foi encontrado para a empresa.")];
    }

    const results: RunResult[] = [];

    for (const item of parcelamentos) {
      try {
        const detalhe = await openParcelamentoModal(page, item);
        const download = await calculateAndDownload(page);
        const savedPath = await saveDownload(download, outputRoot, row.empresa, detalhe);
        results.push(buildSuccessResult(row, detalhe, savedPath));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push(
          buildErrorResult(
            row,
            {
              consolidacao: item.consolidacao,
            },
            `Falha ao processar o parcelamento ${item.consolidacao}: ${message}`,
          ),
        );
      } finally {
        await closeParcelamentoModal(page);
      }
    }

    return results;
  } finally {
    await context.close();
  }
}

async function login(page: Page, row: InputRow): Promise<void> {
  await page.goto(PORTAL_URL, { waitUntil: "domcontentloaded" });
  await page.locator("#link-acesso-parcelamento").click();
  await page.getByRole("textbox", { name: "Usuário" }).fill(row.usuario);
  await page.getByRole("textbox", { name: "Senha" }).fill(row.senha);
  await page.getByRole("button", { name: "Acessar" }).click();

  const consolidacoesLink = page.getByRole("link", { name: /Consolidações \/ Parcela/i });
  await consolidacoesLink.waitFor({ state: "visible", timeout: 30_000 }).catch(async () => {
    const bodyText = await page.locator("body").innerText().catch(() => "");
    throw new Error(
      bodyText.toLowerCase().includes("inválid")
        ? "Falha de autenticação no portal."
        : "O portal não exibiu o menu de consolidações após o login.",
    );
  });
}

async function openConsolidacoes(page: Page): Promise<void> {
  await page.getByRole("link", { name: /Consolidações \/ Parcela/i }).click();
  await page.locator("#datatable-0 tbody tr.data-table-row").first().waitFor({ state: "visible", timeout: 30_000 });
}

async function collectParcelamentos(page: Page): Promise<ParcelamentoItem[]> {
  return page.locator("#datatable-0 tbody tr.data-table-row").evaluateAll((rows: Element[]) => {
    return rows
      .map((row, rowIndex) => {
        const numeroDebito = row.querySelector("th.column-numeroDebito")?.textContent?.trim() ?? "";
        const consolidacaoText = row.querySelector("td.column-id")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
        const consolidacaoMatch = consolidacaoText.match(/^(\d+)/);
        const totalConsolidacao =
          row.querySelector("td.column-totalDaConsolidacao")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
        const situacao = row.querySelector("td.column-situacao")?.textContent?.replace(/\s+/g, " ").trim() ?? "";

        return {
          rowIndex,
          numeroDebito,
          consolidacao: consolidacaoMatch?.[1] ?? "",
          descricao: consolidacaoText,
          totalConsolidacao,
          situacao,
        };
      })
      .filter((item) => item.numeroDebito && item.consolidacao);
  });
}

async function openParcelamentoModal(page: Page, item: ParcelamentoItem): Promise<ParcelamentoDetalhe> {
  const row = page.locator("#datatable-0 tbody tr.data-table-row").nth(item.rowIndex);
  await row.locator('button[title^="Emissão de parcelas/Extrato"]').click();

  const modal = getModal(page);
  await modal.waitFor({ state: "visible", timeout: 30_000 });

  const detailsText = await modal.locator(".modal-body").innerText();
  const consolidacao = extractValue(detailsText, /Consolidação:\s*(\d+)/i, "Consolidação");
  const parcelamento = extractValue(detailsText, /Parcelamento:\s*(\d+)/i, "Parcelamento");
  const parcelasTotaisText = extractValue(detailsText, /Parcelas Totais:\s*([0-9]+\s*\/\s*[0-9]+)/i, "Parcelas Totais");
  const { parcelasJaPagas, totalParcelas } = parseParcelasTotais(parcelasTotaisText);

  return {
    consolidacao,
    parcelamento,
    parcelasTotais: `${parcelasJaPagas}/${totalParcelas}`,
    parcelasJaPagas,
    numeroParcelaEmitida: parcelasJaPagas + 1,
    totalParcelas,
  };
}

async function calculateAndDownload(page: Page): Promise<Download> {
  const modal = getModal(page);
  await modal.getByRole("spinbutton", { name: /Quantidade/i }).fill("1");
  await modal.getByRole("button", { name: "Calcular Parcela" }).click();

  const rows = modal.locator("table.table-parcelas tbody tr");
  await rows.first().waitFor({ state: "visible", timeout: 30_000 });

  const downloadPromise = page.waitForEvent("download");
  await rows.first().locator("button.btn.btn-primary").click();
  return downloadPromise;
}

async function saveDownload(
  download: Download,
  outputRoot: string,
  empresa: string,
  detalhe: ParcelamentoDetalhe,
): Promise<string> {
  const finalPath = buildOutputPath(
    outputRoot,
    empresa,
    detalhe.consolidacao,
    detalhe.numeroParcelaEmitida,
    detalhe.totalParcelas,
  );
  await fs.mkdir(path.dirname(finalPath), { recursive: true });
  await download.saveAs(finalPath);
  return finalPath;
}

async function closeParcelamentoModal(page: Page): Promise<void> {
  const modal = getModal(page);
  if (!(await modal.isVisible().catch(() => false))) {
    return;
  }

  const closeButton = modal.locator(".modal-header button.close");
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click();
    await modal.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => undefined);
  }
}

function getModal(page: Page): Locator {
  return page.locator("ngb-modal-window .modal-content");
}

function extractValue(text: string, pattern: RegExp, fieldName: string): string {
  const match = text.match(pattern);
  if (!match?.[1]) {
    throw new Error(`Não foi possível localizar o campo "${fieldName}" no modal.`);
  }

  return match[1].trim();
}

function buildSuccessResult(row: InputRow, detalhe: ParcelamentoDetalhe, arquivoSalvo: string): RunResult {
  return {
    rowNumber: row.rowNumber,
    empresa: row.empresa,
    usuario: row.usuario,
    consolidacao: detalhe.consolidacao,
    parcelamento: detalhe.parcelamento,
    parcelasTotais: detalhe.parcelasTotais,
    parcelasJaPagas: detalhe.parcelasJaPagas,
    numeroParcelaEmitida: detalhe.numeroParcelaEmitida,
    totalParcelas: detalhe.totalParcelas,
    arquivoSalvo,
    status: "sucesso",
    mensagem: `Boleto atual baixado com sucesso para a consolidação ${detalhe.consolidacao}.`,
  };
}

function buildErrorResult(
  row: InputRow,
  detalhe:
    | Partial<
        Pick<
          ParcelamentoDetalhe,
          "consolidacao" | "parcelamento" | "parcelasTotais" | "parcelasJaPagas" | "numeroParcelaEmitida" | "totalParcelas"
        >
      >
    | undefined,
  mensagem: string,
): RunResult {
  return {
    rowNumber: row.rowNumber,
    empresa: row.empresa,
    usuario: row.usuario,
    consolidacao: detalhe?.consolidacao,
    parcelamento: detalhe?.parcelamento,
    parcelasTotais: detalhe?.parcelasTotais,
    parcelasJaPagas: detalhe?.parcelasJaPagas,
    numeroParcelaEmitida: detalhe?.numeroParcelaEmitida,
    totalParcelas: detalhe?.totalParcelas,
    status: "erro",
    mensagem,
  };
}
