import { ClienteGestta, EmpresaGesttaResolvida } from "./types";
import { normalizarCnpj } from "./utils";

export function resolverClientePorCnpj(clientes: ClienteGestta[], cnpj: string): ClienteGestta {
  const normalized = normalizarCnpj(cnpj);
  const matches = clientes.filter((cliente) => normalizarCnpj(cliente.cnpj) === normalized);

  if (matches.length === 1) return matches[0];
  if (matches.length === 0) throw new Error(`Cliente nao encontrado no Gestta para CNPJ ${normalized}.`);
  throw new Error(`CNPJ ${normalized} retornou ${matches.length} clientes no Gestta.`);
}

export function identificarEmpresaGestta(cliente: ClienteGestta): EmpresaGesttaResolvida {
  return {
    id: cliente._id,
    name: cliente.name,
    cnpj: normalizarCnpj(cliente.cnpj),
  };
}
