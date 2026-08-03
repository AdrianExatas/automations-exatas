import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import {
  APIResponse,
  Browser,
  BrowserContext,
  Download,
  FrameLocator,
  Locator,
  Page,
  Response as PlaywrightResponse,
} from "playwright";
import type { InputRow, ParcelMetadata, ResultTransport, RunResult } from "./types.js";
import {
  buildPdfFileName,
  buildSolicitationMonthFolder,
  classifyDueDate,
  formatToastMessage,
  normalizeWhitespace,
  parseInteger,
  resolveParcelLabel,
  shouldEmitParcelByDueStatus,
} from "./utils.js";

const LOGIN_URL = "https://www.sefaz.se.gov.br/SitePages/login_autoreg.aspx";
const IFRAME_SELECTOR = 'iframe[name="MSOPageViewerWebPart_WebPartWPQ1"]';

type DetailDictionary = Record<string, string>;

type TableRowInfo = {
  id: string;
  protocolo: string;
  vencimento: string;
  valorParcela: string;
};

type PortalSession = {
  context: BrowserContext;
  page: Page;
  frame: FrameLocator;
};

export interface PortalNetworkCapture {
  attachPage: (page: Page) => void;
}

export interface ProcessPortalRowOptions {
  networkCapture?: PortalNetworkCapture;
  resultTransport?: ResultTransport;
}

type PaymentPdf = {
  originalFilename: string;
  source: "http" | "browser";
  saveAs: (targetPath: string) => Promise<void>;
};

class PortalToastError extends Error {
  readonly toast: string;

  constructor(contexto: string, toast: string) {
    super(`${contexto}: ${toast}`);
    this.name = "PortalToastError";
    this.toast = toast;
  }
}

export async function processPortalRow(
  browser: Browser,
  row: InputRow,
  cwd: string,
  options: ProcessPortalRowOptions = {},
): Promise<RunResult[]> {
  const resultTransport = options.resultTransport ?? "browser";
  const collection = await collectParcelMetadata(browser, row, options);
  const results: RunResult[] = [...collection.errors];

  for (const metadata of collection.parcels) {
    if (!shouldEmitParcelByDueStatus(metadata.situacaoVencimento)) {
      results.push(buildIgnoredResult(row, metadata, resultTransport));
      continue;
    }

    results.push(await processSingleParcel(browser, row, metadata, cwd, options));
  }

  if (results.length === 0) {
    return [
      buildErrorResult(
        row,
        undefined,
        `Nenhuma parcela disponivel foi identificada para o codigo ${row.codigo}.`,
        undefined,
        resultTransport,
      ),
    ];
  }

  return results;
}

async function createPortalSession(
  browser: Browser,
  row: InputRow,
  networkCapture?: PortalNetworkCapture,
): Promise<PortalSession> {
  const context = await browser.newContext({
    acceptDownloads: true,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1280, height: 1080 },
  });
  const page = await context.newPage();
  networkCapture?.attachPage(page);
  page.setDefaultTimeout(30_000);

  try {
    await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded" });
    await acceptPrivacyBanner(page);

    const frame = page.frameLocator(IFRAME_SELECTOR);
    await selectInscricaoEstadualLogin(frame);
    await fillLoginInput(frame, "inscricaoEstadual", row.inscricaoEstadual);
    const cpfInput = loginInputLocator(frame, "cpfSolicitante");
    const confirmButton = frame.getByRole("button", { name: "Confirmar" });
    await cpfInput.fill(row.cpf);
    await cpfInput.press("Tab");
    await waitForLocatorEnabled(confirmButton, "botao Confirmar");
    await confirmButton.click();

    const parcelamentosCard = frame.locator('[data-cy="debitos-parcelamentos-card"]');
    await waitForSuccessOrError(
      frame,
      "Falha ao carregar os dados da empresa",
      () => parcelamentosCard.isVisible().catch(() => false),
      60_000,
    );

    const cardSpinner = parcelamentosCard.locator('[role="progressbar"]');
    if (await cardSpinner.isVisible().catch(() => false)) {
      await waitForSuccessOrError(
        frame,
        "Falha ao carregar os dados da empresa",
        () => cardSpinner.isHidden().catch(() => false),
        60_000,
      );
    }

    await parcelamentosCard.click();
    await waitForSuccessOrError(
      frame,
      "Falha ao carregar a tabela de debitos",
      () => frame.locator('[data-cy="detalhes-debitos-table"]').isVisible().catch(() => false),
      60_000,
    );

    return { context, page, frame };
  } catch (error) {
    await context.close();
    throw error;
  }
}

