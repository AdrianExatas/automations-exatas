import { app, BrowserWindow, dialog, ipcMain, safeStorage, session, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { formatProgress, runServiceRequestsBatch } from "../execution";
import { OnvioHttpDepartmentsProvider } from "../onvio/departments";
import { criarPlanilhaPadrao } from "../planilha-padrao";
import { executarReversaoBackup } from "../rollback";
import { loadSheetPreview, toPreviewPayload } from "../sheet-preview";
import {
  DEFAULT_ONVIO_FIRM_COMPANY_ID,
  type DepartmentPreference,
  type RunBatchPayload,
} from "../types";

interface StoredCredentials {
  email?: string;
  encryptedPassword?: string;
}

interface ElectronCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expirationDate?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

let mainWindow: BrowserWindow | null = null;
let authWindow: BrowserWindow | null = null;
let runningBatch = false;
let runningRollback = false;
let batchCancelRequested = false;

function getCredentialsPath(): string {
  return path.join(app.getPath("userData"), "credentials.json");
}

function getAuthDir(): string {
  return path.join(app.getPath("userData"), "auth");
}

function getAuthArtifactPath(): string {
  return path.join(getAuthDir(), "latest-auth.json");
}

function getSelectedSheetPath(): string {
  return path.join(app.getPath("userData"), "selected-sheet.json");
}

function getReportsDir(): string {
  return path.join(app.getPath("userData"), "relatorios");
}

function getDepartmentPreferencePath(): string {
  return path.join(app.getPath("userData"), "department-preference.json");
}

function readDepartmentPreference(): DepartmentPreference | null {
  if (!fs.existsSync(getDepartmentPreferencePath())) return null;
  try {
    const data = JSON.parse(fs.readFileSync(getDepartmentPreferencePath(), "utf8")) as DepartmentPreference;
    if (!data.id?.trim() || !data.name?.trim()) return null;
    return { id: data.id.trim(), name: data.name.trim() };
  } catch {
    return null;
  }
}

function writeDepartmentPreference(preference: DepartmentPreference | null): void {
  const filePath = getDepartmentPreferencePath();
  if (!preference) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(preference, null, 2), "utf8");
}

function sendLog(message: string): void {
  mainWindow?.webContents.send("batch:log", message.endsWith("\n") ? message : `${message}\n`);
}

function sendAuthStatus(message: string): void {
  mainWindow?.webContents.send("auth:log", message);
}

function readStoredCredentials(): StoredCredentials {
  if (!fs.existsSync(getCredentialsPath())) return {};
  try {
    return JSON.parse(fs.readFileSync(getCredentialsPath(), "utf8")) as StoredCredentials;
  } catch {
    return {};
  }
}

function writeStoredCredentials(credentials: StoredCredentials): void {
  fs.mkdirSync(path.dirname(getCredentialsPath()), { recursive: true });
  fs.writeFileSync(getCredentialsPath(), JSON.stringify(credentials, null, 2), "utf8");
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

function readSelectedSheet(): string {
  if (!fs.existsSync(getSelectedSheetPath())) return "";
  try {
    const data = JSON.parse(fs.readFileSync(getSelectedSheetPath(), "utf8")) as { filePath?: string };
    return data.filePath?.trim() || "";
  } catch {
    return "";
  }
}

function writeSelectedSheet(filePath: string): void {
  fs.mkdirSync(path.dirname(getSelectedSheetPath()), { recursive: true });
  fs.writeFileSync(getSelectedSheetPath(), JSON.stringify({ filePath }, null, 2), "utf8");
}

function readAuthArtifact(): { token: string; capturedAt: string | null } {
  if (!fs.existsSync(getAuthArtifactPath())) return { token: "", capturedAt: null };
  try {
    const artifact = JSON.parse(fs.readFileSync(getAuthArtifactPath(), "utf8")) as {
      capturedAt?: string;
      onvio?: { udsLongToken?: string };
    };
    const token = artifact.onvio?.udsLongToken?.trim() || "";
    if (!token || token === "captured-via-electron") return { token: "", capturedAt: null };
    return { token, capturedAt: artifact.capturedAt ?? null };
  } catch {
    return { token: "", capturedAt: null };
  }
}

function writeAuthArtifact(token: string): void {
  const capturedAt = new Date().toISOString();
  fs.mkdirSync(getAuthDir(), { recursive: true });
  fs.writeFileSync(
    getAuthArtifactPath(),
    JSON.stringify(
      {
        capturedAt,
        onvio: { udsLongToken: token },
      },
      null,
      2,
    ),
    "utf8",
  );
}

function readAuthStatus(): { authenticated: boolean; capturedAt: string | null } {
  const artifact = readAuthArtifact();
  return { authenticated: Boolean(artifact.token), capturedAt: artifact.capturedAt };
}

function isAuthenticatedOnvioUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (!lower.includes("onvio.com.br")) return false;
  if (lower.includes("/login") || lower.includes("signin")) return false;
  return (
    lower.includes("/staff/") ||
    lower.includes("portal-do-cliente") ||
    lower.includes("dashboard-core-center") ||
    lower.includes("/br-")
  );
}

