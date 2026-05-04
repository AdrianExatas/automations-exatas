import type { RunProgress, RunResult } from "../types";

export type AppDefaults = {
  inputDir: string;
  outputDir: string;
};

export type StartRunRequest = {
  inputDir: string;
  outputDir: string;
};

export type S5002Api = {
  getDefaults(): Promise<AppDefaults>;
  selectInputDir(): Promise<string | undefined>;
  selectOutputDir(): Promise<string | undefined>;
  startRun(request: StartRunRequest): Promise<RunResult>;
  cancelRun(): Promise<void>;
  openPath(targetPath: string): Promise<void>;
  onLog(callback: (message: string) => void): () => void;
  onProgress(callback: (progress: RunProgress) => void): () => void;
};