async function selectInscricaoEstadualLogin(frame: FrameLocator): Promise<void> {
  const button = frame.getByRole("button", { name: /^Inscri/i }).first();
  if (await button.isVisible().catch(() => false)) {
    await button.click();
    return;
  }

  await frame.getByRole("radio", { name: /Inscri/i }).click();
}

function loginInputLocator(frame: FrameLocator, field: "inscricaoEstadual" | "cpfSolicitante"): Locator {
  if (field === "inscricaoEstadual") {
    return frame.locator("#cdPessoaContribuinte, input[name='cdPessoaContribuinte']").or(
      frame.getByRole("textbox", { name: /Inscri/i }),
    );
  }

  return frame.locator("#input-cdPessoaSolicitante, input[name='cdPessoaSolicitante']").or(
    frame.getByRole("textbox", { name: /CPF ou CNPJ/i }),
  );
}

async function fillLoginInput(
  frame: FrameLocator,
  field: "inscricaoEstadual" | "cpfSolicitante",
  value: string,
): Promise<void> {
  const input = loginInputLocator(frame, field);
  await input.waitFor({ state: "visible", timeout: 30_000 });
  await input.fill(value);
}

async function collectParcelMetadata(
  browser: Browser,
  row: InputRow,
  options: ProcessPortalRowOptions,
): Promise<{ parcels: ParcelMetadata[]; errors: RunResult[] }> {
  const session = await createPortalSession(browser, row, options.networkCapture);
  const resultTransport = options.resultTransport ?? "browser";

  try {
    let availableRows: TableRowInfo[];
    try {
      availableRows = await collectAvailableRows(session.frame, row.codigo);
    } catch (error) {
      const { message, toast } = getErrorDetails(error);
      if (message.includes("Nenhum registro encontrado") || toast) {
        return { parcels: [], errors: [buildErrorResult(row, undefined, message, toast, resultTransport)] };
      }

      throw error;
    }

    const parcels: ParcelMetadata[] = [];
    const errors: RunResult[] = [];

    for (const availableRow of availableRows) {
      try {
        await expandRowDetails(session.frame, availableRow.id);
        const details = await readRowDetails(session.frame, availableRow.id);
        parcels.push(buildParcelMetadata(availableRow, details));
      } catch (error) {
        const { message, toast } = getErrorDetails(error);
        errors.push(
          buildErrorResult(
            row,
            {
              protocolo: availableRow.protocolo,
              vencimento: availableRow.vencimento,
              valorParcela: availableRow.valorParcela,
            },
            buildFailureMessage("Falha ao preparar a parcela para emissao", message, toast),
            toast,
            resultTransport,
          ),
        );
      }
    }

    return { parcels, errors };
  } finally {
    await session.context.close();
  }
}

async function processSingleParcel(
  browser: Browser,
  row: InputRow,
  targetMetadata: ParcelMetadata,
  cwd: string,
  options: ProcessPortalRowOptions,
): Promise<RunResult> {
  const session = await createPortalSession(browser, row, options.networkCapture);
  const resultTransport = options.resultTransport ?? "browser";

  try {
    const availableRows = await collectAvailableRows(session.frame, row.codigo);
    const targetRow = findMatchingAvailableRow(availableRows, targetMetadata);

    await expandRowDetails(session.frame, targetRow.id);
    const details = await readRowDetails(session.frame, targetRow.id);
    const metadata = buildParcelMetadata(targetRow, details);
    await selectDebtRow(session.frame, targetRow.id);
    await addToCashCart(session.page, session.frame);
    await openCashCart(session.frame);
    await goToSummary(session.frame);
    await generateBoleto(session.frame);

    const [downloadResult] = await downloadAllPayments(session.page, session.frame, row, [metadata], cwd);
    return downloadResult
      ? { ...downloadResult, transport: resultTransport }
      : buildErrorResult(row, metadata, "Nenhum resultado de download foi retornado para a parcela.", undefined, resultTransport);
  } catch (error) {
    const { message, toast } = getErrorDetails(error);
    return buildErrorResult(
      row,
      targetMetadata,
      buildFailureMessage("Falha ao emitir a parcela individualmente", message, toast),
      toast,
      resultTransport,
    );
  } finally {
    await session.context.close();
  }
}

