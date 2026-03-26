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

export interface UploadTicketAttachment {
  fileBuffer: Buffer;
  fileName: string;
}

export interface UploadTicketOptions {
  token: string;
  clientId: string;
  departmentId: string;
  requesterId?: string;
  subject: string;
  description: string;
  attachments: UploadTicketAttachment[];
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
