import type { RunProgress, RunResult } from "../runner";
import type { ReportFormat } from "../types";
import type { XmlDownloadProgress, XmlDownloadResult } from "../xml-downloads";

export type AppDefaults = {
  competencia: string;
  outDir: string;
  alterarOutDir: string;
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
  competencia: string;
  formats: ReportFormat[];
  outDir: string;
  checkpointEnabled?: boolean;
};

export type StartXmlDownloadRequest = {
  competencia: string;
  outDir: string;
  threads?: number;
  siegApiKey?: string;
  checkpointEnabled?: boolean;
};

export type StartAlterarRunRequest = {
  user: string;
  certPath: string;
  certPassword: string;
  rememberCredentials: boolean;
  spreadsheetPath: string;
  outDir: string;
  headless: boolean;
};

/** Espelho do progresso do runner Alterar Nota (sem importar o sibling no preload). */
export type AlterarRunProgress = {
  phase: string;
  current: number;
  total: number;
  message: string;
  successCount: number;
  errorCount: number;
  processedCount: number;
  outDir: string;
  jsonPath: string;
  excelPath: string;
};

export type AlterarRunResult = {
  entries: unknown[];
  successCount: number;
  errorCount: number;
  jsonPath: string;
  excelPath: string;
  outDir: string;
};

export type SefazDiaApi = {
  getDefaults(): Promise<AppDefaults>;
  getCredentials(): Promise<StoredCredentials>;
  saveCredentials(credentials: { user: string; certPath: string; certPassword: string }): Promise<void>;
  clearCredentials(): Promise<void>;
  selectOutDir(): Promise<string | undefined>;
  selectCert(): Promise<string | undefined>;
  selectSpreadsheet(): Promise<string | undefined>;
  startRun(request: StartRunRequest): Promise<RunResult>;
  cancelRun(): Promise<void>;
  startXmlDownload(request: StartXmlDownloadRequest): Promise<XmlDownloadResult>;
  cancelXmlDownload(): Promise<void>;
  startAlterarRun(request: StartAlterarRunRequest): Promise<AlterarRunResult>;
  cancelAlterarRun(): Promise<void>;
  openPath(targetPath: string): Promise<void>;
  onLog(callback: (message: string) => void): () => void;
  onProgress(callback: (progress: RunProgress) => void): () => void;
  onXmlLog(callback: (message: string) => void): () => void;
  onXmlProgress(callback: (progress: XmlDownloadProgress) => void): () => void;
  onAlterarLog(callback: (message: string) => void): () => void;
  onAlterarProgress(callback: (progress: AlterarRunProgress) => void): () => void;
};
