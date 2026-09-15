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
  search?: string,
  active = true
): Promise<RespostaClientes["docs"]> {
  const todos: RespostaClientes["docs"] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const params: Record<string, string | number | boolean> = {
      active,
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
  client: AxiosInstance,
  active = true
): Promise<UsuarioGestta[]> {
  const usuarios: UsuarioGestta[] = [];
  let page = 1;
  for (;;) {
    const { data } = await client.get<
      UsuarioGestta[] | { docs?: UsuarioGestta[]; hasNextPage?: boolean }
    >("/admin/company/user", { params: { active, limit: LIMIT, page } });
    if (Array.isArray(data)) return data;
    const docs = data.docs ?? [];
    usuarios.push(...docs);
    if (!data.hasNextPage || docs.length === 0) return usuarios;
    page++;
  }
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

/** Modelo de tarefa usado para localizar a variante VIA WHATSAPP. */
export interface ModeloTarefaGestta {
  _id: string;
  name: string;
  active?: boolean;
  type?: string;
  company_department?: string | { _id?: string; name?: string };
}

export interface DepartamentoGestta {
  _id: string;
  name: string;
}

/** Instância de tarefa já gerada para um cliente. */
export interface TarefaGeradaGestta {
  _id: string;
  name?: string;
  status?: string;
  competence_date?: string | Date | null;
  company_task?: string | { _id?: string; name?: string };
  company_user?: string | UsuarioGestta | null;
  /** A busca e o detalhe das instancias atuais expõem o responsavel neste campo. */
  owner?: string | UsuarioGestta | null;
  customer?: string | { _id?: string; name?: string };
  [key: string]: unknown;
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

/** Remove o dono de vinculos cuja configuracao anterior nao tinha responsavel. */
export async function removerResponsavel(
  client: AxiosInstance,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  await client.delete("/admin/group/customer/config", {
    data: { ids, company_user: true },
  });
}

export async function obterModeloTarefa(
  client: AxiosInstance,
  taskId: string
): Promise<ModeloTarefaGestta> {
  const { data } = await client.get<ModeloTarefaGestta>(`/admin/company/task/${taskId}`);
  return data;
}

export async function listarModelosTarefa(
  client: AxiosInstance,
  type: "RECURRENT" | "SERVICE_ORDER" = "RECURRENT"
): Promise<ModeloTarefaGestta[]> {
  const modelos: ModeloTarefaGestta[] = [];
  let page = 1;
  for (;;) {
    const { data } = await client.get<{ docs?: ModeloTarefaGestta[]; hasNextPage?: boolean }>(
      "/admin/company/task",
      { params: { type, limit: LIMIT, page } }
    );
    modelos.push(...(data.docs ?? []));
    if (!data.hasNextPage) return modelos;
    page++;
  }
}

export async function listarDepartamentos(
  client: AxiosInstance
): Promise<DepartamentoGestta[]> {
  const departamentos: DepartamentoGestta[] = [];
  let page = 1;
  for (;;) {
    const { data } = await client.get<
      DepartamentoGestta[] | { docs?: DepartamentoGestta[]; hasNextPage?: boolean }
    >("/admin/company/department", { params: { limit: LIMIT, page } });
    if (Array.isArray(data)) return data;
    const docs = data.docs ?? [];
    departamentos.push(...docs);
    if (!data.hasNextPage || docs.length === 0) return departamentos;
    page++;
  }
}

function recordsOfUnknown(data: unknown): TarefaGeradaGestta[] {
  if (Array.isArray(data)) return data as TarefaGeradaGestta[];
  if (!data || typeof data !== "object") return [];
  const record = data as Record<string, unknown>;
  for (const key of ["docs", "data", "items", "results"]) {
    if (Array.isArray(record[key])) return record[key] as TarefaGeradaGestta[];
  }
  return [];
}

/** Lista instancias de um cliente nos status informados. */
export async function listarTarefasGeradasPorStatus(
  client: AxiosInstance,
  customerId: string,
  statuses: readonly string[]
): Promise<TarefaGeradaGestta[]> {
  const tarefas: TarefaGeradaGestta[] = [];
  const seen = new Set<string>();
  let page = 1;
  for (;;) {
    const { data } = await client.post<unknown>("/core/customer/task/search", {
      page,
      limit: LIMIT,
      customer: [customerId],
      status: [...statuses],
    });
    const batch = recordsOfUnknown(data);
    let added = 0;
    for (const tarefa of batch) {
      if (!tarefa._id || seen.has(tarefa._id)) continue;
      seen.add(tarefa._id);
      tarefas.push(tarefa);
      added++;
    }
    const response = data as { hasNextPage?: boolean; pages?: number; totalPages?: number } | null;
    const totalPages = Number(response?.pages ?? response?.totalPages ?? 0);
    if (added === 0 || (!response?.hasNextPage && (totalPages === 0 || page >= totalPages))) {
      return tarefas;
    }
    page++;
  }
}

/** Lista instancias OPEN de um cliente. A competencia e filtrada pelo chamador. */
export async function listarTarefasGeradasAbertas(
  client: AxiosInstance,
  customerId: string
): Promise<TarefaGeradaGestta[]> {
  return listarTarefasGeradasPorStatus(client, customerId, ["OPEN"]);
}

export async function obterTarefaGerada(
  client: AxiosInstance,
  taskId: string
): Promise<TarefaGeradaGestta> {
  const { data } = await client.get<TarefaGeradaGestta>(`/core/customer/task/${taskId}`);
  return data;
}

/** Contrato confirmado no front-end Gestta para transferir uma instancia ja gerada. */
export async function transferirTarefaGerada(
  client: AxiosInstance,
  customerTaskId: string,
  newOwnerId: string
): Promise<void> {
  await client.put("/core/customer/task/transfer", {
    customer_task: customerTaskId,
    new_owner: newOwnerId,
  });
}
