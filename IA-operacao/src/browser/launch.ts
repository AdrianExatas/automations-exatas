import { execFile } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const execFileAsync = promisify(execFile);

export interface LaunchOptions {
  headless?: boolean;
  downloadsPath?: string;
  logger?: Pick<Console, "info" | "warn" | "error">;
}

const CHROME_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

function resolveBrowserExecutable(): string {
  for (const candidate of CHROME_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    "Nenhum Chrome/Edge encontrado. Instale o Google Chrome ou informe o caminho do executavel.",
  );
}

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Nao foi possivel obter porta livre para o Chrome"));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
    server.on("error", reject);
  });
}

async function waitForCdpHttp(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) {
        await response.json();
        return;
      }
      lastError = new Error(`CDP respondeu ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(
    `Timeout aguardando CDP HTTP na porta ${port}: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

/**
 * Abre Chrome na sessao interativa (janela visivel) e conecta via CDP.
 * Deve ser executado com Node/tsx — no Bun o WebSocket do Playwright trava.
 */
export async function launchBrowser(
  options: LaunchOptions = {},
): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  const headless = options.headless ?? true;
  const log = options.logger;
  const executablePath = resolveBrowserExecutable();
  const port = await findFreePort();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ia-operacao-chrome-"));

  const chromeArgs = [
    `--remote-debugging-port=${port}`,
    "--remote-allow-origins=*",
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-blink-features=AutomationControlled",
    "--disable-dev-shm-usage",
    "--new-window",
    ...(headless ? ["--headless=new"] : []),
    "about:blank",
  ];

  log?.info(
    `Abrindo ${path.basename(executablePath)} (CDP :${port}, headless=${headless})...`,
  );

  if (process.platform === "win32") {
    const argList = chromeArgs.map((arg) => `'${arg.replace(/'/g, "''")}'`).join(",");
    const ps = `
      $p = Start-Process -FilePath '${executablePath.replace(/'/g, "''")}' -ArgumentList @(${argList}) -PassThru
      Write-Output $p.Id
    `;
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
      { windowsHide: true },
    );
    log?.info(`Chrome pid=${stdout.trim() || "?"}`);
  } else {
    const { spawn } = await import("node:child_process");
    const child = spawn(executablePath, chromeArgs, { stdio: "ignore", detached: true });
    child.unref();
  }

  await waitForCdpHttp(port, 60_000);
  log?.info(`CDP pronto em http://127.0.0.1:${port}`);

  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, {
    timeout: 60_000,
  });
  log?.info("Playwright conectado.");

  const context =
    browser.contexts()[0] ??
    (await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
      acceptDownloads: true,
      ...(options.downloadsPath ? { downloadsPath: options.downloadsPath } : {}),
    }));

  const page = context.pages()[0] ?? (await context.newPage());
  await page.setViewportSize({ width: 1920, height: 1080 }).catch(() => {});
  log?.info("Pagina pronta — indo para o login Unecont...");
  await page.goto("https://app.unecont.com/_login/Login.aspx", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  log?.info(`URL: ${page.url()}`);

  return { browser, context, page };
}