async function dismissPrivacyBannerCore(page: Page): Promise<void> {
  const acceptButton = page.locator("#accept-button");
  await acceptButton.scrollIntoViewIfNeeded().catch(() => undefined);
  try {
    await acceptButton.click({ timeout: 3_000 });
  } catch {
    try {
      await acceptButton.click({ force: true, timeout: 3_000 });
    } catch {
      await page.evaluate(() => {
        const globalWindow = window as unknown as { acceptPrivacy?: () => void };
        if (typeof globalWindow.acceptPrivacy === "function") {
          globalWindow.acceptPrivacy();
        } else {
          document.getElementById("accept-button")?.click();
        }
      });
    }
  }
  await acceptButton.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => undefined);
}

/** Aguarda e aceita o banner na carga inicial (evita sair cedo só porque o iframe já está visível). */
async function acceptPrivacyBanner(page: Page): Promise<void> {
  const acceptButton = page.locator("#accept-button");
  const deadline = Date.now() + 20_000;
  let absentStreak = 0;

  while (Date.now() < deadline) {
    const count = await acceptButton.count().catch(() => 0);
    if (count > 0) {
      absentStreak = 0;
      if (await acceptButton.isVisible().catch(() => false)) {
        await dismissPrivacyBannerCore(page);
        return;
      }
    } else {
      absentStreak++;
      if (absentStreak >= 40) {
        return;
      }
    }
    await sleep(250);
  }
}

/** Remove o banner no documento pai se estiver visível (ex.: antes de clicar no iframe). */
async function dismissPrivacyBannerIfPresent(page: Page): Promise<void> {
  const acceptButton = page.locator("#accept-button");
  const deadline = Date.now() + 3_000;

  while (Date.now() < deadline) {
    if (await acceptButton.isVisible().catch(() => false)) {
      await dismissPrivacyBannerCore(page);
      return;
    }
    await sleep(200);
  }
}

async function waitForLocatorEnabled(locator: Locator, label: string): Promise<void> {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    if (await locator.isEnabled().catch(() => false)) {
      return;
    }

    await sleep(250);
  }

  throw new Error(`${label} nao foi habilitado dentro do tempo esperado.`);
}

async function collectAvailableRows(frame: FrameLocator, codigo: string): Promise<TableRowInfo[]> {
  await waitForDebtRowsOrEmptyState(frame, codigo);
  const rows = await frame.locator("tr.body-row").evaluateAll((elements: Element[]) => {
    return elements.map((element) => {
      const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
      const toggle = element.querySelector('[data-cy^="toggle-"]')?.getAttribute("data-cy") ?? "";
      const dueDate = text.match(/\b\d{2}\/\d{2}\/\d{4}\b/)?.[0] ?? "";
      const amount = text.match(/R\$\s*[\d.]+,\d{2}/)?.[0] ?? "";
      const protocolMatch = text.match(/PROTOCOLO N[\u00B0\u00BA]\s*(\d+)/i);

      return {
        toggle,
        dueDate,
        amount,
        protocol: protocolMatch?.[1] ?? "",
      };
    });
  });

  const mappedRows = rows
    .filter((candidate) => candidate.toggle)
    .map((candidate) => ({
      id: candidate.toggle.replace("toggle-", ""),
      protocolo: candidate.protocol,
      vencimento: candidate.dueDate,
      valorParcela: candidate.amount,
    }));

  if (mappedRows.length === 0) {
    throw new Error(`Nenhuma parcela disponivel foi identificada para o codigo ${codigo}.`);
  }

  return mappedRows;
}

async function waitForDebtRowsOrEmptyState(frame: FrameLocator, codigo: string): Promise<void> {
  const firstRow = frame.locator("tr.body-row").first();
  const emptyState = frame.getByRole("cell", { name: "Nenhum registro encontrado." });
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    await throwIfErrorToast(frame, "Falha ao carregar as parcelas disponiveis");

    if (await emptyState.isVisible().catch(() => false)) {
      throw new Error(`Nenhum registro encontrado para o codigo ${codigo}.`);
    }

    if (await firstRow.isVisible().catch(() => false)) {
      return;
    }

    await sleep(500);
  }

  throw new Error(`Tempo esgotado aguardando debitos na tela para o codigo ${codigo}.`);
}

