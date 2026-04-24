export type ModoExecucao = "dry-run" | "apply";

export interface LinhaPlanilha {
  numero: string;
  empresa: string;
  cnpj: string;
  cnpjOriginal?: string;
  cnpjFoiAjustado?: boolean;
  cnpjInvalido?: boolean;
  setor: string;
  responsavel: string;
  validador: string;
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

export interface PatchValidacaoBody {
  ids: string[];
  approvers: string[];
  approve: true;
  approve_type: string[];
}

export type EtapaFalha =
  | "conflitoDuplicidade"
  | "validarCnpj"
  | "buscarCliente"
  | "buscarAprovador"
  | "groupCustomerIds"
  | "semGroupCustomer"
  | "patchValidacao";

export interface ResultadoLinha {
  linha: LinhaPlanilha;
  sucesso: boolean;
  customerId?: string;
  approverId?: string;
  groupIds?: string[];
  mensagem: string;
  erro?: string;
  etapaFalha?: EtapaFalha;
}

export interface LinhaConflitoDuplicidade {
  linha: LinhaPlanilha;
  mensagem: string;
}
