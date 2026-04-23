import { contextBridge, ipcRenderer } from "electron";
import type { RunProgress, RunResult } from "../runner";
import type { ReportFormat } from "../types";

type StartRunRequest = {
  user: string;
  password: string;
  rememberCredentials: boolean;
  competencia: string;
  formats: ReportFormat[];
  outDir: string;
};

contextBridge.exposeInMainWorld("sefazDia", {
  getDefaults: () => ipcRenderer.invoke("app:getDefaults") as Promise<{ competencia: string; outDir: string }>,
  getCredentials: () => ipcRenderer.invoke("credentials:get") as Promise<{ user: string; password: string; remembered: boolean }>,
  saveCredentials: (credentials: { user: string; password: string }) => ipcRenderer.invoke("credentials:save", credentials) as Promise<void>,
  clearCredentials: () => ipcRenderer.invoke("credentials:clear") as Promise<void>,
  selectOutDir: () => ipcRenderer.invoke("dialog:selectOutDir") as Promise<string | undefined>,
  startRun: (request: StartRunRequest) => ipcRenderer.invoke("run:start", request) as Promise<RunResult>,
  cancelRun: () => ipcRenderer.invoke("run:cancel") as Promise<void>,
  openPath: (targetPath: string) => ipcRenderer.invoke("shell:openPath", targetPath) as Promise<void>,
  onLog: (callback: (message: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message);
    ipcRenderer.on("run:log", listener);
    return () => ipcRenderer.off("run:log", listener);
  },
  onProgress: (callback: (progress: RunProgress) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: RunProgress) => callback(progress);
    ipcRenderer.on("run:progress", listener);
    return () => ipcRenderer.off("run:progress", listener);
  },
});
