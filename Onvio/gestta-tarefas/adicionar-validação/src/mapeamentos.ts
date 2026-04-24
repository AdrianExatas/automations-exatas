import { AxiosInstance } from "axios";
import {
  getGroupCustomerIds,
  listarClientes,
  listarFuncionarios,
} from "./api/endpoints";
import { getCompanyByCnpjFromLocalApi, getDepartmentsFromLocalApi } from "./api/local-api-3001";
import { ClienteGestta, UsuarioGestta } from "./types";
import { normalizarCnpj } from "./cnpj";

export function normalizarNome(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

let cacheClientes: ClienteGestta[] | null = null;
let cacheUsuariosByNome: Map<string, UsuarioGestta[]> | null = null;
let cacheNomesSetor: string[] | null = null;

export async function buscarClientePorCnpj(
  client: AxiosInstance,
  cnpj: string,
): Promise<ClienteGestta | null> {
  const cnpjNorm = normalizarCnpj(cnpj);
  if (!cnpjNorm) return null;

  const localApiUrl = process.env.API_3001_URL?.trim();
  if (localApiUrl) {
    const local = await getCompanyByCnpjFromLocalApi(localApiUrl, cnpjNorm);
    if (local?.gestta_id) {
      return {
        _id: local.gestta_id,
        cnpj: local.cnpj ?? cnpjNorm,
        name: local.name,
      };
    }
  }

  if (!cacheClientes) {
    cacheClientes = await listarClientes(client);
  }

  return cacheClientes.find((item) => (item.cnpj || "").replace(/\D/g, "") === cnpjNorm) ?? null;
}

function groupUsersByName(users: UsuarioGestta[]): Map<string, UsuarioGestta[]> {
  const grouped = new Map<string, UsuarioGestta[]>();

  for (const user of users) {
    const key = normalizarNome(user.name);
    const current = grouped.get(key) ?? [];
    current.push(user);
    grouped.set(key, current);
  }

  return grouped;
}

export async function buscarUsuarioPorNome(
  client: AxiosInstance,
  nome: string,
): Promise<UsuarioGestta | null> {
  const nomeNorm = normalizarNome(nome);
  if (!nomeNorm) return null;

  if (!cacheUsuariosByNome) {
    const users = await listarFuncionarios(client);
    cacheUsuariosByNome = groupUsersByName(users);
  }

  const matches = cacheUsuariosByNome.get(nomeNorm) ?? [];
  if (matches.length > 1) {
    throw new Error(`Aprovador ambiguo no Gestta: ${nome}.`);
  }

  return matches[0] ?? null;
}

export async function obterGroupCustomerIds(
  client: AxiosInstance,
  customerId: string,
  departamentoOuSetor?: string,
): Promise<string[]> {
  return getGroupCustomerIds(client, customerId, departamentoOuSetor);
}

export async function getNomesSetorCanonicos(): Promise<string[]> {
  const localApiUrl = process.env.API_3001_URL?.trim();
  if (!localApiUrl) return [];
  if (cacheNomesSetor) return cacheNomesSetor;

  const departamentos = await getDepartmentsFromLocalApi(localApiUrl);
  cacheNomesSetor = departamentos.map((item) => item.name).filter(Boolean);
  return cacheNomesSetor;
}
