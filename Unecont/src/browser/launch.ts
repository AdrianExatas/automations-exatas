import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export interface LaunchOptions {
  headless?: boolean;
  downloadsPath?: string;
}

export async function launchBrowser(
  options: LaunchOptions = {},
): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  const browser = await chromium.launch({
    headless: options.headless ?? true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    acceptDownloads: true,
    ...(options.downloadsPath ? { downloadsPath: options.downloadsPath } : {}),
  });
  const page = await context.newPage();

  return { browser, context, page };
}
