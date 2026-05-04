const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('agilApi', {
  exportPdfsZip: (payload) => ipcRenderer.invoke('agil:export-pdfs-zip', payload),
  exportReport: (payload) => ipcRenderer.invoke('agil:export-report', payload),
  importFiles: () => ipcRenderer.invoke('agil:import-files'),
  startBatch: (payload) => ipcRenderer.invoke('agil:start-batch', payload),
  onProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);

    ipcRenderer.on('agil:progress', listener);

    return () => {
      ipcRenderer.removeListener('agil:progress', listener);
    };
  },
});
