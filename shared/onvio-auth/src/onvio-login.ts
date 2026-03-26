import fs from "node:fs";
import { chromium, type BrowserContext, type Page } from "playwright";
import { DEFAULT_ONVIO_BASE_URL, DEFAULT_TIMEOUTS } from "./constants";
import { ensureParentDir } from "./runtime-paths";
import type {
  AuthMfaMethod,
  AuthSession,
  AuthStorageState,
  LoginOnvioOptions,
} from "./types";

const LOGIN_URL_PATH = "/login/#/";

export interface ResolvedLoginOptions {
  email: string;
  password: string;
  baseUrl: string;
  locale: string;
  timezoneId: string;
  browser: {
    headless: boolean;
    slowMo?: number;
  };
  mfa: {
    method: AuthMfaMethod;
    code?: string;
    timeoutMs: number;
  };
  timeouts: {
    shortMs: number;
    mediumMs: number;
    longMs: number;
    mfaMs: number;
  };
  storageStatePath?: string;
}

export interface AuthenticatedOnvioContext {
  context: BrowserContext;
  page: Page;
  options: ResolvedLoginOptions;
}

function includesMfaUrl(url: string): boolean {
  return url.includes("mfa") || url.includes("login-options");
}

export function resolveLoginOptions(options: LoginOnvioOptions): ResolvedLoginOptions {
  const timeouts = {
    shortMs: options.timeouts?.shortMs ?? DEFAULT_TIMEOUTS.shortMs,
    mediumMs: options.timeouts?.mediumMs ?? DEFAULT_TIMEOUTS.mediumMs,
    longMs: options.timeouts?.longMs ?? DEFAULT_TIMEOUTS.longMs,
    mfaMs: options.timeouts?.mfaMs ?? DEFAULT_TIMEOUTS.mfaMs,
  };

  return {
    email: options.email,
    password: options.password,
    baseUrl: options.baseUrl ?? DEFAULT_ONVIO_BASE_URL,
    locale: options.locale ?? "pt-BR",
    timezoneId: options.timezoneId ?? "America/Sao_Paulo",
    browser: {
      headless: options.browser?.headless ?? false,
      slowMo: options.browser?.slowMo,
    },
    mfa: {
      method: options.mfa?.method ?? "E-mail",
      code: options.mfa?.code,
      timeoutMs: options.mfa?.timeoutMs ?? timeouts.mfaMs,
    },
    timeouts,
    storageStatePath: options.storageStatePath,
  };
}

async function clickInitialEntrar(page: Page, timeoutMs: number): Promise<void> {
  try {
    const button = page.locator("#trauth-continue-signin-btn");
    await button.waitFor({ state: "visible", timeout: timeoutMs });
    await button.click();
    return;
  } catch {
    await page.getByRole("button", { name: "Entrar" }).first().click({ timeout: timeoutMs });
  }
}

export async function handleMfa(page: Page, options: ResolvedLoginOptions): Promise<void> {
  try {
    await page.waitForURL((url) => includesMfaUrl(url.toString()), {
      timeout: options.timeouts.shortMs,
    });
  } catch {
    return;
  }

  try {
    if (options.mfa.method === "E-mail") {
      await page.getByRole("button", { name: /E-mail|Email/i }).click({
        timeout: options.timeouts.shortMs,
      });
    } else {
      await page.getByRole("button", { name: /SMS|Telefonema/i }).click({
        timeout: options.timeouts.shortMs,
      });
    }
  } catch {
    // Metodo ja selecionado ou nao disponivel.
  }

  if (options.mfa.code) {
    const codeInput = page.getByRole("textbox").first();
    await codeInput.waitFor({ state: "visible", timeout: options.timeouts.mediumMs });
    await codeInput.fill(options.mfa.code);
    await page.getByRole("button", { name: /Verificar|Confirmar|Continuar/i }).click({
      timeout: options.timeouts.mediumMs,
    });
  }

  await page.waitForURL((url) => !includesMfaUrl(url.toString()), {
    timeout: options.mfa.timeoutMs,
  });
}

export async function performOnvioLogin(
  page: Page,
  rawOptions: LoginOnvioOptions | ResolvedLoginOptions,
): Promise<void> {
  const options: ResolvedLoginOptions =
    "locale" in rawOptions
      ? (rawOptions as ResolvedLoginOptions)
      : resolveLoginOptions(rawOptions);

  await page.goto(`${options.baseUrl}${LOGIN_URL_PATH}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Entrar" }).first().waitFor({
    state: "visible",
    timeout: options.timeouts.longMs,
  });

  await clickInitialEntrar(page, options.timeouts.mediumMs);

  const emailField = page.getByRole("textbox", { name: "E-mail" });
  await emailField.waitFor({ state: "visible", timeout: options.timeouts.mediumMs });
  await emailField.fill(options.email);
  await emailField.press("Enter");

  const passwordField = page.getByRole("textbox", { name: "Senha" });
  await passwordField.waitFor({ state: "visible", timeout: options.timeouts.mediumMs });
  await passwordField.fill(options.password);
  await passwordField.press("Enter");

  await handleMfa(page, options);

  await page.waitForURL(/\/staff\/|portal-do-cliente|onvio\.com\.br\/br-/, {
    timeout: options.timeouts.longMs,
  });
}

export async function createAuthSession(
  context: Pick<BrowserContext, "storageState" | "cookies">,
  baseUrl: string,
  storageStatePath?: string,
): Promise<AuthSession> {
  const capturedAt = new Date().toISOString();
  const storageState = (await context.storageState()) as AuthStorageState;
  const cookies = (await context.cookies()) as AuthSession["cookies"];

  if (storageStatePath) {
    ensureParentDir(storageStatePath);
    fs.writeFileSync(storageStatePath, JSON.stringify(storageState, null, 2), "utf8");
  }

  return {
    baseUrl,
    capturedAt,
    storageState,
    cookies,
    storageStatePath,
  };
}

export async function withAuthenticatedOnvioContext<T>(
  rawOptions: LoginOnvioOptions,
  callback: (context: AuthenticatedOnvioContext) => Promise<T>,
): Promise<T> {
  const options = resolveLoginOptions(rawOptions);
  const browser = await chromium.launch({
    headless: options.browser.headless,
    slowMo: options.browser.slowMo,
  });

  try {
    const context = await browser.newContext({
      locale: options.locale,
      timezoneId: options.timezoneId,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();

    await performOnvioLogin(page, options);
    return await callback({ context, page, options });
  } finally {
    await browser.close();
  }
}

export async function loginOnvio(options: LoginOnvioOptions): Promise<AuthSession> {
  return withAuthenticatedOnvioContext(options, async ({ context, options: resolved }) =>
    createAuthSession(context, resolved.baseUrl, resolved.storageStatePath),
  );
}
