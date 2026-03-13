/**
 * Retorna apenas os dígitos da string (remove pontuação).
 */
export function onlyDigits(s: string): string {
  return (s || '').replace(/\D/g, '');
}

/**
 * Regex que casa o CNPJ na tabela (formatado como 10.485.182/0001-91).
 */
export function cnpjNaTabelaRegex(cnpjDigits: string): RegExp {
  if (cnpjDigits.length < 14) return new RegExp(onlyDigits(cnpjDigits));
  const a = cnpjDigits.slice(0, 2),
    b = cnpjDigits.slice(2, 5),
    c = cnpjDigits.slice(5, 8);
  const d = cnpjDigits.slice(8, 12),
    e = cnpjDigits.slice(12, 14);
  return new RegExp(a + '[.]?' + b + '[.]?' + c + '[/]?' + d + '[-]?' + e);
}
