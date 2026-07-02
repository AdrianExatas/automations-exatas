import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("gesttaApp", {
  loadCredentials: () => ipcRenderer.invoke("credentials:load"),
  saveCredentials: (payload: { email: string; password: string; savePassword: boolean }) =>
    ipcRenderer.invoke("credentials:save", payload),
  selectSheet: () => ipcRenderer.invoke("sheet:select"),
  inspectSheet: (payload: { filePath: string }) => ipcRenderer.invoke("sheet:inspect", payload),
  downloadTemplate: () => ipcRenderer.invoke("template:download"),
  openReports: () => ipcRenderer.invoke("reports:open"),
  runAutomation: (payload: {
    email: string;
    password: string;
    saveCredentials: boolean;
    startWithoutCheckpoint: boolean;
    planilhaPath: string;
  }) => ipcRenderer.invoke("automation:run", payload),
  runRollback: (payload: {
    email: string;
    password: string;
    saveCredentials: boolean;
  }) => ipcRenderer.invoke("rollback:run", payload),
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