async function expandRowDetails(frame: FrameLocator, rowId: string): Promise<void> {
  const detailLocator = frame.locator(`[data-cy="detalhes-${rowId}"]`);
  if (await detailLocator.isVisible().catch(() => false)) {
    return;
  }

  await frame.locator(`[data-cy="toggle-${rowId}"] button`).click();
  await waitForSuccessOrError(
    frame,
    "Falha ao preparar a parcela para emissao",
    () => detailLocator.isVisible().catch(() => false),
    30_000,
  );
}

async function readRowDetails(frame: FrameLocator, rowId: string): Promise<DetailDictionary> {
  const entries = await frame
    .locator(`[data-cy="detalhes-${rowId}"] dl.table-display dt, [data-cy="detalhes-${rowId}"] dl.table-display dd`)
    .evaluateAll((nodes: Element[]) => nodes.map((node) => (node.textContent ?? "").trim()).filter(Boolean));

  const details: DetailDictionary = {};
  for (let index = 0; index < entries.length; index += 2) {
    details[entries[index]] = entries[index + 1] ?? "";
  }

  return details;
}

function buildParcelMetadata(row: TableRowInfo, details: DetailDictionary): ParcelMetadata {
  const qtdeParcelas = parseInteger(details["Qtde de parcelas"] ?? "", "Qtde de parcelas");
  const parcelasPagas = parseInteger(details["Parcelas pagas"] ?? "", "Parcelas pagas");
  const parcelasAtrasadas = parseOptionalInteger(details["Parcelas atrasadas"]);
  const { parcelLabel, criterioRotulo } = resolveParcelLabel(details, qtdeParcelas, parcelasPagas, parcelasAtrasadas);
  const situacaoVencimento = classifyDueDate(row.vencimento);

  return {
    portalRowId: row.id,
    protocolo: row.protocolo,
    vencimento: row.vencimento,
    valorParcela: row.valorParcela,
    qtdeParcelas,
    parcelasPagas,
    parcelasAtrasadas,
    situacaoVencimento,
    parcelLabel,
    criterioRotulo,
  };
}

function parseOptionalInteger(value: string | undefined): number {
  return value && value.trim() ? parseInteger(value, "Parcelas atrasadas") : 0;
}

function findMatchingAvailableRow(availableRows: TableRowInfo[], metadata: ParcelMetadata): TableRowInfo {
  const matches = availableRows.filter((row) => {
    const sameProtocol = metadata.protocolo ? row.protocolo === metadata.protocolo : true;
    return sameProtocol && row.vencimento === metadata.vencimento && row.valorParcela === metadata.valorParcela;
  });

  if (matches.length === 1) {
    return matches[0]!;
  }

  if (matches.length > 1) {
    const exactRowIdMatch = matches.find((row) => metadata.portalRowId && row.id === metadata.portalRowId);
    if (exactRowIdMatch) {
      return exactRowIdMatch;
    }

    throw new Error(
      `Mais de uma parcela corresponde ao protocolo ${metadata.protocolo || "sem protocolo"} e vencimento ${metadata.vencimento}.`,
    );
  }

  const exactRowIdMatch = availableRows.find((row) => metadata.portalRowId && row.id === metadata.portalRowId);
  if (exactRowIdMatch) {
    return exactRowIdMatch;
  }

  throw new Error(
    `Parcela do protocolo ${metadata.protocolo || "sem protocolo"} com vencimento ${metadata.vencimento} nao foi encontrada ao reabrir o portal.`,
  );
}

async function selectDebtRow(frame: FrameLocator, rowId: string): Promise<void> {
  const checkboxRoot = frame.locator(`[data-cy="checkbox-${rowId}"]`);
  const checkboxInput = checkboxRoot.locator('input[type="checkbox"]');
  const checkboxBox = checkboxRoot.locator(".p-checkbox-box");
  const isSelected = await checkboxInput
    .evaluate((element) => (element as HTMLInputElement).checked)
    .catch(async () => checkboxBox.evaluate((element) => element.classList.contains("p-highlight")).catch(() => false));

  if (!isSelected) {
    if (await checkboxInput.isVisible().catch(() => false)) {
      await checkboxInput.click({ force: true });
    } else {
      await checkboxBox.click({ force: true });
    }
  }

  await waitForSuccessOrError(
    frame,
    "Falha ao selecionar a parcela",
    () => frame.locator('[data-cy="btn-avista"] button').isVisible().catch(() => false),
    30_000,
  );
}

