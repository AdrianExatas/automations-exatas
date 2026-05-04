import { contextBridge, ipcRenderer } from "electron";
import type { RunProgress } from "../types";
import type { AppDefaults, S5002Api, StartRunRequest } from "./ipc-types";

const api: S5002Api = {
  getDefaults: () => ipcRenderer.invoke("app:getDefaults") as Promise<AppDefaults>,
  selectInputDir: () => ipcRenderer.invoke("dialog:selectInputDir") as Promise<string | undefined>,
  selectOutputDir: () => ipcRenderer.invoke("dialog:selectOutputDir") as Promise<string | undefined>,
  startRun: (request: StartRunRequest) => ipcRenderer.invoke("run:start", request) as ReturnType<S5002Api["startRun"]>,
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

contextBridge.exposeInMainWorld("s5002", api);
