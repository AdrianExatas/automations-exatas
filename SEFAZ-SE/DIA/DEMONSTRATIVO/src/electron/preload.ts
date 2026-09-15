import { contextBridge, ipcRenderer } from "electron";
import type { RunProgress } from "../runner";
import type { XmlDownloadProgress } from "../xml-downloads";
import type {
  AlterarRunProgress,
  AppDefaults,
  SefazDiaApi,
  StartAlterarRunRequest,
  StartRunRequest,
  StartXmlDownloadRequest,
} from "./ipc-types";

const api: SefazDiaApi = {
  getDefaults: () => ipcRenderer.invoke("app:getDefaults") as Promise<AppDefaults>,
  getCredentials: () => ipcRenderer.invoke("credentials:get") as ReturnType<SefazDiaApi["getCredentials"]>,
  saveCredentials: (credentials) => ipcRenderer.invoke("credentials:save", credentials) as Promise<void>,
  clearCredentials: () => ipcRenderer.invoke("credentials:clear") as Promise<void>,
  selectOutDir: () => ipcRenderer.invoke("dialog:selectOutDir") as Promise<string | undefined>,
  selectCert: () => ipcRenderer.invoke("dialog:selectCert") as Promise<string | undefined>,
  selectSpreadsheet: () => ipcRenderer.invoke("dialog:selectSpreadsheet") as Promise<string | undefined>,
  startRun: (request: StartRunRequest) => ipcRenderer.invoke("run:start", request) as ReturnType<SefazDiaApi["startRun"]>,
  cancelRun: () => ipcRenderer.invoke("run:cancel") as Promise<void>,
  startXmlDownload: (request: StartXmlDownloadRequest) =>
    ipcRenderer.invoke("xml:start", request) as ReturnType<SefazDiaApi["startXmlDownload"]>,
  cancelXmlDownload: () => ipcRenderer.invoke("xml:cancel") as Promise<void>,
  startAlterarRun: (request: StartAlterarRunRequest) =>
    ipcRenderer.invoke("alterar:run:start", request) as ReturnType<SefazDiaApi["startAlterarRun"]>,
  cancelAlterarRun: () => ipcRenderer.invoke("alterar:run:cancel") as Promise<void>,
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
  onXmlLog: (callback: (message: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message);
    ipcRenderer.on("xml:log", listener);
    return () => ipcRenderer.off("xml:log", listener);
  },
  onXmlProgress: (callback: (progress: XmlDownloadProgress) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: XmlDownloadProgress) => callback(progress);
    ipcRenderer.on("xml:progress", listener);
    return () => ipcRenderer.off("xml:progress", listener);
  },
  onAlterarLog: (callback: (message: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message);
    ipcRenderer.on("alterar:run:log", listener);
    return () => ipcRenderer.off("alterar:run:log", listener);
  },
  onAlterarProgress: (callback: (progress: AlterarRunProgress) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: AlterarRunProgress) => callback(progress);
    ipcRenderer.on("alterar:run:progress", listener);
    return () => ipcRenderer.off("alterar:run:progress", listener);
  },
};

contextBridge.exposeInMainWorld("sefazDia", api);
