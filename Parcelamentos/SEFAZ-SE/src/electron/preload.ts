import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("parcelamentosApi", {
  selectSheet: () => ipcRenderer.invoke("sheet:select"),
  inspectSheet: (filePath: string) => ipcRenderer.invoke("sheet:inspect", { filePath }),
  createTemplate: () => ipcRenderer.invoke("template:create"),
  openReports: () => ipcRenderer.invoke("reports:open"),
  runAutomation: (payload: { inputPath: string; headed: boolean }) => ipcRenderer.invoke("automation:run", payload),
  onLog: (callback: (message: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message);
    ipcRenderer.on("automation:log", listener);
    return () => ipcRenderer.off("automation:log", listener);
  },
  onDone: (callback: (result: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, result: unknown) => callback(result);
    ipcRenderer.on("automation:done", listener);
    return () => ipcRenderer.off("automation:done", listener);
  },
});