async function readSessionToken(sourceSession?: Electron.Session): Promise<string> {
  const target = sourceSession ?? session.defaultSession;
  const cookies = (await target.cookies.get({})) as ElectronCookie[];
  const matches = cookies.filter(
    (cookie) =>
      cookie.name === "UDSLongToken" &&
      cookie.value?.trim() &&
      (!cookie.domain || cookie.domain.includes("onvio.com.br")),
  );
  const preferred = matches.find((cookie) => cookie.secure !== false) ?? matches[0];
  return preferred?.value.trim() || "";
}

async function resolveLiveOnvioToken(): Promise<string> {
  const live = await readSessionToken();
  if (live) {
    const cached = readAuthArtifact().token;
    if (live !== cached) writeAuthArtifact(live);
    return live;
  }
  return readAuthArtifact().token;
}

async function tryFillOnvioLogin(window: BrowserWindow, email: string, password: string): Promise<boolean> {
  try {
    return Boolean(
      await window.webContents.executeJavaScript(`
      (async () => {
        const email = ${JSON.stringify(email)};
        const password = ${JSON.stringify(password)};
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const isVisible = (element) => {
          if (!element) return false;
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
        };
        const setValue = (input, value) => {
          input.focus();
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          setter?.call(input, value);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
        };
        const pressEnter = (input) => {
          input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
          input.dispatchEvent(new KeyboardEvent("keypress", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
          input.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
        };
        const clickButton = (patterns) => {
          const continueBtn = document.querySelector("#trauth-continue-signin-btn");
          if (continueBtn && isVisible(continueBtn) && !continueBtn.disabled) {
            continueBtn.click();
            return true;
          }
          const buttons = Array.from(document.querySelectorAll("button, input[type='button'], input[type='submit'], a[role='button']"));
          const button = buttons.find((item) => {
            const text = (item.innerText || item.value || item.getAttribute("aria-label") || "").trim();
            return isVisible(item) && !item.disabled && patterns.some((pattern) => pattern.test(text));
          });
          if (button) {
            button.click();
            return true;
          }
          return false;
        };
        const findByLabel = (patterns) => {
          const labels = Array.from(document.querySelectorAll("label"));
          for (const label of labels) {
            const text = (label.textContent || "").trim();
            if (!patterns.some((pattern) => pattern.test(text))) continue;
            if (label.htmlFor) {
              const linked = document.getElementById(label.htmlFor);
              if (linked && isVisible(linked)) return linked;
            }
            const nested = label.querySelector("input, textarea");
            if (nested && isVisible(nested)) return nested;
          }
          return null;
        };
        const findEmailInput = () =>
          findByLabel([/e-?mail/i]) ||
          Array.from(document.querySelectorAll("input")).find((input) => {
            if (!isVisible(input) || input.disabled || input.type === "password" || input.type === "hidden") return false;
            return (
              input.type === "email" ||
              input.autocomplete === "username" ||
              input.inputMode === "email" ||
              /email|e-mail|mail|user|login/i.test(
                input.name || input.id || input.placeholder || input.getAttribute("aria-label") || "",
              )
            );
          }) ||
          Array.from(document.querySelectorAll("input[type='text'], input:not([type])")).find(
            (input) => isVisible(input) && !input.disabled,
          ) ||
          null;
        const findPasswordInput = () =>
          findByLabel([/senha|password/i]) ||
          Array.from(document.querySelectorAll("input")).find((input) => {
            if (!isVisible(input) || input.disabled) return false;
            return input.type === "password" || input.autocomplete === "current-password";
          }) ||
          null;
        const waitFor = async (factory, timeoutMs = 4000) => {
          const start = Date.now();
          while (Date.now() - start < timeoutMs) {
            const result = factory();
            if (result) return result;
            await sleep(200);
          }
          return null;
        };

        // So clica Continuar inicial do Onvio quando ainda nao ha campo de e-mail/senha.
        if (!findEmailInput() && !findPasswordInput()) {
          clickButton([/continuar/i, /acessar/i]);
          await sleep(400);
        }

        const emailInput = await waitFor(findEmailInput, 3500);
        if (emailInput && emailInput.value !== email) {
          setValue(emailInput, email);
          await sleep(150);
          if (!findPasswordInput()) {
            pressEnter(emailInput);
            clickButton([/entrar/i, /continuar/i, /pr[oó]ximo/i, /avançar/i, /next/i, /acessar/i]);
          }
        }

        const passwordInput = await waitFor(findPasswordInput, 4500);
        if (passwordInput && passwordInput.value !== password) {
          setValue(passwordInput, password);
          await sleep(150);
          pressEnter(passwordInput);
          clickButton([/entrar/i, /continuar/i, /login/i, /sign in/i, /acessar/i]);
          return true;
        }

        return Boolean(emailInput || passwordInput);
      })();
    `),
    );
  } catch {
    return false;
  }
}

function isLoginAutomationUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes("thomsonreuters.com") || lower.includes("login.tr.com")) return true;
  if (!lower.includes("onvio.com.br")) return false;
  return lower.includes("login") || lower.includes("signin") || lower.includes("mfa") || lower.includes("login-options");
}

function captureAuth(
  email: string,
  password: string,
): Promise<{ ok: boolean; canceled?: boolean; error?: string }> {
  if (authWindow) {
    authWindow.focus();
    return Promise.resolve({ ok: false, error: "A janela de login ja esta aberta." });
  }

  return new Promise((resolve) => {
    let resolved = false;
    let fillAttempts = 0;
    let loginAutomationTimer: NodeJS.Timeout | null = null;
    let tokenPollTimer: NodeJS.Timeout | null = null;

    authWindow = new BrowserWindow({
      width: 1120,
      height: 780,
      minWidth: 900,
      minHeight: 640,
      title: "Login Onvio",
      parent: mainWindow ?? undefined,
      modal: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        session: session.defaultSession,
      },
    });

    const windowRef = authWindow;

    const cleanup = () => {
      if (loginAutomationTimer) clearInterval(loginAutomationTimer);
      if (tokenPollTimer) clearInterval(tokenPollTimer);
      authWindow = null;
    };

    const finish = (result: { ok: boolean; canceled?: boolean; error?: string }) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      if (!windowRef.isDestroyed()) windowRef.close();
      resolve(result);
    };

    const runLoginAutomation = () => {
      if (resolved || windowRef.isDestroyed()) return;
      const currentUrl = windowRef.webContents.getURL();
      if (!isLoginAutomationUrl(currentUrl)) return;
      fillAttempts += 1;
      if (fillAttempts === 1) {
        sendAuthStatus("Preenchendo login automaticamente. Se nao preencher, digite e-mail e senha na janela.");
      }
      void tryFillOnvioLogin(windowRef, email, password);
      if (fillAttempts >= 120 && loginAutomationTimer) {
        clearInterval(loginAutomationTimer);
        loginAutomationTimer = null;
      }
    };

    const pollToken = async () => {
      if (resolved || windowRef.isDestroyed()) return;
      const currentUrl = windowRef.webContents.getURL();
      if (
        currentUrl.includes("/login") ||
        currentUrl.includes("signin") ||
        currentUrl.includes("thomsonreuters.com") ||
        !currentUrl.includes("onvio.com.br")
      ) {
        return;
      }

      const token = await readSessionToken(windowRef.webContents.session);
      if (!token) return;

      if (!isAuthenticatedOnvioUrl(currentUrl)) {
        sendAuthStatus("Login detectado. Abrindo o portal Onvio...");
        if (!currentUrl.includes("dashboard-core-center")) {
          void windowRef.loadURL("https://onvio.com.br/staff/#/dashboard-core-center");
        }
        return;
      }

      writeAuthArtifact(token);
      sendAuthStatus("Login Onvio concluido.");
      finish({ ok: true });
    };

    windowRef.webContents.on("did-navigate", runLoginAutomation);
    windowRef.webContents.on("did-navigate-in-page", runLoginAutomation);
    windowRef.webContents.on("did-finish-load", runLoginAutomation);
    windowRef.webContents.on("dom-ready", runLoginAutomation);
    windowRef.on("closed", () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve({ ok: false, canceled: true });
      }
    });

    sendAuthStatus("Abrindo login do Onvio. Conclua o login e o MFA na janela aberta.");
    void windowRef.loadURL("https://onvio.com.br/login/#/");
    loginAutomationTimer = setInterval(runLoginAutomation, 1200);
    tokenPollTimer = setInterval(() => {
      void pollToken();
    }, 1500);
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 980,
    minHeight: 680,
    title: "Solicitacoes Onvio",
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
  if (fs.existsSync(getAuthArtifactPath())) fs.unlinkSync(getAuthArtifactPath());
  await session.defaultSession.clearStorageData();
  return readAuthStatus();
});

