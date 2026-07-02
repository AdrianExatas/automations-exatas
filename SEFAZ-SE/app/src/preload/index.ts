import { contextBridge, ipcRenderer } from "electron";

export type SavedCredentials = {
  user: string;
  password: string;
};

export type OpenDialogResult = {
  canceled: boolean;
  filePaths: string[];
};

export type SaveDialogResult = {
  canceled: boolean;
  filePath?: string;
};

const api = {
  // ── Credenciais ──────────────────────────────────────────────────────────
  loadSefazCredentials: (): Promise<SavedCredentials | null> =>
    ipcRenderer.invoke("store:load-sefaz-credentials"),
  saveSefazCredentials: (creds: SavedCredentials): Promise<void> =>
    ipcRenderer.invoke("store:save-sefaz-credentials", creds),
  clearSefazCredentials: (): Promise<void> =>
    ipcRenderer.invoke("store:clear-sefaz-credentials"),

  loadAgilCredentials: (): Promise<SavedCredentials | null> =>
    ipcRenderer.invoke("store:load-agil-credentials"),
  saveAgilCredentials: (creds: SavedCredentials): Promise<void> =>
    ipcRenderer.invoke("store:save-agil-credentials", creds),
  clearAgilCredentials: (): Promise<void> =>
    ipcRenderer.invoke("store:clear-agil-credentials"),

  // ── Dialogs ──────────────────────────────────────────────────────────────
  openFile: (opts?: Electron.OpenDialogOptions): Promise<OpenDialogResult> =>
    ipcRenderer.invoke("dialog:open-file", opts),
  openDirectory: (): Promise<OpenDialogResult> =>
    ipcRenderer.invoke("dialog:open-directory"),
  saveFile: (opts?: Electron.SaveDialogOptions): Promise<SaveDialogResult> =>
    ipcRenderer.invoke("dialog:save-file", opts),
  openPath: (path: string): Promise<string> =>
    ipcRenderer.invoke("shell:open-path", path),
  getVersion: (): Promise<string> =>
    ipcRenderer.invoke("app:get-version"),

  // ── AGIL ─────────────────────────────────────────────────────────────────
  agilImportFiles: (): Promise<{ filePaths: string[]; keys: string[] }> =>
    ipcRenderer.invoke("agil:import-files"),
  agilStartBatch: (payload: {
    auth: { authMode: "credentials"; username: string; password: string } | { authMode: "certificate" };
    danfes: string[];
    dryRun?: boolean;
  }): Promise<unknown[]> =>
    ipcRenderer.invoke("agil:start-batch", payload),
  agilExportReport: (payload: unknown): Promise<{ canceled: boolean; filePath?: string }> =>
    ipcRenderer.invoke("agil:export-report", payload),
  agilExportPdfsZip: (payload: { paths: string[] }): Promise<{ canceled: boolean; filePath?: string }> =>
    ipcRenderer.invoke("agil:export-pdfs-zip", payload),
  agilCancel: (): Promise<void> =>
    ipcRenderer.invoke("agil:cancel"),
  onAgilProgress: (callback: (event: unknown) => void) => {
    ipcRenderer.on("agil:progress", (_e, data) => callback(data));
    return () => ipcRenderer.removeAllListeners("agil:progress");
  },

  // ── Gerar DAE ─────────────────────────────────────────────────────────────
  daeStart: (payload: {
    user: string;
    password: string;
    modelDir: string;
    outDir: string;
    headless: boolean;
    referencia?: { ano: number; mes: number };
  }): Promise<unknown[]> =>
    ipcRenderer.invoke("dae:start", payload),
  daeCancel: (): Promise<void> =>
    ipcRenderer.invoke("dae:cancel"),
  onDaeProgress: (callback: (result: unknown) => void) => {
    ipcRenderer.on("dae:progress", (_e, data) => callback(data));
    return () => ipcRenderer.removeAllListeners("dae:progress");
  },

  // ── Alterar Nota ─────────────────────────────────────────────────────────
  alterarNotaStart: (payload: {
    user: string;
    password: string;
    spreadsheetPath: string;
    outDir: string;
    headless: boolean;
    dryRun: boolean;
  }): Promise<unknown> =>
    ipcRenderer.invoke("alterar-nota:start", payload),
  alterarNotaCancel: (): Promise<void> =>
    ipcRenderer.invoke("alterar-nota:cancel"),
  onAlterarNotaProgress: (callback: (progress: unknown) => void) => {
    ipcRenderer.on("alterar-nota:progress", (_e, data) => callback(data));
    return () => ipcRenderer.removeAllListeners("alterar-nota:progress");
  },
  onAlterarNotaLog: (callback: (message: string) => void) => {
    ipcRenderer.on("alterar-nota:log", (_e, data) => callback(data));
    return () => ipcRenderer.removeAllListeners("alterar-nota:log");
  },

  // ── Demonstrativo ─────────────────────────────────────────────────────────
  demonstrativoStart: (payload: {
    user: string;
    password: string;
    competencia: string;
    formats: string[];
    outDir: string;
  }): Promise<unknown> =>
    ipcRenderer.invoke("demonstrativo:start", payload),
  demonstrativoCancel: (): Promise<void> =>
    ipcRenderer.invoke("demonstrativo:cancel"),
  onDemonstrativoProgress: (callback: (progress: unknown) => void) => {
    ipcRenderer.on("demonstrativo:progress", (_e, data) => callback(data));
    return () => ipcRenderer.removeAllListeners("demonstrativo:progress");
  },
  onDemonstrativoLog: (callback: (message: string) => void) => {
    ipcRenderer.on("demonstrativo:log", (_e, data) => callback(data));
    return () => ipcRenderer.removeAllListeners("demonstrativo:log");
  },
};

contextBridge.exposeInMainWorld("api", api);

export type ElectronAPI = typeof api;
