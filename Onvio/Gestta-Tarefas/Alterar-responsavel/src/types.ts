/**
 * Tipos da planilha e respostas da API Gestta.
 */

/** Uma linha da planilha DP RESPONSÁVEL.xlsx (após normalização). */
export interface LinhaPlanilha {
  cod: string;
  cnpj: string;
  responsavel: string;
  mesGeracao: { month: number; year: number };
  /** Nome do departamento (ex.: Pessoal, Fiscal) – define o setor para alterar responsável. */
  departamento?: string;
  setor?: string;
}

/** Cliente retornado pelo GET admin/customer. */
export interface ClienteGestta {
  _id: string;
  cnpj: string;
  name: string;
  code?: string;
  active?: boolean;
  [key: string]: unknown;
}

/** Resposta paginada de clientes. */
export interface RespostaClientes {
  docs: ClienteGestta[];
  totalDocs?: number;
  limit?: number;
  page?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

/** Usuário/funcionário retornado pelo GET admin/company/user. */
export interface UsuarioGestta {
  _id: string;
  name: string;
  email?: string;
  active?: boolean;
  [key: string]: unknown;
}

/** Body do PATCH admin/group/customer/config. */
export interface PatchResponsavelBody {
  ids: string[];
  company_user: string;
}

/** Body do DELETE/POST task-gen/admin/customer/:customerId. */
export interface TaskGenBody {
  month: number;
  year: number;
}

/** Etapa em que ocorreu falha (para diagnóstico de 404 etc.). */
export type EtapaFalha =
  | "buscarCliente"
  | "buscarUsuario"
  | "groupCustomerIds"
  | "patchResponsavel"
  | "removerTarefas"
  | "gerarTarefas";

/** Resultado do processamento de uma linha. */
export interface ResultadoLinha {
  linha: LinhaPlanilha;
  sucesso: boolean;
  customerId?: string;
  userId?: string;
  groupIds?: string[];
  mensagem: string;
  erro?: string;
  /** Preenchido quando há falha: indica em qual etapa a requisição falhou (ex.: 404). */
  etapaFalha?: EtapaFalha;
}
