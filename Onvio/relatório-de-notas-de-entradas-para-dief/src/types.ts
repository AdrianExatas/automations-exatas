export const COLUNAS_SAIDA = [
  "UF Emit.",
  "Cnpj Emit.",
  "Razao Social Emit.",
  "CNPJ Dest.",
  "IE Dest.",
  "Razao Social Dest",
  "Numero",
  "Data Emissao",
  "Valor N.F.",
  "Chave Acesso",
  "Recebida ",
  "Finalidade dos produtos ",
] as const;

export type ColunaSaida = (typeof COLUNAS_SAIDA)[number];

export type LinhaEntrada = Record<string, unknown>;

export type LinhaSaida = Record<ColunaSaida, string | number>;

export const COLUNAS_ENTRADA_OBRIGATORIAS = [
  "UF Emit.",
  "Cnpj Emit.",
  "Razao Social Emit.",
  "CNPJ Dest.",
  "IE Dest.",
  "Razao Social Dest",
  "Numero",
  "Data Emissao",
  "Valor N.F.",
  "Chave Acesso",
] as const;

export const MAPEAMENTO_ENTRADA_PARA_SAIDA: Record<
  (typeof COLUNAS_ENTRADA_OBRIGATORIAS)[number],
  ColunaSaida
> = {
  "UF Emit.": "UF Emit.",
  "Cnpj Emit.": "Cnpj Emit.",
  "Razao Social Emit.": "Razao Social Emit.",
  "CNPJ Dest.": "CNPJ Dest.",
  "IE Dest.": "IE Dest.",
  "Razao Social Dest": "Razao Social Dest",
  Numero: "Numero",
  "Data Emissao": "Data Emissao",
  "Valor N.F.": "Valor N.F.",
  "Chave Acesso": "Chave Acesso",
};

export class PlanilhaEntradaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanilhaEntradaError";
  }
}
