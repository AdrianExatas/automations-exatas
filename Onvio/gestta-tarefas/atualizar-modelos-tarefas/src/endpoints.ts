import { AxiosInstance } from "axios";
import {
  CustomerTaskConfig,
  GesttaStep,
  GesttaTask,
  TaskCustomerLink,
  TaskUpdatePayload,
} from "./types";

const LIMIT = 500;

function asArray<T>(data: unknown, docsKey = "docs"): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && docsKey in data) {
    const docs = (data as Record<string, unknown>)[docsKey];
    return Array.isArray(docs) ? (docs as T[]) : [];
  }
  return [];
}

export async function listarTarefasRecorrentes(
  client: AxiosInstance,
): Promise<GesttaTask[]> {
  const tarefas: GesttaTask[] = [];
  let page = 1;
  for (;;) {
    const { data } = await client.get<{
      docs?: GesttaTask[];
      hasNextPage?: boolean;
    }>("/admin/company/task", {
      params: { type: "RECURRENT", limit: LIMIT, page },
    });
    tarefas.push(...(data.docs ?? []));
    if (!data.hasNextPage) break;
    page += 1;
  }
  return tarefas;
}

export async function obterTarefa(
  client: AxiosInstance,
  taskId: string,
): Promise<GesttaTask> {
  const { data } = await client.get<GesttaTask>(
    `/admin/company/task/${taskId}`,
  );
  return data;
}

export async function atualizarModeloTarefa(
  client: AxiosInstance,
  taskId: string,
  payload: TaskUpdatePayload,
): Promise<GesttaTask> {
  const { data } = await client.put<GesttaTask>(
    `/admin/company/task/${taskId}`,
    payload,
  );
  return data;
}

export async function listarClientesDaTarefa(
  client: AxiosInstance,
  taskId: string,
): Promise<TaskCustomerLink[]> {
  const { data } = await client.get<
    TaskCustomerLink[] | { docs?: TaskCustomerLink[] }
  >(`/admin/company/task/${taskId}/customer`);
  return asArray<TaskCustomerLink>(data);
}

export async function listarSteps(
  client: AxiosInstance,
  taskId: string,
): Promise<GesttaStep[]> {
  const { data } = await client.get<GesttaStep[]>(
    `/admin/company/task/${taskId}/step`,
  );
  return Array.isArray(data) ? data : [];
}

export async function criarStep(
  client: AxiosInstance,
  taskId: string,
  body: { name: string; order: number; required: boolean },
): Promise<unknown> {
  const { data } = await client.post(
    `/admin/company/task/${taskId}/step`,
    body,
  );
  return data;
}

export async function regenerarTarefasCliente(
  client: AxiosInstance,
  customerId: string,
  competence: {
    month: number;
    year: number;
    company_department?: string;
    force_erase_interaction?: boolean;
  },
): Promise<{
  erase: { ok: boolean; status: number; body: unknown };
  generate: { ok: boolean; status: number; body: unknown };
}> {
  const erase = await apagarGeracaoCliente(client, customerId, competence);
  const generate = await gerarTarefasCliente(client, customerId, competence);
  return { erase, generate };
}

function taskGenBody(competence: {
  month: number;
  year: number;
  company_department?: string;
  force_erase_interaction?: boolean;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    month: competence.month,
    year: competence.year,
  };
  if (competence.company_department) {
    body.company_department = competence.company_department;
  }
  if (competence.force_erase_interaction != null) {
    body.force_erase_interaction = competence.force_erase_interaction;
  }
  return body;
}

export async function apagarGeracaoCliente(
  client: AxiosInstance,
  customerId: string,
  competence: {
    month: number;
    year: number;
    company_department?: string;
    force_erase_interaction?: boolean;
  },
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await client.request({
    method: "DELETE",
    url: `/task-gen/admin/customer/${customerId}`,
    data: taskGenBody(competence),
    validateStatus: () => true,
  });
  return {
    ok: res.status >= 200 && res.status < 300,
    status: res.status,
    body: res.data,
  };
}

