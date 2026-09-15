import type { SefazAuthConfig } from "./sefaz-auth";

export const ACESSO_USUARIO_URL = "https://www.sefaz.se.gov.br/SitePages/acesso_usuario.aspx";
export const VINCULOS_URL = "https://portais-fazendario.apps.sefaz.se.gov.br/private/portal-fazendario/vinculos";
export const PORTAL_FAZENDARIO_HOME_URL = "https://portais-fazendario.apps.sefaz.se.gov.br/private/portal-fazendario";
export const SIT_MODULE_URL = `${PORTAL_FAZENDARIO_HOME_URL}/modulo?sistema=SIT`;
export const EMPRESA_VINCULO_CARD = /Empresa\s+Inscrita|Contribuinte|^Empresa$/i;

/** @deprecated Portal legado; mantido para compatibilidade de imports. */
export const LOGIN_CONTABILISTA_URL = "https://security.sefaz.se.gov.br/internet/portal/contabilista/atoAcessoContabilista.jsp";
/** @deprecated Portal legado; use PORTAL_FAZENDARIO_HOME_URL. */
export const PORTAL_URL = PORTAL_FAZENDARIO_HOME_URL;

type SefazLocator = {
  click(options?: { timeout?: number }): Promise<unknown>;
  filter?(options: { hasText: string | RegExp }): SefazLocator;
  getByRole?(role: string, options?: { name?: string | RegExp }): SefazLocator;
  getByText?(text: string | RegExp, options?: { exact?: boolean }): Pick<SefazLocator, "click" | "isVisible">;
  innerText?(options?: { timeout?: number }): Promise<string>;
  isVisible?(options?: { timeout?: number }): Promise<boolean>;
};

type SefazPlaywrightPage = {
  close?(): Promise<unknown>;
  getByLabel?(text: string | RegExp): SefazLocator;
  getByRole(role: string, options?: { name?: string | RegExp }): SefazLocator;
  getByText(text: string | RegExp, options?: { exact?: boolean }): Pick<SefazLocator, "click" | "isVisible">;
  goto(url: string, options?: { waitUntil?: "domcontentloaded" }): Promise<unknown>;
  locator(selector: string): SefazLocator;
  url(): string;
  waitForEvent?(event: "popup", options?: { timeout?: number }): Promise<SefazPlaywrightPage>;
  waitForLoadState(state: "domcontentloaded" | "networkidle"): Promise<unknown>;
  waitForTimeout?(ms: number): Promise<unknown>;
};

export type SefazLoginOptions = Partial<SefazAuthConfig> & {
  user: string;
  password?: string;
  timeoutMs: number;
};

/**
 * Entra no Portal Fazendario via certificado digital e seleciona o vinculo Contador.
 * Retorna a pagina do portal (popup), que deve ser usada nas etapas seguintes.
 */
export async function loginSefazContabilista(
  page: SefazPlaywrightPage,
  options: SefazLoginOptions,
): Promise<SefazPlaywrightPage> {
  if (!options.certificate) {
    throw new Error("Login por certificado digital e obrigatorio. Configure o certificado A1.");
  }

  const vinculoCode = options.user.trim();
  if (!vinculoCode) {
    throw new Error("Informe SEFAZ_USER com o codigo do vinculo Contador.");
  }

  await page.goto(ACESSO_USUARIO_URL, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);

  const portalPage = await openPortalFazendarioPopup(page, options.timeoutMs);
  await portalPage.getByRole("link", { name: /Certificado\s+Digital/i }).click({ timeout: options.timeoutMs });
  await portalPage.waitForLoadState("domcontentloaded").catch(() => undefined);
  await assertCertificateAuthSucceeded(portalPage, options.timeoutMs);

  await ensureVinculosPage(portalPage, options.timeoutMs);
  await selectVinculo(portalPage, /Contador/i, vinculoCode, options.timeoutMs, "Contador");
  await assertLoggedIn(portalPage, options.timeoutMs);

  // Nao fechar a pagina opener: no Edge/Chromium isso pode encerrar o popup do portal.
  if (portalPage !== page) {
    await page.goto?.("about:blank").catch(() => undefined);
  }

  return portalPage;
}

/**
 * Entra no Portal Fazendario via certificado digital e seleciona o vinculo Empresa Inscrita.
 * Usado pelo AGIL (nao pelo DIA/Contador).
 */
