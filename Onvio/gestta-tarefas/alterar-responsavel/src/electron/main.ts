import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from "electron";
import fs from "fs";
import path from "path";
import { criarPlanilhaPadrao } from "../planilha-padrao";
import { lerEstruturaPlanilha } from "../planilha-estrutura";
import { loadRuntimeEnv, runAutomation } from "../automation";
import { executarReversaoRelatorio } from "../rollback";
import { readSelectedSheetPath, writeSelectedSheetPath } from "./sheet-settings";

interface StoredCredentials {
  email?: string;
  encryptedPassword?: string;
}

interface RunAutomationPayload {
  planilhaPath: string;
  startWithoutCheckpoint: boolean;
  reprocessFailures: boolean;
}

interface ElectronCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expirationDate?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

let mainWindow: BrowserWindow | null = null;
let authWindow: BrowserWindow | null = null;
let runningAutomation = false;

function getCredentialsPath(): string {
  return path.join(app.getPath("userData"), "credentials.json");
}

function getAuthDir(): string {
  return path.join(app.getPath("userData"), "auth");
}

function getAuthArtifactPath(): string {
  return path.join(getAuthDir(), "latest-auth.json");
}

function getAuthStorageStatePath(): string {
  return path.join(getAuthDir(), "storageState.json");
}

function getReportsDir(): string {
  return path.join(app.getPath("userData"), "relatorios");
}

function readStoredCredentials(): StoredCredentials {
  const filePath = getCredentialsPath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as StoredCredentials;
  } catch {
    return {};
  }
}

function writeStoredCredentials(credentials: StoredCredentials): void {
  const filePath = getCredentialsPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(credentials, null, 2), "utf8");
}

function decryptPassword(encryptedPassword: string | undefined): string {
  if (!encryptedPassword || !safeStorage.isEncryptionAvailable()) return "";
  try {
    return safeStorage.decryptString(Buffer.from(encryptedPassword, "base64"));
  } catch {
    return "";
  }
}

function saveCredentials(email: string, password: string, savePassword: boolean): void {
  if (!savePassword) {
    writeStoredCredentials({ email });
    return;
  }

  if (!safeStorage.isEncryptionAvailable()) {
    writeStoredCredentials({ email });
    return;
  }

  const encryptedPassword = safeStorage.encryptString(password).toString("base64");
  writeStoredCredentials({ email, encryptedPassword });
}

function sendLog(message: string): void {
  mainWindow?.webContents.send("automation:log", message);
}

function sendAuthStatus(message: string): void {
  mainWindow?.webContents.send("auth:log", message);
}