async function confirmAddToCashCartModal(frame: FrameLocator): Promise<void> {
  const modal = frame.locator('[data-cy="modal-adicionar-carrinho"]');
  const confirmAddButton = frame.locator("button#confirmar-add").or(frame.locator('[data-cy="confirmar-add"] button'));

  await confirmAddButton.waitFor({ state: "attached", timeout: 15_000 });

  await modal
    .evaluate((root) => {
      const setMaxScroll = (el: Element) => {
        const html = el as HTMLElement;
        if (html.scrollHeight > html.clientHeight) {
          html.scrollTop = html.scrollHeight;
        }
      };
      setMaxScroll(root);
      root.querySelectorAll(".p-dialog-content, .p-dialog").forEach(setMaxScroll);
    })
    .catch(() => undefined);

  await frame
    .locator("body")
    .evaluate(() => {
      document.documentElement.scrollTop = document.documentElement.scrollHeight;
      (document.body as HTMLElement).scrollTop = document.body.scrollHeight;
    })
    .catch(() => undefined);

  await confirmAddButton
    .evaluate((button) => {
      (button as HTMLButtonElement).scrollIntoView({ block: "center", inline: "nearest" });
    })
    .catch(() => undefined);

  await confirmAddButton.scrollIntoViewIfNeeded().catch(() => undefined);

  try {
    await confirmAddButton.click({ timeout: 5_000 });
  } catch {
    try {
      await confirmAddButton.click({ force: true });
    } catch {
      await confirmAddButton.evaluate((button) => {
        (button as HTMLButtonElement).click();
      });
    }
  }
}

async function addToCashCart(page: Page, frame: FrameLocator): Promise<void> {
  await frame.locator('[data-cy="btn-avista"] button').click();
  await waitForSuccessOrError(
    frame,
    "Falha ao abrir a confirmacao de carrinho",
    () => frame.locator('[data-cy="modal-adicionar-carrinho"]').isVisible().catch(() => false),
    30_000,
  );
  await dismissPrivacyBannerIfPresent(page);
  await confirmAddToCashCartModal(frame);
  await waitForSuccessOrError(
    frame,
    "Falha ao adicionar debitos ao carrinho",
    () => frame.getByText(/adicionado\(s\) com sucesso/i).isVisible().catch(() => false),
    30_000,
  );
}

async function openCashCart(frame: FrameLocator): Promise<void> {
  await frame.locator('div[role="button"]').filter({ hasText: /Carrinhos:/ }).first().click();
  await waitForSuccessOrError(
    frame,
    "Falha ao abrir o carrinho",
    () => frame.locator('[data-cy="botao-a-vista"]').isVisible().catch(() => false),
    30_000,
  );
  await frame.locator('[data-cy="botao-a-vista"]').click();
  await waitForSuccessOrError(
    frame,
    "Falha ao abrir o carrinho a vista",
    () => frame.locator('[data-cy="botao-avancar"] button').isVisible().catch(() => false),
    30_000,
  );
}

async function goToSummary(frame: FrameLocator): Promise<void> {
  await frame.locator('[data-cy="botao-avancar"] button').click();
  await waitForSuccessOrError(
    frame,
    "Falha ao avancar para o resumo",
    () => frame.locator('[data-cy="botao-gerar-boleto"] button').isVisible().catch(() => false),
    30_000,
  );
}

async function generateBoleto(frame: FrameLocator): Promise<void> {
  await frame.locator('[data-cy="botao-gerar-boleto"] button').click();
  await waitForSuccessOrError(
    frame,
    "Falha ao gerar os boletos",
    () => frame.locator('[data-cy^="pagar-debito-"] button').first().isVisible().catch(() => false),
    60_000,
  );
}

async function downloadAllPayments(
  page: Page,
  frame: FrameLocator,
  row: InputRow,
  selectedParcels: ParcelMetadata[],
  cwd: string,
): Promise<RunResult[]> {
  const paymentButtons = frame.locator('[data-cy^="pagar-debito-"] button');
  const availablePaymentCount = await paymentButtons.count();
  const results: RunResult[] = [];
  const matchedCount = Math.min(availablePaymentCount, selectedParcels.length);

  for (let index = 0; index < matchedCount; index += 1) {
    const metadata = selectedParcels[index]!;

    try {
      const paymentPdf = await openPaymentAndDownload(page, frame, index);
      const pdfPath = await savePaymentPdf(paymentPdf, row, metadata, cwd);
      results.push(buildSuccessResult(row, metadata, paymentPdf.originalFilename, pdfPath, paymentPdf.source));
    } catch (error) {
      const { message, toast } = getErrorDetails(error);
      results.push(buildErrorResult(row, metadata, buildFailureMessage("Falha ao baixar o PDF da parcela", message, toast), toast));
    }
  }

  if (availablePaymentCount < selectedParcels.length) {
    for (const metadata of selectedParcels.slice(availablePaymentCount)) {
      results.push(
        buildErrorResult(
          row,
          metadata,
          "Nao foi encontrado um item de pagamento correspondente para a parcela apos a geracao dos boletos.",
        ),
      );
    }
  }

  return results;
}

