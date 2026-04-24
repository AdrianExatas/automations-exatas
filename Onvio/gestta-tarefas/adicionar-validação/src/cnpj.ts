export interface CnpjNormalizado {
  original: string;
  digitos: string;
  valor: string;
  valido: boolean;
  ajustado: boolean;
}

export function normalizarCnpjDetalhado(val: unknown): CnpjNormalizado {
  const original = val == null ? "" : String(val).trim();
  const digitos = original.replace(/\D/g, "");

  if (!digitos || digitos.length > 14) {
    return {
      original,
      digitos,
      valor: "",
      valido: false,
      ajustado: false,
    };
  }

  const valor = digitos.padStart(14, "0");
  return {
    original,
    digitos,
    valor,
    valido: true,
    ajustado: digitos.length < 14,
  };
}

export function normalizarCnpj(val: unknown): string {
  const { valor, valido } = normalizarCnpjDetalhado(val);
  return valido ? valor : "";
}
