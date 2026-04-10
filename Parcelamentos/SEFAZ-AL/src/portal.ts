import fs from "node:fs/promises";
import path from "node:path";
import { Browser, Download, Locator, Page } from "playwright";
import type { InputRow, ParcelamentoDetalhe, ParcelamentoItem, ResultadoCalculo, RunResult } from "./types.js";
import { buildOutputPath, parseParcelasTotais, sanitizePathSegment, timestampForFile } from "./utils.js";

export const PORTAL_URL = "https://contribuinte.sefaz.al.gov.br/parcelamento/#/";
export const EMPTY_CONSOLIDACOES_MESSAGE = "Nenhuma consolidacao encontrada para a situacao selecionada.";

const LOGIN_MODAL_SELECTOR = "ngb-modal-window";
const EMISSAO_MODAL_SELECTOR = "ngb-modal-window .modal-content";
const CONSOLIDACOES_ROW_SELECTOR = "table.data-table tbody tr.data-table-row";
const CONSOLIDACOES_WARNING_SELECTOR = "p.alert.alert-warning, .alert.alert-warning";
const LOGIN_ALERT_SELECTOR = ".alert.alert-danger, .alert.alert-warning, .alert-danger, .alert-warning";
const CALCULO_ROWS_SELECTOR = "table.table-parcelas tbody tr";
const CALCULO_ALERT_SELECTOR = ".alert.alert-warning, .alert.alert-danger, .alert-warning, .alert-danger";

const CONSOLIDACOES_TIMEOUT_MS = 20_000;
const MODAL_TIMEOUT_MS = 20_000;
const CALCULO_MAX_ATTEMPTS = 2;
const CALCULO_TIMEOUTS_MS = [12_000, 20_000] as const;

type PartialParcelamentoDetalhe = Partial<
  Pick<
    ParcelamentoDetalhe,
    "consolidacao" | "parcelamento" | "parcelasTotais" | "parcelasJaPagas" | "numeroParcelaEmitida" | "totalParcelas"
  >
>;

type InstantCalculationState = { status: "rows" } | { status: "alert"; message: string } | { status: "timeout" };
type LoginOutcome = { status: "authenticated" } | { status: "alert"; message: string } | { status: "timeout" };

type RunDiagnostics = Pick<
  RunResult,
  "tempoCalculoMs" | "tentativasCalculo" | "resultadoCalculo" | "tempoTentativa1Ms" | "tempoTentativa2Ms" | "mensagemDiagnostico"
>;

interface ParcelamentoStepMetrics {
  tempoAberturaModalMs?: number;
  tempoDownloadMs?: number;
  calculo?: CalculoParcelaState;
  evidencias?: string[];
}

export type CalculoParcelaState =
  | {
      status: "rows";
      resultadoCalculo: Extract<ResultadoCalculo, "rows_immediate" | "rows_after_retry_1" | "rows_after_retry_2">;
      tentativasCalculo: number;
      tempoCalculoMs: number;
      temposTentativasMs: number[];
    }
  | {
      status: "alert";
      resultadoCalculo: Extract<ResultadoCalculo, "alert" | "modal_closed">;
      tentativasCalculo: number;
      tempoCalculoMs: number;
      temposTentativasMs: number[];
      message: string;
    }
  | {
      status: "timeout";
      resultadoCalculo: Extract<ResultadoCalculo, "timeout">;
      tentativasCalculo: number;
      tempoCalculoMs: number;
      temposTentativasMs: number[];
      message: string;
    };

class PortalCalculationError extends Error {
  readonly metrics: ParcelamentoStepMetrics;

  constructor(message: string, metrics: ParcelamentoStepMetrics) {
    super(message);
    this.name = "PortalCalculationError";
    this.metrics = metrics;
  }
}

class PortalAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortalAuthenticationError";
  }
}

