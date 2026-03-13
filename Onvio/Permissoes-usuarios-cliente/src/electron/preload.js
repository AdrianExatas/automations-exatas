const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expõe APIs seguras para o renderer process
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Automação
  startAutomation: (config) => ipcRenderer.invoke('start-automation', config),
  stopAutomation: () => ipcRenderer.invoke('stop-automation'),
  
  // Arquivos
  getExcelFiles: () => ipcRenderer.invoke('get-excel-files'),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  
  // Credenciais
  loadEnvCredentials: () => ipcRenderer.invoke('load-env-credentials'),
  
  // Métricas
  getMetrics: () => ipcRenderer.invoke('get-metrics'),
  
  // Eventos
  onAutomationLog: (callback) => {
    ipcRenderer.on('automation-log', (event, data) => callback(data));
  },
  onAutomationComplete: (callback) => {
    ipcRenderer.on('automation-complete', (event, data) => callback(data));
  },
  
  // Remover listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