export async function loginSefazEmpresa(
  page: SefazPlaywrightPage,
  options: SefazLoginOptions,
): Promise<SefazPlaywrightPage> {
  if (!options.certificate) {
    throw new Error("Login por certificado digital e obrigatorio. Configure o certificado A1.");
  }

  const vinculoCode = options.user.trim();
  if (!vinculoCode) {
    throw new Error("Informe o codigo do vinculo Empresa Inscrita.");
  }

  await page.goto(ACESSO_USUARIO_URL, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);

  const portalPage = await openPortalFazendarioPopup(page, options.timeoutMs);
  await portalPage.getByRole("link", { name: /Certificado\s+Digital/i }).click({ timeout: options.timeoutMs });
  await portalPage.waitForLoadState("domcontentloaded").catch(() => undefined);
  await assertCertificateAuthSucceeded(portalPage, options.timeoutMs);

  await ensureVinculosPage(portalPage, options.timeoutMs);
  await selectVinculo(portalPage, EMPRESA_VINCULO_CARD, vinculoCode, options.timeoutMs, "Empresa Inscrita");
  await assertLoggedIn(portalPage, options.timeoutMs);

  if (portalPage !== page) {
    await page.goto?.("about:blank").catch(() => undefined);
  }

  return portalPage;
}

/**
 * Abre o Portal Fazendario e espera o usuario escolher o certificado (prompt do Windows)
 * e o vinculo Empresa Inscrita na tela. Nao injeta PFX nem seleciona o codigo automaticamente.
 */
export async function loginSefazEmpresaInteractive(
  page: SefazPlaywrightPage,
  timeoutMs: number,
): Promise<SefazPlaywrightPage> {
  await page.goto(ACESSO_USUARIO_URL, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);

  const portalPage = await openPortalFazendarioPopup(page, timeoutMs);

  const certLink = portalPage.getByRole("link", { name: /Certificado\s+Digital/i });
  const certVisible = await certLink.isVisible?.({ timeout: 3_000 }).catch(() => false);
  if (certVisible) {
    await certLink.click({ timeout: timeoutMs }).catch(() => undefined);
    await portalPage.waitForLoadState("domcontentloaded").catch(() => undefined);
  }

  await waitForAgilEmpresaSession(portalPage, timeoutMs);

  if (portalPage !== page) {
    await page.goto?.("about:blank").catch(() => undefined);
  }

  return portalPage;
}

export function isAgilEmpresaSessionReady(pageUrl: string, bodyText: string): boolean {
  if (!/portais-fazendario\.apps\.sefaz\.se\.gov\.br/i.test(pageUrl)) {
    return false;
  }
  if (/\/vinculos(?:\/|\?|#|$)/i.test(pageUrl)) {
    return false;
  }

  return (
    /modulo\?sistema=SIT/i.test(pageUrl) ||
    /Trocar\s+V[ií]nculo/i.test(bodyText) ||
    /Empresa\s+Inscrita/i.test(bodyText) ||
    /Informa[cç][oõ]es\s+de\s+Tr[aâ]nsito/i.test(bodyText)
  );
}

async function waitForAgilEmpresaSession(page: SefazPlaywrightPage, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = page.url();
    const body = (await page.locator("body").innerText?.({ timeout: 1_500 }).catch(() => "")) ?? "";
    if (/Falha na Autentica[cç][aã]o|certificado n[aã]o foi encontrado/i.test(body)) {
      throw new Error(
        `Login por certificado rejeitado pela SEFAZ em ${url}. Selecione um certificado valido no prompt do Windows.`,
      );
    }
    if (isAgilEmpresaSessionReady(url, body)) {
      return;
    }
    await delay(500);
  }

  throw new Error(
    `Tempo esgotado aguardando certificado e vinculo Empresa Inscrita. URL atual: ${page.url()}`,
  );
}

export async function openDiaModule(page: SefazPlaywrightPage, timeoutMs: number): Promise<void> {
  const transito = page.getByText(/Informa[cç][oõ]es\s+de\s+Tr[aâ]nsito/i);
  const alreadyOpen = await page.getByRole("treeitem", { name: /^DIA$/i }).isVisible?.({ timeout: 1_500 }).catch(() => false);
  if (!alreadyOpen) {
    await transito.click({ timeout: timeoutMs });
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  }

  const treeItem = page.getByRole("treeitem", { name: /^DIA$/i });
  const treeButton = treeItem.getByRole?.("button");
  if (treeButton) {
    await treeButton.click({ timeout: timeoutMs });
  } else {
    await treeItem.click({ timeout: timeoutMs });
  }

  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
}

