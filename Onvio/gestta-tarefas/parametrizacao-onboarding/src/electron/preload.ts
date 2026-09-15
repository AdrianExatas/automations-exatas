import { contextBridge, ipcRenderer } from "electron";
import { ParametrizacaoInput } from "../types";

type RunMode = "dry-run" | "apply";

contextBridge.exposeInMainWorld("onboardingApp", {
  getInitialState: () => ipcRenderer.invoke("app:initial-state"),
  selectMatrix: () => ipcRenderer.invoke("matrix:select"),
  resetMatrix: () => ipcRenderer.invoke("matrix:reset"),
  calculatePreview: (payload: { input: ParametrizacaoInput }) =>
    ipcRenderer.invoke("preview:calculate", payload),
  lookupCompany: (cnpj: string) => ipcRenderer.invoke("company:lookup", cnpj),
  captureAuth: (payload: { email: string; password: string; saveCredentials: boolean }) =>
    ipcRenderer.invoke("auth:capture", payload),
  clearCredentials: () => ipcRenderer.invoke("credentials:clear"),
  openReports: () => ipcRenderer.invoke("reports:open"),
  runAutomation: (payload: {
    mode: RunMode;
    input: ParametrizacaoInput;
    options?: {
      timeoutMs?: number;
      readRetries?: number;
      readRetryDelayMs?: number;
    };
  }) => ipcRenderer.invoke("automation:run", payload),
  cancelAutomation: () => ipcRenderer.invoke("automation:cancel"),
  onAutomationLog: (callback: (message: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message);
    ipcRenderer.on("automation:log", listener);
    return () => ipcRenderer.removeListener("automation:log", listener);
  },
  onAutomationStatus: (callback: (message: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message);
    ipcRenderer.on("automation:status", listener);
    return () => ipcRenderer.removeListener("automation:status", listener);
  },
  onAuthStatus: (callback: (message: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message);
    ipcRenderer.on("auth:status", listener);
    return () => ipcRenderer.removeListener("auth:status", listener);
  },
  onAutomationDone: (callback: (result: {
    ok: boolean;
    code: number | null;
    error?: string;
    reportPaths?: { jsonPath: string; xlsxPath: string };
  }) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      result: {
        ok: boolean;
        code: number | null;
        error?: string;
        reportPaths?: { jsonPath: string; xlsxPath: string };
      },
    ) => callback(result);
    ipcRenderer.on("automation:done", listener);
    return () => ipcRenderer.removeListener("automation:done", listener);
  },
});
