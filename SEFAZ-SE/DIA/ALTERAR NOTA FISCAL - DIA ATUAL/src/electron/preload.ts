import { contextBridge, ipcRenderer } from "electron";
import type { RunProgress } from "../runner";
import type { SefazDiaApi, StartRunRequest } from "./ipc-types";

const api: SefazDiaApi = {
  getDefaults: () => ipcRenderer.invoke("app:getDefaults") as ReturnType<SefazDiaApi["getDefaults"]>,
  getCredentials: () => ipcRenderer.invoke("credentials:get") as ReturnType<SefazDiaApi["getCredentials"]>,
  saveCredentials: (credentials: { user: string; password: string }) => ipcRenderer.invoke("credentials:save", credentials) as Promise<void>,
  clearCredentials: () => ipcRenderer.invoke("credentials:clear") as Promise<void>,
  selectSpreadsheet: () => ipcRenderer.invoke("dialog:selectSpreadsheet") as Promise<string | undefined>,
  selectOutDir: () => ipcRenderer.invoke("dialog:selectOutDir") as Promise<string | undefined>,
  startRun: (request: StartRunRequest) => ipcRenderer.invoke("run:start", request) as ReturnType<SefazDiaApi["startRun"]>,
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
};

contextBridge.exposeInMainWorld("sefazDia", api);
