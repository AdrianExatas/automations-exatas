export type AreaParametrizacao =
  | "dp"
  | "fiscal"
  | "financeiro"
  | "contabil"
  | "sucesso_cliente";

export type RegimeFiscal = "simples_nacional" | "fiscal_normal";

export interface ParametrizacaoInput {
  cnpj: string;
  areas: AreaParametrizacao[];
  regimeFiscal: RegimeFiscal;
  incluirAnuais: boolean;
  planoPremium: boolean;
  supervisor: boolean;
  adicionarAnaliseParcelamentos: boolean;
  uf?: string;
}

export interface TarefaMatriz {
  area: AreaParametrizacao;
  aba: string;
  tarefa: string;
  responsavel: string;
  anual: boolean;
  premium: boolean;
  supervisor: boolean;
  uf?: string;
  linha: number;
}

export interface MatrizPreview {
  tarefas: TarefaMatriz[];
  avisos: string[];
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
  docs?: ClienteGestta[];
  hasNextPage?: boolean;
}

export interface UsuarioGestta {
  _id: string;
  name: string;
  email?: string;
  active?: boolean;
  [key: string]: unknown;
}

export interface DepartamentoGestta {
  _id?: string;
  name?: string;
  [key: string]: unknown;
}

export interface TarefaGestta {
  _id: string;
  name: string;
  type?: string;
  active?: boolean;
  company_department?: DepartamentoGestta;
  [key: string]: unknown;
}

export interface RespostaTarefasGestta {
  docs?: TarefaGestta[];
  hasNextPage?: boolean;
}

export interface VinculoTarefaCliente {
  _id: string;
  company_task?: string | TarefaGestta;
  customer?: string | ClienteGestta;
  company_user?: string | UsuarioGestta;
  approve_type?: string[];
  active?: boolean;
  [key: string]: unknown;
}

export interface ConfiguracaoTarefaCliente {
  _id: string;
  company_task?: string | TarefaGestta;
  company_user?: string | UsuarioGestta;
  customer?: string | ClienteGestta;
  approve_type?: string[];
  active?: boolean;
  [key: string]: unknown;
}

export interface TarefaResolvida extends TarefaMatriz {
  taskId: string;
  taskNomeGestta: string;
  userId: string;
  userNomeGestta: string;
}

export type NivelLog = "info" | "warn" | "error" | "success";

export interface TimelineEvento {
  timestamp: string;
  nivel: NivelLog;
  etapa: string;
  tarefa?: string;
  mensagem: string;
}

export interface ResultadoTarefa {
  area: AreaParametrizacao;
  aba: string;
  tarefaPlanilha: string;
  tarefaGestta?: string;
  taskId?: string;
  responsavelPlanilha: string;
  responsavelGestta?: string;
  userId?: string;
  dryRun: boolean;
  sucesso: boolean;
  jaVinculada: boolean;
  inclusaoSolicitada: boolean;
  patchResponsavel: boolean;
  mensagem: string;
  detalhes: string[];
}

export interface RelatorioExecucao {
  execucao: {
    inicio: string;
    fim: string;
    dryRun: boolean;
    cnpj: string;
    customerId?: string;
    customerName?: string;
    regimeFiscal: RegimeFiscal;
    areas: AreaParametrizacao[];
    totalTarefasCalculadas: number;
    sucesso: number;
    falha: number;
    avisos: string[];
  };
  resultados: ResultadoTarefa[];
  timeline: TimelineEvento[];
}