export async function gerarTarefasCliente(
  client: AxiosInstance,
  customerId: string,
  competence: {
    month: number;
    year: number;
    company_department?: string;
  },
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const body: Record<string, unknown> = {
    month: competence.month,
    year: competence.year,
  };
  if (competence.company_department) {
    body.company_department = competence.company_department;
  }
  const res = await client.request({
    method: "POST",
    url: `/task-gen/admin/customer/${customerId}`,
    data: body,
    validateStatus: () => true,
  });
  return {
    ok: res.status >= 200 && res.status < 300,
    status: res.status,
    body: res.data,
  };
}

export async function copiarModeloTarefa(
  client: AxiosInstance,
  taskId: string,
): Promise<GesttaTask> {
  const { data } = await client.post<GesttaTask>(
    `/admin/company/task/${taskId}/copy`,
    {},
  );
  return data;
}

export async function listarTarefasDoCliente(
  client: AxiosInstance,
  customerId: string,
): Promise<CustomerTaskConfig[]> {
  const { data } = await client.get<
    CustomerTaskConfig[] | { docs?: CustomerTaskConfig[] }
  >(`/admin/customer/${customerId}/company/task`);
  return asArray<CustomerTaskConfig>(data);
}

const GENERATED_TASK_STATUSES = [
  "OPEN",
  "IMPEDIMENT",
  "DONE",
  "DISCONSIDERED",
  "IGNORED",
] as const;

function recordsOfUnknown(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item && typeof item === "object"),
    );
  }
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of ["docs", "data", "items", "results"]) {
    const nested = record[key];
    if (Array.isArray(nested)) return recordsOfUnknown(nested);
  }
  return [];
}

export interface GeneratedCustomerTask {
  _id: string;
  name: string;
  status: string;
  competence_date?: unknown;
  legal_date?: unknown;
  due_date?: unknown;
  close_date?: unknown;
  company_user?: unknown;
  customer?: unknown;
}

export async function buscarTarefasGeradasCliente(
  client: AxiosInstance,
  customerId: string,
  statuses: readonly string[] = GENERATED_TASK_STATUSES,
): Promise<GeneratedCustomerTask[]> {
  const tarefas: GeneratedCustomerTask[] = [];
  const seen = new Set<string>();
  let page = 1;
  for (;;) {
    const { data } = await client.post<
      | GeneratedCustomerTask[]
      | {
          docs?: GeneratedCustomerTask[];
          hasNextPage?: boolean;
          pages?: number;
          totalPages?: number;
        }
    >("/core/customer/task/search", {
      page,
      limit: LIMIT,
      customer: [customerId],
      status: [...statuses],
    });
    const batch = recordsOfUnknown(data) as unknown as GeneratedCustomerTask[];
    let added = 0;
    for (const task of batch) {
      const id = String(task._id || "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      tarefas.push(task);
      added += 1;
    }
    const hasNext =
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      Boolean((data as { hasNextPage?: boolean }).hasNextPage);
    const totalPages =
      data && typeof data === "object" && !Array.isArray(data)
        ? Number(
            (data as { pages?: number; totalPages?: number }).pages ??
              (data as { totalPages?: number }).totalPages ??
              0,
          )
        : 0;
    if (added === 0 || page >= 20) break;
    if (hasNext || (totalPages > 0 && page < totalPages) || batch.length >= LIMIT) {
      page += 1;
      continue;
    }
    break;
  }
  return tarefas;
}

export async function adicionarClientesNaTarefa(
  client: AxiosInstance,
  taskId: string,
  customerIds: string[],
): Promise<void> {
  if (customerIds.length === 0) return;
  await client.post(`/admin/company/task/${taskId}/customer`, {
    customerId: customerIds,
  });
}

export async function removerGroupCustomers(
  client: AxiosInstance,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return;
  await client.delete("/admin/group/customer", { data: { ids } });
}

export async function patchGroupCustomerConfig(
  client: AxiosInstance,
  body: {
    ids: string[];
    company_user?: string;
    approve?: boolean;
    approvers?: string[];
    approve_type?: string[];
  },
): Promise<void> {
  if (body.ids.length === 0) return;
  await client.patch("/admin/group/customer/config", body);
}

export function customerIdOf(link: TaskCustomerLink): string {
  const c = link.customer;
  return typeof c === "string" ? c : c._id;
}

export function customerNameOf(link: TaskCustomerLink): string | undefined {
  const c = link.customer;
  return typeof c === "string" ? undefined : c.name;
}
