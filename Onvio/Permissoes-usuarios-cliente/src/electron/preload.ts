import { contextBridge, ipcRenderer } from 'electron';
import { AutomationConfig } from '../types';

/**
 * Expõe APIs seguras para o renderer process
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Automação
  startAutomation: (config: AutomationConfig) => ipcRenderer.invoke('start-automation', config),
  stopAutomation: () => ipcRenderer.invoke('stop-automation'),
  
  // Arquivos
  getExcelFiles: () => ipcRenderer.invoke('get-excel-files'),
  openFile: (filePath: string) => ipcRenderer.invoke('open-file', filePath),
  
  // Credenciais
  loadEnvCredentials: () => ipcRenderer.invoke('load-env-credentials'),
  
  // Métricas
  getMetrics: () => ipcRenderer.invoke('get-metrics'),
  
  // Health Checks
  runHealthChecks: () => ipcRenderer.invoke('run-health-checks'),
  quickHealthCheck: () => ipcRenderer.invoke('quick-health-check'),
  
  // Eventos
  onAutomationLog: (callback: (data: string) => void) => {
    ipcRenderer.on('automation-log', (_event, data) => callback(data));
  },
  onAutomationComplete: (callback: (data: any) => void) => {
    ipcRenderer.on('automation-complete', (_event, data) => callback(data));
  },
  
  // Remover listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