export async function ensureSitModule(page: SefazPlaywrightPage, timeoutMs: number): Promise<void> {
  if (/modulo\?sistema=SIT/i.test(page.url())) {
    return;
  }

  const transito = page.getByText(/Informa[cç][oõ]es\s+de\s+Tr[aâ]nsito/i);
  const transitoVisible = await transito.isVisible?.({ timeout: 1_500 }).catch(() => false);
  if (transitoVisible) {
    await transito.click({ timeout: timeoutMs });
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    return;
  }

  await page.goto(SIT_MODULE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
}

/**
 * Abre AGIL → Incluir Nota Fiscal na arvore SIT (Informações de Trânsito).
 * Expandir AGIL nao carrega o formulario; e obrigatorio clicar no item filho.
 */
export async function openAgilIncluirNotaFiscal(page: SefazPlaywrightPage, timeoutMs: number): Promise<void> {
  await ensureSitModule(page, timeoutMs);

  const incluirViaLabel = page.getByLabel?.("AGIL")?.getByText?.(/Incluir\s+Nota\s+Fiscal/i);
  if (incluirViaLabel) {
    const visible = await incluirViaLabel.isVisible?.({ timeout: 1_500 }).catch(() => false);
    if (visible) {
      await incluirViaLabel.click({ timeout: timeoutMs });
      await page.waitForLoadState("domcontentloaded").catch(() => undefined);
      return;
    }
  }

  const incluir = page.getByRole("treeitem", { name: /Incluir\s+Nota\s+Fiscal/i });
  const incluirVisible = await incluir.isVisible?.({ timeout: 1_500 }).catch(() => false);
  if (!incluirVisible) {
    await expandAgilTree(page, timeoutMs);
  }

  const incluirAfterExpand = page.getByRole("treeitem", { name: /Incluir\s+Nota\s+Fiscal/i });
  const treeVisible = await incluirAfterExpand.isVisible?.({ timeout: 2_000 }).catch(() => false);
  if (treeVisible) {
    await incluirAfterExpand.click({ timeout: timeoutMs });
  } else {
    await page.getByText(/Incluir\s+Nota\s+Fiscal/i).click({ timeout: timeoutMs });
  }

  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
}

async function expandAgilTree(page: SefazPlaywrightPage, timeoutMs: number): Promise<void> {
  const agil = page.getByRole("treeitem", { name: /^AGIL$/i });
  const agilButton = agil.getByRole?.("button");
  if (agilButton) {
    await agilButton.click({ timeout: timeoutMs }).catch(async () => {
      await agil.click({ timeout: timeoutMs });
    });
    return;
  }

  const agilVisible = await agil.isVisible?.({ timeout: 1_500 }).catch(() => false);
  if (agilVisible) {
    await agil.click({ timeout: timeoutMs });
    return;
  }

  await page.getByText("AGIL", { exact: true }).click({ timeout: timeoutMs });
}

export async function ensurePortalHome(page: SefazPlaywrightPage, timeoutMs: number): Promise<void> {
  const body = (await page.locator("body").innerText?.({ timeout: 2_000 }).catch(() => "")) ?? "";
  if (/portais-fazendario\.apps\.sefaz\.se\.gov\.br/i.test(page.url()) && /Informa[cç][oõ]es\s+de\s+Tr[aâ]nsito|\bDIA\b/i.test(body)) {
    return;
  }

  await page.goto(PORTAL_FAZENDARIO_HOME_URL, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  void timeoutMs;
}

export function getSefazLoginFailureMessage(pageUrl: string, bodyText: string): string | undefined {
  const error = bodyText.match(/(?:preenchimento obrigat.rio|inv.lid[ao]|incorret[ao]|erro)[^\n\r]*/i)?.[0]?.trim();
  if (/erroLogin\.jsp/i.test(pageUrl) || error) {
    return `Login nao confirmado no portal SEFAZ-SE${error ? `: ${error}` : "."}`;
  }

  return undefined;
}

export function isSefazLoginConfirmed(pageUrl: string, bodyText: string): boolean {
  if (/portais-fazendario\.apps\.sefaz\.se\.gov\.br/i.test(pageUrl)) {
    return (
      /Informa[cç][oõ]es\s+de\s+Tr[aâ]nsito|\bDIA\b|v[ií]nculo/i.test(bodyText) ||
      /\/private\/portal-fazendario/i.test(pageUrl)
    );
  }

  return /portal\.jsp/i.test(pageUrl) || /logout\.jsp/i.test(bodyText) || /\bDIA\b/i.test(bodyText);
}

async function openPortalFazendarioPopup(page: SefazPlaywrightPage, timeoutMs: number): Promise<SefazPlaywrightPage> {
  if (!page.waitForEvent) {
    await page.getByRole("link", { name: /Acessar\s+Portal\s+Fazend[aá]rio/i }).click({ timeout: timeoutMs });
    return page;
  }

  const popupPromise = page.waitForEvent("popup", { timeout: timeoutMs });
  await page.getByRole("link", { name: /Acessar\s+Portal\s+Fazend[aá]rio/i }).click({ timeout: timeoutMs });
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded").catch(() => undefined);
  return popup;
}

async function ensureVinculosPage(page: SefazPlaywrightPage, timeoutMs: number): Promise<void> {
  if (!(await isVinculosReady(page))) {
    await page.goto(VINCULOS_URL, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isVinculosReady(page)) {
      return;
    }
    await delay(300);
  }

  throw new Error(`Tela de vinculos do Portal Fazendario nao carregou. URL atual: ${page.url()}`);
}

async function isVinculosReady(page: SefazPlaywrightPage): Promise<boolean> {
  if (/\/vinculos/i.test(page.url())) {
    return true;
  }

  const body = (await page.locator("body").innerText?.({ timeout: 1_500 }).catch(() => "")) ?? "";
  return /Selecione o seu v[ií]nculo|Boas vindas|Contador|Empresa Inscrita/i.test(body);
}

async function selectVinculo(
  page: SefazPlaywrightPage,
  cardPattern: RegExp,
  vinculoCode: string,
  timeoutMs: number,
  fallbackLabel: string,
): Promise<void> {
  const card =
    page.locator("sefaz-card-vinculo").filter?.({ hasText: cardPattern }) ??
    page.locator("p-card").filter?.({ hasText: cardPattern });

  if (card) {
    const button = card.getByRole?.("button");
    if (button) {
      await button.click({ timeout: timeoutMs }).catch(async () => {
        await card.click({ timeout: timeoutMs });
      });
    } else {
      await card.click({ timeout: timeoutMs });
    }
  } else {
    await page.getByText(fallbackLabel, { exact: true }).click({ timeout: timeoutMs });
  }

  await delay(500);

  await page.getByRole("combobox", { name: /Selecione\s+o\s+v[ií]nculo/i }).click({ timeout: timeoutMs });
  await page.getByRole("option", { name: new RegExp(escapeRegExp(vinculoCode), "i") }).click({ timeout: timeoutMs });
  await page.getByRole("button", { name: /^Ok$/i }).click({ timeout: timeoutMs });
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForLoadState("networkidle").catch(() => undefined);
}

async function assertCertificateAuthSucceeded(page: SefazPlaywrightPage, timeoutMs: number): Promise<void> {
  const body = (await page.locator("body").innerText?.({ timeout: Math.min(timeoutMs, 8_000) }).catch(() => "")) ?? "";
  if (/Falha na Autentica[cç][aã]o|certificado n[aã]o foi encontrado/i.test(body)) {
    throw new Error(
      `Login por certificado rejeitado pela SEFAZ em ${page.url()}. Verifique o PFX, a senha e se a origin portal-cert esta configurada.`,
    );
  }
}

async function assertLoggedIn(page: SefazPlaywrightPage, timeoutMs: number): Promise<void> {
  const url = page.url();
  if (/portais-fazendario\.apps\.sefaz\.se\.gov\.br/i.test(url) && /\/private\/portal-fazendario/i.test(url)) {
    return;
  }

  const body = (await page.locator("body").innerText?.({ timeout: Math.min(timeoutMs, 8_000) }).catch(() => "")) ?? "";
  const failureMessage = getSefazLoginFailureMessage(url, body);
  if (failureMessage) {
    throw new Error(failureMessage);
  }
  if (!isSefazLoginConfirmed(url, body)) {
    throw new Error("Login por certificado nao confirmado no Portal Fazendario SEFAZ-SE.");
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
