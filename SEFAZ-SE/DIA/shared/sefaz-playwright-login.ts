export const LOGIN_CONTABILISTA_URL = "https://security.sefaz.se.gov.br/internet/portal/contabilista/atoAcessoContabilista.jsp";

type SefazLocator = {
  click(options?: { timeout?: number }): Promise<unknown>;
  fill(value: string): Promise<unknown>;
  innerText(options?: { timeout?: number }): Promise<string>;
  inputValue(): Promise<string>;
};

type SefazPlaywrightPage = {
  getByText(text: string, options?: { exact?: boolean }): Pick<SefazLocator, "click">;
  goto(url: string, options?: { waitUntil?: "domcontentloaded" }): Promise<unknown>;
  locator(selector: string): SefazLocator;
  url(): string;
  waitForLoadState(state: "domcontentloaded"): Promise<unknown>;
};

export type SefazLoginOptions = {
  user: string;
  password: string;
  timeoutMs: number;
};

export async function loginSefazContabilista(page: SefazPlaywrightPage, options: SefazLoginOptions): Promise<void> {
  await page.goto(LOGIN_CONTABILISTA_URL, { waitUntil: "domcontentloaded" });
  const userInput = page.locator('input[name="UserName"]');
  const passwordInput = page.locator('input[name="Password"]');
  await userInput.fill(options.user);
  await passwordInput.fill(options.password);
  await assertFilled(userInput, "Login");
  await assertFilled(passwordInput, "Senha");
  await page.locator('input[name="submit"]').click();
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await assertLoggedIn(page, options.timeoutMs);
}

export async function openDiaModule(page: SefazPlaywrightPage, timeoutMs: number): Promise<void> {
  await page.getByText("DIA", { exact: true }).click({ timeout: timeoutMs });
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
}

export function getSefazLoginFailureMessage(pageUrl: string, bodyText: string): string | undefined {
  const error = bodyText.match(/(?:preenchimento obrigat.rio|inv.lid[ao]|incorret[ao]|erro)[^\n\r]*/i)?.[0]?.trim();
  if (/erroLogin\.jsp/i.test(pageUrl) || error) {
    return `Login nao confirmado no portal SEFAZ-SE${error ? `: ${error}` : "."}`;
  }

  return undefined;
}

export function isSefazLoginConfirmed(pageUrl: string, bodyText: string): boolean {
  return /portal\.jsp/i.test(pageUrl) || /logout\.jsp/i.test(bodyText) || /\bDIA\b/i.test(bodyText);
}

async function assertFilled(locator: SefazLocator, label: string): Promise<void> {
  const value = await locator.inputValue();
  if (!value.trim()) {
    throw new Error(`Campo '${label}' nao foi preenchido antes do envio do login.`);
  }
}

async function assertLoggedIn(page: SefazPlaywrightPage, timeoutMs: number): Promise<void> {
  const body = await page.locator("body").innerText({ timeout: Math.min(timeoutMs, 5_000) }).catch(() => "");
  const failureMessage = getSefazLoginFailureMessage(page.url(), body);
  if (failureMessage) {
    throw new Error(failureMessage);
  }
  if (!isSefazLoginConfirmed(page.url(), body)) {
    throw new Error("Login nao confirmado no portal SEFAZ-SE.");
  }
}
