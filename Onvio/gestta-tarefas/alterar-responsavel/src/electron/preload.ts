import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("gesttaApp", {
  loadCredentials: () => ipcRenderer.invoke("credentials:load"),
  saveCredentials: (payload: { email: string; password: string; savePassword: boolean }) =>
    ipcRenderer.invoke("credentials:save", payload),
  getAuthStatus: () => ipcRenderer.invoke("auth:status"),
  captureAuth: (payload: { email: string; password: string; savePassword: boolean }) =>
    ipcRenderer.invoke("auth:capture", payload),
  clearAuth: () => ipcRenderer.invoke("auth:clear"),
  selectSheet: () => ipcRenderer.invoke("sheet:select"),
  inspectSheet: (payload: { filePath: string }) => ipcRenderer.invoke("sheet:inspect", payload),
  downloadTemplate: () => ipcRenderer.invoke("template:download"),
  openReports: () => ipcRenderer.invoke("reports:open"),
  runAutomation: (payload: {
    startWithoutCheckpoint: boolean;
    reprocessFailures: boolean;
    planilhaPath: string;
  }) => ipcRenderer.invoke("automation:run", payload),
  runRollback: () => ipcRenderer.invoke("rollback:run"),
  onAuthLog: (callback: (message: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message);
    ipcRenderer.on("auth:log", listener);
    return () => ipcRenderer.removeListener("auth:log", listener);
  },
  onAutomationLog: (callback: (message: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message);
    ipcRenderer.on("automation:log", listener);
    return () => ipcRenderer.removeListener("automation:log", listener);
  },
  onAutomationDone: (callback: (result: { ok: boolean; code: number | null }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, result: { ok: boolean; code: number | null }) =>
      callback(result);
    ipcRenderer.on("automation:done", listener);
    return () => ipcRenderer.removeListener("automation:done", listener);
  },
});