async function openPaymentAndDownload(page: Page, frame: FrameLocator, paymentIndex: number): Promise<PaymentPdf> {
  const paymentButton = frame.locator('[data-cy^="pagar-debito-"] button').nth(paymentIndex);
  await waitForSuccessOrError(
    frame,
    "Falha ao localizar o pagamento da parcela",
    () => paymentButton.isVisible().catch(() => false),
    60_000,
  );
  await paymentButton.click();

  const paymentDialog = frame.locator('[data-cy="dialog-arrecadacao-autoreg"]');
  await waitForSuccessOrError(
    frame,
    "Falha ao abrir a arrecadacao da parcela",
    () => paymentDialog.isVisible().catch(() => false),
    30_000,
  );

  let observedDownload: Download | null = null;
  let observedPdfResponse: PlaywrightResponse | null = null;
  let httpCaptureError: string | null = null;
  let popupOpened = false;

  const onDownload = (download: Download): void => {
    observedDownload = download;
  };
  const onResponse = (response: PlaywrightResponse): void => {
    if (!observedPdfResponse && response.status() >= 200 && response.status() < 300 && hasPdfHeaders(response.headers())) {
      observedPdfResponse = response;
    }
  };
  const onPopup = (): void => {
    popupOpened = true;
  };

  page.on("download", onDownload);
  page.on("response", onResponse);
  page.on("popup", onPopup);

  try {
    const downloadButton = paymentDialog.getByRole("button", { name: "Baixar PDF" });
    await downloadButton.scrollIntoViewIfNeeded();
    await downloadButton.evaluate((button) => {
      (button as HTMLElement).click();
    });

    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      if (observedPdfResponse) {
        const paymentPdf = await paymentPdfFromBrowserResponse(observedPdfResponse).catch((error: unknown) => {
          httpCaptureError = error instanceof Error ? error.message : String(error);
          observedPdfResponse = null;
          return null;
        });

        if (paymentPdf) {
          await closePaymentDialog(page, frame);
          return paymentPdf;
        }
      }

      if (observedDownload) {
        const paymentPdf = await paymentPdfFromDownloadUrl(page, observedDownload).catch((error: unknown) => {
          httpCaptureError = error instanceof Error ? error.message : String(error);
          return null;
        });

        await closePaymentDialog(page, frame);
        return paymentPdf ?? paymentPdfFromBrowserDownload(observedDownload);
      }

      await throwIfErrorToast(frame, "Falha ao baixar o PDF da parcela");

      if (popupOpened) {
        throw new Error("Baixar PDF abriu um popup em vez de download.");
      }

      await page.waitForTimeout(500);
    }

    await throwIfErrorToast(frame, "Falha ao baixar o PDF da parcela");
    if (httpCaptureError) {
      throw new Error(`Baixar PDF retornou uma resposta HTTP invalida: ${httpCaptureError}`);
    }
    throw new Error("Baixar PDF nao iniciou download dentro do tempo esperado.");
  } finally {
    page.off("download", onDownload);
    page.off("response", onResponse);
    page.off("popup", onPopup);

    if (await paymentDialog.isVisible().catch(() => false)) {
      await closePaymentDialog(page, frame);
    }
  }
}

async function closePaymentDialog(page: Page, frame: FrameLocator): Promise<void> {
  const paymentDialog = frame.locator('[data-cy="dialog-arrecadacao-autoreg"]');
  if (!(await paymentDialog.isVisible().catch(() => false))) {
    return;
  }

  const closedByButton = await paymentDialog
    .evaluate((element) => {
      const closeButton = element.querySelector(
        'button.p-dialog-header-close, button[aria-label="Close"], button[aria-label="Fechar"]',
      );

      if (closeButton instanceof HTMLElement) {
        closeButton.click();
        return true;
      }

      return false;
    })
    .catch(() => false);

  if (!closedByButton) {
    await page.keyboard.press("Escape").catch(() => undefined);
  }

  await paymentDialog.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => undefined);
}

