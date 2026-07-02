import type { SupportedEventType } from "./xml";

export type RunConfig = {
  inputDir: string;
  outputDir: string;
};

export type EventCounts = {
  s5002: number;
  s2501: number;
};

export type RunCallbacks = {
  signal?: AbortSignal;
  onLog?: (message: string) => void;
  onProgress?: (progress: RunProgress) => void;
};

export type RunProgress = {
  phase: "descobrindo" | "processando" | "relatorio" | "concluido";
  message: string;
  current: number;
  total: number;
  successCount: number;
  errorCount: number;
  ignoredCount: number;
  eventXmlCount: number;
  eventCounts: EventCounts;
  processedCount: number;
  outputDir: string;
  excelPath?: string;
  jsonPath?: string;
};

export type DetailStatus = "sucesso" | "erro";

export type DetailErrorCode =
  | "zip_invalido"
  | "xml_invalido"
  | "cpf_ausente"
  | "multiplos_cpfs"
  | "periodo_ausente"
  | "gravacao_falhou";

export type DetailEntry = {
  ordem: number;
  status: DetailStatus;
  eventType?: SupportedEventType;
  sourceZip: string;
  sourceEntry?: string;
  cpf?: string;
  perApur?: string;
  outputPath?: string;
  errorCode?: DetailErrorCode;
  message?: string;
};

export type RunResult = {
  inputDir: string;
  outputDir: string;
  excelPath: string;
  jsonPath: string;
  zipCount: number;
  eventXmlCount: number;
  eventCounts: EventCounts;
  ignoredCount: number;
  successCount: number;
  errorCount: number;
  entries: DetailEntry[];
};
