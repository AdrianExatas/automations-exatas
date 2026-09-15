export type DocumentStatus =
  | "pending"
  | "validating"
  | "ready"
  | "processing"
  | "completed"
  | "pending_review"
  | "failed"
  | "canceled";

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationMessage {
  code: string;
  severity: ValidationSeverity;
  message: string;
}

export interface CompanyReference {
  id: string;
  onvioId?: string;
  name: string;
  cnpj?: string;
  cpf?: string;
  code?: string;
}

export interface TaskReference {
  id: string;
  name: string;
  competence?: string;
  status: "open" | "completed";
  company: CompanyReference;
  companyDocumentId?: string;
  companyDocumentName?: string;
}

export interface DocumentInspection {
  id: string;
  filePath: string;
  fileName: string;
  size: number;
  sha256: string;
  pageCount?: number;
  textLength: number;
  extractedDueDate?: string;
  dueDateCandidates: string[];
  competence?: string;
  competenceSources: string[];
  extractedCnpj?: string;
  extractedIdentifierType?: CompanyIdentifierType;
  extractedIdentifierValue?: string;
  cnpjCandidates: string[];
  extractedCompanyName?: string;
  documentKind?: DocumentKind;
  company?: CompanyReference;
  companyCandidates?: CompanyReference[];
  task?: TaskReference;
  taskCandidates?: TaskReference[];
  status: DocumentStatus;
  messages: ValidationMessage[];
  duplicate: boolean;
}

export interface DocumentConfirmation {
  id: string;
  sha256: string;
  companyId: string;
  taskId: string;
  confirmedDueDate: string;
  dueDateConfirmed: boolean;
  companyConfirmed: boolean;
  taskConfirmed: boolean;
}

export interface ExecutionItemResult {
  id: string;
  fileName: string;
  sha256: string;
  status: Extract<DocumentStatus, "completed" | "pending_review" | "failed" | "canceled">;
  company?: CompanyReference;
  task?: TaskReference;
  confirmedDueDate?: string;
  attachmentId?: string;
  publicationCorrelationId?: string;
  portalDocumentId?: string;
  portalFolderId?: string;
  calendarResult?: CalendarUpdateResult;
  message: string;
  startedAt: string;
  finishedAt: string;
}

export interface BatchExecutionReport {
  executionId: string;
  startedAt: string;
  finishedAt: string;
  canceled: boolean;
  totals: {
    selected: number;
    completed: number;
    pendingReview: number;
    failed: number;
    canceled: number;
  };
  items: ExecutionItemResult[];
}

export interface IntegrationStatus {
  available: boolean;
  mode: "verified" | "demo" | "unavailable";
  reason?: string;
  contractVersion?: string;
  capabilities?: IntegrationCapabilities;
}

export interface IntegrationCapabilities {
  companyLookup: boolean;
  taskLookup: boolean;
  taskCompletion: boolean;
  portalPublication: boolean;
  dueDateUpdate: boolean;
}

export interface CompanyResolutionInput {
  identifierType: CompanyIdentifierType;
  identifierValue: string;
  extractedCompanyName?: string;
  preferredCompanyId?: string;
}

export type CompanyIdentifierType = "cnpj" | "cnpj_root" | "cpf";

export interface CompanyResolver {
  status(): IntegrationStatus;
  findCompanies(input: CompanyResolutionInput): Promise<CompanyReference[]>;
  resolveCompany(input: CompanyResolutionInput): Promise<CompanyReference>;
}

export interface TaskResolutionInput {
  filePath: string;
  fileName: string;
  sha256: string;
  competence?: string;
  dueDate?: string;
  company: CompanyReference;
  documentKind?: DocumentKind;
  extractedText: string;
  preferredTaskId?: string;
}

export interface CompletionResult {
  attachmentId: string;
  publicationCorrelationId: string;
}

export interface TaskDocumentAttachment {
  present: boolean;
  fileName?: string;
}

export interface TaskDocumentSlot {
  id: string;
  name: string;
  present: boolean;
}

export interface PublishedDocument {
  id: string;
  folderId: string;
  projectId?: string;
  dueDate?: string;
  shownInTaxCalendar?: boolean;
}

export interface CalendarUpdateResult {
  documentId: string;
  dueDate: string;
  shownInTaxCalendar: boolean;
}

export interface ExpressDocumentsGateway {
  status(): IntegrationStatus;
  findTasks(input: TaskResolutionInput): Promise<TaskReference[]>;
  resolveTask(input: TaskResolutionInput): Promise<TaskReference>;
  completeTaskWithDocument(input: {
    task: TaskReference;
    filePath: string;
    sha256: string;
  }): Promise<CompletionResult>;
  getTaskStatus(task: TaskReference): Promise<"open" | "completed">;
  getTaskDocumentAttachment(task: TaskReference): Promise<TaskDocumentAttachment>;
  listTaskDocumentSlots(task: TaskReference): Promise<TaskDocumentSlot[]>;
  findPublishedDocument(input: {
    task: TaskReference;
    fileName: string;
    sha256: string;
    publicationCorrelationId?: string;
  }): Promise<PublishedDocument | undefined>;
  waitForPublishedDocument(input: {
    task: TaskReference;
    fileName: string;
    sha256: string;
    publicationCorrelationId: string;
  }): Promise<PublishedDocument>;
  setDocumentDueDate(input: {
    company: CompanyReference;
    document: PublishedDocument;
    dueDate: string;
    showInTaxCalendar: true;
  }): Promise<CalendarUpdateResult>;
}
import type { DocumentKind } from "./document-identity";
