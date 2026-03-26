import type { ExecutionStrategy, RunLogEntry, RunProgress, RunResult } from '../app/types';

export const IPC_CHANNELS = {
  getState: 'app:get-state',
  startRun: 'app:start-run',
  openPath: 'app:open-path',
  stateChanged: 'app:state-changed',
  runLog: 'app:run-log',
  runProgress: 'app:run-progress',
} as const;

export interface AppState {
  isRunning: boolean;
  configPath: string;
  outputDir: string;
  certificatePath: string;
  certificateUser: string;
  executionStrategy: ExecutionStrategy;
}

export interface StartRunResponse {
  ok: boolean;
  result?: RunResult;
  error?: string;
}

export interface DesktopApi {
  getState: () => Promise<AppState>;
  startRun: () => Promise<StartRunResponse>;
  openPath: (targetPath: string) => Promise<void>;
  onStateChanged: (listener: (state: AppState) => void) => () => void;
  onRunLog: (listener: (entry: RunLogEntry) => void) => () => void;
  onRunProgress: (listener: (progress: RunProgress) => void) => () => void;
}