async function savePaymentPdf(paymentPdf: PaymentPdf, row: InputRow, metadata: ParcelMetadata, cwd: string): Promise<string> {
  const targetDirectory = path.resolve(cwd, row.saveDir, buildSolicitationMonthFolder());
  await fs.mkdir(targetDirectory, { recursive: true });

  const finalFilename = buildPdfFileName(row.codigo, metadata.parcelLabel, row.empresa, metadata.vencimento);
  const finalPath = path.join(targetDirectory, finalFilename);

  await paymentPdf.saveAs(finalPath);
  return finalPath;
}

async function paymentPdfFromBrowserResponse(response: PlaywrightResponse): Promise<PaymentPdf> {
  const body = await response.body();
  validatePdfBody(body);

  return paymentPdfFromBuffer(body, response.headers(), response.url(), "DAE.pdf");
}

async function paymentPdfFromDownloadUrl(page: Page, download: Download): Promise<PaymentPdf | null> {
  const downloadUrl = download.url();
  if (!downloadUrl || downloadUrl.startsWith("blob:")) {
    return null;
  }

  const response = await page.context().request.get(downloadUrl, {
    timeout: 90_000,
  });

  if (!response.ok() || !hasPdfHeaders(response.headers())) {
    return null;
  }

  const body = await response.body();
  validatePdfBody(body);

  return paymentPdfFromBuffer(body, response.headers(), response.url(), download.suggestedFilename());
}

function paymentPdfFromBrowserDownload(download: Download): PaymentPdf {
  return {
    originalFilename: download.suggestedFilename(),
    source: "browser",
    saveAs: (targetPath) => download.saveAs(targetPath),
  };
}

function paymentPdfFromBuffer(
  body: Buffer,
  headers: ReturnType<PlaywrightResponse["headers"]> | ReturnType<APIResponse["headers"]>,
  responseUrl: string,
  fallbackFilename: string,
): PaymentPdf {
  return {
    originalFilename: filenameFromHeaders(headers) ?? filenameFromUrl(responseUrl) ?? fallbackFilename,
    source: "http",
    saveAs: (targetPath) => fs.writeFile(targetPath, body),
  };
}

function validatePdfBody(body: Buffer): void {
  if (body.length === 0) {
    throw new Error("resposta PDF vazia.");
  }

  const header = body.subarray(0, 16).toString("latin1");
  if (!header.includes("%PDF")) {
    throw new Error("resposta HTTP nao parece ser um arquivo PDF.");
  }
}

function hasPdfHeaders(headers: Record<string, string>): boolean {
  const contentType = getHeader(headers, "content-type");
  const contentDisposition = getHeader(headers, "content-disposition");

  return /application\/pdf/i.test(contentType) || /\.pdf\b/i.test(contentDisposition);
}

function filenameFromHeaders(headers: Record<string, string>): string | null {
  const contentDisposition = getHeader(headers, "content-disposition");
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return safeDecodeFilename(utf8Match[1]);
  }

  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const plainMatch = contentDisposition.match(/filename=([^;]+)/i);
  return plainMatch?.[1]?.trim() ?? null;
}

function filenameFromUrl(responseUrl: string): string | null {
  try {
    const url = new URL(responseUrl);
    const lastSegment = path.basename(url.pathname);
    return lastSegment && lastSegment.includes(".") ? lastSegment : null;
  } catch {
    return null;
  }
}

function getHeader(headers: Record<string, string>, name: string): string {
  const direct = headers[name] ?? headers[name.toLowerCase()];
  if (direct) {
    return direct;
  }

  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return entry?.[1] ?? "";
}

