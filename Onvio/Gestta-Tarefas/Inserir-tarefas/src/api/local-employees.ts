import axios from "axios";
import { FuncionarioLocal, RespostaFuncionariosLocal } from "../types";

const DEFAULT_BASE_URL = "http://localhost:3001";
const LIMIT = 500;

export function getLocalApiBaseUrl(): string {
  const raw = process.env.LOCAL_API_URL || process.env.API_3001_URL || DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export async function listarFuncionariosLocal(
  baseUrl = getLocalApiBaseUrl(),
): Promise<FuncionarioLocal[]> {
  const client = axios.create({
    baseURL: baseUrl,
    timeout: 15000,
    headers: { accept: "application/json" },
  });

  const funcionarios: FuncionarioLocal[] = [];
  let offset = 0;

  for (;;) {
    const { data } = await client.get<RespostaFuncionariosLocal>("/api/employees", {
      params: { limit: LIMIT, offset },
    });

    const pagina = Array.isArray(data.data) ? data.data.filter((item) => item.active !== false) : [];
    funcionarios.push(...pagina);

    const limit = typeof data.limit === "number" && data.limit > 0 ? data.limit : LIMIT;
    const total = typeof data.total === "number" ? data.total : undefined;

    if (pagina.length === 0) break;

    offset += pagina.length;

    if (total !== undefined && offset >= total) break;
    if (pagina.length < limit) break;
  }

  return funcionarios;
}
