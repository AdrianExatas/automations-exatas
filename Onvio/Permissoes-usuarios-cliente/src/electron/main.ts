import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import { getMetrics } from '../utils/metrics';
import { runHealthChecks, quickHealthCheck } from '../utils/healthCheck';
import { AutomationConfig } from '../types';

let mainWindow: BrowserWindow | null = null;
let automationProcess: ChildProcess | null = null;

/**
 * Cria a janela principal da aplicação
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    titleBarStyle: 'default',
    backgroundColor: '#1e1e1e'
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // Abrir DevTools em desenvolvimento
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Inicia a automação com as configurações fornecidas
 */
ipcMain.handle('start-automation', async (_event, config: AutomationConfig) => {
  return new Promise((resolve, reject) => {
    try {
      const scriptPath = path.join(__dirname, 'automation-runner.js');
      
      // Configurar variáveis de ambiente
      const env = {
        ...process.env,
        ONVIO_EMAIL: config.email,
        ONVIO_PASSWORD: config.password,
        ONVIO_CLIENT_ID: config.clientId,
        ONVIO_MFA_METHOD: config.mfaMethod || 'E-mail',
        ONVIO_MFA_CODE: config.mfaCode || ''
      };

      // Executar o script de automação
      automationProcess = spawn('node', [scriptPath], {
        env: env,
        cwd: path.join(__dirname, '../..')
      });

      let output = '';
      let errorOutput = '';

      /**
       * Remove códigos ANSI de escape de uma string
       */
      function stripAnsiCodes(text: string): string {
        // Remove códigos ANSI (ex: \x1b[32m, [0m, etc.)
        return text
          .replace(/\x1b\[[0-9;]*m/g, '') // Remove códigos de cor ANSI
          .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '') // Remove outros códigos de escape ANSI
          .replace(/\[32m|\[33m|\[31m|\[36m|\[0m/g, ''); // Remove códigos específicos comuns
      }

      automationProcess.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        const cleanText = stripAnsiCodes(text);
        mainWindow?.webContents.send('automation-log', cleanText);
      });

      automationProcess.stderr?.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        const cleanText = stripAnsiCodes(text);
        mainWindow?.webContents.send('automation-log', cleanText);
      });

      automationProcess.on('close', (code) => {
        automationProcess = null;
        if (code === 0) {
          // Obter métricas finais
          const metrics = getMetrics();
          mainWindow?.webContents.send('automation-complete', { 
            success: true, 
            output,
            metrics 
          });
          resolve({ success: true, output, metrics });
        } else {
          mainWindow?.webContents.send('automation-complete', { success: false, error: errorOutput });
          reject(new Error(`Processo terminou com código ${code}: ${errorOutput}`));
        }
      });

      automationProcess.on('error', (error) => {
        automationProcess = null;
        mainWindow?.webContents.send('automation-complete', { success: false, error: error.message });
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
});

/**
 * Para a automação em execução
 */
ipcMain.handle('stop-automation', async () => {
  if (automationProcess) {
    automationProcess.kill();
    automationProcess = null;
    return { success: true };
  }
  return { success: false, message: 'Nenhum processo em execução' };
});

/**
 * Lista arquivos Excel gerados
 */
ipcMain.handle('get-excel-files', async () => {
  const testResultsDir = path.join(__dirname, '../../test-results');
  const files: Array<{ name: string; path: string; size: number; modified: Date }> = [];
  
  try {
    if (fs.existsSync(testResultsDir)) {
      const dirFiles = fs.readdirSync(testResultsDir);
      dirFiles.forEach(file => {
        if (file.endsWith('.xlsx') || file.endsWith('.xls')) {
          const filePath = path.join(testResultsDir, file);
          const stats = fs.statSync(filePath);
          files.push({
            name: file,
            path: filePath,
            size: stats.size,
            modified: stats.mtime
          });
        }
      });
    }
  } catch (error) {
    console.error('Erro ao listar arquivos Excel:', error);
  }
  
  return files.sort((a, b) => b.modified.getTime() - a.modified.getTime());
});

/**
 * Abre um arquivo no sistema
 */
ipcMain.handle('open-file', async (_event, filePath: string) => {
  const { shell } = require('electron');
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

/**
 * Carrega credenciais do arquivo .env
 */
ipcMain.handle('load-env-credentials', async () => {
  try {
    const envPath = path.join(__dirname, '../..', '.env');
    
    if (!fs.existsSync(envPath)) {
      return { 
        success: false, 
        error: 'Arquivo .env não encontrado. Certifique-se de que o arquivo existe na raiz do projeto.' 
      };
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const credentials: Record<string, string> = {};
    
    // Parsear o arquivo .env linha por linha
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Ignorar linhas vazias e comentários
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Extrair chave e valor (formato: KEY=value)
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex === -1) {
        continue;
      }
      
      const key = trimmedLine.substring(0, equalIndex).trim();
      let value = trimmedLine.substring(equalIndex + 1).trim();
      
      // Remover aspas se existirem
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      // Mapear chaves do .env para o formato esperado
      switch (key) {
        case 'ONVIO_EMAIL':
          credentials.email = value;
          break;
        case 'ONVIO_PASSWORD':
          credentials.password = value;
          break;
        case 'ONVIO_CLIENT_ID':
          credentials.clientId = value;
          break;
        case 'ONVIO_MFA_METHOD':
          credentials.mfaMethod = value || 'E-mail';
          break;
        case 'ONVIO_MFA_CODE':
          credentials.mfaCode = value || '';
          break;
      }
    }
    
    // Validar se as credenciais obrigatórias foram encontradas
    if (!credentials.email || !credentials.password || !credentials.clientId) {
      return { 
        success: false, 
        error: 'Arquivo .env incompleto. Certifique-se de que ONVIO_EMAIL, ONVIO_PASSWORD e ONVIO_CLIENT_ID estão definidos.' 
      };
    }
    
    return { success: true, credentials };
  } catch (error) {
    return { 
      success: false, 
      error: `Erro ao ler arquivo .env: ${(error as Error).message}` 
    };
  }
});

/**
 * Obtém métricas atuais
 */
ipcMain.handle('get-metrics', async () => {
  try {
    const metrics = getMetrics();
    return metrics;
  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    return null;
  }
});

/**
 * Executa health checks
 */
ipcMain.handle('run-health-checks', async () => {
  try {
    const report = await runHealthChecks();
    return report;
  } catch (error) {
    console.error('Erro ao executar health checks:', error);
    return { overall: 'unhealthy', error: (error as Error).message };
  }
});

/**
 * Verificação rápida de saúde
 */
ipcMain.handle('quick-health-check', async () => {
  try {
    const isHealthy = await quickHealthCheck();
    return { healthy: isHealthy };
  } catch (error) {
    return { healthy: false, error: (error as Error).message };
  }
});
