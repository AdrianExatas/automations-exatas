export interface LinhaPlanilha {
  cod: string;
  empresa: string;
  cnpj: string;
  tarefa: string;
  responsavel: string;
}

export interface ClienteGestta {
  _id: string;
  cnpj: string;
  name: string;
  code?: string;
  active?: boolean;
  [key: string]: unknown;
}

export interface RespostaClientes {
  docs: ClienteGestta[];
  totalDocs?: number;
  limit?: number;
  page?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface UsuarioGestta {
  _id: string;
  name: string;
  email?: string;
  active?: boolean;
  [key: string]: unknown;
}

export interface FuncionarioLocal {
  employee_id: string;
  name: string;
  email?: string;
  active?: boolean;
  [key: string]: unknown;
}

export interface RespostaFuncionariosLocal {
  data: FuncionarioLocal[];
  total?: number;
  limit?: number;
  offset?: number;
}

export interface DepartamentoGestta {
  _id?: string;
  name?: string;
  [key: string]: unknown;
}

export interface TarefaGestta {
  _id: string;
  name: string;
  type: string;
  active?: boolean;
  subtype?: string;
  frequency?: string;
  group_customer_count?: number;
  company_department?: DepartamentoGestta;
  [key: string]: unknown;
}

export interface RespostaTarefasGestta {
  docs: TarefaGestta[];
  totalDocs?: number;
  limit?: number;
  page?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface VinculoTarefaCliente {
  _id: string;
  company?: string;
  company_task?: string | TarefaGestta;
  customer?: string | ClienteGestta;
  approvers?: unknown[];
  approve_type?: string[];
  active?: boolean;
  [key: string]: unknown;
}

export interface ConfiguracaoTarefaCliente {
  _id: string;
  company?: string;
  company_task?: string | TarefaGestta;
  company_user?: string | UsuarioGestta;
  customer?: string | ClienteGestta;
  approve_type?: string[];
  active?: boolean;
  [key: string]: unknown;
}

export interface PatchResponsavelBody {
  ids: string[];
  company_user: string;
  approve_type: string[];
}

export type OrigemResponsavel = "gestta" | "local-fallback";

export interface TarefaPlanilhaResolvida extends LinhaPlanilha {
  taskId: string;
  taskNomeGestta: string;
  customerId: string;
  customerNomeGestta: string;
  userId: string;
  userNomeGestta: string;
  userOrigem: OrigemResponsavel;
}

export interface LinkResumo {
  id: string;
  customerId: string;
  customerName: string;
  cnpj: string;
  approveType: string[];
  active: boolean;
}

export interface ClienteResumo {
  customerId: string;
  customerName: string;
  cnpj?: string;
  linkId?: string;
}

export interface ResponsavelResolvidoResumo {
  responsavel: string;
  userId: string;
  origem: OrigemResponsavel;
}

export interface PendenciaConfiguracao {
  customerId: string;
  customerName: string;
  cnpj?: string;
}

export interface DivergenciaResponsavel {
  customerId: string;
  customerName: string;
  cnpj?: string;
  expectedUserId: string;
  expectedUserName: string;
  currentUserId?: string;
  currentUserName?: string;
}

export interface DiagnosticoHttpEmpresa {
  customerId: string;
  customerName: string;
  cnpj?: string;
  etapa: "aguardar-configuracao" | "aguardar-propagacao";
  tentativas: number;
  ultimoErro: string;
}

export type NivelLog = "info" | "warn" | "error" | "success";

export type EtapaLog =
  | "preflight"
  | "iniciar"
  | "listar-vinculos"
  | "adicionar-empresas"
  | "aguardar-configuracao"
  | "alterar-responsavel"
  | "aguardar-propagacao"
  | "remover-extras"
  | "finalizar";

export interface ProgressoLogEvento {
  timestamp: string;
  nivel: NivelLog;
  etapa: EtapaLog;
  tarefa: string;
  taskIndex?: number;
  taskTotal?: number;
  companyIndex?: number;
  companyTotal?: number;
  customerId?: string;
  customerName?: string;
  cnpj?: string;
  mensagem: string;
}

export interface ProgressoEtapasResumo {
  inclusoesSolicitadas: number;
  configuracoesConfirmadas: number;
  responsaveisValidados: number;
  empresasComErro: number;
}

export interface ConfiguracaoResumo {
  linkId: string;
  customerId: string;
  taskId: string;
  taskName: string;
  companyUserId?: string;
  companyUserName?: string;
  approveType: string[];
  active: boolean;
}

export interface NecessidadePatch {
  linkId?: string;
  customerId: string;
  customerName: string;
  desiredUserId: string;
  desiredUserName: string;
  currentUserId?: string;
  approveType: string[];
}

export interface GrupoPatchPlanejado {
  companyUserId: string;
  companyUserName: string;
  approveType: string[];
  ids: string[];
  customerIds: string[];
}

export interface DiffVinculos {
  extras: LinkResumo[];
  missing: TarefaPlanilhaResolvida[];
  presentes: LinkResumo[];
}

export type EtapaFalha =
  | "preflight"
  | "listarVinculosAtuais"
  | "adicionarAusentes"
  | "aguardarConfiguracoes"
  | "alterarResponsavel"
  | "aguardarResponsavel"
  | "removerExtras";

export interface ResultadoTarefa {
  tarefaPlanilha: string;
  tarefaGestta?: string;
  taskId?: string;
  dryRun: boolean;
  sucesso: boolean;
  totalEmpresasPlanilha: number;
  vinculosAtuais: number;
  vinculosFinais?: number;
  extras: number;
  inclusoes: number;
  patchLinks: number;
  patchGrupos: number;
  mensagem: string;
  etapaFalha?: EtapaFalha;
  detalhes: string[];
  responsaveisResolvidos?: ResponsavelResolvidoResumo[];
  vinculosAtuaisDetalhes?: LinkResumo[];
  extrasPlanejados?: LinkResumo[];
  inclusoesSolicitadas?: ClienteResumo[];
  vinculosEncontradosNaTarefa?: ClienteResumo[];
  clientesAusentesNaTarefa?: ClienteResumo[];
  pendenciasConfiguracao?: PendenciaConfiguracao[];
  pendenciasValidacaoResponsavel?: ClienteResumo[];
  divergenciasResponsavel?: DivergenciaResponsavel[];
  extrasRemovidos?: LinkResumo[];
  falhasHttp?: DiagnosticoHttpEmpresa[];
  timeline?: ProgressoLogEvento[];
  progressoEtapas?: ProgressoEtapasResumo;
}

export interface GrupoTarefaResolvida {
  taskId: string;
  taskNomePlanilha: string;
  taskNomeGestta: string;
  itens: TarefaPlanilhaResolvida[];
}

export interface ResumoPreflight {
  totalLinhasPlanilha: number;
  totalTarefas: number;
  totalEmpresas: number;
}
