import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { DocumentConfirmation } from "../types";

contextBridge.exposeInMainWorld("expressDocumentsApp", {
  getInitialState: () => ipcRenderer.invoke("app:initial-state"),
  captureAuth: (payload: { email: string; password: string; savePassword: boolean }) => ipcRenderer.invoke("auth:capture", payload),
  clearAuth: () => ipcRenderer.invoke("auth:clear"),
  selectFiles: () => ipcRenderer.invoke("files:select"),
  pathsForFiles: (files: File[]) => files.map((file) => webUtils.getPathForFile(file)).filter(Boolean),
  validateBatch: (filePaths: string[]) => ipcRenderer.invoke("batch:validate", filePaths),
  applySelection: (payload: { id: string; companyId?: string; taskId?: string }) => ipcRenderer.invoke("batch:apply-selection", payload),
  executeBatch: (confirmations: DocumentConfirmation[]) => ipcRenderer.invoke("batch:execute", { confirmations }),
  cancelBatch: () => ipcRenderer.invoke("batch:cancel"),
  openReports: () => ipcRenderer.invoke("reports:open"),
  onItemStatus: (callback: (payload: { id: string; status: string; message: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: { id: string; status: string; message: string }) => callback(payload);
    ipcRenderer.on("execution:item-status", listener);
    return () => ipcRenderer.removeListener("execution:item-status", listener);
  },
});
