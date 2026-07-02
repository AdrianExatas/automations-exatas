/**
 * Endpoints da API Gestta usados pela automação.
 */

import { AxiosInstance } from "axios";
import {
  RespostaClientes,
  UsuarioGestta,
  PatchResponsavelBody,
} from "../types";

const LIMIT = 500;

/**
 * Lista clientes com paginação até encontrar todos (ou por search).
 */
export async function listarClientes(
  client: AxiosInstance,
  search?: string
): Promise<RespostaClientes["docs"]> {
  const todos: RespostaClientes["docs"] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const params: Record<string, string | number | boolean> = {
      active: true,
      limit: LIMIT,
      page,
      search: search ?? "",
    };
    const { data } = await client.get<RespostaClientes>("/admin/customer", {
      params,
    });
    todos.push(...(data.docs ?? []));
    hasMore = (data.hasNextPage ?? false) && (data.docs?.length ?? 0) === LIMIT;
    page++;
  }

  return todos;
}

/**
 * Lista funcionários ativos (GET admin/company/user?active=true).
 */
export async function listarFuncionarios(
  client: AxiosInstance
): Promise<UsuarioGestta[]> {
  const { data } = await client.get<UsuarioGestta[] | { docs?: UsuarioGestta[] }>(
    "/admin/company/user",
    { params: { active: true } }
  );
  if (Array.isArray(data)) return data;
  return data.docs ?? [];
}

/** Item retornado por GET /admin/customer/:id/company/task. */
export interface CompanyTaskItem {
  _id: string;
  company_task?: string | {
    _id?: string;
    name?: string;
    company_department?: { _id?: string; name?: string };
  };
  company_user?: string | UsuarioGestta | null;
  approve_type?: unknown[];
  active?: boolean;
}

/** Normaliza nome para comparação (trim, minúsculo, sem acentos). */
function normalizarNomeDepto(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Resposta possível de GET /admin/customer/:id/company/task (array direto ou paginada). */
type CompanyTaskResponse = CompanyTaskItem[] | { docs?: CompanyTaskItem[]; hasNextPage?: boolean };

/**
 * Normaliza a resposta do GET company/task para um único array (suporta array direto ou { docs }).
 */
export function normalizarCompanyTaskData(
  data: unknown,
  customerId: string
): { items: CompanyTaskItem[]; origem: "array" | "docs" } {
  if (Array.isArray(data)) {
    return { items: data, origem: "array" };
  }
  if (data != null && typeof data === "object" && "docs" in data) {
    const docs = (data as { docs?: unknown }).docs;
    const items = Array.isArray(docs) ? docs as CompanyTaskItem[] : [];
    return { items, origem: "docs" };
  }
  const tipo = data === null ? "null" : typeof data;
  const chaves = data != null && typeof data === "object" ? Object.keys(data).join(", ") : "";
  console.warn(
    `[${customerId}] GET company/task: resposta inesperada (tipo: ${tipo}${chaves ? `, chaves: ${chaves}` : ""}).`
  );
  return { items: [], origem: "docs" };
}

/**
 * Obtém os IDs de group_customer para um cliente.
 * Usa GET /admin/customer/:customerId/company/task. Aceita resposta em array ou { docs: [] }.
 * Se departamentoOuSetor for informado, retorna os _id dos itens cujo company_task.company_department.name
 * comece com esse valor. Ex.: "Fiscal" engloba "Fiscal" e "Fiscal - Simples Nacional".
 */
export async function getGroupCustomerItems(
  client: AxiosInstance,
  customerId: string,
  departamentoOuSetor?: string
): Promise<CompanyTaskItem[]> {
  try {
    const { data } = await client.get<CompanyTaskResponse>(
      `/admin/customer/${customerId}/company/task`
    );
    const { items: dataItems, origem } = normalizarCompanyTaskData(data, customerId);

    if (dataItems.length === 0) {
      console.warn(
        `[${customerId}] GET company/task retornou 0 itens (resposta: ${origem === "array" ? "array direto" : "docs com 0 itens"}).`
      );
      return [];
    }

    const filtro = departamentoOuSetor?.trim()
      ? normalizarNomeDepto(departamentoOuSetor)
      : "";

    const itens = filtro
      ? dataItems.filter((d) => {
          const task = d.company_task;
          const nome = typeof task === "object" ? task.company_department?.name : undefined;
          if (nome == null || nome === "") return false;
          return normalizarNomeDepto(nome).startsWith(filtro);
        })
      : dataItems;

    if (filtro && itens.length === 0 && dataItems.length > 0) {
      const nomes = new Set<string>();
      for (const d of dataItems) {
        const task = d.company_task;
        const n = typeof task === "object" ? task.company_department?.name : undefined;
        if (n != null && n !== "") nomes.add(n);
      }
      const lista = nomes.size ? [...nomes].sort().join(", ") : "(nenhum com nome de departamento)";
      console.warn(
        `[${customerId}] Filtro "${departamentoOuSetor}" não encontrou vínculos. Departamentos deste cliente: ${lista}`
      );
    }

    return itens.filter((d) => Boolean(d._id));
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    const data = (err as { response?: { data?: unknown } })?.response?.data;
    if (status === 401 || status === 403) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[${customerId}] GET company/task falhou (status=${status ?? "N/A"}): ${msg}.`,
      data != null ? ` Resposta: ${JSON.stringify(data).slice(0, 300)}` : ""
    );
  }
  return [];
}

export async function getGroupCustomerIds(
  client: AxiosInstance,
  customerId: string,
  departamentoOuSetor?: string
): Promise<string[]> {
  const itens = await getGroupCustomerItems(client, customerId, departamentoOuSetor);
  return itens.map((d) => d._id).filter(Boolean);
}

/**
 * Alterar responsável: PATCH admin/group/customer/config.
 */
export async function patchResponsavel(
  client: AxiosInstance,
  body: PatchResponsavelBody
): Promise<void> {
  await client.patch("/admin/group/customer/config", body);
}
