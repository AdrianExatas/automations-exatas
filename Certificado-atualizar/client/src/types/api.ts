export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  mensagem?: string;
  error?: string;
  errors?: string[];
}

export interface ExtrairCnpjData {
  cnpj: string;
}

export interface CertificadoSieg {
  Id?: number | string;
  id?: number | string;
  CertificadoId?: number | string;
  certificadoId?: number | string;
  Nome?: string;
  nome?: string;
  CnpjCpf?: string;
  cnpjCpf?: string;
}

export interface DefaultsUnecont {
  email: string;
  senha: string;
}

export interface DefaultsOnvio {
  email: string;
  senha: string;
  cnpj: string;
}

/** Estado compartilhado dos formulários de automação (UNECONT/ONVIO). */
export interface CertificadoFormState {
  email: string;
  senha: string;
  cnpj: string;
  certificadoFile: File | null;
  senhaCertificado: string;
}
