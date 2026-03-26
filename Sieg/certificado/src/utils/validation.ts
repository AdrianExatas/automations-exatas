/**
 * Utilitários de validação compartilhados.
 */

/**
 * Remove caracteres não numéricos de uma string.
 */
export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/**
 * Valida se um CNPJ é válido (14 dígitos + dígitos verificadores).
 */
export function validarCnpj(cnpj: string): boolean {
  const digitos = somenteDigitos(cnpj);
  if (digitos.length !== 14) return false;
  if (/^(\d)\1+$/.test(digitos)) return false;

  const calcularDigito = (base: string, pesos: number[]): number => {
    let soma = 0;
    for (let i = 0; i < pesos.length; i++) {
      soma += parseInt(base[i], 10) * pesos[i];
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const base = digitos.slice(0, 12);
  const d1 = calcularDigito(base, pesos1);
  const d2 = calcularDigito(base + d1, pesos2);

  return digitos === base + d1 + d2;
}

/**
 * Formata um CNPJ para o padrão XX.XXX.XXX/XXXX-XX.
 */
export function formatarCnpj(cnpj: string): string {
  const digitos = somenteDigitos(cnpj);
  if (digitos.length !== 14) return cnpj;
  return digitos.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}
