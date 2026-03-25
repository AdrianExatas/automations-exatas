import { contextBridge, ipcRenderer } from 'electron';

import type { RunLogEntry, RunProgress } from '../src/app/types';
import { IPC_CHANNELS, type AppState, type DesktopApi } from '../src/shared/ipc';

function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const wrappedListener = (_event: Electron.IpcRendererEvent, payload: T): void => {
    listener(payload);
  };

  ipcRenderer.on(channel, wrappedListener);
  return () => {
    ipcRenderer.off(channel, wrappedListener);
  };
}

const api: DesktopApi = {
  getState: () => ipcRenderer.invoke(IPC_CHANNELS.getState) as Promise<AppState>,
  startRun: () => ipcRenderer.invoke(IPC_CHANNELS.startRun),
  openPath: async (targetPath: string) => {
    await ipcRenderer.invoke(IPC_CHANNELS.openPath, targetPath);
  },
  onStateChanged: (listener) => subscribe<AppState>(IPC_CHANNELS.stateChanged, listener),
  onRunLog: (listener) => subscribe<RunLogEntry>(IPC_CHANNELS.runLog, listener),
  onRunProgress: (listener) => subscribe<RunProgress>(IPC_CHANNELS.runProgress, listener),
};

contextBridge.exposeInMainWorld('caixaPostalApp', api);
