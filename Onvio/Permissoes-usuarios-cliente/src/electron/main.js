const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const { getMetrics } = require('../utils/metrics');

let mainWindow;
let automationProcess = null;

/**
 * Cria a janela principal da aplicação
 */
function createWindow() {
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
ipcMain.handle('start-automation', async (event, config) => {
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

      automationProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        mainWindow.webContents.send('automation-log', text);
      });

      automationProcess.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        mainWindow.webContents.send('automation-log', text);
      });

      automationProcess.on('close', (code) => {
        automationProcess = null;
        if (code === 0) {
          // Obter métricas finais
          const metrics = getMetrics();
          mainWindow.webContents.send('automation-complete', { 
            success: true, 
            output,
            metrics 
          });
          resolve({ success: true, output, metrics });
        } else {
          mainWindow.webContents.send('automation-complete', { success: false, error: errorOutput });
          reject(new Error(`Processo terminou com código ${code}: ${errorOutput}`));
        }
      });

      automationProcess.on('error', (error) => {
        automationProcess = null;
        mainWindow.webContents.send('automation-complete', { success: false, error: error.message });
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
  const files = [];
  
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
  
  return files.sort((a, b) => b.modified - a.modified);
});

/**
 * Abre um arquivo no sistema
 */
ipcMain.handle('open-file', async (event, filePath) => {
  const { shell } = require('electron');
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
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
    const credentials = {};
    
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
      error: `Erro ao ler arquivo .env: ${error.message}` 
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
