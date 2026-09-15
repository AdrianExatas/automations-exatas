import { captureOnvioAndGesttaTokens, loadAuthArtifactsFromFile } from "@exatas/onvio-auth";
import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from "electron";
import fs from "fs";
import path from "path";
import { createCompanyResolver } from "../company-resolver";
import { BatchExecutor } from "../execution";
import { createExpressDocumentsGateway } from "../gateway";
import { ProcessedDocumentStore } from "../processed-store";
import { saveExecutionReport, type ReportPaths } from "../report";
import type { DocumentConfirmation, DocumentInspection } from "../types";
import { DocumentValidator } from "../validation";

interface StoredCredentials {
  email?: string;
  encryptedPassword?: string;
}

let mainWindow: BrowserWindow | null = null;
let running = false;
let cancelRequested = false;
let lastInspections = new Map<string, DocumentInspection>();
let lastReportPaths: ReportPaths | undefined;

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
  return path.join(getAuthDir(), "storage-state.json");
}

function getReportsDir(): string {
  return path.join(app.getPath("documents"), "Publicar Documentos Express", "relatorios");
}

function getProcessedStore(): ProcessedDocumentStore {
  return new ProcessedDocumentStore(path.join(app.getPath("userData"), "processed-documents.json"));
}

function readStoredCredentials(): StoredCredentials {
  try {
    return JSON.parse(fs.readFileSync(getCredentialsPath(), "utf8")) as StoredCredentials;
  } catch {
    return {};
  }
}

function writeStoredCredentials(value: StoredCredentials): void {
  fs.mkdirSync(path.dirname(getCredentialsPath()), { recursive: true });
  fs.writeFileSync(getCredentialsPath(), JSON.stringify(value, null, 2), "utf8");
}

function credentialState() {
  const stored = readStoredCredentials();
  let password = "";
  if (stored.encryptedPassword && safeStorage.isEncryptionAvailable()) {
    try {
      password = safeStorage.decryptString(Buffer.from(stored.encryptedPassword, "base64"));
    } catch {
      password = "";
    }
  }
  return {
    email: stored.email || "",
    password,
    canSavePassword: safeStorage.isEncryptionAvailable(),
    hasSavedPassword: Boolean(stored.encryptedPassword),
  };
}

function saveCredentials(email: string, password: string, savePassword: boolean): void {
  if (savePassword && safeStorage.isEncryptionAvailable()) {
    writeStoredCredentials({ email, encryptedPassword: safeStorage.encryptString(password).toString("base64") });
  } else {
    writeStoredCredentials({ email });
  }
}

function authState() {
  if (process.env.EXPRESS_DOCUMENTS_DEMO === "1") {
    return { authenticated: true, capturedAt: new Date().toISOString(), demo: true };
  }
  try {
    const artifact = loadAuthArtifactsFromFile(getAuthArtifactPath());
    return { authenticated: Boolean(artifact), capturedAt: artifact?.capturedAt, demo: false };
  } catch {
    return { authenticated: false, demo: false };
  }
}

function createServices() {
  const artifactPath = authState().authenticated ? getAuthArtifactPath() : undefined;
  return {
    companies: createCompanyResolver(artifactPath),
    gateway: createExpressDocumentsGateway(artifactPath),
  };
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 680,
    backgroundColor: "#f3f5f7",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.removeMenu();
  void mainWindow.loadFile(path.join(__dirname, "renderer.html"));
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => { mainWindow = null; });
}

function emitItemStatus(payload: { id: string; status: string; message: string }): void {
  mainWindow?.webContents.send("execution:item-status", payload);
}

ipcMain.handle("app:initial-state", () => ({
  auth: authState(),
  credentials: credentialState(),
  integration: createServices().gateway.status(),
  reportsDir: getReportsDir(),
}));

