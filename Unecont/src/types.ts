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
  onvioClientSource?: string;
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
  outputDir?: string;
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

export interface DownloadEmpresasUnecontOptions {
  credentials: {
    email: string;
    senha: string;
  };
  browser?: {
    headless?: boolean;
  };
  outputDir?: string;
  empresasUrl?: string;
  reportName?: string;
  logger?: DownloadLogger;
  timeouts?: {
    defaultTimeoutSeconds?: number;
    shortTimeoutSeconds?: number;
    longTimeoutSeconds?: number;
  };
  loginUrl?: string;
}

export interface DownloadEmpresasUnecontResult {
  outputDir: string;
  filePath: string;
  reportName: string;
  sizeBytes: number;
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
  normalizedDir?: string;
  reportPath?: string;
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
  resolvedRequesterId?: string;
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

export interface CompareEmpresasPlanilhasOptions {
  atualizadaPath: string;
  operacionalPath: string;
  outputDir?: string;
  /** Codigos de onboarding do mes vigente (Bitrix); ficam fora da planilha final. */
  excludedCodes?: readonly string[];
  clientUsersProvider?: ClientUsersProvider;
  logger?: Pick<Console, "info" | "warn" | "error">;
}

export interface EmpresaComparisonRow {
  cnpj: string;
  codigo: string;
  nome: string;
}

export interface EmpresaChangedRow {
  cnpj: string;
  oldCnpj: string;
  newCnpj: string;
  oldCodigo: string;
  newCodigo: string;
  oldNome: string;
  newNome: string;
}

export interface EmpresaCodigoConflict {
  codigo: string;
  operacionalCnpj: string;
  operacionalNome: string;
  atualizadaCnpj: string;
  atualizadaNome: string;
}

export interface ClientUserLookupRequest {
  codigo: string;
  cnpj: string;
  nome: string;
  /** Client id do Onvio (ex.: mapeamento BD); reservado para consultas futuras. */
  onvioClientId?: string;
}

export interface ClientUser {
  nome: string;
  email?: string;
  id?: string;
}

export interface ClientUserLookupResult {
  users: ClientUser[];
  warnings?: string[];
}

export interface ClientUsersProvider {
  lookupUsers(request: ClientUserLookupRequest): Promise<ClientUser[] | ClientUserLookupResult>;
}

export type OnvioCompanyStatus = "ATIVO" | "INATIVO" | "LOCALIZADO_SEM_STATUS" | "NAO_LOCALIZADO";

export interface OnvioCompanyLookupRequest {
  codigo: string;
  cnpj: string;
  nome: string;
}

export interface OnvioCompanyLookupResult {
  codigo: string;
  clientId?: string;
  status: OnvioCompanyStatus;
  fonte?: "client-core-ativo" | "client-core" | "core-v3";
  mensagem?: string;
}

export interface OnvioCompaniesProvider {
  lookupCompany(request: OnvioCompanyLookupRequest): Promise<OnvioCompanyLookupResult>;
}

export type ClientUserLookupStatus =
  | "preenchido_unico"
  | "multipla_escolha"
  | "responsavel_corrigido_unico"
  | "responsavel_invalido_multipla_escolha"
  | "nenhum_usuario"
  | "erro_consulta";

export interface ClientUserLookupReportRow {
  codigo: string;
  cnpj: string;
  nome: string;
  usuariosCliente: string;
  qtdUsuariosCliente: number;
  statusUsuariosCliente: ClientUserLookupStatus;
  mensagem?: string;
}

export interface CompareEmpresasPlanilhasResult {
  outputDir: string;
  reportPath: string;
  finalPlanilhaPath: string;
  summary: {
    atualizadas: number;
    excluidasPorCompetencia: number;
    operacionais: number;
    final: number;
    novas: number;
    removidas: number;
    alteradas: number;
    conflitosCodigo: number;
    usuariosConsultados: number;
    usuariosPreenchidos: number;
    usuariosMultiplaEscolha: number;
    usuariosNaoEncontrados: number;
    usuariosComErro: number;
  };
  novas: EmpresaComparisonRow[];
  excluidasPorCompetencia: EmpresaComparisonRow[];
  removidas: EmpresaComparisonRow[];
  alteradas: EmpresaChangedRow[];
  conflitosCodigo: EmpresaCodigoConflict[];
  usuariosCliente: ClientUserLookupReportRow[];
}

export interface UpdatePlanilhaOperacionalOptions {
  credentials: {
    email: string;
    senha: string;
  };
  browser?: {
    headless?: boolean;
  };
  operacionalPath?: string;
  outputDir?: string;
  publishDir?: string;
  referenceMonth?: string;
  force?: boolean;
  empresasUrl?: string;
  empresasReportName?: string;
  bitrixCompetenciasUrl?: string;
  bitrixAccountingUrl?: string;
  accountingCompaniesPath?: string;
  clientUsersProvider?: ClientUsersProvider;
  onvioCompaniesProvider?: OnvioCompaniesProvider;
  logger?: Pick<Console, "info" | "warn" | "error">;
  timeouts?: {
    defaultTimeoutSeconds?: number;
    shortTimeoutSeconds?: number;
    longTimeoutSeconds?: number;
  };
  loginUrl?: string;
  now?: Date;
}

export interface UpdatePlanilhaOperacionalResult {
  outputDir: string;
  baseUnecontPath: string;
  bitrixCompetenciasPath?: string;
  bitrixAccountingPath?: string;
  onvioCompaniesReportPath?: string;
  operacionalPath: string;
  reportPath: string;
  runtimePlanilhaPath: string;
  publishedPlanilhaPath: string;
  referenceMonth: string;
  summary: CompareEmpresasPlanilhasResult["summary"];
}
