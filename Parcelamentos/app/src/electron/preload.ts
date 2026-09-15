import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { UfCode } from "../shared/types.js";

contextBridge.exposeInMainWorld("parcelamentosApi", {
  bootstrap: () => ipcRenderer.invoke("app:bootstrap"),
  selectSheet: () => ipcRenderer.invoke("sheet:select"),
  selectFolder: () => ipcRenderer.invoke("folder:select"),
  inspectSheet: (filePath: string, uf: UfCode) => ipcRenderer.invoke("sheet:inspect", { filePath, uf }),
  createTemplate: (uf: UfCode) => ipcRenderer.invoke("template:create", { uf }),
  columnsHint: (uf: UfCode) => ipcRenderer.invoke("hint:columns", { uf }),
  openDownloads: () => ipcRenderer.invoke("downloads:open"),
  openReport: () => ipcRenderer.invoke("report:open"),
  cancelAutomation: () => ipcRenderer.invoke("automation:cancel"),
  runAutomation: (payload: unknown) => ipcRenderer.invoke("automation:run", payload),
  onLog: (callback: (message: string) => void) => {
    const listener = (_event: IpcRendererEvent, message: string) => callback(message);
    ipcRenderer.on("automation:log", listener);
    return () => ipcRenderer.off("automation:log", listener);
  },
  onProgress: (callback: (payload: unknown) => void) => {
    const listener = (_event: IpcRendererEvent, payload: unknown) => callback(payload);
    ipcRenderer.on("automation:progress", listener);
    return () => ipcRenderer.off("automation:progress", listener);
  },
  onDone: (callback: (result: unknown) => void) => {
    const listener = (_event: IpcRendererEvent, result: unknown) => callback(result);
    ipcRenderer.on("automation:done", listener);
    return () => ipcRenderer.off("automation:done", listener);
  },
});