function parseJwtFromAuthorizationHeader(headerValue: string | undefined): string | null {
  if (!headerValue) return null;
  const match = headerValue.trim().match(/^JWT\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function getHeaderValue(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const target = name.toLowerCase();
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === target);
  const value = entry?.[1];
  return Array.isArray(value) ? value[0] : value;
}

function normalizeCookie(cookie: ElectronCookie) {
  return {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    expires: cookie.expirationDate ?? -1,
    httpOnly: Boolean(cookie.httpOnly),
    secure: Boolean(cookie.secure),
    sameSite: cookie.sameSite ?? "Lax",
  };
}

async function writeElectronAuthArtifact(jwt: string, requestUrl: string): Promise<void> {
  const session = authWindow?.webContents.session ?? mainWindow?.webContents.session;
  const cookies = session ? ((await session.cookies.get({})) as ElectronCookie[]) : [];
  const normalizedCookies = cookies.map(normalizeCookie);
  const udsLongToken = normalizedCookies.find((cookie) => cookie.name === "UDSLongToken" && cookie.value.trim());
  const capturedAt = new Date().toISOString();
  const storageState = {
    cookies: normalizedCookies,
    origins: [],
  };

  const artifact = {
    capturedAt,
    artifactPath: getAuthArtifactPath(),
    storageStatePath: getAuthStorageStatePath(),
    session: {
      baseUrl: "https://onvio.com.br",
      capturedAt,
      storageState,
      cookies: normalizedCookies,
      storageStatePath: getAuthStorageStatePath(),
    },
    onvio: {
      udsLongToken: udsLongToken?.value ?? "captured-via-electron",
      ...(udsLongToken?.expires && udsLongToken.expires > 0
        ? { cookieExpiresAt: new Date(udsLongToken.expires * 1000).toISOString() }
        : {}),
    },
    gestta: {
      jwt,
      requestUrl,
    },
  };

  fs.mkdirSync(getAuthDir(), { recursive: true });
  fs.writeFileSync(getAuthArtifactPath(), JSON.stringify(artifact, null, 2), "utf8");
  fs.writeFileSync(getAuthStorageStatePath(), JSON.stringify(storageState, null, 2), "utf8");
}

function readAuthStatus(): { authenticated: boolean; capturedAt: string | null; artifactPath: string } {
  const artifactPath = getAuthArtifactPath();
  if (!fs.existsSync(artifactPath)) {
    return { authenticated: false, capturedAt: null, artifactPath };
  }

  try {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as {
      capturedAt?: unknown;
      gestta?: { jwt?: unknown };
    };
    return {
      authenticated: typeof artifact.gestta?.jwt === "string" && artifact.gestta.jwt.trim().length > 0,
      capturedAt: typeof artifact.capturedAt === "string" ? artifact.capturedAt : null,
      artifactPath,
    };
  } catch {
    return { authenticated: false, capturedAt: null, artifactPath };
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 940,
    minHeight: 640,
    title: "Alterar Responsavel Gestta",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer.html"));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function withAutomationEnvironment<T>(fn: () => Promise<T>): Promise<T> {
  const keys = [
    "ONVIO_AUTH_ARTIFACT_PATH",
    "GESTTA_FORCE_ARTIFACT_AUTH",
    "GESTTA_DISABLE_EXTERNAL_AUTH_REFRESH",
    "JWT_GESTTA",
    "GESTTA_JWT_TOKEN",
    "GESTTA_RELATORIOS_DIR",
  ];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));

  process.env.ONVIO_AUTH_ARTIFACT_PATH = getAuthArtifactPath();
  process.env.GESTTA_FORCE_ARTIFACT_AUTH = "true";
  process.env.GESTTA_DISABLE_EXTERNAL_AUTH_REFRESH = "true";
  process.env.JWT_GESTTA = "";
  process.env.GESTTA_JWT_TOKEN = "";
  process.env.GESTTA_RELATORIOS_DIR = getReportsDir();

  return fn().finally(() => {
    for (const key of keys) {
      const value = previous.get(key);
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

async function withCapturedLogs<T>(fn: () => Promise<T>): Promise<T> {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);

  console.log = (...args: unknown[]) => {
    sendLog(`${args.map(String).join(" ")}\n`);
    originalLog(...args);
  };
  console.warn = (...args: unknown[]) => {
    sendLog(`${args.map(String).join(" ")}\n`);
    originalWarn(...args);
  };
  console.error = (...args: unknown[]) => {
    sendLog(`${args.map(String).join(" ")}\n`);
    originalError(...args);
  };
  process.stdout.write = ((chunk: unknown, ...args: unknown[]) => {
    sendLog(String(chunk));
    return originalStdoutWrite(chunk as string | Uint8Array, ...(args as [BufferEncoding?, (() => void)?]));
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: unknown, ...args: unknown[]) => {
    sendLog(String(chunk));
    return originalStderrWrite(chunk as string | Uint8Array, ...(args as [BufferEncoding?, (() => void)?]));
  }) as typeof process.stderr.write;

  try {
    return await fn();
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    process.stdout.write = originalStdoutWrite as typeof process.stdout.write;
    process.stderr.write = originalStderrWrite as typeof process.stderr.write;
  }
}

async function tryOpenGesttaSso(window: BrowserWindow): Promise<boolean> {
  try {
    const didClick = await window.webContents.executeJavaScript(`
      (() => {
        const link = document.querySelector('a[href*="api.gestta.com.br/dominio/auth/redirect"]');
        if (!link) return false;
        link.target = "_self";
        link.click();
        return true;
      })();
    `);
    if (!didClick) {
      window.loadURL("https://app.gestta.com.br/");
      return false;
    }
    return true;
  } catch {
    window.loadURL("https://app.gestta.com.br/");
    return false;
  }
}

async function tryFillOnvioLogin(window: BrowserWindow, email: string, password: string): Promise<boolean> {
  try {
    return Boolean(await window.webContents.executeJavaScript(`
      (async () => {
        const email = ${JSON.stringify(email)};
        const password = ${JSON.stringify(password)};
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const isVisible = (element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
        };
        const findInput = (predicate) => Array
          .from(document.querySelectorAll("input"))
          .find((input) => isVisible(input) && predicate(input));
        const setValue = (input, value) => {
          if (input.value === value) return;
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          setter?.call(input, value);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        };
        const clickButton = (patterns) => {
          const buttons = Array.from(document.querySelectorAll("button, input[type='button'], input[type='submit'], #trauth-continue-signin-btn"));
          const button = buttons.find((item) => {
            const text = (item.innerText || item.value || item.getAttribute("aria-label") || "").trim();
            return isVisible(item) && !item.disabled && patterns.some((pattern) => pattern.test(text));
          });
          if (button) button.click();
          return Boolean(button);
        };
        const waitFor = async (factory, timeoutMs = 10000) => {
          const start = Date.now();
          while (Date.now() - start < timeoutMs) {
            const result = factory();
            if (result) return result;
            await sleep(250);
          }
          return null;
        };

        clickButton([/entrar/i, /continuar/i, /acessar/i]);
        const emailInput = await waitFor(() => findInput((input) =>
          input.type === "email" ||
          input.autocomplete === "username" ||
          input.inputMode === "email" ||
          /email|e-mail|mail/i.test(input.name || input.id || input.placeholder || input.getAttribute("aria-label") || "")
        ), 2500);
        if (emailInput) {
          emailInput.focus();
          setValue(emailInput, email);
          clickButton([/continuar/i, /entrar/i, /pr[oó]ximo/i, /avançar/i, /acessar/i]);
        }

        const passwordInput = await waitFor(() => findInput((input) =>
          input.type === "password" || input.autocomplete === "current-password"
        ), 2500);
        if (passwordInput) {
          passwordInput.focus();
          setValue(passwordInput, password);
          clickButton([/entrar/i, /continuar/i, /login/i, /acessar/i]);
          return true;
        }

        return Boolean(emailInput);
      })();
    `));
  } catch {
    // Se o preenchimento automatico falhar, a janela permanece aberta para login manual.
    return false;
  }
}

function captureAuth(
  email: string,
  password: string
): Promise<{ ok: boolean; canceled?: boolean; artifactPath?: string; error?: string }> {
  if (authWindow) {
    authWindow.focus();
    return Promise.resolve({ ok: false, error: "A janela de login ja esta aberta." });
  }

  return new Promise((resolve) => {
    let resolved = false;
    let ssoAttempted = false;
    let fillAttempts = 0;
    let ssoAttempts = 0;
    let loginAutomationTimer: NodeJS.Timeout | null = null;
    let ssoAutomationTimer: NodeJS.Timeout | null = null;

    authWindow = new BrowserWindow({
      width: 1120,
      height: 780,
      minWidth: 900,
      minHeight: 640,
      title: "Login Onvio / Gestta",
      parent: mainWindow ?? undefined,
      modal: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    const windowRef = authWindow;
    const authSession = windowRef.webContents.session;

    const cleanup = () => {
      if (loginAutomationTimer) clearInterval(loginAutomationTimer);
      if (ssoAutomationTimer) clearInterval(ssoAutomationTimer);
      authSession.webRequest.onBeforeSendHeaders({ urls: ["https://api.gestta.com.br/*"] }, null);
      authWindow = null;
    };

    const finish = async (result: { ok: boolean; canceled?: boolean; artifactPath?: string; error?: string }) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      if (!windowRef.isDestroyed()) windowRef.close();
      resolve(result);
    };

    authSession.webRequest.onBeforeSendHeaders(
      { urls: ["https://api.gestta.com.br/*"] },
      async (details, callback) => {
        callback({ requestHeaders: details.requestHeaders });
        const jwt = parseJwtFromAuthorizationHeader(
          getHeaderValue(details.requestHeaders as Record<string, string | string[] | undefined>, "authorization")
        );
        if (!jwt) return;

        try {
          await writeElectronAuthArtifact(jwt, details.url);
          sendAuthStatus("Login concluido. Acesso ao Gestta salvo.");
          await finish({ ok: true, artifactPath: getAuthArtifactPath() });
        } catch (error) {
          await finish({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    );

    const runLoginAutomation = () => {
      if (resolved || windowRef.isDestroyed()) return;
      const currentUrl = windowRef.webContents.getURL();
      if (!currentUrl.includes("onvio.com.br")) return;
      if (!currentUrl.includes("login") && !currentUrl.includes("signin")) return;
      fillAttempts += 1;
      if (fillAttempts === 1) {
        sendAuthStatus("Preenchendo login automaticamente...");
      }
      void tryFillOnvioLogin(windowRef, email, password);
      if (fillAttempts >= 120 && loginAutomationTimer) {
        clearInterval(loginAutomationTimer);
        loginAutomationTimer = null;
      }
    };

    const runSsoAutomation = () => {
      if (resolved || windowRef.isDestroyed() || !ssoAttempted) return;
      ssoAttempts += 1;
      void tryOpenGesttaSso(windowRef).then((clicked) => {
        if (clicked && ssoAutomationTimer) {
          clearInterval(ssoAutomationTimer);
          ssoAutomationTimer = null;
        }
      });
      if (ssoAttempts >= 40 && ssoAutomationTimer) {
        clearInterval(ssoAutomationTimer);
        ssoAutomationTimer = null;
      }
    };

    const handleNavigationState = async () => {
      const currentUrl = windowRef.webContents.getURL();
      if (currentUrl.includes("onvio.com.br/login")) {
        runLoginAutomation();
      }
      if (ssoAttempted) return;
      if (!currentUrl.includes("onvio.com.br")) return;
      if (!currentUrl.includes("/staff/") && !currentUrl.includes("portal-do-cliente")) return;

      ssoAttempted = true;
      sendAuthStatus("Login Onvio concluido. Abrindo Gestta para capturar o acesso...");
      if (!currentUrl.includes("/staff/#/dashboard-core-center")) {
        await windowRef.loadURL("https://onvio.com.br/staff/#/dashboard-core-center");
      }
      setTimeout(runSsoAutomation, 1200);
      ssoAutomationTimer = setInterval(runSsoAutomation, 3000);
    };

    windowRef.webContents.on("dom-ready", handleNavigationState);
    windowRef.webContents.on("did-finish-load", handleNavigationState);
    windowRef.webContents.on("did-navigate", handleNavigationState);
    windowRef.webContents.on("did-navigate-in-page", handleNavigationState);

    windowRef.on("closed", () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve({ ok: false, canceled: true });
      }
    });

    sendAuthStatus("Abrindo login do Onvio. Conclua o login e o MFA na janela aberta.");
    windowRef.loadURL("https://onvio.com.br/login/#/");
    loginAutomationTimer = setInterval(runLoginAutomation, 1500);
  });
}

ipcMain.handle("credentials:load", () => {
  const stored = readStoredCredentials();
  return {
    email: stored.email ?? "",
    password: decryptPassword(stored.encryptedPassword),
    canSavePassword: safeStorage.isEncryptionAvailable(),
    hasSavedPassword: Boolean(stored.encryptedPassword),
  };
});

ipcMain.handle("credentials:save", (_event, payload: { email: string; password: string; savePassword: boolean }) => {
  saveCredentials(payload.email.trim(), payload.password, payload.savePassword);
  return { ok: true };
});

ipcMain.handle("auth:status", () => readAuthStatus());

ipcMain.handle("auth:clear", async () => {
  const artifactPath = getAuthArtifactPath();
  const storageStatePath = getAuthStorageStatePath();
  if (fs.existsSync(artifactPath)) fs.unlinkSync(artifactPath);
  if (fs.existsSync(storageStatePath)) fs.unlinkSync(storageStatePath);
  await mainWindow?.webContents.session.clearStorageData();
  return readAuthStatus();
});

ipcMain.handle("auth:capture", async (_event, payload: { email: string; password: string; savePassword: boolean }) => {
  const email = payload.email.trim();
  const password = payload.password;
  if (!email || !password) {
    return { ok: false, error: "Informe e-mail e senha antes de fazer login." };
  }

  saveCredentials(email, password, payload.savePassword);
  process.env.ONVIO_EMAIL = email;
  process.env.ONVIO_PASSWORD = password;
  return captureAuth(email, password);
});

ipcMain.handle("sheet:select", async () => {
  const options: Electron.OpenDialogOptions = {
    title: "Selecionar planilha",
    properties: ["openFile"],
    filters: [
      { name: "Planilhas Excel", extensions: ["xlsx", "xls"] },
      { name: "Todos os arquivos", extensions: ["*"] },
    ],
  };
  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, options)
    : await dialog.showOpenDialog(options);

  const filePath = result.filePaths[0] ?? "";
  if (filePath) writeSelectedSheetPath(app.getPath("userData"), filePath);

  return {
    canceled: result.canceled,
    filePath,
  };
});

ipcMain.handle("sheet:load-selected", () => {
  const filePath = readSelectedSheetPath(app.getPath("userData"));
  return {
    filePath: filePath ?? "",
    exists: Boolean(filePath && fs.existsSync(filePath)),
  };
});

ipcMain.handle("sheet:inspect", (_event, payload: { filePath: string }) => {
  const filePath = payload.filePath.trim();
  if (!filePath || !fs.existsSync(filePath)) {
    return { ok: false, error: "Planilha nao encontrada." };
  }

  try {
    return { ok: true, structure: lerEstruturaPlanilha(filePath) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle("template:download", async () => {
  const options: Electron.SaveDialogOptions = {
    title: "Baixar planilha padrao",
    defaultPath: "DP RESPONSAVEL - MODELO.xlsx",
    filters: [{ name: "Planilha Excel", extensions: ["xlsx"] }],
  };
  const result = mainWindow
    ? await dialog.showSaveDialog(mainWindow, options)
    : await dialog.showSaveDialog(options);

  if (result.canceled || !result.filePath) {
    return { canceled: true, filePath: "" };
  }

  const fileAlreadyExists = fs.existsSync(result.filePath);
  if (fileAlreadyExists) {
    const confirmation = mainWindow
      ? await dialog.showMessageBox(mainWindow, {
          type: "warning",
          title: "Planilha existente",
          message: "Ja existe uma planilha neste local.",
          detail: "Usar o arquivo existente preserva todos os responsaveis que ja foram alterados.",
          buttons: ["Usar arquivo existente", "Substituir pelo modelo padrao", "Cancelar"],
          defaultId: 0,
          cancelId: 2,
        })
      : await dialog.showMessageBox({
          type: "warning",
          title: "Planilha existente",
          message: "Ja existe uma planilha neste local.",
          detail: "Usar o arquivo existente preserva todos os responsaveis que ja foram alterados.",
          buttons: ["Usar arquivo existente", "Substituir pelo modelo padrao", "Cancelar"],
          defaultId: 0,
          cancelId: 2,
        });

    if (confirmation.response === 2) return { canceled: true, filePath: "" };
    if (confirmation.response === 1) criarPlanilhaPadrao(result.filePath);
  } else {
    criarPlanilhaPadrao(result.filePath);
  }

  writeSelectedSheetPath(app.getPath("userData"), result.filePath);
  return { canceled: false, filePath: result.filePath, existing: fileAlreadyExists };
});

ipcMain.handle("reports:open", async () => {
  const reportsDir = getReportsDir();
  fs.mkdirSync(reportsDir, { recursive: true });
  const error = await shell.openPath(reportsDir);
  return { ok: !error, error };
});

ipcMain.handle("rollback:run", async () => {
  if (runningAutomation) {
    return { ok: false, error: "A automacao ja esta em execucao." };
  }
  if (!readAuthStatus().authenticated) {
    return { ok: false, error: "Faca login antes de reverter uma execucao." };
  }

  const reportsDir = getReportsDir();
  fs.mkdirSync(reportsDir, { recursive: true });
  const result = await (mainWindow
    ? dialog.showOpenDialog(mainWindow, {
        title: "Selecionar relatorio para reversao",
        defaultPath: reportsDir,
        properties: ["openFile"],
        filters: [{ name: "Relatorio JSON", extensions: ["json"] }],
      })
    : dialog.showOpenDialog({
        title: "Selecionar relatorio para reversao",
        defaultPath: reportsDir,
        properties: ["openFile"],
        filters: [{ name: "Relatorio JSON", extensions: ["json"] }],
      }));

  if (result.canceled || !result.filePaths[0]) {
    return { ok: false, canceled: true };
  }

  runningAutomation = true;
  sendLog("Iniciando reversao...\n");
  void withCapturedLogs(() =>
    withAutomationEnvironment(async () => {
      await executarReversaoRelatorio(result.filePaths[0]);
    })
  )
    .then(() => {
      mainWindow?.webContents.send("automation:done", { ok: true, code: 0 });
    })
    .catch((error) => {
      sendLog(`\nErro na reversao: ${error instanceof Error ? error.message : String(error)}\n`);
      mainWindow?.webContents.send("automation:done", { ok: false, code: 1 });
    })
    .finally(() => {
      runningAutomation = false;
    });

  return { ok: true };
});

ipcMain.handle("automation:run", async (_event, payload: RunAutomationPayload) => {
  if (runningAutomation) {
    return { ok: false, error: "A automacao ja esta em execucao." };
  }
  if (!readAuthStatus().authenticated) {
    return { ok: false, error: "Faca login antes de executar a automacao." };
  }

  const planilhaPath = payload.planilhaPath.trim();
  if (!planilhaPath || !fs.existsSync(planilhaPath)) {
    return { ok: false, error: "Selecione uma planilha valida." };
  }

  runningAutomation = true;
  sendLog("Iniciando automacao...\n");
  void withCapturedLogs(() =>
    withAutomationEnvironment(async () => {
      loadRuntimeEnv();
      await runAutomation({
        planilhaPath,
        continuar: !payload.startWithoutCheckpoint,
        ignorarCheckpoint: payload.startWithoutCheckpoint,
        reprocessarFalhas: payload.reprocessFailures,
        interactiveCheckpoint: false,
      });
    })
  )
    .then(() => {
      mainWindow?.webContents.send("automation:done", { ok: true, code: 0 });
    })
    .catch((error) => {
      sendLog(`\nErro na automacao: ${error instanceof Error ? error.message : String(error)}\n`);
      mainWindow?.webContents.send("automation:done", { ok: false, code: 1 });
    })
    .finally(() => {
      runningAutomation = false;
    });

  return { ok: true };
});

app.whenReady().then(() => {
  loadRuntimeEnv();
  fs.mkdirSync(getReportsDir(), { recursive: true });
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  if (authWindow && !authWindow.isDestroyed()) {
    authWindow.close();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
