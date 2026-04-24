export interface ServiceRequestRow {
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

export type EmpresaBatchItem = ServiceRequestRow;

export type ServiceRequestBatchInput =
  | { serviceRequests: ServiceRequestRow[] }
  | { excelPath: string };

export type BatchInput = { empresas: EmpresaBatchItem[] } | { excelPath: string };

export interface ServiceRequestAttachment {
  fileBuffer: Buffer;
  fileName: string;
}

export interface OpenServiceRequestOptions {
  token: string;
  clientId: string;
  departmentId: string;
  requesterId?: string;
  subject: string;
  description: string;
  attachments?: ServiceRequestAttachment[];
}

export type OpenTicketOptions = OpenServiceRequestOptions;

export interface UploadTicketAttachment extends ServiceRequestAttachment {}

export interface UploadTicketOptions extends OpenServiceRequestOptions {
  attachments: ServiceRequestAttachment[];
}

export interface ServiceRequestIdentifierLookupData {
  clientIdByCode: Map<string, string>;
  requesterIdByName: Map<string, string>;
  departmentIdByName: Map<string, string>;
}

export interface ServiceRequestIdentifierProvider {
  loadLookupData(): Promise<ServiceRequestIdentifierLookupData>;
}

export type ServiceRequestMode = "attachments" | "no-attachments";
export type ServiceRequestAttachmentStrategy = "explicit" | "code-fallback";

export interface ServiceRequestDefaultContent {
  subject?: (row: ServiceRequestRow) => string;
  description?: (row: ServiceRequestRow, context: { attachmentCount: number }) => string;
}

export type SendServiceRequestsProgressEvent =
  | { type: "batch_start"; total: number }
  | {
      type: "item_start";
      index: number;
      total: number;
      row: ServiceRequestRow;
    }
  | {
      type: "item_done";
      index: number;
      total: number;
      row: ServiceRequestRow;
      outcome: "success" | "failed" | "skipped";
      message?: string;
      ticketId?: string;
    };

export interface SendServiceRequestsOptions {
  token: string;
  input: ServiceRequestBatchInput | BatchInput;
  attachmentsDir?: string;
  mode?: ServiceRequestMode;
  attachmentsMode?: "required" | "none";
  attachmentStrategy?: ServiceRequestAttachmentStrategy;
  dryRun?: boolean;
  identifierProvider?: ServiceRequestIdentifierProvider;
  bdApiBaseUrl?: string;
  defaults?: {
    clientId?: string;
    requesterId?: string;
    departmentId?: string;
    departmentName?: string;
  };
  defaultContent?: ServiceRequestDefaultContent;
  /** Absolute or relative paths merged after resolver output (e.g. product-specific extras). */
  extraAttachmentPaths?: string[];
  /** Called once per batch on first HTTP 401; must return a new UDSLongToken. */
  onUnauthorized?: () => Promise<string>;
  /** Optional progress hook (e.g. CLI logging). */
  onProgress?: (event: SendServiceRequestsProgressEvent) => void;
}

export interface UploadOnvioOptions extends SendServiceRequestsOptions {}

export interface ServiceRequestBatchItemResult {
  serviceRequest: ServiceRequestRow;
  status: "success" | "failed" | "skipped";
  message?: string;
  ticketId?: string;
  attachmentCount?: number;
  warnings?: string[];
}

export interface UploadBatchItemResult {
  empresa: EmpresaBatchItem;
  status: "success" | "failed" | "skipped";
  message?: string;
  ticketId?: string;
  attachmentCount?: number;
  warnings?: string[];
}

export interface ServiceRequestBatchResult {
  summary: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
  };
  items: ServiceRequestBatchItemResult[];
  warnings: string[];
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