ipcMain.handle("auth:capture", async (_event, payload: { email: string; password: string; savePassword: boolean }) => {
  const email = payload.email.trim();
  const password = payload.password;
  if (!email || !password) {
    return { ok: false, error: "Informe e-mail e senha antes de fazer login." };
  }
  saveCredentials(email, password, payload.savePassword);
  return captureAuth(email, password);
});

ipcMain.handle("catalogs:departments", async () => {
  const token = await resolveLiveOnvioToken();
  if (!token) {
    return {
      ok: false,
      error: "Faca login para carregar departamentos.",
      departments: [],
      selected: null,
    };
  }

  try {
    const provider = new OnvioHttpDepartmentsProvider({
      token,
      firmCompanyId: process.env.ONVIO_FIRM_COMPANY_ID || DEFAULT_ONVIO_FIRM_COMPANY_ID,
      cookie: `UDSLongToken=${token}`,
      onUnauthorized: async () => {
        const refreshed = await resolveLiveOnvioToken();
        return refreshed || token;
      },
    });
    const departments = (await provider.listDepartments()).sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
    );
    const selected = readDepartmentPreference();
    return { ok: true, departments, selected };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      departments: [],
      selected: readDepartmentPreference(),
    };
  }
});

ipcMain.handle(
  "preferences:department",
  (_event, payload: { id?: string; name?: string } | null) => {
    if (!payload?.id?.trim() || !payload?.name?.trim()) {
      writeDepartmentPreference(null);
      return { ok: true, selected: null };
    }
    const selected = { id: payload.id.trim(), name: payload.name.trim() };
    writeDepartmentPreference(selected);
    return { ok: true, selected };
  },
);

