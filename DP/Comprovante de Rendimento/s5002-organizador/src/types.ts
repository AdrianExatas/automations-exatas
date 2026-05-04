export type RunConfig = {
  inputDir: string;
  outputDir: string;
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
  s5002Count: number;
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
  | "periodo_ausente"
  | "gravacao_falhou";

export type DetailEntry = {
  ordem: number;
  status: DetailStatus;
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
  s5002Count: number;
  ignoredCount: number;
  successCount: number;
  errorCount: number;
  entries: DetailEntry[];
};
