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

export type MessagePriority = "critica" | "alta" | "operacional" | "informativa" | "revisar";
export type MessageCategory =
  | "processo_administrativo"
  | "fgts"
  | "credito_do_trabalhador"
  | "igualdade_salarial"
  | "cadastro_det"
  | "informativo"
  | "outro";
export type MessageScienceStatus = "leitura_manual" | "ciencia_por_decurso" | "aguardando_ciencia";
export type MessageDeadlineStatus =
  | "possivelmente_vencido"
  | "vence_em_7_dias"
  | "prazo_futuro"
  | "calculo_manual_necessario"
  | "nao_identificado";

export interface AnalyzedDteMessage extends DteMessage {
  textPlain: string;
  summary: string;
  category: MessageCategory;
  priority: MessagePriority;
  requiresAction: boolean;
  suggestedAction: string;
  responsibleArea: string;
  actionStatus: "a_confirmar" | "somente_ciencia" | "revisao_manual";
  classificationReason: string;
  classificationConfidence: number;
  isUnread: boolean;
  scienceStatus: MessageScienceStatus;
  scienceAt: string;
  deadlineText: string;
  deadlineDate: string;
  deadlineStatus: MessageDeadlineStatus;
}

export type CompanyResultStatus =
  | "processed"
  | "skipped_inactive"
  | "skipped_dominio_inactive"
  | "unauthorized"
  | "failed";

export interface DominioCompany {
  codiEmp: number;
  cnpj: string;
  corporateName: string;
  status: string;
}

export interface ActiveWithoutProcurationRecord {
  codiEmp: number;
  cnpj: string;
  corporateName: string;
}

export interface CompanyResult {
  cnpj: string;
  corporateName: string;
  dominioCode?: number | null;
  dominioStatus?: string | null;
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
  dominioActiveCompanies?: number;
  activeWithoutProcuration?: number;
  skippedDominioInactive?: number;
  processed: number;
  skippedInactive: number;
  unauthorized: number;
  failed: number;
  messages: number;
  unreadMessages: number;
  actionableMessages: number;
  criticalMessages: number;
  highPriorityMessages: number;
  informationalMessages: number;
  tacitScienceMessages: number;
  awaitingScienceMessages: number;
  companiesWithAction: number;
}

export interface RunReport {
  schemaVersion: "2.0";
  collectorVersion: string;
  startedAt: string;
  finishedAt: string;
  timezone: "America/Sao_Paulo";
  summary: RunSummary;
  companies: CompanyResult[];
  messages: AnalyzedDteMessage[];
  failures: FailureRecord[];
  activeWithoutProcuration?: ActiveWithoutProcurationRecord[];
}

export interface AppConfig {
  certificatePath: string;
  certificatePassword: string;
  procuratorCnpj: string;
  outputDir: string;
  captchaTimeoutMs: number;
  requestDelayMs: number;
  browserMode: "cdp" | "playwright";
  dominioDsn: string;
  dominioUser: string;
  dominioPassword?: string;
  filterDominioActive: boolean;
}
