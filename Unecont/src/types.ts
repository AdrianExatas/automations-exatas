export interface EmpresaBatchItem {
  cnpj: string;
  codigo: string;
  nome: string;
  solicitante: string;
  departamento: string;
  assunto: string;
  descricao: string;
  qtdArquivos?: number;
  arquivos: string[];
  onvioClientId?: string;
  onvioRequesterId?: string;
  onvioDepartmentId?: string;
}

export type BatchInput = { empresas: EmpresaBatchItem[] } | { excelPath: string };

export type DownloadLogger = Pick<Console, "info" | "warn" | "error">;

export interface ReportFormattingOptions {
  enabled?: boolean;
  modelPath?: string;
  serviceMapPath?: string;
  overwrite?: boolean;
}

export interface ReportValidationIssue {
  rowNumber: number;
  serviceItem: string;
  reason: "missing_mapped" | "missing_unmapped" | "ambiguous";
}

export interface ReportValidationResult {
  filledCount: number;
  missingMappedCount: number;
  missingUnmappedCount: number;
  issues: ReportValidationIssue[];
}

export interface DownloadUnecontOptions {
  credentials: {
    email: string;
    senha: string;
  };
  input: BatchInput;
  browser?: {
    headless?: boolean;
    downloadDir?: string;
  };
  checkpointPath?: string;
  logger?: DownloadLogger;
  reportFormatting?: ReportFormattingOptions;
  timeouts?: {
    defaultTimeoutSeconds?: number;
    shortTimeoutSeconds?: number;
    longTimeoutSeconds?: number;
  };
  loginUrl?: string;
  servicosTomadosUrl?: string;
}

export interface UploadOnvioOptions {
  token: string;
  input: BatchInput;
  attachmentsDir: string;
  bdApiBaseUrl?: string;
  defaults?: {
    clientId?: string;
    requesterId?: string;
    departmentId?: string;
    departmentName?: string;
  };
}

export interface DownloadBatchItemResult {
  empresa: EmpresaBatchItem;
  status: "success" | "no_notas" | "not_found" | "failed" | "skipped";
  message?: string;
  filePath?: string;
}

export interface DownloadBatchResult {
  runId: string;
  downloadsDir: string;
  summary: {
    total: number;
    success: number;
    noNotas: number;
    notFound: number;
    failed: number;
    skipped: number;
  };
  items: DownloadBatchItemResult[];
}

export interface ReformatDownloadedReportsOptions {
  downloadsDir: string;
  outputDir?: string;
  modelPath: string;
  serviceMapPath: string;
  overwrite?: boolean;
  logger?: DownloadLogger;
}

export interface ReformatDownloadedReportItemResult extends ReportValidationResult {
  filePath: string;
  status: "success" | "failed";
  warnings: string[];
  message?: string;
}

export interface ReformatDownloadedReportsResult {
  downloadsDir: string;
  outputDir: string;
  summary: {
    total: number;
    success: number;
    failed: number;
  };
  items: ReformatDownloadedReportItemResult[];
}

export interface UploadBatchItemResult {
  empresa: EmpresaBatchItem;
  status: "success" | "failed" | "skipped";
  message?: string;
  ticketId?: string;
  attachmentCount?: number;
  warnings?: string[];
}

export interface UploadBatchResult {
  summary: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
  };
  items: UploadBatchItemResult[];
  warnings: string[];
}