async function showOpen(options: Electron.OpenDialogOptions) {
  return mainWindow ? dialog.showOpenDialog(mainWindow, options) : dialog.showOpenDialog(options);
}

async function showSave(options: Electron.SaveDialogOptions) {
  return mainWindow ? dialog.showSaveDialog(mainWindow, options) : dialog.showSaveDialog(options);
}

ipcMain.handle("sheet:select", async () => {
  const result = await showOpen({
    title: "Selecionar planilha",
    properties: ["openFile"],
    filters: [
      { name: "Planilhas Excel", extensions: ["xlsx", "xls"] },
      { name: "Todos os arquivos", extensions: ["*"] },
    ],
  });
  const filePath = result.filePaths[0] ?? "";
  if (filePath) writeSelectedSheet(filePath);
  return { canceled: result.canceled, filePath };
});

ipcMain.handle("sheet:load-selected", () => {
  const filePath = readSelectedSheet();
  return { filePath, exists: Boolean(filePath && fs.existsSync(filePath)) };
});

ipcMain.handle("sheet:inspect", (_event, payload: { filePath: string }) => {
  const filePath = payload.filePath.trim();
  if (!filePath || !fs.existsSync(filePath)) {
    return { ok: false, error: "Planilha nao encontrada." };
  }
  try {
    const preview = loadSheetPreview(filePath);
    return {
      ok: true,
      totalRows: preview.totalRows,
      rows: preview.rows.map(toPreviewPayload),
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle("template:download", async () => {
  const result = await showSave({
    title: "Baixar planilha padrao",
    defaultPath: "solicitacoes-onvio-modelo.xlsx",
    filters: [{ name: "Planilha Excel", extensions: ["xlsx"] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true, filePath: "" };
  criarPlanilhaPadrao(result.filePath);
  writeSelectedSheet(result.filePath);
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle("attachments:select", async () => {
  const result = await showOpen({
    title: "Selecionar anexos",
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "Arquivos suportados", extensions: ["pdf", "xlsx", "xls", "mp4", "webm", "mov"] },
      { name: "Todos os arquivos", extensions: ["*"] },
    ],
  });
  return {
    canceled: result.canceled,
    files: result.filePaths.map((filePath) => ({
      filePath,
      fileName: path.basename(filePath),
    })),
  };
});

ipcMain.handle("reports:open", async () => {
  fs.mkdirSync(getReportsDir(), { recursive: true });
  const error = await shell.openPath(getReportsDir());
  return { ok: !error, error };
});

ipcMain.handle("batch:run", async (_event, payload: RunBatchPayload) => {
  if (runningBatch || runningRollback) {
    return { ok: false, error: "Ja existe um envio ou reversao em andamento." };
  }
  const token = await resolveLiveOnvioToken();
  if (!token) return { ok: false, error: "Faca login antes de enviar as solicitacoes." };
  if (!payload.planilhaPath || !fs.existsSync(payload.planilhaPath)) {
    return { ok: false, error: "Selecione uma planilha valida." };
  }

  runningBatch = true;
  batchCancelRequested = false;
  sendLog("Iniciando envio em lote...");
  void runServiceRequestsBatch({
    ...payload,
    token,
    firmCompanyId: process.env.ONVIO_FIRM_COMPANY_ID || DEFAULT_ONVIO_FIRM_COMPANY_ID,
    userDataDir: app.getPath("userData"),
    onUnauthorized: async () => (await resolveLiveOnvioToken()) || token,
    onLog: sendLog,
    onProgress: (event) => sendLog(formatProgress(event)),
    shouldCancel: () => batchCancelRequested,
  })
    .then((outcome) => {
      const { summary } = outcome.result;
      sendLog(
        `Resumo: ${summary.success} sucesso(s), ${summary.failed} falha(s), ${summary.skipped} ignorado(s).`,
      );
      sendLog(`Relatorio salvo: ${outcome.xlsxPath}`);
      sendLog(`Backup para reversao: ${outcome.backupPath}`);
      if (summary.cancelled) {
        mainWindow?.webContents.send("batch:done", {
          ok: true,
          canceled: true,
          summary: `Envio cancelado: ${summary.success} enviada(s), ${summary.skipped} nao enviada(s). Backup disponivel para reverter o que ja foi criado.`,
        });
        return;
      }
      mainWindow?.webContents.send("batch:done", {
        ok: summary.failed === 0,
        summary: `Finalizado: ${summary.success} sucesso(s), ${summary.failed} falha(s).`,
      });
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      sendLog(`Erro: ${message}`);
      mainWindow?.webContents.send("batch:done", { ok: false, error: message });
    })
    .finally(() => {
      runningBatch = false;
      batchCancelRequested = false;
    });

  return { ok: true };
});

ipcMain.handle("batch:cancel", () => {
  if (!runningBatch) {
    return { ok: false, error: "Nao ha envio em andamento." };
  }
  batchCancelRequested = true;
  sendLog("Cancelamento solicitado. O lote para apos o item atual...");
  return { ok: true };
});

ipcMain.handle("rollback:run", async () => {
  if (runningBatch || runningRollback) {
    return { ok: false, error: "Ja existe um envio ou reversao em andamento." };
  }
  const token = await resolveLiveOnvioToken();
  if (!token) return { ok: false, error: "Faca login antes de reverter uma execucao." };

  const reportsDir = getReportsDir();
  fs.mkdirSync(reportsDir, { recursive: true });
  const picker = await (mainWindow
    ? dialog.showOpenDialog(mainWindow, {
        title: "Selecionar backup para reversao",
        defaultPath: reportsDir,
        properties: ["openFile"],
        filters: [{ name: "Backup JSON", extensions: ["json"] }],
      })
    : dialog.showOpenDialog({
        title: "Selecionar backup para reversao",
        defaultPath: reportsDir,
        properties: ["openFile"],
        filters: [{ name: "Backup JSON", extensions: ["json"] }],
      }));

  if (picker.canceled || !picker.filePaths[0]) {
    return { ok: false, canceled: true };
  }

  const backupPath = picker.filePaths[0];
  const confirm = await (mainWindow
    ? dialog.showMessageBox(mainWindow, {
        type: "warning",
        buttons: ["Cancelar", "Apagar solicitacoes"],
        defaultId: 0,
        cancelId: 0,
        title: "Confirmar reversao",
        message: "Tentar apagar no Onvio as solicitacoes deste backup?",
        detail:
          "Esta acao e destrutiva. Se a API nao permitir apagar algum ticket, o item falhara no relatorio de reversao.\n\n" +
          path.basename(backupPath),
      })
    : dialog.showMessageBox({
        type: "warning",
        buttons: ["Cancelar", "Apagar solicitacoes"],
        defaultId: 0,
        cancelId: 0,
        title: "Confirmar reversao",
        message: "Tentar apagar no Onvio as solicitacoes deste backup?",
        detail:
          "Esta acao e destrutiva. Se a API nao permitir apagar algum ticket, o item falhara no relatorio de reversao.\n\n" +
          path.basename(backupPath),
      }));

  if (confirm.response !== 1) {
    return { ok: false, canceled: true };
  }

  runningRollback = true;
  sendLog(`Iniciando reversao a partir de ${path.basename(backupPath)}...`);
  void executarReversaoBackup({
    backupPath,
    token,
    reportsDir,
    onLog: sendLog,
    onUnauthorized: async () => (await resolveLiveOnvioToken()) || token,
  })
    .then((outcome) => {
      const { summary } = outcome;
      mainWindow?.webContents.send("batch:done", {
        ok: summary.falha === 0,
        summary: `Reversao: ${summary.sucesso} apagada(s), ${summary.falha} falha(s).`,
      });
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      sendLog(`Erro na reversao: ${message}`);
      mainWindow?.webContents.send("batch:done", { ok: false, error: message });
    })
    .finally(() => {
      runningRollback = false;
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
