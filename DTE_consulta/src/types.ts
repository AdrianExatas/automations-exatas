export type ProcurationStatus = "active" | "inactive" | "unknown";

export interface ProcurationTarget {
  cnpj: string;
  corporateName: string;
  rawStatus: string;
  status: ProcurationStatus;
}

export interface DteMessage {
  cnpj: string;
  corporateName: string;
  uid: string;
  title: string;
  text: string;
  sender: string;
  type: string;
  situation: string;
  archived: boolean | null;
  createdAt: string;
  readAt: string;
  readByDeadlineAt: string;
  sourceSystem: string;
}

export type CompanyResultStatus =
  | "processed"
  | "skipped_inactive"
  | "unauthorized"
  | "failed";

export interface CompanyResult {
  cnpj: string;
  corporateName: string;
  procurationStatus: string;
  authorizedDet: boolean | null;
  totalMessages: number;
  unreadMessages: number | null;
  status: CompanyResultStatus;
  error: string;
}

export type FailureStage =
  | "config"
  | "spe_auth"
  | "spe_list"
  | "dte_auth"
  | "dte_permission"
  | "dte_mailbox"
  | "report";

export type FailureCategory =
  | "authentication"
  | "authorization"
  | "network"
  | "rate_limit"
  | "server"
  | "invalid_response"
  | "unknown";

export interface FailureRecord {
  cnpj: string;
  corporateName: string;
  stage: FailureStage;
  category: FailureCategory;
  httpStatus: number | null;
  message: string;
  retryable: boolean;
}

export interface RunSummary {
  procurationsFound: number;
  processed: number;
  skippedInactive: number;
  unauthorized: number;
  failed: number;
  messages: number;
  unreadMessages: number;
}

export interface RunReport {
  schemaVersion: "1.0";
  collectorVersion: string;
  startedAt: string;
  finishedAt: string;
  timezone: "America/Sao_Paulo";
  summary: RunSummary;
  companies: CompanyResult[];
  messages: DteMessage[];
  failures: FailureRecord[];
}

export interface AppConfig {
  certificatePath: string;
  certificatePassword: string;
  procuratorCnpj: string;
  outputDir: string;
  captchaTimeoutMs: number;
  requestDelayMs: number;
}
