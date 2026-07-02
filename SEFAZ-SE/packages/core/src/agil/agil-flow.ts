import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Frame, Locator, Page } from '@playwright/test';

export type AgilCredentials = {
  username: string;
  password: string;
};

export type AgilAuthOptions =
  | ({
      authMode: 'credentials';
    } & AgilCredentials)
  | {
      authMode: 'certificate';
    };

export type AgilInserirTimeouts = {
  /** Tempo maximo por fase aguardando alerta "Atenção" ou linha na grelha apos clicar em Inserir. */
  inserirOutcomeTimeoutMs?: number;
  /** Tempo maximo para confirmar a chave na grelha antes de Salvar (polling). */
  insertGridConfirmTimeoutMs?: number;
  /**
   * Deadline absoluto por chave (ms). Encerra o processamento de uma DANFE com erro
   * mesmo se algum await ficar travado (ex.: navegacao do iframe que nao completa).
   * Default: 4 x `inserirOutcomeTimeoutMs` + `DEFAULT_HARD_DEADLINE_MARGIN_MS`.
   */
  hardDeadlineMs?: number;
};

export const DEFAULT_INSERIR_OUTCOME_TIMEOUT_MS = 60_000;
export const DEFAULT_INSERT_GRID_CONFIRM_TIMEOUT_MS = 5_000;
export const DEFAULT_HARD_DEADLINE_MARGIN_MS = 30_000;

export type DanfeProgressStatus = 'pending' | 'processing' | 'success' | 'error';

export type DanfeProgressEvent = {
  danfe: string;
  status: DanfeProgressStatus;
  message?: string;
  pdfPath?: string;
};

export type DanfeResult = {
  danfe: string;
  status: Exclude<DanfeProgressStatus, 'pending' | 'processing'>;
  message?: string;
  pdfPath?: string;
};

export type IncluirNotaFiscalOptions = AgilAuthOptions &
  AgilInserirTimeouts & {
    danfe?: string;
    dryRun?: boolean;
    pdfDownloadDir?: string;
  };

export type IncluirNotasFiscaisOptions = AgilAuthOptions &
  AgilInserirTimeouts & {
    danfes: string[];
    dryRun?: boolean;
    pdfDownloadDir?: string;
    onProgress?: (event: DanfeProgressEvent) => void;
  };

const ACESSO_URL = 'https://www.sefaz.se.gov.br/SitePages/acesso_usuario.aspx';
const CERTIFICATE_LOGIN_TIMEOUT = 180_000;
const ATTENTION_MESSAGE_TIMEOUT = 5_000;
const PDF_POPUP_TIMEOUT = 30_000;
const INLINE_ERROR_TIMEOUT = 5_000;
/** Intervalo curto entre checagens de overlay/grelha; faz transicao entre notas mais responsiva. */
const INSERIR_POLL_MS = 75;
/** Probe rapido para erro inline DENTRO do loop de polling — full check com `INLINE_ERROR_TIMEOUT` so quando precisa. */
const INLINE_ERROR_POLL_TIMEOUT_MS = 80;
/** Probe rapido para `<div id="alert">` em qualquer frame; usado em `garantirSemOverlayBloqueante` no caminho rapido. */
const OVERLAY_PROBE_TIMEOUT_MS = 80;
// Pausa explicita apos cliques que disparam round-trip ao backend do AGIL (Inserir/Salvar)
// para dar tempo de renderizar o overlay de atencao ou o popup do PDF antes de avaliar
// o resultado. O polling/listener subsequente continua atuando como rede de seguranca,
// portanto mantemos a pausa curta — pode ser elevado por chave via `postClickSettleMs`.
const POST_CLICK_SETTLE_MS = 250;
/** Primeira checagem de visibilidade de `#danfe` (transicao entre notas): evita esperar 3s quando o campo continua oculto. */
const DANFE_QUICK_VISIBILITY_PROBE_MS = 600;
const REOPEN_INCLUSAO_ATTEMPTS = 2;
const AGIL_MENU_VISIBLE_TIMEOUT_MS = 2_000;
const AGIL_MENU_CLICK_TIMEOUT_MS = 4_000;
const INCLUIR_LINK_VISIBLE_TIMEOUT_MS = 5_000;
const INCLUIR_LINK_CLICK_TIMEOUT_MS = 4_000;
const DANFE_REOPEN_VISIBLE_TIMEOUT_MS = 6_000;
const PREPARE_NEXT_AFTER_ERROR_REOPEN_ENABLED = false;
const DEFAULT_PDF_DOWNLOAD_DIR = resolve('output', 'agil-pdfs');

