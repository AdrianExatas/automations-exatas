import {
  performOnvioLogin,
  resolveLoginOptions,
  type AuthMfaMethod,
  type LoginOnvioOptions,
} from "@exatas/onvio-auth";
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "playwright";
import type { ClientUser, ClientUserLookupRequest, ClientUsersProvider } from "./types";

export interface OnvioClientUsersProviderOptions {
  email: string;
  password: string;
  headless?: boolean;
  mfaMethod?: AuthMfaMethod;
  mfaCode?: string;
  timeouts?: LoginOnvioOptions["timeouts"];
  logger?: Pick<Console, "info" | "warn" | "error">;
}

const VIEWPORT = { width: 1920, height: 1080 };

function normalizeCodeForSearch(code: string): string {
  const trimmed = String(code ?? "").trim();
  return /^\d+$/.test(trimmed) ? String(parseInt(trimmed, 10)) : trimmed;
}

async function maybeClick(locator: Locator, timeout = 3000): Promise<boolean> {
  try {
    await locator.click({ timeout });
    return true;
  } catch {
    return false;
  }
}

async function navigateToClientPortal(page: Page, timeout: number): Promise<Page> {
  const settings = page.getByTestId("settings").first();
  if (await settings.isVisible({ timeout: 2000 }).catch(() => false)) {
    return page;
  }

  await page.getByRole("link", { name: "Menu" }).click({ timeout });
  const popupPromise = page.waitForEvent("popup", { timeout }).catch(() => null);
  await page.getByRole("link", { name: /Portal do Cliente/i }).click({ timeout });
  const popup = await popupPromise;
  const portalPage = popup ?? page;
  await portalPage.getByTestId("settings").waitFor({ state: "visible", timeout });
  await portalPage.setViewportSize(VIEWPORT);
  return portalPage;
}

async function navigateToClientUsers(page: Page, timeout: number): Promise<void> {
  await page.getByTestId("settings").click({ timeout });
  const menuItem = page.getByTestId("settings-clients-users");
  await menuItem.waitFor({ state: "visible", timeout });
  await menuItem.click({ timeout });
  await page.locator('input[id^="client-"][id$="-input"][type="text"]').first().waitFor({
    state: "visible",
    timeout,
  });
}

async function configurePagination(page: Page, timeout: number): Promise<void> {
  const paginationSelect = page
    .getByRole("navigation", { name: "Pagination" })
    .getByTestId("grid-pagination-page-selection");
  try {
    await paginationSelect.waitFor({ state: "visible", timeout: Math.min(timeout, 5000) });
    await paginationSelect.selectOption("50");
    await page.waitForLoadState("networkidle", { timeout: Math.min(timeout, 5000) }).catch(() => {});
  } catch {
    // Pagination is optional; the visible grid can still be read.
  }
}

