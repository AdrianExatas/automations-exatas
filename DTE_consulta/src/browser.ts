import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

import type { AppConfig } from "./types.js";

export const CERTIFICATE_ORIGIN = "https://certificado.sso.acesso.gov.br";

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

export async function launchBrowserSession(config: AppConfig): Promise<BrowserSession> {
  const browser = await chromium.launch({ channel: "chrome", headless: false });
  const context = await browser.newContext({
    viewport: null,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    clientCertificates: [
      {
        origin: CERTIFICATE_ORIGIN,
        pfxPath: config.certificatePath,
        passphrase: config.certificatePassword,
      },
    ],
  });
  const page = await context.newPage();
  return { browser, context, page };
}

export async function closeBrowserSession(session: Partial<BrowserSession>): Promise<void> {
  await session.context?.close().catch(() => undefined);
  await session.browser?.close().catch(() => undefined);
}

export async function clickFirstVisible(page: Page, patterns: RegExp[]): Promise<boolean> {
  for (const pattern of patterns) {
    const candidates = [
      page.getByRole("button", { name: pattern }).first(),
      page.getByRole("link", { name: pattern }).first(),
      page.getByText(pattern, { exact: false }).first(),
    ];
    for (const candidate of candidates) {
      if (await candidate.isVisible().catch(() => false)) {
        await candidate.click({ noWaitAfter: true }).catch(() => undefined);
        return true;
      }
    }
  }
  return false;
}
