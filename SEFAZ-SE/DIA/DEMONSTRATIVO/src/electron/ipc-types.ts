import type { RunProgress, RunResult } from "../runner";
import type { ReportFormat } from "../types";
import type { XmlDownloadProgress, XmlDownloadResult } from "../xml-downloads";

export type AppDefaults = {
  competencia: string;
  outDir: string;
};

export type StoredCredentials = {
  user: string;
  password: string;
  remembered: boolean;
};

export type StartRunRequest = {
  user: string;
  password: string;
  rememberCredentials: boolean;
  competencia: string;
  formats: ReportFormat[];
  outDir: string;
};

export type StartXmlDownloadRequest = {
  competencia: string;
  outDir: string;
  threads?: number;
  siegApiKey?: string;
};

export type SefazDiaApi = {
  getDefaults(): Promise<AppDefaults>;
  getCredentials(): Promise<StoredCredentials>;
  saveCredentials(credentials: { user: string; password: string }): Promise<void>;
  clearCredentials(): Promise<void>;
  selectOutDir(): Promise<string | undefined>;
  startRun(request: StartRunRequest): Promise<RunResult>;
  cancelRun(): Promise<void>;
  startXmlDownload(request: StartXmlDownloadRequest): Promise<XmlDownloadResult>;
  cancelXmlDownload(): Promise<void>;
  openPath(targetPath: string): Promise<void>;
  onLog(callback: (message: string) => void): () => void;
  onProgress(callback: (progress: RunProgress) => void): () => void;
  onXmlLog(callback: (message: string) => void): () => void;
  onXmlProgress(callback: (progress: XmlDownloadProgress) => void): () => void;
};
