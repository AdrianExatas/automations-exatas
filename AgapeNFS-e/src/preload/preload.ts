import { contextBridge, ipcRenderer } from "electron";
import type { DownloadResult } from "../agape";

interface Credentials {
  login: string;
  password: string;
  available: boolean;
  saved: boolean;
}

interface DownloadInput {
  login: string;
  password: string;
  startDate: string;
  endDate: string;
  outputDir?: string;
  saveCredentials: boolean;
}

const api = {
  loadCredentials: (): Promise<Credentials> => ipcRenderer.invoke("credentials:load"),
  saveCredentials: (login: string, password: string): Promise<{ saved: boolean }> =>
    ipcRenderer.invoke("credentials:save", { login, password }),
  clearCredentials: (): Promise<{ saved: boolean }> => ipcRenderer.invoke("credentials:save", null),
  selectFolder: (currentPath?: string): Promise<string> => ipcRenderer.invoke("folder:select", currentPath),
  runDownload: (input: DownloadInput): Promise<DownloadResult> => ipcRenderer.invoke("download:run", input),
  onDownloadLog: (callback: (message: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message);
    ipcRenderer.on("download:log", listener);
    return () => ipcRenderer.off("download:log", listener);
  },
  onDownloadDone: (callback: (result: DownloadResult | { error: string; destino: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, result: DownloadResult | { error: string; destino: string }) => callback(result);
    ipcRenderer.on("download:done", listener);
    return () => ipcRenderer.off("download:done", listener);
  },
};

contextBridge.exposeInMainWorld("agape", api);

declare global {
  interface Window {
    agape: typeof api;
  }
}
