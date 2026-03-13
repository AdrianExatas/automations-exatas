/**
 * Cliente para a API local (porta 3001) do projeto Comparar Adiantamentos Liquidos Domínio - Onvio.
 * Usado opcionalmente para resolver gestta_id por CNPJ e validar nomes de setor.
 * Ative definindo API_3001_URL no .env (ex.: http://localhost:3001).
 */

import axios, { AxiosInstance } from "axios";

export interface LocalCompany {
  onvio_id: string;
  name: string;
  status: string | null;
  gestta_id: string | null;
  code: string | null;
  cnpj: string | null;
  external_id: string | null;
  last_run_id: string | null;
  updated_at: string;
}

export interface LocalDepartment {
  department_id: string;
  name: string;
  is_default: boolean;
  last_run_id: string | null;
  updated_at: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

const LIMIT = 500;

function createLocalApiClient(baseURL: string): AxiosInstance {
  const url = baseURL.replace(/\/$/, "");
  return axios.create({
    baseURL: url,
    timeout: 15000,
    headers: { accept: "application/json" },
  });
}

/**
 * Busca empresa por CNPJ na API local (paginação até encontrar ou esgotar).
 * Retorna null se a API estiver indisponível, não encontrar o CNPJ ou gestta_id for null.
 */
export async function getCompanyByCnpjFromLocalApi(
  baseURL: string,
  cnpj: string
): Promise<LocalCompany | null> {
  const cnpjNorm = cnpj.replace(/\D/g, "");
  if (!cnpjNorm) return null;

  const client = createLocalApiClient(baseURL);
  let offset = 0;

  try {
    for (;;) {
      const { data } = await client.get<PaginatedResponse<LocalCompany>>("/api/companies", {
        params: { limit: LIMIT, offset },
      });
      const list = data?.data ?? [];
      const found = list.find((c) => (c.cnpj || "").replace(/\D/g, "") === cnpjNorm);
      if (found) return found;
      if (list.length < LIMIT || offset + list.length >= (data?.total ?? 0)) return null;
      offset += LIMIT;
    }
  } catch {
    return null;
  }
}

/**
 * Lista departamentos da API local (nomes canônicos de setor).
 * Útil para validar/normalizar a coluna SETOR da planilha.
 */
export async function getDepartmentsFromLocalApi(
  baseURL: string
): Promise<LocalDepartment[]> {
  const client = createLocalApiClient(baseURL);
  try {
    const { data } = await client.get<PaginatedResponse<LocalDepartment>>("/api/departments", {
      params: { limit: 200, offset: 0 },
    });
    return data?.data ?? [];
  } catch {
    return [];
  }
}
