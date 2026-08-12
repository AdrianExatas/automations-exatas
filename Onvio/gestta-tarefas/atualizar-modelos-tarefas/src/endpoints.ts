import { AxiosInstance } from "axios";
import {
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
  competence: { month: number; year: number },
): Promise<{
  erase: { ok: boolean; status: number; body: unknown };
  generate: { ok: boolean; status: number; body: unknown };
}> {
  const eraseRes = await client.request({
    method: "DELETE",
    url: `/task-gen/admin/customer/${customerId}`,
    data: competence,
    validateStatus: () => true,
  });
  const generateRes = await client.request({
    method: "POST",
    url: `/task-gen/admin/customer/${customerId}`,
    data: competence,
    validateStatus: () => true,
  });
  return {
    erase: {
      ok: eraseRes.status >= 200 && eraseRes.status < 300,
      status: eraseRes.status,
      body: eraseRes.data,
    },
    generate: {
      ok: generateRes.status >= 200 && generateRes.status < 300,
      status: generateRes.status,
      body: generateRes.data,
    },
  };
}

export function customerIdOf(link: TaskCustomerLink): string {
  const c = link.customer;
  return typeof c === "string" ? c : c._id;
}

export function customerNameOf(link: TaskCustomerLink): string | undefined {
  const c = link.customer;
  return typeof c === "string" ? undefined : c.name;
}
