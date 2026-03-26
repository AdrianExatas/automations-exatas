import { AxiosInstance } from "axios";
import {
  ClienteGestta,
  ConfiguracaoTarefaCliente,
  PatchResponsavelBody,
  RespostaClientes,
  RespostaTarefasGestta,
  TarefaGestta,
  UsuarioGestta,
  VinculoTarefaCliente,
} from "../types";

const LIMIT = 500;

function asArray<T>(data: unknown, docsKey = "docs"): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && docsKey in data) {
    const docs = (data as Record<string, unknown>)[docsKey];
    return Array.isArray(docs) ? (docs as T[]) : [];
  }
  return [];
}

export async function listarClientes(client: AxiosInstance): Promise<ClienteGestta[]> {
  const clientes: ClienteGestta[] = [];
  let page = 1;

  for (;;) {
    const { data } = await client.get<RespostaClientes>("/admin/customer", {
      params: { active: true, limit: LIMIT, page, search: "" },
    });
    clientes.push(...(data.docs ?? []));
    if (!data.hasNextPage) break;
    page += 1;
  }

  return clientes;
}

export async function listarFuncionarios(client: AxiosInstance): Promise<UsuarioGestta[]> {
  const firstResponse = await client.get<
    UsuarioGestta[] | { docs?: UsuarioGestta[]; hasNextPage?: boolean }
  >("/admin/company/user", {
    params: { active: true, limit: LIMIT, page: 1 },
  });

  if (Array.isArray(firstResponse.data)) return firstResponse.data;

  const usuarios = [...(firstResponse.data.docs ?? [])];
  let page = 2;
  let hasNextPage = Boolean(firstResponse.data.hasNextPage);

  while (hasNextPage) {
    const { data } = await client.get<{ docs?: UsuarioGestta[]; hasNextPage?: boolean }>(
      "/admin/company/user",
      { params: { active: true, limit: LIMIT, page } },
    );
    usuarios.push(...(data.docs ?? []));
    hasNextPage = Boolean(data.hasNextPage);
    page += 1;
  }

  return usuarios;
}

export async function listarTarefasRecorrentesAtivas(client: AxiosInstance): Promise<TarefaGestta[]> {
  const tarefas: TarefaGestta[] = [];
  let page = 1;

  for (;;) {
    const { data } = await client.get<RespostaTarefasGestta>("/admin/company/task", {
      params: { type: "RECURRENT", limit: LIMIT, page },
    });

    tarefas.push(...(data.docs ?? []).filter((tarefa) => tarefa.active !== false));

    if (!data.hasNextPage) break;
    page += 1;
  }

  return tarefas;
}

export async function listarClientesDaTarefa(
  client: AxiosInstance,
  taskId: string,
): Promise<VinculoTarefaCliente[]> {
  const { data } = await client.get<VinculoTarefaCliente[] | { docs?: VinculoTarefaCliente[] }>(
    `/admin/company/task/${taskId}/customer`,
  );
  return asArray<VinculoTarefaCliente>(data);
}

export async function adicionarClientesNaTarefa(
  client: AxiosInstance,
  taskId: string,
  customerIds: string[],
): Promise<void> {
  if (customerIds.length === 0) return;
  await client.post(`/admin/company/task/${taskId}/customer`, { customerId: customerIds });
}

export async function removerGroupCustomers(
  client: AxiosInstance,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return;
  await client.delete("/admin/group/customer", { data: { ids } });
}

export async function patchResponsavel(
  client: AxiosInstance,
  body: PatchResponsavelBody,
): Promise<void> {
  if (body.ids.length === 0) return;
  await client.patch("/admin/group/customer/config", body);
}

export async function listarTarefasDoCliente(
  client: AxiosInstance,
  customerId: string,
): Promise<ConfiguracaoTarefaCliente[]> {
  const { data } = await client.get<
    ConfiguracaoTarefaCliente[] | { docs?: ConfiguracaoTarefaCliente[] }
  >(`/admin/customer/${customerId}/company/task`);
  return asArray<ConfiguracaoTarefaCliente>(data);
}