ipcMain.handle("auth:capture", async (_event, payload: { email: string; password: string; savePassword: boolean }) => {
  const email = String(payload?.email || "").trim();
  const password = String(payload?.password || "");
  if (!email || !password) return { ok: false, error: "Informe e-mail e senha." };
  try {
    saveCredentials(email, password, Boolean(payload.savePassword));
    await captureOnvioAndGesttaTokens({
      email,
      password,
      artifactPath: getAuthArtifactPath(),
      storageStatePath: getAuthStorageStatePath(),
      writeArtifact: true,
      browser: { headless: false },
    });
    return { ok: true, auth: authState(), integration: createServices().gateway.status() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle("auth:clear", () => {
  for (const filePath of [getCredentialsPath(), getAuthArtifactPath(), getAuthStorageStatePath()]) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  return { ok: true, auth: authState(), credentials: credentialState(), integration: createServices().gateway.status() };
});

ipcMain.handle("files:select", async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: "Selecionar guias em PDF",
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "Documentos PDF", extensions: ["pdf"] }],
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle("batch:validate", async (_event, rawPaths: unknown) => {
  if (running) return { ok: false, error: "Aguarde a execucao atual." };
  const filePaths = Array.isArray(rawPaths) ? rawPaths.filter((item): item is string => typeof item === "string") : [];
  if (!filePaths.length) return { ok: false, error: "Selecione ao menos um PDF." };
  const services = createServices();
  const validator = new DocumentValidator(services.companies, services.gateway, getProcessedStore());
  const inspections = await validator.inspectMany(filePaths);
  lastInspections = new Map(inspections.map((item) => [item.id, item]));
  return { ok: true, inspections };
});

ipcMain.handle("batch:apply-selection", async (_event, payload: { id?: string; companyId?: string; taskId?: string }) => {
  if (running) return { ok: false, error: "Aguarde a execucao atual." };
  const id = String(payload?.id || "");
  const row = lastInspections.get(id);
  if (!row) return { ok: false, error: "Documento nao encontrado. Valide o lote novamente." };
  try {
    const services = createServices();
    const validator = new DocumentValidator(services.companies, services.gateway, getProcessedStore());
    const inspection = await validator.applySelection(row, {
      companyId: payload?.companyId ? String(payload.companyId) : undefined,
      taskId: payload?.taskId ? String(payload.taskId) : undefined,
    });
    lastInspections.set(inspection.id, inspection);
    return { ok: true, inspection };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle("batch:execute", async (_event, payload: { confirmations?: DocumentConfirmation[] }) => {
  if (running) return { ok: false, error: "Ja existe uma execucao em andamento." };
  const confirmations = Array.isArray(payload?.confirmations) ? payload.confirmations : [];
  const rows = confirmations.map((item) => lastInspections.get(item.id)).filter((item): item is DocumentInspection => Boolean(item));
  if (!rows.length) return { ok: false, error: "Nenhum documento valido e confirmado foi selecionado." };

  const integration = createServices().gateway.status();
  if (!integration.available) {
    const missingCapabilities = Object.entries(integration.capabilities || {})
      .filter(([, available]) => !available).map(([capability]) => capability);
    return {
      ok: false,
      error: integration.reason || "A integracao obrigatoria esta indisponivel.",
      code: "INTEGRATION_CAPABILITIES_MISSING",
      stage: "preflight",
      missingCapabilities,
      integration,
    };
  }

  running = true;
  cancelRequested = false;
  try {
    const services = createServices();
    const executor = new BatchExecutor(services.companies, services.gateway, getProcessedStore());
    const report = await executor.run(rows, confirmations, {
      isCancellationRequested: () => cancelRequested,
      onItemStatus: emitItemStatus,
    });
    lastReportPaths = saveExecutionReport(report, getReportsDir());
    return { ok: true, report, reportPaths: lastReportPaths };
  } catch (error) {
    const structured = error && typeof error === "object" ? error as { code?: string; stage?: string } : {};
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      code: structured.code || "EXECUTION_REJECTED",
      stage: structured.stage || "preflight",
      missingCapabilities: [],
    };
  } finally {
    running = false;
  }
});

ipcMain.handle("batch:cancel", () => {
  cancelRequested = true;
  return { ok: true, running };
});

ipcMain.handle("reports:open", async () => {
  fs.mkdirSync(getReportsDir(), { recursive: true });
  const error = await shell.openPath(getReportsDir());
  return { ok: !error, error, lastReportPaths };
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
