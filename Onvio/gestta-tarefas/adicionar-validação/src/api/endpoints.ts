import { AxiosInstance } from "axios";
import {
  PatchValidacaoBody,
  RespostaClientes,
  UsuarioGestta,
} from "../types";

const LIMIT = 500;

export async function listarClientes(
  client: AxiosInstance,
  search?: string,
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
    const { data } = await client.get<RespostaClientes>("/admin/customer", { params });
    todos.push(...(data.docs ?? []));
    hasMore = (data.hasNextPage ?? false) && (data.docs?.length ?? 0) === LIMIT;
    page += 1;
  }

  return todos;
}

export async function listarFuncionarios(client: AxiosInstance): Promise<UsuarioGestta[]> {
  const { data } = await client.get<UsuarioGestta[] | { docs?: UsuarioGestta[] }>(
    "/admin/company/user",
    { params: { active: true } },
  );
  if (Array.isArray(data)) return data;
  return data.docs ?? [];
}

interface CompanyTaskItem {
  _id: string;
  company_task?: {
    company_department?: { _id?: string; name?: string };
  };
}

type CompanyTaskResponse =
  | CompanyTaskItem[]
  | {
      docs?: CompanyTaskItem[];
      hasNextPage?: boolean;
    };

function normalizarNomeDepto(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function normalizarCompanyTaskData(
  data: unknown,
  customerId: string,
): { items: CompanyTaskItem[]; origem: "array" | "docs" } {
  if (Array.isArray(data)) {
    return { items: data, origem: "array" };
  }
  if (data != null && typeof data === "object" && "docs" in data) {
    const docs = (data as { docs?: unknown }).docs;
    const items = Array.isArray(docs) ? (docs as CompanyTaskItem[]) : [];
    return { items, origem: "docs" };
  }

  const tipo = data === null ? "null" : typeof data;
  const chaves = data != null && typeof data === "object" ? Object.keys(data).join(", ") : "";
  console.warn(
    `[${customerId}] GET company/task: resposta inesperada (tipo: ${tipo}${chaves ? `, chaves: ${chaves}` : ""}).`,
  );
  return { items: [], origem: "docs" };
}

export async function getGroupCustomerIds(
  client: AxiosInstance,
  customerId: string,
  departamentoOuSetor?: string,
): Promise<string[]> {
  try {
    const { data } = await client.get<CompanyTaskResponse>(
      `/admin/customer/${customerId}/company/task`,
    );
    const { items: dataItems, origem } = normalizarCompanyTaskData(data, customerId);

    if (dataItems.length === 0) {
      console.warn(
        `[${customerId}] GET company/task retornou 0 itens (resposta: ${origem === "array" ? "array direto" : "docs com 0 itens"}).`,
      );
      return [];
    }

    const filtro = departamentoOuSetor?.trim()
      ? normalizarNomeDepto(departamentoOuSetor)
      : "";

    const itens = filtro
      ? dataItems.filter((item) => {
          const nome = item.company_task?.company_department?.name;
          if (!nome) return false;
          return normalizarNomeDepto(nome).startsWith(filtro);
        })
      : dataItems;

    if (filtro && itens.length === 0 && dataItems.length > 0) {
      const nomes = new Set<string>();
      for (const item of dataItems) {
        const nome = item.company_task?.company_department?.name;
        if (nome) nomes.add(nome);
      }
      const lista = nomes.size ? [...nomes].sort().join(", ") : "(nenhum departamento)";
      console.warn(
        `[${customerId}] Filtro "${departamentoOuSetor}" nao encontrou vinculos. Departamentos deste cliente: ${lista}`,
      );
    }

    return itens.map((item) => item._id).filter(Boolean);
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    const data = (err as { response?: { data?: unknown } })?.response?.data;
    if (status === 401 || status === 403) {
      throw err;
    }

    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[${customerId}] GET company/task falhou (status=${status ?? "N/A"}): ${msg}.`,
      data != null ? ` Resposta: ${JSON.stringify(data).slice(0, 300)}` : "",
    );
  }

  return [];
}

export async function patchValidacao(
  client: AxiosInstance,
  body: PatchValidacaoBody,
): Promise<void> {
  await client.patch("/admin/group/customer/config", body);
}
