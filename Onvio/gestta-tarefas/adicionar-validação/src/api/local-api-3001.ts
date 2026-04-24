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
  return axios.create({
    baseURL: baseURL.replace(/\/$/, ""),
    timeout: 15000,
    headers: { accept: "application/json" },
  });
}

export async function getCompanyByCnpjFromLocalApi(
  baseURL: string,
  cnpj: string,
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
      const found = list.find((item) => (item.cnpj || "").replace(/\D/g, "") === cnpjNorm);
      if (found) return found;
      if (list.length < LIMIT || offset + list.length >= (data?.total ?? 0)) return null;
      offset += LIMIT;
    }
  } catch {
    return null;
  }
}

export async function getDepartmentsFromLocalApi(
  baseURL: string,
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
