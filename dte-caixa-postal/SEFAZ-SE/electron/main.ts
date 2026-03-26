import { app, BrowserWindow, ipcMain, shell } from 'electron';

import { access } from 'node:fs/promises';
import path from 'node:path';

import { ensureAppConfig, resolveRunOptions } from '../src/app/config';
import { runCaixaPostal } from '../src/app/runCaixaPostal';
import type { ConfigEnvironment, RunLogEntry } from '../src/app/types';
import { IPC_CHANNELS, type AppState, type StartRunResponse } from '../src/shared/ipc';

const CONFIG_DIRECTORY_NAME = 'DTE Caixa Postal';

let mainWindow: BrowserWindow | null = null;
let isRunning = false;
let ipcRegistered = false;

app.whenReady().then(async () => {
  await ensureAppConfig(getConfigEnvironment());
  createMainWindow();
  registerIpc();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: '#f4efe7',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.resolve(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  void mainWindow.loadFile(path.resolve(__dirname, 'index.html'));
}

function registerIpc(): void {
  if (ipcRegistered) {
    return;
  }

  ipcRegistered = true;

  ipcMain.handle(IPC_CHANNELS.getState, async (): Promise<AppState> => buildAppState());

  ipcMain.handle(IPC_CHANNELS.startRun, async (): Promise<StartRunResponse> => {
    if (isRunning) {
      return {
        ok: false,
        error: 'Ja existe uma execucao em andamento.',
      };
    }

    isRunning = true;
    await broadcastState();

    try {
      const { config } = await ensureAppConfig(getConfigEnvironment());
      const result = await runCaixaPostal(resolveRunOptions(config), {
        onLog: (entry) => sendToRenderer(IPC_CHANNELS.runLog, entry),
        onProgress: (progress) => sendToRenderer(IPC_CHANNELS.runProgress, progress),
      });

      return {
        ok: true,
        result,
      };
    } catch (error) {
      const message = formatError(error);
      sendToRenderer<RunLogEntry>(IPC_CHANNELS.runLog, {
        timestamp: new Date().toISOString(),
        level: 'error',
        message,
      });

      return {
        ok: false,
        error: message,
      };
    } finally {
      isRunning = false;
      await broadcastState();
    }
  });

  ipcMain.handle(IPC_CHANNELS.openPath, async (_event, targetPath: string): Promise<void> => {
    if (!targetPath) {
      return;
    }

    try {
      await access(targetPath);
      shell.showItemInFolder(targetPath);
    } catch {
      await shell.openPath(targetPath);
    }
  });
}

function getConfigEnvironment(): ConfigEnvironment {
  return {
    userDataDir: path.resolve(app.getPath('appData'), CONFIG_DIRECTORY_NAME),
    documentsDir: app.getPath('documents'),
    resourcesDir: app.isPackaged ? process.resourcesPath : process.cwd(),
    cwd: process.cwd(),
  };
}

async function buildAppState(): Promise<AppState> {
  const { config, configPath } = await ensureAppConfig(getConfigEnvironment());

  return {
    isRunning,
    configPath,
    outputDir: config.output.dir,
    certificatePath: config.certificate.path,
    certificateUser: config.certificate.user,
    executionStrategy: config.execution.strategy,
  };
}

async function broadcastState(): Promise<void> {
  sendToRenderer<AppState>(IPC_CHANNELS.stateChanged, await buildAppState());
}

function sendToRenderer<T>(channel: string, payload: T): void {
  mainWindow?.webContents.send(channel, payload);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