export async function processPortalRow(
  browser: Browser,
  row: InputRow,
  outputRoot: string,
  diagnosticsRoot = path.resolve(path.dirname(outputRoot), "diagnostics"),
): Promise<RunResult[]> {
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
      let detalheContexto: PartialParcelamentoDetalhe = { consolidacao: item.consolidacao };
      let metrics: ParcelamentoStepMetrics = {};

      try {
        detalheContexto = mergeParcelamentoDetalhe(detalheContexto, await readInlineParcelamentoDetalhe(page, item));

        const modalOpenedAt = Date.now();
        detalheContexto = mergeParcelamentoDetalhe(detalheContexto, await openParcelamentoModal(page, item, detalheContexto));
        metrics.tempoAberturaModalMs = Date.now() - modalOpenedAt;

        const { download, calculationState, tempoDownloadMs } = await calculateAndDownload(
          page,
          diagnosticsRoot,
          row.empresa,
          detalheContexto,
        );

        metrics = mergeParcelamentoStepMetrics(metrics, {
          calculo: calculationState,
          tempoDownloadMs,
        });

        const detalhe = ensureParcelamentoDetalheCompleto(detalheContexto);
        const savedPath = await saveDownload(download, outputRoot, row.empresa, detalhe);
        results.push(buildSuccessResult(row, detalhe, savedPath, buildRunDiagnostics(metrics)));
      } catch (error) {
        if (error instanceof PortalCalculationError) {
          metrics = mergeParcelamentoStepMetrics(metrics, error.metrics);
        }

        const message = error instanceof Error ? error.message : String(error);
        results.push(
          buildErrorResult(
            row,
            mergeParcelamentoDetalhe({ consolidacao: item.consolidacao }, detalheContexto),
            `Falha ao processar o parcelamento ${item.consolidacao}: ${message}`,
            buildRunDiagnostics(metrics),
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

  const loginModal = getLoginModal(page);
  await loginModal.locator("#username").waitFor({ state: "visible", timeout: 30_000 });
  await loginModal.locator("#username").fill(row.usuario);
  await loginModal.locator("#password").fill(row.senha);
  await loginModal.getByRole("button", { name: /Acessar/i }).click();

  const outcome = await waitForLoginOutcome(page, row.usuario);
  if (outcome.status === "authenticated") {
    return;
  }

  if (outcome.status === "alert") {
    throw new PortalAuthenticationError(outcome.message);
  }

  const bodyText = normalizePortalText(await page.locator("body").innerText().catch(() => ""));
  throw new Error(
    bodyText.includes("invalid") || bodyText.includes("incorreta")
      ? "Falha de autenticacao no portal."
      : "O portal nao exibiu o menu de consolidacoes apos o login.",
  );
}

async function openConsolidacoes(page: Page): Promise<void> {
  const serviceTileLink = getConsolidacoesServiceTile(page);
  if (await serviceTileLink.isVisible().catch(() => false)) {
    await Promise.all([
      page.waitForURL(/#\/consolidacao(?:$|\b)/, { timeout: 15_000 }).catch(() => undefined),
      serviceTileLink.click(),
    ]);
  } else {
    await page.goto(buildConsolidacoesUrl(), { waitUntil: "domcontentloaded" });
  }

  const listingState = await waitForConsolidacoesState(page);
  if (listingState === "empty") {
    throw new Error("Nenhuma consolidacao foi encontrada para a situacao selecionada no portal.");
  }
}

export async function waitForConsolidacoesState(page: Page): Promise<"rows" | "empty"> {
  const rows = page.locator(CONSOLIDACOES_ROW_SELECTOR).first();
  const warningAlert = page.locator(CONSOLIDACOES_WARNING_SELECTOR).first();

  return Promise.any<"rows" | "empty">([
    rows.waitFor({ state: "visible", timeout: CONSOLIDACOES_TIMEOUT_MS }).then(() => "rows" as const),
    warningAlert.waitFor({ state: "visible", timeout: CONSOLIDACOES_TIMEOUT_MS }).then(async () => {
      const message = normalizePortalText(await warningAlert.innerText().catch(() => ""));
      if (message.includes(EMPTY_CONSOLIDACOES_MESSAGE)) {
        return "empty" as const;
      }

      throw new Error(`Aviso inesperado na tela de consolidacoes: ${message || "sem mensagem"}.`);
    }),
  ]).catch(async () => {
    const bodyText = normalizePortalText(await page.locator("body").innerText().catch(() => ""));
    throw new Error(
      bodyText.includes(EMPTY_CONSOLIDACOES_MESSAGE)
        ? "Nenhuma consolidacao foi encontrada para a situacao selecionada no portal."
        : "O portal nao exibiu nem a listagem de consolidacoes nem a mensagem de ausencia de dados.",
    );
  });
}

async function collectParcelamentos(page: Page): Promise<ParcelamentoItem[]> {
  return page.locator(CONSOLIDACOES_ROW_SELECTOR).evaluateAll((rows: Element[]) => {
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

async function openParcelamentoModal(
  page: Page,
  item: ParcelamentoItem,
  fallbackDetalhe?: PartialParcelamentoDetalhe,
): Promise<ParcelamentoDetalhe> {
  const row = page.locator(CONSOLIDACOES_ROW_SELECTOR).nth(item.rowIndex);
  await getEmitirParcelasButton(row).click();

  const modal = getModal(page);
  await modal.locator("#quantidade").waitFor({ state: "visible", timeout: MODAL_TIMEOUT_MS });

  const detailsText = normalizePortalText(await modal.innerText());
  const consolidacao = extractValue(
    detailsText,
    /Consolidacao:\s*(\d+)/i,
    "Consolidacao",
    fallbackDetalhe?.consolidacao ?? item.consolidacao,
  );
  const parcelamento = extractValue(detailsText, /Parcelamento:\s*(\d+)/i, "Parcelamento", fallbackDetalhe?.parcelamento);
  const parcelasTotaisText = extractValue(
    detailsText,
    /Parcelas Totais:\s*([0-9]+\s*\/\s*[0-9]+)/i,
    "Parcelas Totais",
    fallbackDetalhe?.parcelasTotais,
  );
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

async function calculateAndDownload(
  page: Page,
  diagnosticsRoot: string,
  empresa: string,
  detalhe?: PartialParcelamentoDetalhe,
): Promise<{
  download: Download;
  calculationState: Extract<CalculoParcelaState, { status: "rows" }>;
  tempoDownloadMs: number;
}> {
  const modal = getModal(page);
  logCalculationStart(detalhe);

  const calculationState = await calculateParcelaWithRetry(modal);
  if (calculationState.status !== "rows") {
    const evidencias = await saveCalculationFailureEvidence(page, modal, diagnosticsRoot, empresa, detalhe, calculationState);
    logCalculationEnd(detalhe, calculationState);
    throw new PortalCalculationError(buildCalculationFailureMessage(detalhe, calculationState), {
      calculo: calculationState,
      evidencias,
    });
  }

  const downloadStartedAt = Date.now();
  const downloadPromise = page.waitForEvent("download");
  await getCalculationRows(modal).first().locator("button.btn.btn-primary").first().click();
  const download = await downloadPromise;
  const tempoDownloadMs = Date.now() - downloadStartedAt;

  logCalculationEnd(detalhe, calculationState, tempoDownloadMs);

  return {
    download,
    calculationState,
    tempoDownloadMs,
  };
}

export async function calculateParcelaWithRetry(modal: Locator): Promise<CalculoParcelaState> {
  const quantidadeInput = modal.locator("#quantidade");
  const calcularButton = modal.getByRole("button", { name: /Calcular Parcela/i });
  const calculationStartedAt = Date.now();
  const temposTentativasMs: number[] = [];

  const immediateState = await readCalculationStateNow(modal);
  if (immediateState.status === "rows") {
    return {
      status: "rows",
      resultadoCalculo: "rows_immediate",
      tentativasCalculo: 0,
      tempoCalculoMs: Date.now() - calculationStartedAt,
      temposTentativasMs,
    };
  }

  if (immediateState.status === "alert") {
    return {
      status: "alert",
      resultadoCalculo: "alert",
      tentativasCalculo: 0,
      tempoCalculoMs: Date.now() - calculationStartedAt,
      temposTentativasMs,
      message: immediateState.message,
    };
  }

  for (let attempt = 0; attempt < CALCULO_MAX_ATTEMPTS; attempt += 1) {
    if ((await quantidadeInput.inputValue().catch(() => "")) !== "1") {
      await quantidadeInput.fill("1");
    }

    const attemptStartedAt = Date.now();
    await calcularButton.click();

    const state = await waitForCalculoParcelaState(modal, CALCULO_TIMEOUTS_MS[attempt] ?? 20_000);
    temposTentativasMs.push(Date.now() - attemptStartedAt);

    if (state.status === "rows") {
      return {
        status: "rows",
        resultadoCalculo: attempt === 0 ? "rows_after_retry_1" : "rows_after_retry_2",
        tentativasCalculo: attempt + 1,
        tempoCalculoMs: Date.now() - calculationStartedAt,
        temposTentativasMs,
      };
    }

    if (state.status === "alert") {
      return {
        status: "alert",
        resultadoCalculo: "alert",
        tentativasCalculo: attempt + 1,
        tempoCalculoMs: Date.now() - calculationStartedAt,
        temposTentativasMs,
        message: state.message,
      };
    }

    if (!(await modal.isVisible().catch(() => false))) {
      return {
        status: "alert",
        resultadoCalculo: "modal_closed",
        tentativasCalculo: attempt + 1,
        tempoCalculoMs: Date.now() - calculationStartedAt,
        temposTentativasMs,
        message: "o modal de emissao foi fechado antes da resposta do calculo.",
      };
    }
  }

  return {
    status: "timeout",
    resultadoCalculo: "timeout",
    tentativasCalculo: CALCULO_MAX_ATTEMPTS,
    tempoCalculoMs: Date.now() - calculationStartedAt,
    temposTentativasMs,
    message: "o calculo da parcela nao retornou apos 2 tentativas.",
  };
}

export async function waitForCalculoParcelaState(modal: Locator, timeoutMs = 20_000): Promise<InstantCalculationState> {
  const rows = getCalculationRows(modal).first();
  const alert = getCalculationAlert(modal).first();

  return Promise.any<InstantCalculationState>([
    rows.waitFor({ state: "visible", timeout: timeoutMs }).then(() => ({ status: "rows" as const })),
    alert.waitFor({ state: "visible", timeout: timeoutMs }).then(async () => ({
      status: "alert" as const,
      message: sanitizeDiagnosticText(await alert.innerText().catch(() => "o portal exibiu um alerta ao calcular a parcela.")),
    })),
  ]).catch(async () => {
    const immediateState = await readCalculationStateNow(modal);
    return immediateState.status === "timeout" ? { status: "timeout" } : immediateState;
  });
}

export function extractInlineParcelamentoDetalhe(text: string): PartialParcelamentoDetalhe | undefined {
  const normalizedText = normalizePortalText(text);
  if (!normalizedText) {
    return undefined;
  }

  const parcelamento = normalizedText.match(/Parcelamento:\s*(\d+)/i)?.[1];
  const totalParcelasText = normalizedText.match(/Qtde Parcelas:\s*(\d+)/i)?.[1];
  const detalhe: PartialParcelamentoDetalhe = {};

  if (parcelamento) {
    detalhe.parcelamento = parcelamento;
  }

  if (totalParcelasText) {
    detalhe.totalParcelas = Number(totalParcelasText);
  }

  return Object.keys(detalhe).length > 0 ? detalhe : undefined;
}

export function buildCalculoIndisponivelMessage(
  detalhe: PartialParcelamentoDetalhe | undefined,
  reason: string,
): string {
  const normalizedReason = normalizeSentence(reason);

  if (detalhe?.parcelamento && detalhe?.consolidacao) {
    return `O portal identificou o parcelamento ${detalhe.parcelamento} da consolidacao ${detalhe.consolidacao}, mas ${normalizedReason}`;
  }

  if (detalhe?.parcelamento) {
    return `O portal identificou o parcelamento ${detalhe.parcelamento}, mas ${normalizedReason}`;
  }

  if (detalhe?.consolidacao) {
    return `O portal identificou a consolidacao ${detalhe.consolidacao}, mas ${normalizedReason}`;
  }

  return `O portal nao disponibilizou a emissao da parcela: ${normalizedReason}`;
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

  const closeButton = modal.locator("button.close, button:has-text('Fechar')").first();
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click();
  }

  await page.locator(LOGIN_MODAL_SELECTOR).waitFor({ state: "hidden", timeout: 10_000 }).catch(() => undefined);
}

function getLoginModal(page: Page): Locator {
  return page.locator(LOGIN_MODAL_SELECTOR);
}

function getLoginAlert(modal: Locator): Locator {
  return modal.locator(LOGIN_ALERT_SELECTOR).first();
}

function getModal(page: Page): Locator {
  return page.locator(EMISSAO_MODAL_SELECTOR);
}

function getConsolidacoesServiceTile(page: Page): Locator {
  return page.locator('a.btn.btn-sq-lg.btn-primary[href="#/consolidacao"]').first();
}

function getEmitirParcelasButton(row: Locator): Locator {
  return row.locator('td.column-opcoes button[title*="parcelas/Extrato"]').first();
}

async function waitForAuthenticatedHome(page: Page, usuario: string, timeoutMs = 30_000): Promise<void> {
  return Promise.any([
    getConsolidacoesServiceTile(page).waitFor({ state: "visible", timeout: timeoutMs }),
    page.locator("body").filter({ hasText: usuario }).waitFor({ state: "visible", timeout: timeoutMs }),
  ]).then(() => undefined);
}

export async function waitForLoginOutcome(page: Page, usuario: string, timeoutMs = 30_000): Promise<LoginOutcome> {
  const loginAlert = getLoginAlert(getLoginModal(page));

  return Promise.any<LoginOutcome>([
    waitForAuthenticatedHome(page, usuario, timeoutMs).then(() => ({ status: "authenticated" as const })),
    loginAlert.waitFor({ state: "visible", timeout: timeoutMs }).then(async () => ({
      status: "alert" as const,
      message: extractLoginAlertMessage(await loginAlert.innerText().catch(() => "")),
    })),
  ]).catch(async () => {
    const visibleMessage = await readVisibleLoginAlertMessage(loginAlert);
    if (visibleMessage) {
      return { status: "alert" as const, message: visibleMessage };
    }

    return { status: "timeout" as const };
  });
}

function buildConsolidacoesUrl(): string {
  return `${PORTAL_URL}consolidacao`;
}

async function readInlineParcelamentoDetalhe(
  page: Page,
  item: ParcelamentoItem,
): Promise<PartialParcelamentoDetalhe | undefined> {
  const row = page.locator(CONSOLIDACOES_ROW_SELECTOR).nth(item.rowIndex);
  const inlineText = await row
    .evaluate((element) => {
      const rowText = element.textContent ?? "";
      const siblingText = element.nextElementSibling?.textContent ?? "";
      return `${rowText}\n${siblingText}`;
    })
    .catch(async () => row.innerText().catch(() => ""));

  return extractInlineParcelamentoDetalhe(inlineText);
}

async function readCalculationStateNow(modal: Locator): Promise<InstantCalculationState> {
  if (await getCalculationRows(modal).first().isVisible().catch(() => false)) {
    return { status: "rows" };
  }

  const alert = getCalculationAlert(modal).first();
  const alertVisible = await alert.isVisible().catch(() => false);
  const alertMessage = alertVisible ? sanitizeDiagnosticText(await alert.innerText().catch(() => "")) : "";

  if (alertMessage) {
    return { status: "alert", message: alertMessage };
  }

  return { status: "timeout" };
}

function getCalculationRows(modal: Locator): Locator {
  return modal.locator(CALCULO_ROWS_SELECTOR);
}

function getCalculationAlert(modal: Locator): Locator {
  return modal.locator(CALCULO_ALERT_SELECTOR);
}

function mergeParcelamentoDetalhe(...detalhes: Array<PartialParcelamentoDetalhe | undefined>): PartialParcelamentoDetalhe {
  const merged: PartialParcelamentoDetalhe = {};

  for (const detalhe of detalhes) {
    if (!detalhe) {
      continue;
    }

    for (const [key, value] of Object.entries(detalhe) as Array<[keyof PartialParcelamentoDetalhe, string | number | undefined]>) {
      if (value !== undefined) {
        merged[key] = value as never;
      }
    }
  }

  return merged;
}

function mergeParcelamentoStepMetrics(
  current: ParcelamentoStepMetrics,
  incoming: ParcelamentoStepMetrics,
): ParcelamentoStepMetrics {
  return {
    tempoAberturaModalMs: incoming.tempoAberturaModalMs ?? current.tempoAberturaModalMs,
    tempoDownloadMs: incoming.tempoDownloadMs ?? current.tempoDownloadMs,
    calculo: incoming.calculo ?? current.calculo,
    evidencias: incoming.evidencias ?? current.evidencias,
  };
}

function ensureParcelamentoDetalheCompleto(detalhe: PartialParcelamentoDetalhe): ParcelamentoDetalhe {
  if (
    !detalhe.consolidacao ||
    !detalhe.parcelamento ||
    !detalhe.parcelasTotais ||
    detalhe.parcelasJaPagas === undefined ||
    detalhe.numeroParcelaEmitida === undefined ||
    detalhe.totalParcelas === undefined
  ) {
    throw new Error(buildCalculoIndisponivelMessage(detalhe, "os dados do parcelamento ficaram incompletos para salvar o boleto."));
  }

  return detalhe as ParcelamentoDetalhe;
}

function extractValue(text: string, pattern: RegExp, fieldName: string, fallbackValue?: string): string {
  const match = text.match(pattern);
  if (!match?.[1]) {
    if (fallbackValue) {
      return fallbackValue.trim();
    }

    throw new Error(`Nao foi possivel localizar o campo "${fieldName}" no modal.`);
  }

  return match[1].trim();
}

function normalizeSentence(text: string): string {
  const normalized = sanitizeDiagnosticText(text);
  if (!normalized) {
    return "o portal nao informou o motivo da indisponibilidade.";
  }

  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function buildSuccessResult(
  row: InputRow,
  detalhe: ParcelamentoDetalhe,
  arquivoSalvo: string,
  diagnostics?: RunDiagnostics,
): RunResult {
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
    ...diagnostics,
    status: "sucesso",
    mensagem: `Boleto atual baixado com sucesso para a consolidacao ${detalhe.consolidacao}.`,
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
  diagnostics?: RunDiagnostics,
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
    ...diagnostics,
    status: "erro",
    mensagem,
  };
}

function buildRunDiagnostics(metrics: ParcelamentoStepMetrics): RunDiagnostics | undefined {
  const calculationState = metrics.calculo;
  const messageParts: string[] = [];

  if (metrics.tempoAberturaModalMs !== undefined) {
    messageParts.push(`tempo_abertura_modal_ms=${metrics.tempoAberturaModalMs}`);
  }

  if (calculationState) {
    messageParts.push(`resultado_calculo=${calculationState.resultadoCalculo}`);
    messageParts.push(`tentativas_calculo=${calculationState.tentativasCalculo}`);
    messageParts.push(`tempo_calculo_ms=${calculationState.tempoCalculoMs}`);

    const tempoTentativa1Ms = calculationState.temposTentativasMs[0];
    const tempoTentativa2Ms = calculationState.temposTentativasMs[1];

    if (tempoTentativa1Ms !== undefined) {
      messageParts.push(`tempo_tentativa_1_ms=${tempoTentativa1Ms}`);
    }

    if (tempoTentativa2Ms !== undefined) {
      messageParts.push(`tempo_tentativa_2_ms=${tempoTentativa2Ms}`);
    }

    if ("message" in calculationState && calculationState.message) {
      messageParts.push(`detalhe_calculo=${sanitizeDiagnosticText(calculationState.message)}`);
    }
  }

  if (metrics.tempoDownloadMs !== undefined) {
    messageParts.push(`tempo_download_ms=${metrics.tempoDownloadMs}`);
  }

  if (metrics.evidencias?.length) {
    messageParts.push(`evidencias=${metrics.evidencias.join(", ")}`);
  }

  if (messageParts.length === 0) {
    return undefined;
  }

  return {
    tempoCalculoMs: calculationState?.tempoCalculoMs,
    tentativasCalculo: calculationState?.tentativasCalculo,
    resultadoCalculo: calculationState?.resultadoCalculo,
    tempoTentativa1Ms: calculationState?.temposTentativasMs[0],
    tempoTentativa2Ms: calculationState?.temposTentativasMs[1],
    mensagemDiagnostico: messageParts.join("; "),
  };
}

function buildCalculationFailureMessage(
  detalhe: PartialParcelamentoDetalhe | undefined,
  calculationState: Exclude<CalculoParcelaState, { status: "rows" }>,
): string {
  return buildCalculoIndisponivelMessage(detalhe, calculationState.message);
}

function buildParcelamentoLabel(detalhe?: PartialParcelamentoDetalhe): string {
  const parts: string[] = [];

  if (detalhe?.consolidacao) {
    parts.push(`consolidacao=${detalhe.consolidacao}`);
  }

  if (detalhe?.parcelamento) {
    parts.push(`parcelamento=${detalhe.parcelamento}`);
  }

  return parts.length > 0 ? parts.join("; ") : "consolidacao/parcela_nao_identificados";
}

function logCalculationStart(detalhe?: PartialParcelamentoDetalhe): void {
  console.log(`[calculo] Iniciando emissao da parcela: ${buildParcelamentoLabel(detalhe)}.`);
}

function logCalculationEnd(
  detalhe: PartialParcelamentoDetalhe | undefined,
  calculationState: CalculoParcelaState,
  tempoDownloadMs?: number,
): void {
  const parts = [
    buildParcelamentoLabel(detalhe),
    `resultado=${calculationState.resultadoCalculo}`,
    `tentativas=${calculationState.tentativasCalculo}`,
    `tempo_calculo_ms=${calculationState.tempoCalculoMs}`,
  ];

  if (calculationState.temposTentativasMs[0] !== undefined) {
    parts.push(`tempo_tentativa_1_ms=${calculationState.temposTentativasMs[0]}`);
  }

  if (calculationState.temposTentativasMs[1] !== undefined) {
    parts.push(`tempo_tentativa_2_ms=${calculationState.temposTentativasMs[1]}`);
  }

  if (tempoDownloadMs !== undefined) {
    parts.push(`tempo_download_ms=${tempoDownloadMs}`);
  }

  if ("message" in calculationState && calculationState.message) {
    parts.push(`detalhe=${sanitizeDiagnosticText(calculationState.message)}`);
  }

  console.log(`[calculo] Finalizado: ${parts.join("; ")}.`);
}

async function saveCalculationFailureEvidence(
  page: Page,
  modal: Locator,
  diagnosticsRoot: string,
  empresa: string,
  detalhe: PartialParcelamentoDetalhe | undefined,
  calculationState: Exclude<CalculoParcelaState, { status: "rows" }>,
): Promise<string[]> {
  const diagnosticsDir = path.join(diagnosticsRoot, buildDiagnosticDirectoryName(empresa));
  await fs.mkdir(diagnosticsDir, { recursive: true });

  const evidencePrefix = `${buildDiagnosticFilePrefix(detalhe)}-${timestampForFile()}-${Date.now()}`;
  const screenshotPath = path.join(diagnosticsDir, `${evidencePrefix}.png`);
  const textDumpPath = path.join(diagnosticsDir, `${evidencePrefix}.txt`);

  try {
    if (await modal.isVisible().catch(() => false)) {
      await modal.screenshot({ path: screenshotPath });
    } else {
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }
  } catch {
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  }

  const modalText = await modal.innerText().catch(() => "");
  const bodyText = await page.locator("body").innerText().catch(() => "");
  const dumpLines = [
    `resultado_calculo=${calculationState.resultadoCalculo}`,
    `tentativas_calculo=${calculationState.tentativasCalculo}`,
    `tempo_calculo_ms=${calculationState.tempoCalculoMs}`,
    `tempo_tentativa_1_ms=${calculationState.temposTentativasMs[0] ?? ""}`,
    `tempo_tentativa_2_ms=${calculationState.temposTentativasMs[1] ?? ""}`,
    `detalhe=${sanitizeDiagnosticText(calculationState.message)}`,
    "",
    "[modal]",
    modalText,
    "",
    "[body]",
    bodyText,
  ];
  await fs.writeFile(textDumpPath, dumpLines.join("\n"), "utf8");

  return [screenshotPath, textDumpPath];
}

function buildDiagnosticDirectoryName(empresa: string): string {
  return sanitizePathSegment(empresa) || "SEM_EMPRESA";
}

function buildDiagnosticFilePrefix(detalhe?: PartialParcelamentoDetalhe): string {
  const consolidacao = sanitizePathSegment(detalhe?.consolidacao ?? "sem-consolidacao").replace(/\s+/g, "_");
  const parcelamento = sanitizePathSegment(detalhe?.parcelamento ?? "sem-parcelamento").replace(/\s+/g, "_");
  return `parcelamento-${consolidacao}-${parcelamento}`;
}

function sanitizeDiagnosticText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function readVisibleLoginAlertMessage(loginAlert: Locator): Promise<string | undefined> {
  return loginAlert
    .isVisible()
    .then(async (isVisible) => {
      if (!isVisible) {
        return undefined;
      }

      return extractLoginAlertMessage(await loginAlert.innerText().catch(() => ""));
    })
    .catch(() => undefined);
}

function extractLoginAlertMessage(value: string): string {
  return normalizePortalText(value) || "Falha de autenticacao no portal.";
}

function normalizePortalText(value: string): string {
  return sanitizeDiagnosticText(stripDiacritics(value));
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
