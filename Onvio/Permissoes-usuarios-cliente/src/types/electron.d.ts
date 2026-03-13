import { AutomationConfig } from './index';

declare global {
  interface Window {
    electronAPI: {
      startAutomation: (config: AutomationConfig) => Promise<any>;
      stopAutomation: () => Promise<any>;
      getExcelFiles: () => Promise<Array<{ name: string; path: string; size: number; modified: Date }>>;
      openFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      loadEnvCredentials: () => Promise<{ success: boolean; credentials?: any; error?: string }>;
      getMetrics: () => Promise<any>;
      runHealthChecks: () => Promise<any>;
      quickHealthCheck: () => Promise<{ healthy: boolean; error?: string }>;
      onAutomationLog: (callback: (data: string) => void) => void;
      onAutomationComplete: (callback: (data: any) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}
