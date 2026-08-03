import { app, BrowserWindow, dialog, ipcMain, safeStorage, session, shell } from "electron";
import type { WebFrameMain } from "electron";
import fs from "fs";
import path from "path";
import { executarParametrizacao } from "../execution";
import { validarInput } from "../input";
import { calcularPreviewMatriz, DEFAULT_MATRIX_FILE } from "../matrix";
import { salvarRelatorios } from "../relatorio";
import { ParametrizacaoInput } from "../types";
import { resolveDefaultResourcePath, resolveReportsDir } from "./app-paths";
import {
  getMatrixInfo,
  resolveMatrixPath,
  validateMatrixPath,
  writeCustomMatrixPath,
} from "./matrix-settings";

interface StoredCredentials {
  email?: string;
  encryptedPassword?: string;
}

interface RunPayload {
  mode: "dry-run" | "apply";
  input: ParametrizacaoInput;
  options?: {
    timeoutMs?: number;
    readRetries?: number;
    readRetryDelayMs?: number;
  };
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
let cancelRequested = false;
const CLEAR_BROWSER_STORAGES: NonNullable<Electron.ClearStorageDataOptions["storages"]> = [
  "cookies",
  "filesystem",
  "indexdb",
  "websql",
  "serviceworkers",
  "cachestorage",
];

function getProjectRoot(): string {
  return path.resolve(__dirname, "..", "..");
}

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
  return resolveReportsDir(app.getPath("documents"));
}

function getElectronDefaultMatrixPath(): string {
  const configured = process.env.MATRIX_PATH?.trim();
  if (configured) return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);

  return resolveDefaultResourcePath({
    fileName: DEFAULT_MATRIX_FILE,
    isPackaged: app.isPackaged,
    processResourcesPath: process.resourcesPath,
    projectRoot: getProjectRoot(),
  });
}

function getResolvedMatrixPath(): string {
  return resolveMatrixPath(app.getPath("userData"), getElectronDefaultMatrixPath());
}

function ensureMatrixAvailable(matrixPath: string): void {
  if (!fs.existsSync(matrixPath)) {
    throw new Error("Nenhuma planilha valida encontrada. Selecione um arquivo .xlsx.");
  }
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
  if (!savePassword || !safeStorage.isEncryptionAvailable()) {
    writeStoredCredentials({ email });
    return;
  }

  writeStoredCredentials({
    email,
    encryptedPassword: safeStorage.encryptString(password).toString("base64"),
  });
}

function loadCredentialsState() {
  const stored = readStoredCredentials();
  return {
    email: stored.email ?? "",
    password: decryptPassword(stored.encryptedPassword),
    canSavePassword: safeStorage.isEncryptionAvailable(),
    hasSavedPassword: Boolean(stored.encryptedPassword),
  };
}