function safeDecodeFilename(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function buildSuccessResult(
  row: InputRow,
  metadata: ParcelMetadata,
  originalFilename: string,
  pdfPath: string,
  downloadSource: PaymentPdf["source"],
): RunResult {
  const downloadSourceLabel = downloadSource === "http" ? "HTTP" : "navegador";

  return {
    rowNumber: row.rowNumber,
    codigo: row.codigo,
    empresa: row.empresa,
    cnpj: row.cnpj,
    protocolo: metadata.protocolo,
    vencimento: metadata.vencimento,
    valorParcela: metadata.valorParcela,
    qtdeParcelas: metadata.qtdeParcelas,
    parcelasPagas: metadata.parcelasPagas,
    parcelasAtrasadas: metadata.parcelasAtrasadas,
    situacaoVencimento: metadata.situacaoVencimento,
    parcelLabel: metadata.parcelLabel,
    criterioRotulo: metadata.criterioRotulo,
    nomeOriginalPdf: originalFilename,
    pdfPath,
    status: "sucesso",
    mensagem: `PDF gerado com sucesso para o protocolo ${metadata.protocolo} via ${downloadSourceLabel}.`,
  };
}

function buildIgnoredResult(row: InputRow, metadata: ParcelMetadata, transport: ResultTransport): RunResult {
  return {
    rowNumber: row.rowNumber,
    codigo: row.codigo,
    empresa: row.empresa,
    cnpj: row.cnpj,
    protocolo: metadata.protocolo,
    vencimento: metadata.vencimento,
    valorParcela: metadata.valorParcela,
    qtdeParcelas: metadata.qtdeParcelas,
    parcelasPagas: metadata.parcelasPagas,
    parcelasAtrasadas: metadata.parcelasAtrasadas,
    situacaoVencimento: metadata.situacaoVencimento,
    parcelLabel: metadata.parcelLabel,
    criterioRotulo: metadata.criterioRotulo,
    transport,
    status: "ignorado",
    mensagem: "Parcela futura ignorada conforme regra de emissao.",
  };
}

function buildErrorResult(
  row: InputRow,
  metadata:
    | Partial<
        Pick<
          ParcelMetadata,
          | "protocolo"
          | "vencimento"
          | "valorParcela"
          | "qtdeParcelas"
          | "parcelasPagas"
          | "parcelasAtrasadas"
          | "situacaoVencimento"
          | "parcelLabel"
          | "criterioRotulo"
        >
      >
    | undefined,
  mensagem: string,
  toast?: string,
  transport?: ResultTransport,
): RunResult {
  return {
    rowNumber: row.rowNumber,
    codigo: row.codigo,
    empresa: row.empresa,
    cnpj: row.cnpj,
    protocolo: metadata?.protocolo,
    vencimento: metadata?.vencimento ?? "",
    valorParcela: metadata?.valorParcela,
    qtdeParcelas: metadata?.qtdeParcelas,
    parcelasPagas: metadata?.parcelasPagas,
    parcelasAtrasadas: metadata?.parcelasAtrasadas,
    situacaoVencimento: metadata?.situacaoVencimento,
    parcelLabel: metadata?.parcelLabel,
    criterioRotulo: metadata?.criterioRotulo,
    toast,
    transport,
    status: "erro",
    mensagem,
  };
}

function getErrorDetails(error: unknown): { message: string; toast?: string } {
  if (error instanceof PortalToastError) {
    return {
      message: error.message,
      toast: error.toast,
    };
  }

  return {
    message: error instanceof Error ? error.message : String(error),
  };
}

function buildFailureMessage(prefixo: string, message: string, toast?: string): string {
  return toast ? `${prefixo}: ${toast}` : `${prefixo}: ${message}`;
}

async function waitForSuccessOrError(
  frame: FrameLocator,
  contexto: string,
  successCheck: () => Promise<boolean>,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await successCheck()) {
      return;
    }

    await throwIfErrorToast(frame, contexto);
    await sleep(250);
  }

  await throwIfErrorToast(frame, contexto);
  throw new Error(`${contexto}: tempo esgotado aguardando a tela responder.`);
}

function isIgnorablePortalToast(toast: string): boolean {
  return /integridade de dados/i.test(toast);
}

async function throwIfErrorToast(frame: FrameLocator, contexto: string): Promise<void> {
  const toast = await readVisibleErrorToast(frame);

  if (toast && isIgnorablePortalToast(toast)) {
    return;
  }

  if (toast) {
    throw new PortalToastError(contexto, toast);
  }
}

async function readVisibleErrorToast(frame: FrameLocator): Promise<string | null> {
  const toast = frame.locator("#toast-container .toast-error").first();
  if (!(await toast.isVisible().catch(() => false))) {
    return null;
  }

  const content = await toast
    .evaluate((element) => {
      const title = element.querySelector(".toast-title")?.textContent ?? "";
      const message = element.querySelector(".toast-message")?.textContent ?? "";
      return { title, message };
    })
    .catch(() => null);

  if (!content) {
    return null;
  }

  const formatted = formatToastMessage(content.title, content.message);
  return normalizeWhitespace(formatted) || null;
}
