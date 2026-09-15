import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("solicitacoesApp", {
  loadCredentials: () => ipcRenderer.invoke("credentials:load"),
  saveCredentials: (payload: { email: string; password: string; savePassword: boolean }) =>
    ipcRenderer.invoke("credentials:save", payload),
  getAuthStatus: () => ipcRenderer.invoke("auth:status"),
  captureAuth: (payload: { email: string; password: string; savePassword: boolean }) =>
    ipcRenderer.invoke("auth:capture", payload),
  clearAuth: () => ipcRenderer.invoke("auth:clear"),
  listDepartments: () => ipcRenderer.invoke("catalogs:departments"),
  saveDepartmentPreference: (payload: { id: string; name: string } | null) =>
    ipcRenderer.invoke("preferences:department", payload),
  selectSheet: () => ipcRenderer.invoke("sheet:select"),
  loadSelectedSheet: () => ipcRenderer.invoke("sheet:load-selected"),
  inspectSheet: (payload: { filePath: string }) => ipcRenderer.invoke("sheet:inspect", payload),
  downloadTemplate: () => ipcRenderer.invoke("template:download"),
  selectAttachments: () => ipcRenderer.invoke("attachments:select"),
  openReports: () => ipcRenderer.invoke("reports:open"),
  runRollback: () => ipcRenderer.invoke("rollback:run"),
  cancelBatch: () => ipcRenderer.invoke("batch:cancel"),
  runBatch: (payload: {
    planilhaPath: string;
    rowAttachments: Record<number, { filePath: string; fileName: string }[]>;
    commonAttachments: { filePath: string; fileName: string }[];
    defaultDepartmentName?: string;
    defaultDepartmentId?: string;
    dryRun?: boolean;
    startWithoutCheckpoint?: boolean;
    reprocessFailures?: boolean;
  }) => ipcRenderer.invoke("batch:run", payload),
  onAuthLog: (callback: (message: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message);
    ipcRenderer.on("auth:log", listener);
    return () => ipcRenderer.removeListener("auth:log", listener);
  },
  onBatchLog: (callback: (message: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message);
    ipcRenderer.on("batch:log", listener);
    return () => ipcRenderer.removeListener("batch:log", listener);
  },
  onBatchDone: (
    callback: (result: { ok: boolean; summary?: string; error?: string; canceled?: boolean }) => void,
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      result: { ok: boolean; summary?: string; error?: string; canceled?: boolean },
    ) => callback(result);
    ipcRenderer.on("batch:done", listener);
    return () => ipcRenderer.removeListener("batch:done", listener);
  },
});