function deleteAuthArtifacts(): void {
  for (const filePath of [getAuthArtifactPath(), getAuthStorageStatePath()]) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

async function clearElectronBrowserData(): Promise<void> {
  const sessions = new Set<Electron.Session>([session.defaultSession]);
  const mainSession = mainWindow?.webContents.session;
  const authSession = authWindow?.webContents.session;
  if (mainSession) sessions.add(mainSession);
  if (authSession) sessions.add(authSession);

  await Promise.all([...sessions].map(async (browserSession) => {
    await browserSession.clearCache();
    await browserSession.clearStorageData({
      storages: CLEAR_BROWSER_STORAGES,
      quotas: ["temporary"],
    });
    browserSession.clearAuthCache();
    browserSession.clearHostResolverCache();
    browserSession.clearCodeCaches({});
  }));
}

function sendLog(message: string): void {
  mainWindow?.webContents.send("automation:log", message);
}

function sendAuthStatus(message: string): void {
  mainWindow?.webContents.send("auth:status", message);
}

function sendState(message: string): void {
  mainWindow?.webContents.send("automation:status", message);
}

function parseJwtFromAuthorizationHeader(headerValue: string | undefined): string | null {
  if (!headerValue) return null;
  const match = headerValue.trim().match(/^JWT\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function getHeaderValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
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
  const authSession = authWindow?.webContents.session ?? mainWindow?.webContents.session;
  const cookies = authSession ? ((await authSession.cookies.get({})) as ElectronCookie[]) : [];
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
    width: 1240,
    height: 800,
    minWidth: 1020,
    minHeight: 680,
    title: "Parametrizacao Onboarding Gestta",
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

function toNonNegativeInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

function toPositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

async function withAutomationEnvironment<T>(
  options: Required<NonNullable<RunPayload["options"]>>,
  fn: () => Promise<T>,
): Promise<T> {
  const keys = [
    "ONVIO_AUTH_ARTIFACT_PATH",
    "GESTTA_FORCE_ARTIFACT_AUTH",
    "GESTTA_DISABLE_EXTERNAL_AUTH_REFRESH",
    "JWT_GESTTA",
    "GESTTA_JWT_TOKEN",
    "GESTTA_HTTP_TIMEOUT_MS",
    "GESTTA_READ_RETRIES",
    "GESTTA_READ_RETRY_DELAY_MS",
    "GESTTA_RELATORIOS_DIR",
  ];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));

  process.env.ONVIO_AUTH_ARTIFACT_PATH = getAuthArtifactPath();
  process.env.GESTTA_FORCE_ARTIFACT_AUTH = "true";
  process.env.GESTTA_DISABLE_EXTERNAL_AUTH_REFRESH = "true";
  process.env.JWT_GESTTA = "";
  process.env.GESTTA_JWT_TOKEN = "";
  process.env.GESTTA_HTTP_TIMEOUT_MS = String(options.timeoutMs);
  process.env.GESTTA_READ_RETRIES = String(options.readRetries);
  process.env.GESTTA_READ_RETRY_DELAY_MS = String(options.readRetryDelayMs);
  process.env.GESTTA_RELATORIOS_DIR = getReportsDir();

  try {
    return await fn();
  } finally {
    for (const key of keys) {
      const value = previous.get(key);
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function withCapturedLogs<T>(fn: () => Promise<T>): Promise<T> {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

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

  try {
    return await fn();
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
}

async function tryOpenGesttaSso(window: BrowserWindow): Promise<boolean> {
  const script = `
    (async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const isVisible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      };
      const queryAll = (selector, root = document) => {
        const elements = Array.from(root.querySelectorAll(selector));
        const nested = Array.from(root.querySelectorAll("*"))
          .flatMap((element) => element.shadowRoot ? queryAll(selector, element.shadowRoot) : []);
        return [...elements, ...nested];
      };
      const textOf = (element) => [
        element.innerText,
        element.textContent,
        element.value,
        element.title,
        element.getAttribute("aria-label"),
      ].filter(Boolean).join(" ").replace(/\\s+/g, " ").trim();
      const candidates = () => queryAll("a, button, [role='link'], [role='button'], input[type='button'], input[type='submit']")
        .filter((element) => isVisible(element) && !element.disabled);
      const findByText = (patterns) => candidates().find((element) => {
        const text = textOf(element);
        return patterns.some((pattern) => pattern.test(text));
      });
      const click = (element) => {
        element.scrollIntoView?.({ block: "center", inline: "center" });
        element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        element.click();
        return true;
      };

      const menu = findByText([/^menu$/i, /\\bmenu\\b/i]);
      if (!menu) return false;

      click(menu);
      const waitFor = async (factory, timeoutMs = 5000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
          const result = factory();
          if (result) return result;
          await sleep(250);
        }
        return null;
      };

      const processos = await waitFor(() => findByText([/^processos\\b/i, /\\bprocessos\\b/i]));
      if (!processos) return false;

      return click(processos);
    })();
  `;

  try {
    for (const frame of window.webContents.mainFrame.framesInSubtree) {
      if (await tryExecuteFrameScript(frame, script)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

function buildOnvioLoginFillScript(email: string, password: string): string {
  return `
      (async () => {
        const email = ${JSON.stringify(email)};
        const password = ${JSON.stringify(password)};
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const isVisible = (element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
        };
        const queryAll = (selector, root = document) => {
          const elements = Array.from(root.querySelectorAll(selector));
          const nested = Array.from(root.querySelectorAll("*"))
            .flatMap((element) => element.shadowRoot ? queryAll(selector, element.shadowRoot) : []);
          return [...elements, ...nested];
        };
        const findInput = (predicate) => queryAll("input")
          .find((input) => isVisible(input) && predicate(input));
        const getNearbyText = (input) => [
          input.name,
          input.id,
          input.placeholder,
          input.autocomplete,
          input.inputMode,
          input.getAttribute("aria-label"),
          input.closest("label, div, section, form")?.textContent,
          input.previousElementSibling?.textContent,
          ...queryAll("label")
            .filter((label) => label.htmlFor === input.id || label.contains(input))
            .map((label) => label.textContent || ""),
        ].join(" ");
        const setValue = async (input, value) => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          input.focus();
          input.click();
          input.select?.();
          if (setter) setter.call(input, value);
          else input.value = value;
          const inputEvent = typeof InputEvent === "function"
            ? new InputEvent("input", { bubbles: true, inputType: "insertText", data: value })
            : new Event("input", { bubbles: true });
          input.dispatchEvent(inputEvent);
          input.dispatchEvent(new Event("change", { bubbles: true }));
          input.focus();
          await sleep(100);
          if (input.value !== value && document.activeElement === input && document.execCommand) {
            input.select?.();
            document.execCommand("insertText", false, value);
            input.dispatchEvent(new Event("change", { bubbles: true }));
            await sleep(100);
          }
          return input.value === value;
        };
        const clickButton = (patterns) => {
          const buttons = queryAll("button, input[type='button'], input[type='submit'], #trauth-continue-signin-btn");
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

        const emailInput = await waitFor(() => {
          const inputs = queryAll("input").filter(isVisible);
          return inputs.find((input) =>
            input.type === "email" ||
            input.autocomplete === "username" ||
            input.inputMode === "email" ||
            /email|e-mail|mail/i.test(getNearbyText(input))
          ) || (inputs.filter((input) => input.type !== "password").length === 1
            ? inputs.filter((input) => input.type !== "password")[0]
            : null);
        }, 2500);
        if (emailInput) {
          const didSetEmail = await setValue(emailInput, email);
          if (didSetEmail) {
            clickButton([/continuar/i, /entrar/i, /proximo/i, /pr.?ximo/i, /avan.ar/i, /acessar/i]);
          }
        } else {
          clickButton([/entrar/i, /continuar/i, /acessar/i, /comecar/i, /come.ar/i]);
        }

        const passwordInput = await waitFor(() => findInput((input) =>
          input.type === "password" || input.autocomplete === "current-password"
        ), 2500);
        if (passwordInput) {
          const didSetPassword = await setValue(passwordInput, password);
          if (didSetPassword) {
            clickButton([/entrar/i, /continuar/i, /login/i, /acessar/i]);
          }
          return true;
        }

        return Boolean(emailInput);
      })();
    `;
}

async function tryExecuteFrameScript(frame: WebFrameMain, script: string): Promise<boolean> {
  if (frame.isDestroyed() || frame.detached) return false;

  try {
    return Boolean(await frame.executeJavaScript(script));
  } catch {
    return false;
  }
}

async function tryFillOnvioLogin(window: BrowserWindow, email: string, password: string): Promise<boolean> {
  const script = buildOnvioLoginFillScript(email, password);

  try {
    for (const frame of window.webContents.mainFrame.framesInSubtree) {
      if (await tryExecuteFrameScript(frame, script)) return true;
    }
  } catch {
    return false;
  }

  return false;
}

function captureAuth(
  email: string,
  password: string,
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
    const authChildWindows = new Set<BrowserWindow>();

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
      for (const childWindow of authChildWindows) {
        if (!childWindow.isDestroyed()) childWindow.close();
      }
      authChildWindows.clear();
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
          getHeaderValue(
            details.requestHeaders as Record<string, string | string[] | undefined>,
            "authorization",
          ),
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
      },
    );

    windowRef.webContents.setWindowOpenHandler(() => ({
      action: "allow",
      overrideBrowserWindowOptions: {
        parent: windowRef,
        modal: false,
        width: 1120,
        height: 780,
        minWidth: 900,
        minHeight: 640,
        title: "Gestta",
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          session: authSession,
        },
      },
    }));
    windowRef.webContents.on("did-create-window", (childWindow) => {
      authChildWindows.add(childWindow);
      sendAuthStatus("Popup do Gestta aberto. Aguardando captura do acesso...");
      childWindow.on("closed", () => {
        authChildWindows.delete(childWindow);
      });
    });

    const runLoginAutomation = () => {
      if (resolved || windowRef.isDestroyed()) return;
      const currentUrl = windowRef.webContents.getURL();
      const isOnvioLogin = currentUrl.includes("onvio.com.br")
        && (currentUrl.includes("login") || currentUrl.includes("signin"));
      const isThomsonReutersLogin = currentUrl.includes("auth.thomsonreuters.com");
      if (!isOnvioLogin && !isThomsonReutersLogin) return;
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
      if (currentUrl.includes("onvio.com.br/login") || currentUrl.includes("auth.thomsonreuters.com")) {
        runLoginAutomation();
      }
      if (ssoAttempted) return;
      if (!currentUrl.includes("onvio.com.br")) return;
      if (!currentUrl.includes("/staff/") && !currentUrl.includes("portal-do-cliente")) return;

      ssoAttempted = true;
      sendAuthStatus("Login Onvio concluido. Abrindo Gestta pelo menu Processos...");
      if (!currentUrl.includes("/staff/")) {
        await windowRef.loadURL("https://onvio.com.br/staff/");
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

    sendAuthStatus("Abrindo login do Onvio. Conclua o MFA na janela aberta.");
    windowRef.loadURL("https://onvio.com.br/login/#/");
    loginAutomationTimer = setInterval(runLoginAutomation, 1500);
  });
}

ipcMain.handle("app:initial-state", () => ({
  credentials: loadCredentialsState(),
  auth: readAuthStatus(),
  matrix: getMatrixInfo(app.getPath("userData"), getElectronDefaultMatrixPath()),
  reportsDir: getReportsDir(),
  defaults: {
    timeoutMs: 60000,
    readRetries: 5,
    readRetryDelayMs: 2000,
    mfaMethod: "E-mail",
  },
}));

ipcMain.handle("matrix:get", () => getMatrixInfo(app.getPath("userData"), getElectronDefaultMatrixPath()));

ipcMain.handle("matrix:select", async () => {
  try {
    const dialogOptions = {
      title: "Selecionar planilha de tarefas",
      properties: ["openFile"] as Array<"openFile">,
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
    };
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (result.canceled || result.filePaths.length === 0) {
      return { ok: true, info: getMatrixInfo(app.getPath("userData"), getElectronDefaultMatrixPath()) };
    }

    const selectedPath = result.filePaths[0];
    validateMatrixPath(selectedPath);
    writeCustomMatrixPath(app.getPath("userData"), selectedPath);

    return { ok: true, info: getMatrixInfo(app.getPath("userData"), getElectronDefaultMatrixPath()) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      info: getMatrixInfo(app.getPath("userData"), getElectronDefaultMatrixPath()),
    };
  }
});

ipcMain.handle("matrix:reset", () => {
  writeCustomMatrixPath(app.getPath("userData"), null);
  return { ok: true, info: getMatrixInfo(app.getPath("userData"), getElectronDefaultMatrixPath()) };
});

ipcMain.handle("auth:capture", async (_event, payload: { email: string; password: string; saveCredentials: boolean }) => {
  const email = payload.email.trim();
  const password = payload.password;
  if (!email || !password) {
    return { ok: false, error: "Informe e-mail e senha." };
  }

  saveCredentials(email, password, payload.saveCredentials);
  sendAuthStatus("Limpando dados do navegador antes do login...");
  deleteAuthArtifacts();
  await clearElectronBrowserData();
  return captureAuth(email, password);
});

ipcMain.handle("credentials:clear", async () => {
  if (fs.existsSync(getCredentialsPath())) fs.unlinkSync(getCredentialsPath());
  deleteAuthArtifacts();
  await clearElectronBrowserData();
  return {
    credentials: loadCredentialsState(),
    auth: readAuthStatus(),
  };
});

ipcMain.handle("preview:calculate", (_event, payload: { input: unknown }) => {
  try {
    const input = validarInput(payload.input);
    const matrixPath = getResolvedMatrixPath();
    ensureMatrixAvailable(matrixPath);
    const preview = calcularPreviewMatriz(matrixPath, input);
    return { ok: true, preview };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle("reports:open", async () => {
  const reportsDir = getReportsDir();
  fs.mkdirSync(reportsDir, { recursive: true });
  const error = await shell.openPath(reportsDir);
  return { ok: !error, error };
});

ipcMain.handle("automation:cancel", () => {
  if (!runningAutomation) return { ok: true, running: false };
  cancelRequested = true;
  sendLog("\nCancelamento solicitado. A execucao vai parar ao concluir a etapa atual.\n");
  sendState("Cancelamento solicitado.");
  return { ok: true, running: true };
});

ipcMain.handle("automation:run", async (_event, payload: RunPayload) => {
  if (runningAutomation) {
    return { ok: false, error: "A automacao ja esta em execucao." };
  }
  if (payload.mode !== "dry-run" && payload.mode !== "apply") {
    return { ok: false, error: "Modo de execucao invalido." };
  }
  if (!readAuthStatus().authenticated) {
    return { ok: false, error: "Faca login antes de executar a automacao." };
  }

  let input: ParametrizacaoInput;
  try {
    input = validarInput(payload.input);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  let matrixPath: string;
  try {
    matrixPath = getResolvedMatrixPath();
    ensureMatrixAvailable(matrixPath);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  const runOptions = {
    timeoutMs: toPositiveInteger(payload.options?.timeoutMs, 60000),
    readRetries: toNonNegativeInteger(payload.options?.readRetries, 5),
    readRetryDelayMs: toNonNegativeInteger(payload.options?.readRetryDelayMs, 2000),
  };

  runningAutomation = true;
  cancelRequested = false;
  const dryRun = payload.mode === "dry-run";
  sendLog(`${dryRun ? "Iniciando simulacao" : "Iniciando parametrizacao"}...\nMatriz: ${matrixPath}\n`);
  sendState(dryRun ? "Simulando sem alterar..." : "Aplicando parametrizacao...");

  void withCapturedLogs(() =>
    withAutomationEnvironment(runOptions, async () => {
      const relatorio = await executarParametrizacao({
        matrixPath,
        input,
        dryRun,
        emitLog: sendLog,
        readRetries: runOptions.readRetries,
        readRetryDelayMs: runOptions.readRetryDelayMs,
        shouldCancel: () => cancelRequested,
      });
      const reportPaths = salvarRelatorios(relatorio, getReportsDir());
      sendLog(`\nRelatorio JSON: ${reportPaths.jsonPath}\nRelatorio XLSX: ${reportPaths.xlsxPath}\n`);
      return { relatorio, reportPaths };
    })
  )
    .then(({ relatorio, reportPaths }) => {
      const ok = relatorio.execucao.falha === 0;
      mainWindow?.webContents.send("automation:done", { ok, code: ok ? 0 : 1, reportPaths });
      sendState(ok ? "Execucao finalizada." : "Execucao finalizada com falhas.");
    })
    .catch((error) => {
      sendLog(`\nErro na execucao: ${error instanceof Error ? error.message : String(error)}\n`);
      mainWindow?.webContents.send("automation:done", {
        ok: false,
        code: 1,
        error: error instanceof Error ? error.message : String(error),
      });
      sendState("Execucao finalizada com falha.");
    })
    .finally(() => {
      runningAutomation = false;
      cancelRequested = false;
    });

  return { ok: true };
});

app.whenReady().then(() => {
  fs.mkdirSync(getReportsDir(), { recursive: true });
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  if (authWindow && !authWindow.isDestroyed()) authWindow.close();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