async function selectClient(page: Page, codigo: string, timeout: number): Promise<void> {
  const searchCode = normalizeCodeForSearch(codigo);
  const searchField = page.locator('input[id^="client-"][id$="-input"][type="text"]').first();

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await searchField.waitFor({ state: "visible", timeout });
      await searchField.clear();
      await searchField.fill(searchCode);
      const clientCell = page.getByRole("gridcell", {
        name: new RegExp(`^0*${searchCode}$`),
      });
      await clientCell.waitFor({ state: "visible", timeout });
      await clientCell.click();
      await page.locator(".bento-icon-edit").first().waitFor({ state: "visible", timeout });
      return;
    } catch (error) {
      if (attempt === 3) {
        throw new Error(
          `Nao foi possivel selecionar cliente ${searchCode}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      await page.waitForTimeout(1000);
    }
  }
}

async function textFrom(locator: Locator, timeout = 500): Promise<string> {
  if (!(await locator.isVisible({ timeout }).catch(() => false))) return "";
  return ((await locator.textContent().catch(() => "")) ?? "").trim();
}

async function readUserFromIndexedCells(page: Page, index: number): Promise<ClientUser | null> {
  const name =
    (await textFrom(page.locator(`[data-testid="col-name-row-${index}"]`).first())) ||
    (await textFrom(page.locator(`[data-testid="col-name-row-${index + 1}"]`).first()));
  const email =
    (await textFrom(page.locator(`[data-testid="col-email-row-${index}"]`).first())) ||
    (await textFrom(page.locator(`[data-testid="col-email-row-${index + 1}"]`).first()));

  if (!name && !email) return null;
  return { nome: name, email };
}

async function readUserFromButtonRow(button: Locator): Promise<ClientUser | null> {
  const row = button
    .locator('xpath=ancestor::tr | ancestor::div[@role="row"] | ancestor::*[contains(@class, "row")]')
    .first();
  if (!(await row.isVisible({ timeout: 500 }).catch(() => false))) return null;

  const cells = await row.locator("td, [role='gridcell']").all();
  let nome = "";
  let email = "";
  let id = "";

  for (const cell of cells) {
    const text = ((await cell.textContent().catch(() => "")) ?? "").trim();
    if (!text) continue;
    if (!email && text.includes("@")) email = text;
    if (!id && /^\d+$/.test(text)) id = text;
    if (!nome && !text.includes("@") && !/^\d+$/.test(text) && text.length > 2) {
      nome = text;
    }
  }

  if (!nome && !email && !id) return null;
  return { nome, email, id };
}

function dedupeUsers(users: ClientUser[]): ClientUser[] {
  const map = new Map<string, ClientUser>();
  for (const user of users) {
    const key = [user.nome, user.email, user.id].map((value) => value?.trim().toUpperCase() ?? "").join("|");
    if (!key.replace(/\|/g, "")) continue;
    if (!map.has(key)) map.set(key, user);
  }
  return Array.from(map.values());
}

async function listClientUsers(page: Page, timeout: number): Promise<ClientUser[]> {
  await page.waitForLoadState("networkidle", { timeout: Math.min(timeout, 5000) }).catch(() => {});
  await page.waitForTimeout(1000);

  const users: ClientUser[] = [];
  const editButtons = [
    ...(await page.locator(".bento-icon-edit").all()),
    ...(await page.locator('button[aria-label*="Editar"], button[aria-label*="Edit"], [data-testid*="edit"]').all()),
  ];

  for (let index = 0; index < editButtons.length; index++) {
    const button = editButtons[index];
    if (!(await button.isVisible({ timeout: 1000 }).catch(() => false))) continue;
    const byIndex = await readUserFromIndexedCells(page, index);
    const byRow = byIndex ?? (await readUserFromButtonRow(button));
    if (byRow) users.push(byRow);
  }

  if (users.length > 0) return dedupeUsers(users);

  const rows = await page.getByRole("row").all();
  for (const row of rows) {
    if ((await row.locator("[role='columnheader'], th").count()) > 0) continue;
    const cells = await row.locator("td, [role='gridcell']").all();
    let nome = "";
    let email = "";
    let id = "";

    for (const cell of cells) {
      const text = ((await cell.textContent().catch(() => "")) ?? "").trim();
      if (!text) continue;
      if (!email && text.includes("@")) email = text;
      if (!id && /^\d+$/.test(text)) id = text;
      if (!nome && !text.includes("@") && !/^\d+$/.test(text) && text.length > 2) nome = text;
    }

    if (nome || email || id) users.push({ nome, email, id });
  }

  return dedupeUsers(users);
}

export class OnvioClientUsersProvider implements ClientUsersProvider {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private readonly loginOptions: ReturnType<typeof resolveLoginOptions>;

  constructor(private readonly options: OnvioClientUsersProviderOptions) {
    this.loginOptions = resolveLoginOptions({
      email: options.email,
      password: options.password,
      browser: { headless: options.headless ?? false },
      mfa: {
        method: options.mfaMethod ?? "E-mail",
        code: options.mfaCode,
      },
      timeouts: options.timeouts,
    });
  }

  async lookupUsers(request: ClientUserLookupRequest): Promise<ClientUser[]> {
    const page = await this.ensureReady();
    this.options.logger?.info?.(`[Onvio] Buscando usuarios do cliente ${request.codigo} - ${request.nome}`);
    await selectClient(page, request.codigo, this.loginOptions.timeouts.longMs);
    await configurePagination(page, this.loginOptions.timeouts.mediumMs);
    return listClientUsers(page, this.loginOptions.timeouts.longMs);
  }

  async close(): Promise<void> {
    await this.browser?.close().catch(() => {});
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  private async ensureReady(): Promise<Page> {
    if (this.page) return this.page;

    this.browser = await chromium.launch({
      headless: this.loginOptions.browser.headless,
      slowMo: this.loginOptions.browser.slowMo,
    });
    this.context = await this.browser.newContext({
      locale: this.loginOptions.locale,
      timezoneId: this.loginOptions.timezoneId,
      reducedMotion: "reduce",
    });
    const page = await this.context.newPage();
    await page.setViewportSize(VIEWPORT);
    await performOnvioLogin(page, this.loginOptions);
    const portalPage = await navigateToClientPortal(page, this.loginOptions.timeouts.longMs);
    await navigateToClientUsers(portalPage, this.loginOptions.timeouts.longMs);
    this.page = portalPage;
    return portalPage;
  }
}
