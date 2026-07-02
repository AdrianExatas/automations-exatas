/**
 * Mapeamentos: cliente por CNPJ, usuário por nome (normalizado).
 * Opcionalmente usa a API local (porta 3001) para resolver gestta_id por CNPJ (env API_3001_URL).
 */

import { AxiosInstance } from "axios";
import {
  listarClientes,
  listarFuncionarios,
  getGroupCustomerIds,
  getGroupCustomerItems,
  type CompanyTaskItem,
} from "./api/endpoints";
import { getCompanyByCnpjFromLocalApi, getDepartmentsFromLocalApi } from "./api/local-api-3001";
import { ClienteGestta, UsuarioGestta, LinhaPlanilha } from "./types";
import { normalizarCnpj } from "./cnpj";

/** Normaliza nome para comparação: minúsculo, sem acentos, trim. */
export function normalizarNome(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

let cacheClientes: ClienteGestta[] | null = null;
let cacheUsuarios: UsuarioGestta[] | null = null;

/**
 * Busca cliente por CNPJ (apenas dígitos). Usa cache na mesma execução.
 * Se API_3001_URL estiver definida, tenta primeiro a API local; se encontrar empresa com gestta_id, retorna um ClienteGestta sintético (evita chamar a API Gestta para esse CNPJ).
 */
export async function buscarClientePorCnpj(
  client: AxiosInstance,
  cnpj: string
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

  return (
    cacheClientes.find(
      (c) => (c.cnpj || "").replace(/\D/g, "") === cnpjNorm
    ) ?? null
  );
}

/**
 * Busca funcionário por nome (match normalizado, case-insensitive, sem acentos).
 */
export async function buscarUsuarioPorNome(
  client: AxiosInstance,
  nome: string
): Promise<UsuarioGestta | null> {
  const nomeNorm = normalizarNome(nome);
  if (!nomeNorm) return null;

  if (!cacheUsuarios) {
    cacheUsuarios = await listarFuncionarios(client);
  }

  return (
    cacheUsuarios.find((u) => normalizarNome(u.name) === nomeNorm) ?? null
  );
}

/**
 * Obtém os IDs de group_customer para o cliente (e opcionalmente departamento/setor).
 * Se departamentoOuSetor for informado, retorna apenas tarefas daquele departamento.
 */
export async function obterGroupCustomerIds(
  client: AxiosInstance,
  customerId: string,
  departamentoOuSetor?: string
): Promise<string[]> {
  return getGroupCustomerIds(client, customerId, departamentoOuSetor);
}

/**
 * Obtem os vinculos group_customer completos para capturar snapshot de rollback.
 */
export async function obterGroupCustomerItems(
  client: AxiosInstance,
  customerId: string,
  departamentoOuSetor?: string
): Promise<CompanyTaskItem[]> {
  return getGroupCustomerItems(client, customerId, departamentoOuSetor);
}

/** Cache dos nomes de departamento da API 3001 (para validação de setor). */
let cacheNomesSetor: string[] | null = null;

/**
 * Retorna os nomes canônicos de setor/departamento da API local (API_3001_URL).
 * Útil para validar a coluna SETOR da planilha. Retorna [] se a API não estiver configurada ou falhar.
 */
export async function getNomesSetorCanonicos(): Promise<string[]> {
  const localApiUrl = process.env.API_3001_URL?.trim();
  if (!localApiUrl) return [];
  if (cacheNomesSetor) return cacheNomesSetor;
  const depts = await getDepartmentsFromLocalApi(localApiUrl);
  cacheNomesSetor = depts.map((d) => d.name).filter(Boolean);
  return cacheNomesSetor;
}