/**
 * Subset comum entre Page e Frame usado pelos helpers de detecção. Permite passar
 * tanto a Page raiz quanto qualquer frame filha (`page.frames()`) para os mesmos
 * locators sem dependência do tipo concreto.
 */
type FrameLike = Pick<Frame, 'getByText' | 'getByRole' | 'locator'>;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveInserirTimeouts(options: AgilInserirTimeouts) {
  return {
    inserirOutcomeTimeoutMs: options.inserirOutcomeTimeoutMs ?? DEFAULT_INSERIR_OUTCOME_TIMEOUT_MS,
    insertGridConfirmTimeoutMs:
      options.insertGridConfirmTimeoutMs ?? DEFAULT_INSERT_GRID_CONFIRM_TIMEOUT_MS,
  };
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

type PhaseLogger = (message: string) => void;

function elapsedMs(start: number) {
  return Date.now() - start;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function medirFase<T>(
  label: string,
  onPhase: PhaseLogger | undefined,
  task: () => Promise<T>,
) {
  const start = Date.now();

  try {
    const result = await task();

    onPhase?.(`${label} concluido em ${elapsedMs(start)}ms.`);
    return result;
  } catch (error) {
    onPhase?.(`${label} falhou em ${elapsedMs(start)}ms: ${errorMessage(error)}`);
    throw error;
  }
}

/**
 * Retorna a Page e todas as suas frames filhas (sem duplicar a main). Usado para
 * varrer locators dentro de iframes do AGIL (ex.: grelha "Notas Fiscais Inseridas").
 *
 * Filtra frames detached para evitar awaits pendurados em locators de frames mortas
 * (race comum quando o iframe do AGIL recarrega depois de um click OK).
 */
function todasAsFrames(page: Page): FrameLike[] {
  const main = page.mainFrame();
  const others = page
    .frames()
    .filter((frame) => frame !== main && !isDetachedSafe(frame));

  return [page, ...others];
}

function isDetachedSafe(frame: Frame): boolean {
  try {
    return frame.isDetached();
  } catch {
    return true;
  }
}

/** Locators para a chave na grelha em uma frame especifica (exclui o campo #danfe). */
function locatorsChaveNaGrelha(scope: FrameLike, danfe: string): Locator[] {
  const inputDanfe = scope.locator('#danfe');
  const chaveRegex = new RegExp(escapeRegExp(danfe));

  return [
    scope.getByText(danfe, { exact: true }).filter({ hasNot: inputDanfe }),
    scope.getByText(chaveRegex).filter({ hasNot: inputDanfe }),
    scope.locator('tr').filter({ hasText: danfe }).filter({ hasNot: inputDanfe }).first(),
  ];
}

async function chaveVisivelEmAlgumaFrame(page: Page, danfe: string): Promise<boolean> {
  for (const frame of todasAsFrames(page)) {
    for (const locator of locatorsChaveNaGrelha(frame, danfe)) {
      if (await locator.isVisible().catch(() => false)) {
        return true;
      }
    }
  }

  return false;
}

function attentionTitleLocator(scope: FrameLike): Locator {
  return scope.getByText('!!! Atenção !!!', { exact: true });
}

async function localizarFrameComAtencao(page: Page): Promise<FrameLike | undefined> {
  for (const frame of todasAsFrames(page)) {
    if (await attentionTitleLocator(frame).isVisible().catch(() => false)) {
      return frame;
    }
  }

  return undefined;
}

/**
 * Seleciona o container do alerta priorizando `<div id="alert">` (overlay real do AGIL),
 * com fallback para `<table>` interna. O `<div id="alert">` e quem intercepta pointer
 * events nos cliques posteriores; e nele que o OK efetivo costuma estar.
 */
async function selecionarAttentionContainer(
  frame: FrameLike,
  attentionTitle: Locator,
): Promise<Locator> {
  const divAlert = frame.locator('div#alert', { has: attentionTitle }).last();

  if (await divAlert.isVisible({ timeout: 500 }).catch(() => false)) {
    return divAlert;
  }

  return frame.locator('table', { has: attentionTitle }).last();
}

/** Localiza overlay `<div id="alert">` visivel em qualquer frame (com ou sem attention). */
async function localizarOverlayAlert(
  page: Page,
): Promise<{ frame: FrameLike; overlay: Locator } | undefined> {
  for (const frame of todasAsFrames(page)) {
    const overlay = frame.locator('div#alert').first();

    if (await overlay.isVisible({ timeout: OVERLAY_PROBE_TIMEOUT_MS }).catch(() => false)) {
      return { frame, overlay };
    }
  }

  return undefined;
}

function inlineErrorLocators(scope: FrameLike) {
  const base = scope.locator(
    'font[color="red"], font[color="#ff0000"], td:has-text("Não foi possível")',
  );
  const filtered = base.filter({ hasText: /n[aã]o foi poss[ií]vel/i });

  return { base, filtered };
}

async function capturarErroInlineEmFrame(scope: FrameLike, timeout: number) {
  const { base, filtered } = inlineErrorLocators(scope);

  if (!(await filtered.first().isVisible({ timeout }).catch(() => false))) {
    return undefined;
  }

  const messages = await base
    .evaluateAll((elements) =>
      [
        ...new Set(
          elements
            .map((element) => element.textContent?.trim().replace(/\s+/g, ' '))
            .filter(Boolean),
        ),
      ],
    )
    .catch(() => [] as (string | undefined)[]);

  return messages.join(' | ') || 'Erro ao enviar nota fiscal.';
}

async function capturarErroInline(page: Page, timeout = INLINE_ERROR_TIMEOUT) {
  for (const frame of todasAsFrames(page)) {
    const message = await capturarErroInlineEmFrame(frame, timeout);

    if (message) {
      return message;
    }
  }

  return undefined;
}

function sanitizePathSegment(value: string) {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

async function obterDiretorioDownloadEmpresa(page: Page, pdfDownloadDir: string) {
  const bodyText = await page.locator('body').innerText({ timeout: 5_000 }).catch(() => '');
  const match = bodyText.match(/(?:Usu.rio\s*(?:›|>|»)?\s*)?(\d{14})\s*:\s*([^\r\n]+)/i);

  if (!match) {
    return resolve(pdfDownloadDir, 'empresa-nao-identificada');
  }

  const [, cnpj, companyName] = match;
  const folderName = sanitizePathSegment(`${cnpj} - ${companyName}`);

  return resolve(pdfDownloadDir, folderName || 'empresa-nao-identificada');
}

async function autenticarAgil(page: Page, auth: AgilAuthOptions) {
  await page.goto(ACESSO_URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'Acesso aos Sistemas' }).click();

  if (auth.authMode === 'certificate') {
    const popupPromise = page.waitForEvent('popup', { timeout: 5_000 }).catch(() => null);

    await page.getByRole('link', { name: 'Paris' }).click({ noWaitAfter: true });

    const popup = await popupPromise;
    const authenticatedPage = popup ?? page;

    await authenticatedPage
      .getByText('AGIL', { exact: true })
      .waitFor({ timeout: CERTIFICATE_LOGIN_TIMEOUT });

    return authenticatedPage;
  }

  const acessoFrame = page
    .frameLocator('iframe[name="MSOPageViewerWebPart_WebPartWPQ1"]')
    .frameLocator('iframe[name="acesso"]');

  await acessoFrame.locator('input[name="UserName"]').fill(auth.username);
  await acessoFrame.locator('input[name="Password"]').fill(auth.password);
  await acessoFrame.getByRole('button', { name: 'OK' }).click();

  await page.getByText('AGIL', { exact: true }).waitFor({ timeout: 60_000 });

  return page;
}

async function abrirTelaInclusaoNotaFiscal(page: Page) {
  const danfeInput = page.locator('#danfe');

  if (await danfeInput.isVisible({ timeout: DANFE_QUICK_VISIBILITY_PROBE_MS }).catch(() => false)) {
    return danfeInput;
  }

  await forcarReabrirTelaInclusaoNotaFiscal(page);

  if (!(await danfeInput.isVisible({ timeout: 500 }).catch(() => false))) {
    throw new Error(
      'Nao foi possivel abrir a tela "Incluir Nota Fiscal" (link nao ficou disponivel).',
    );
  }

  return danfeInput;
}

/**
 * Forca reabertura da tela "Incluir Nota Fiscal" (clica AGIL + link), dispensando
 * qualquer overlay residual antes. Usado entre chaves (apos erro ou quando a tela
 * muda apos Enviar) para evitar que o link do menu fique inacessivel ou que o
 * `<div id="alert">` da chave anterior bloqueie cliques na proxima.
 *
 * Resiliente:
 * - `waitFor({ state: 'visible' })` ANTES do click no link evita os 30s do auto-wait
 *   do Playwright contra um seletor que demora a ficar actionable.
 * - Cliques com timeout reduzido falham rapido se o elemento nao responder.
 */
async function forcarReabrirTelaInclusaoNotaFiscal(page: Page) {
  let overlayEncontrado = false;
  let lastError: unknown;
  const danfeInput = page.locator('#danfe');

  for (let attempt = 1; attempt <= REOPEN_INCLUSAO_ATTEMPTS; attempt += 1) {
    const overlayResult = await garantirSemOverlayBloqueante(page);
    overlayEncontrado = overlayEncontrado || overlayResult.overlayEncontrado;

    try {
      const agil = page.getByText('AGIL', { exact: true });

      if (await agil.isVisible({ timeout: AGIL_MENU_VISIBLE_TIMEOUT_MS }).catch(() => false)) {
        await agil.click({ timeout: AGIL_MENU_CLICK_TIMEOUT_MS });
      }

      const incluirLink = page.getByRole('link', { name: 'Incluir Nota Fiscal' });

      await incluirLink.waitFor({
        state: 'visible',
        timeout: INCLUIR_LINK_VISIBLE_TIMEOUT_MS,
      });
      await incluirLink.click({ timeout: INCLUIR_LINK_CLICK_TIMEOUT_MS });

      await danfeInput.waitFor({
        state: 'visible',
        timeout: DANFE_REOPEN_VISIBLE_TIMEOUT_MS,
      });

      return { overlayEncontrado };
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Nao foi possivel abrir a tela "Incluir Nota Fiscal" apos ${REOPEN_INCLUSAO_ATTEMPTS} tentativas curtas. Ultimo erro: ${errorMessage(lastError)}`,
  );
}

/**
 * Faz pre-check de overlay bloqueante e clica no botao com timeout reduzido.
 * Se o overlay nao puder ser dispensado, lanca erro com a mensagem capturada,
 * evitando travar 30s contra `subtree intercepts pointer events` do Playwright.
 */
async function clickComCheckOverlay(
  page: Page,
  name: 'Inserir' | 'Salvar' | 'Enviar',
  danfe: string,
) {
  const { aindaVisivel, message } = await garantirSemOverlayBloqueante(page, danfe);

  if (aindaVisivel) {
    throw new Error(message ?? `Overlay bloqueante impede o click em ${name}.`);
  }

  await page.getByRole('button', { name }).click({ timeout: 10_000 });
}

async function aguardarResultadoAposInserir(
  page: Page,
  danfe: string,
  inserirOutcomeTimeoutMs: number,
): Promise<'attention' | 'grid' | 'timeout'> {
  const deadline = Date.now() + inserirOutcomeTimeoutMs;

  while (Date.now() < deadline) {
    if ((await localizarFrameComAtencao(page)) !== undefined) {
      return 'attention';
    }

    if (await chaveVisivelEmAlgumaFrame(page, danfe)) {
      // Re-check tardio: o alerta pode aparecer junto com a linha na grelha (mesmo
      // backend pode aceitar a inclusao e logo em seguida exibir "ja vinculada").
      if ((await localizarFrameComAtencao(page)) !== undefined) {
        return 'attention';
      }

      return 'grid';
    }

    // Inline error e o probe mais caro do loop (~80ms por frame): roda apenas apos
    // attention/grid checks rapidos falharem, evitando latencia em cada iteracao.
    const inlineMessage = await capturarErroInline(page, INLINE_ERROR_POLL_TIMEOUT_MS);

    if (inlineMessage) {
      throw new Error(inlineMessage);
    }

    await sleep(INSERIR_POLL_MS);
  }

  return 'timeout';
}

/**
 * Tenta fechar o modal "!!! Atenção !!!" clicando OK estritamente DENTRO do container
 * do alerta (`<div id="alert">` ou `<table>`). Faz ate 2 ciclos: para cada candidato
 * visivel, clica e aguarda o titulo sumir; se ainda visivel, tenta o proximo.
 *
 * Retorna `true` somente quando confirmou que o `attentionTitle` esta `hidden`.
 * Caller deve decidir o que fazer com `false` (provavelmente abortar o fluxo da chave).
 */
async function fecharAlertaAtencao(
  attentionContainer: Locator,
  attentionTitle: Locator,
): Promise<boolean> {
  const candidatos: Locator[] = [
    attentionContainer
      .locator(
        'input[type="button"][value="OK"], input[type="submit"][value="OK"], input[value="OK"]',
      )
      .first(),
    attentionContainer.getByRole('button', { name: /^OK$/i }).first(),
  ];

  for (let ciclo = 0; ciclo < 2; ciclo += 1) {
    for (const candidato of candidatos) {
      const visivel = await candidato.isVisible({ timeout: 1_000 }).catch(() => false);

      if (!visivel) {
        continue;
      }

      await candidato
        .click({ noWaitAfter: true, timeout: 5_000 })
        .catch(() => undefined);

      const sumiu = await attentionTitle
        .waitFor({ state: 'hidden', timeout: 5_000 })
        .then(() => true)
        .catch(() => false);

      if (sumiu) {
        return true;
      }
    }
  }

  // Ultimo recurso: clicar via DOM dentro do container (sem tocar no scope inteiro
  // nem disparar Enter no teclado, que poderiam submeter forms nao relacionados).
  const clickedByDom = await attentionContainer
    .evaluate((root) => {
      const candidates = [...root.querySelectorAll('input, button')];
      const okElement = candidates.find((node) => {
        const value = node instanceof HTMLInputElement ? node.value : node.textContent;
        const rect = node instanceof HTMLElement ? node.getBoundingClientRect() : undefined;

        return (
          value?.trim().toLowerCase() === 'ok' &&
          rect !== undefined &&
          rect.width > 0 &&
          rect.height > 0
        );
      });

      if (!(okElement instanceof HTMLElement)) {
        return false;
      }

      okElement.click();
      return true;
    })
    .catch(() => false);

  if (!clickedByDom) {
    return false;
  }

  return attentionTitle
    .waitFor({ state: 'hidden', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
}

async function extrairMensagemDoContainer(
  attentionContainer: Locator,
  danfe: string | undefined,
) {
  const dialogMessage = await attentionContainer
    .evaluate((element) => {
      const texts = [...element.querySelectorAll('td, th, div, span')]
        .map((node) => node.textContent?.trim().replace(/\s+/g, ' '))
        .filter(
          (text): text is string =>
            Boolean(text) && text !== '!!! Atenção !!!' && text.toLowerCase() !== 'ok',
        );

      return texts.sort((left, right) => right.length - left.length)[0];
    })
    .catch(() => undefined);

  if (!danfe) {
    return dialogMessage;
  }

  const messageCell = attentionContainer
    .getByRole('cell', {
      name: new RegExp(`${escapeRegExp(danfe)}\\s+.+`),
    })
    .first();
  const cellText = (await messageCell
    .textContent({ timeout: ATTENTION_MESSAGE_TIMEOUT })
    .catch(() => undefined))
    ?.trim()
    .replace(/\s+/g, ' ');

  return cellText || dialogMessage;
}

async function capturarMensagemAtencao(page: Page, danfe: string) {
  const start = Date.now();
  let frame: FrameLike | undefined;

  while (Date.now() - start < ATTENTION_MESSAGE_TIMEOUT) {
    frame = await localizarFrameComAtencao(page);

    if (frame) {
      break;
    }

    await sleep(100);
  }

  if (!frame) {
    return undefined;
  }

  const attentionTitle = attentionTitleLocator(frame);
  const attentionContainer = await selecionarAttentionContainer(frame, attentionTitle);
  const message = await extrairMensagemDoContainer(attentionContainer, danfe);

  await fecharAlertaAtencao(attentionContainer, attentionTitle);

  return message || 'Erro ao inserir nota fiscal.';
}

/**
 * Verifica se ha overlay `<div id="alert">` bloqueando cliques em qualquer frame.
 * Quando encontra, captura a mensagem (se houver "!!! Atenção !!!" dentro) e tenta
 * fechar via `fecharAlertaAtencao`.
 *
 * Retorna `aindaVisivel: true` se o overlay continuar visivel apos a tentativa
 * (caso em que o caller deve abortar para nao bater 30s contra o intercept de pointer
 * events do Playwright). `message` traz a mensagem capturada (se possivel) para o erro.
 */
async function garantirSemOverlayBloqueante(
  page: Page,
  danfe?: string,
): Promise<{ aindaVisivel: boolean; message?: string; overlayEncontrado: boolean }> {
  const located = await localizarOverlayAlert(page);

  if (!located) {
    return { aindaVisivel: false, overlayEncontrado: false };
  }

  const { frame, overlay } = located;
  const attentionTitle = attentionTitleLocator(frame);
  const temAttention = await attentionTitle.isVisible({ timeout: OVERLAY_PROBE_TIMEOUT_MS }).catch(() => false);

  let message: string | undefined;

  if (temAttention) {
    const container = await selecionarAttentionContainer(frame, attentionTitle);
    message = await extrairMensagemDoContainer(container, danfe);
    await fecharAlertaAtencao(container, attentionTitle);
  } else {
    // Overlay sem attention reconhecivel: ainda assim tenta clicar OK dentro do
    // proprio overlay (cobre dialogs nao identificados pelo nosso titulo padrao).
    await fecharAlertaAtencao(overlay, attentionTitle);
  }

  const aindaVisivel = await overlay.isVisible({ timeout: OVERLAY_PROBE_TIMEOUT_MS }).catch(() => false);

  return {
    aindaVisivel,
    overlayEncontrado: true,
    message: message || (aindaVisivel ? 'Overlay bloqueante permanece visivel.' : undefined),
  };
}

async function salvarPdfDoPopup(page: Page, danfe: string, pdfDownloadDir: string) {
  const popup = await page.waitForEvent('popup', { timeout: PDF_POPUP_TIMEOUT }).catch(() => null);

  if (!popup) {
    throw new Error('Nota enviada, mas a janela do PDF nao foi detectada.');
  }

  try {
    await popup.waitForLoadState('domcontentloaded', { timeout: PDF_POPUP_TIMEOUT }).catch(() => undefined);

    const pdfUrl = popup.url();

    if (!pdfUrl) {
      throw new Error('A janela do PDF abriu sem URL para download.');
    }

    const response = await popup.context().request.get(pdfUrl);

    if (!response.ok()) {
      throw new Error(`Falha ao baixar PDF (${response.status()} ${response.statusText()}).`);
    }

    await mkdir(pdfDownloadDir, { recursive: true });

    const pdfPath = resolve(pdfDownloadDir, `${danfe}.pdf`);
    await writeFile(pdfPath, await response.body());

    return pdfPath;
  } finally {
    await popup.close().catch(() => undefined);
  }
}

async function salvarPdfOuCapturarErroAposEnviar(
  page: Page,
  pdfPromise: Promise<{ pdfPath: string } | { pdfError: Error }>,
) {
  const inlineErrorPromise = capturarErroInline(page).then((message) => ({ message }));
  const firstResult = await Promise.race([pdfPromise, inlineErrorPromise]);

  if ('pdfPath' in firstResult) {
    return firstResult.pdfPath;
  }

  if ('message' in firstResult && firstResult.message) {
    throw new Error(firstResult.message);
  }

  const finalResult = await pdfPromise;

  if ('pdfPath' in finalResult) {
    return finalResult.pdfPath;
  }

  throw finalResult.pdfError;
}

async function validarDanfeInseridaAntesDeSalvar(
  page: Page,
  danfe: string,
  insertGridConfirmTimeoutMs: number,
) {
  const deadline = Date.now() + insertGridConfirmTimeoutMs;

  while (Date.now() < deadline) {
    if (await chaveVisivelEmAlgumaFrame(page, danfe)) {
      return;
    }

    const inlineErrorMessage = await capturarErroInline(page, INLINE_ERROR_POLL_TIMEOUT_MS);

    if (inlineErrorMessage) {
      throw new Error(inlineErrorMessage);
    }

    await sleep(INSERIR_POLL_MS);
  }

  const delayedInlineErrorMessage = await capturarErroInline(page, 1_000);

  if (delayedInlineErrorMessage) {
    throw new Error(delayedInlineErrorMessage);
  }

  throw new Error('Nota fiscal nao foi inserida no quadro de notas fiscais.');
}

type IncluirDanfeTimeouts = {
  inserirOutcomeTimeoutMs: number;
  insertGridConfirmTimeoutMs: number;
};

function calcularHardDeadlineMs(
  { inserirOutcomeTimeoutMs }: IncluirDanfeTimeouts,
  override: number | undefined,
) {
  if (override !== undefined && override > 0) {
    return override;
  }

  // 4x o outcome (duas fases de espera + capturar atencao + validacao) + margem fixa
  // para Salvar/Enviar/PDF/popup. Garantia de saida mesmo se algum await travar.
  return 4 * inserirOutcomeTimeoutMs + DEFAULT_HARD_DEADLINE_MARGIN_MS;
}

function comDeadlineAbsoluto<T>(
  promise: Promise<T>,
  deadlineMs: number,
  danfe: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new Error(`Tempo total excedido (${deadlineMs}ms) processando chave ${danfe}.`),
      );
    }, deadlineMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  }) as Promise<T>;
}

/**
 * Fluxo canônico de inclusão de uma chave DANFE no AGIL (apos `autenticarAgil`), alinhado ao
 * que o Playwright Codegen registra na SEFAZ-SE:
 *
 * - **Abrir tela**: sondagem rapida de `#danfe` (`DANFE_QUICK_VISIBILITY_PROBE_MS`);
 *   quando o campo nao aparece, reabre via AGIL + "Incluir Nota Fiscal" com tentativas curtas.
 * - **Sucesso**: preencher `#danfe` -> Inserir -> pausa `POST_CLICK_SETTLE_MS` (1s) -> aguardar
 *   linha na grelha -> Salvar -> mesma pausa -> registrar listener do popup PDF -> Enviar ->
 *   salvar PDF ou erro inline.
 * - **Erro (ex. "ja vinculado")**: apos Inserir + pausa, detecta modal "!!! Atenção !!!", le a
 *   mensagem (incl. celula com a chave), fecha OK no container do alerta e lanca — sem Salvar/
 *   Enviar. Nao usamos clique nas celulas so para localizar; polling + locators equivalentes.
 */
async function incluirDanfeAtual(
  page: Page,
  danfe: string,
  {
    dryRun = false,
    pdfDownloadDir = DEFAULT_PDF_DOWNLOAD_DIR,
    inserirOutcomeTimeoutMs,
    insertGridConfirmTimeoutMs,
    onPhase,
  }: { dryRun?: boolean; pdfDownloadDir?: string; onPhase?: PhaseLogger } & IncluirDanfeTimeouts,
) {
  const danfeInput = await medirFase('Abrir tela', onPhase, () =>
    abrirTelaInclusaoNotaFiscal(page),
  );

  // Best-effort: dispensa qualquer overlay residual antes de focar no campo da chave.
  await garantirSemOverlayBloqueante(page, danfe);

  await danfeInput.click();

  if (danfe) {
    await danfeInput.fill(danfe);
  }

  if (dryRun) {
    return {
      message: 'Dry-run finalizado antes de Salvar.',
    };
  }

  await medirFase('Inserir', onPhase, async () => {
    await clickComCheckOverlay(page, 'Inserir', danfe);
    await sleep(POST_CLICK_SETTLE_MS);
  });

  await medirFase('Detectar alerta/grelha', onPhase, async () => {
    const outcome = await aguardarResultadoAposInserir(page, danfe, inserirOutcomeTimeoutMs);
    const maxEsperaInserirMs = 2 * inserirOutcomeTimeoutMs;

    if (outcome === 'attention') {
      const attentionMessage = await capturarMensagemAtencao(page, danfe);

      if (attentionMessage) {
        throw new Error(attentionMessage);
      }
    } else if (outcome === 'grid') {
      await validarDanfeInseridaAntesDeSalvar(page, danfe, insertGridConfirmTimeoutMs);
    } else {
      const lateAttention = await capturarMensagemAtencao(page, danfe);

      if (lateAttention) {
        throw new Error(lateAttention);
      }

      const extendedOutcome = await aguardarResultadoAposInserir(page, danfe, inserirOutcomeTimeoutMs);

      if (extendedOutcome === 'attention') {
        const attentionMessage = await capturarMensagemAtencao(page, danfe);

        if (attentionMessage) {
          throw new Error(attentionMessage);
        }
      } else if (extendedOutcome === 'grid') {
        await validarDanfeInseridaAntesDeSalvar(page, danfe, insertGridConfirmTimeoutMs);
      } else {
        try {
          await validarDanfeInseridaAntesDeSalvar(page, danfe, insertGridConfirmTimeoutMs);
        } catch (error) {
          const message = errorMessage(error);

          if (message.includes('nao foi inserida no quadro de notas fiscais')) {
            throw new Error(
              `Sem resposta do AGIL apos Inserir (nem alerta nem linha na grelha em ate ${maxEsperaInserirMs}ms). ${message}`,
            );
          }

          throw error;
        }
      }
    }
  });

  await medirFase('Salvar', onPhase, async () => {
    await clickComCheckOverlay(page, 'Salvar', danfe);
    await sleep(POST_CLICK_SETTLE_MS);
  });

  const pdfPath = await medirFase('Enviar/PDF', onPhase, async () => {
    const pdfPromise = salvarPdfDoPopup(page, danfe, pdfDownloadDir).then(
      (path) => ({ pdfPath: path }),
      (error) => ({ pdfError: error instanceof Error ? error : new Error(String(error)) }),
    );

    await clickComCheckOverlay(page, 'Enviar', danfe);

    return await salvarPdfOuCapturarErroAposEnviar(page, pdfPromise);
  });

  return {
    message: `PDF salvo em ${pdfPath}.`,
    pdfPath,
  };
}

export async function incluirNotasFiscaisAgil(
  page: Page,
  {
    danfes,
    dryRun = false,
    pdfDownloadDir = DEFAULT_PDF_DOWNLOAD_DIR,
    onProgress,
    inserirOutcomeTimeoutMs: inserirOutcomeTimeoutOpt,
    insertGridConfirmTimeoutMs: insertGridConfirmTimeoutOpt,
    hardDeadlineMs: hardDeadlineMsOpt,
    ...auth
  }: IncluirNotasFiscaisOptions,
) {
  const timeouts = resolveInserirTimeouts({
    inserirOutcomeTimeoutMs: inserirOutcomeTimeoutOpt,
    insertGridConfirmTimeoutMs: insertGridConfirmTimeoutOpt,
  });
  const authenticatedPage = await autenticarAgil(page, auth);
  const companyPdfDownloadDir = dryRun
    ? pdfDownloadDir
    : await obterDiretorioDownloadEmpresa(authenticatedPage, pdfDownloadDir);
  const results: DanfeResult[] = [];

  const hardDeadlineMs = calcularHardDeadlineMs(
    timeouts,
    isPositiveNumber(hardDeadlineMsOpt) ? hardDeadlineMsOpt : undefined,
  );
  let previousErrored = false;

  for (const danfe of danfes) {
    onProgress?.({ danfe, status: 'processing' });

    try {
      if (previousErrored && PREPARE_NEXT_AFTER_ERROR_REOPEN_ENABLED) {
        const start = Date.now();

        onProgress?.({
          danfe,
          status: 'processing',
          message: 'Preparando proxima nota apos erro anterior.',
        });

        const { overlayEncontrado } = await forcarReabrirTelaInclusaoNotaFiscal(
          authenticatedPage,
        );

        onProgress?.({
          danfe,
          status: 'processing',
          message: `Preparar proxima nota concluido em ${elapsedMs(start)}ms (${
            overlayEncontrado ? 'overlay encontrado' : 'sem overlay encontrado'
          }).`,
        });
      } else if (previousErrored) {
        onProgress?.({
          danfe,
          status: 'processing',
          message: 'Preparacao da proxima nota apos erro anterior inativa para testes.',
        });
      }

      const { message, pdfPath } = await comDeadlineAbsoluto(
        incluirDanfeAtual(authenticatedPage, danfe, {
          dryRun,
          pdfDownloadDir: companyPdfDownloadDir,
          inserirOutcomeTimeoutMs: timeouts.inserirOutcomeTimeoutMs,
          insertGridConfirmTimeoutMs: timeouts.insertGridConfirmTimeoutMs,
          onPhase: (message) => onProgress?.({ danfe, status: 'processing', message }),
        }),
        hardDeadlineMs,
        danfe,
      );
      const result: DanfeResult = { danfe, status: 'success', message, pdfPath };

      results.push(result);
      onProgress?.(result);
      previousErrored = false;
    } catch (error) {
      const message = errorMessage(error);
      const result: DanfeResult = { danfe, status: 'error', message };

      results.push(result);
      onProgress?.(result);
      previousErrored = true;
    }
  }

  return results;
}

export async function incluirNotaFiscalAgil(page: Page, options: IncluirNotaFiscalOptions) {
  const {
    danfe,
    dryRun = false,
    pdfDownloadDir = DEFAULT_PDF_DOWNLOAD_DIR,
    inserirOutcomeTimeoutMs,
    insertGridConfirmTimeoutMs,
    hardDeadlineMs,
    ...auth
  } = options;

  if (!danfe) {
    const authenticatedPage = await autenticarAgil(page, auth);
    const danfeInput = await abrirTelaInclusaoNotaFiscal(authenticatedPage);

    await danfeInput.click();

    if (dryRun) {
      return;
    }

    await authenticatedPage.getByRole('button', { name: 'Salvar' }).click();
    await authenticatedPage.getByRole('button', { name: 'Enviar' }).click();
    return;
  }

  await incluirNotasFiscaisAgil(page, {
    ...auth,
    danfes: [danfe],
    dryRun,
    pdfDownloadDir,
    inserirOutcomeTimeoutMs,
    insertGridConfirmTimeoutMs,
    hardDeadlineMs,
  });
}
