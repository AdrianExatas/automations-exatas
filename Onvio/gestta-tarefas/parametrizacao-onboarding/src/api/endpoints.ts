import { AxiosInstance } from "axios";
import {
  ClienteGestta,
  ConfiguracaoTarefaCliente,
  RespostaClientes,
  RespostaTarefasGestta,
  TarefaGestta,
  UsuarioGestta,
  VinculoTarefaCliente,
} from "../types";
import { asArray } from "../utils";

const LIMIT = 500;

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
  const first = await client.get<UsuarioGestta[] | { docs?: UsuarioGestta[]; hasNextPage?: boolean }>(
    "/admin/company/user",
    { params: { active: true, limit: LIMIT, page: 1 } },
  );

  if (Array.isArray(first.data)) return first.data;

  const usuarios = [...(first.data.docs ?? [])];
  let page = 2;
  let hasNextPage = Boolean(first.data.hasNextPage);
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
    tarefas.push(...(data.docs ?? []).filter((item) => item.active !== false));
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

export async function adicionarClienteNaTarefa(
  client: AxiosInstance,
  taskId: string,
  customerId: string,
): Promise<void> {
  await client.post(`/admin/company/task/${taskId}/customer`, { customerId: [customerId] });
}

export async function listarTarefasDoCliente(
  client: AxiosInstance,
  customerId: string,
): Promise<ConfiguracaoTarefaCliente[]> {
  const { data } = await client.get<ConfiguracaoTarefaCliente[] | { docs?: ConfiguracaoTarefaCliente[] }>(
    `/admin/customer/${customerId}/company/task`,
  );
  return asArray<ConfiguracaoTarefaCliente>(data);
}

export async function patchResponsavel(
  client: AxiosInstance,
  body: { ids: string[]; company_user: string; approve_type: string[] },
): Promise<void> {
  if (body.ids.length === 0) return;
  await client.patch("/admin/group/customer/config", body);
}
