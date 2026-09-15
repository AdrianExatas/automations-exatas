import { spawn, type ChildProcess } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

import type { SafeLogger } from "./logger.js";
import type { AppConfig } from "./types.js";
import { sleep } from "./utils.js";

export const CERTIFICATE_ORIGIN = "https://certificado.sso.acesso.gov.br";

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  externalProcess?: ChildProcess;
  temporaryProfileDir?: string;
}

export async function launchBrowserSession(config: AppConfig): Promise<BrowserSession> {
  return config.browserMode === "cdp"
    ? launchCdpBrowserSession()
    : launchPlaywrightBrowserSession(config);
}

async function launchPlaywrightBrowserSession(config: AppConfig): Promise<BrowserSession> {
  const browser = await chromium.launch({ channel: "chrome", headless: false, timeout: 30_000 });
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

async function launchCdpBrowserSession(): Promise<BrowserSession> {
  const executablePath = await findChromeExecutable();
  const temporaryProfileDir = await mkdtemp(path.join(os.tmpdir(), "dte-consulta-chrome-"));
  const port = await findFreePort();
  const externalProcess = spawn(
    executablePath,
    [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${temporaryProfileDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { stdio: "ignore", windowsHide: false },
  );

  try {
    await waitForCdp(port, externalProcess, 30_000);
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 30_000 });
    const context = browser.contexts()[0];
    if (!context) throw new Error("Chrome via CDP nao forneceu um contexto de navegador.");
    const page = context.pages()[0] ?? (await context.newPage());
    return { browser, context, page, externalProcess, temporaryProfileDir };
  } catch (error) {
    externalProcess.kill();
    await removeTemporaryProfile(temporaryProfileDir);
    throw error;
  }
}

export async function closeBrowserSession(session: Partial<BrowserSession>): Promise<void> {
  await session.context?.close().catch(() => undefined);
  await session.browser?.close().catch(() => undefined);
  if (session.externalProcess && !session.externalProcess.killed) session.externalProcess.kill();
  if (session.temporaryProfileDir) await removeTemporaryProfile(session.temporaryProfileDir);
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

export async function isHcaptchaReady(page: Page): Promise<boolean> {
  return page
    .evaluate(() => {
      const candidate = (window as unknown as { hcaptcha?: { execute?: unknown } }).hcaptcha;
      return typeof candidate?.execute === "function";
    })
    .catch(() => false);
}

export async function isCaptchaInvalid(page: Page): Promise<boolean> {
  return page
    .getByText(/captcha inv.lido|ERL0033000/i)
    .first()
    .isVisible()
    .catch(() => false);
}

const instrumentedPages = new WeakSet<Page>();

export function attachSafePageDiagnostics(page: Page, logger: SafeLogger): void {
  if (instrumentedPages.has(page)) return;
  instrumentedPages.add(page);

  page.on("requestfailed", (request) => {
    const url = safeUrl(request.url());
    void logger.log(
      "warn",
      `Falha de rede no navegador: ${request.method()} ${url} - ${request.failure()?.errorText ?? "sem detalhe"}.`,
    );
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    void logger.log(
      "warn",
      `Resposta HTTP ${response.status()} no navegador: ${response.request().method()} ${safeUrl(response.url())}.`,
    );
  });
  page.on("pageerror", (error) => {
    void logger.log("warn", `Erro JavaScript no navegador: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() !== "error" && message.type() !== "warning") return;
    void logger.log("warn", `Console ${message.type()}: ${message.text()}`);
  });
}

async function findChromeExecutable(): Promise<string> {
  const candidates = [
    process.env.PROGRAMFILES &&
      path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
    process.env["PROGRAMFILES(X86)"] &&
      path.join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
    process.env.LOCALAPPDATA &&
      path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (await access(candidate).then(() => true).catch(() => false)) return candidate;
  }
  throw new Error("Google Chrome nao encontrado para o modo CDP assistido.");
}

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function waitForCdp(port: number, processHandle: ChildProcess, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) {
      throw new Error(`Chrome encerrou antes da conexao CDP (codigo ${processHandle.exitCode}).`);
    }
    const ready = await fetch(`http://127.0.0.1:${port}/json/version`)
      .then((response) => response.ok)
      .catch(() => false);
    if (ready) return;
    await sleep(200);
  }
  throw new Error("Tempo limite excedido ao conectar ao Chrome via CDP.");
}

async function removeTemporaryProfile(profileDir: string): Promise<void> {
  const resolved = path.resolve(profileDir);
  const expectedParent = path.resolve(os.tmpdir());
  if (path.dirname(resolved) !== expectedParent || !path.basename(resolved).startsWith("dte-consulta-chrome-")) {
    throw new Error("Recusa ao remover perfil temporario fora do diretorio esperado.");
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(resolved, { recursive: true, force: true });
      return;
    } catch {
      await sleep(200 * (attempt + 1));
    }
  }
}

function safeUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return "[URL_INVALIDA]";
  }
}
