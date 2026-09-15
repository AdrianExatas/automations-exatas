import type { RunProgress, RunResult } from "../runner";

export type AppDefaults = {
  outDir: string;
  headless: boolean;
};

export type StoredCredentials = {
  user: string;
  certPath: string;
  certPassword: string;
  remembered: boolean;
};

export type StartRunRequest = {
  user: string;
  certPath: string;
  certPassword: string;
  rememberCredentials: boolean;
  spreadsheetPath: string;
  outDir: string;
  headless: boolean;
};

export type SefazDiaApi = {
  getDefaults(): Promise<AppDefaults>;
  getCredentials(): Promise<StoredCredentials>;
  saveCredentials(credentials: { user: string; certPath: string; certPassword: string }): Promise<void>;
  clearCredentials(): Promise<void>;
  selectSpreadsheet(): Promise<string | undefined>;
  selectOutDir(): Promise<string | undefined>;
  selectCert(): Promise<string | undefined>;
  startRun(request: StartRunRequest): Promise<RunResult>;
  cancelRun(): Promise<void>;
  openPath(targetPath: string): Promise<void>;
  onLog(callback: (message: string) => void): () => void;
  onProgress(callback: (progress: RunProgress) => void): () => void;
};
