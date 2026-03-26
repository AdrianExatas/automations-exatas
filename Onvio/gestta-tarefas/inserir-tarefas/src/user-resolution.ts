import { FuncionarioLocal, OrigemResponsavel, UsuarioGestta } from "./types";
import { normalizarNome } from "./utils";

export interface LocalEmployeesLookup {
  available: boolean;
  error?: string;
  byName: Map<string, FuncionarioLocal[]>;
}

export interface UsuarioResolvido {
  userId: string;
  userNome: string;
  origem: OrigemResponsavel;
}

export function agruparFuncionariosLocaisPorNome(
  funcionarios: FuncionarioLocal[],
): Map<string, FuncionarioLocal[]> {
  const grouped = new Map<string, FuncionarioLocal[]>();

  for (const funcionario of funcionarios) {
    const key = normalizarNome(funcionario.name);
    const current = grouped.get(key) ?? [];
    current.push(funcionario);
    grouped.set(key, current);
  }

  return grouped;
}

export function criarLookupFuncionariosLocais(
  funcionarios: FuncionarioLocal[] | null,
  error?: string,
): LocalEmployeesLookup {
  return {
    available: funcionarios !== null,
    error,
    byName: funcionarios ? agruparFuncionariosLocaisPorNome(funcionarios) : new Map(),
  };
}

export function resolverUsuarioComFallback(
  usersByName: Map<string, UsuarioGestta[]>,
  localLookup: LocalEmployeesLookup,
  responsavel: string,
): UsuarioResolvido {
  const key = normalizarNome(responsavel);
  const gesttaMatches = usersByName.get(key) ?? [];
  const localMatches = localLookup.byName.get(key) ?? [];

  if (gesttaMatches.length > 1) {
    throw new Error(`Responsavel ambiguo no Gestta: ${responsavel}.`);
  }

  if (gesttaMatches.length === 1) {
    const gesttaUser = gesttaMatches[0];

    if (localMatches.length === 1 && localMatches[0].employee_id !== gesttaUser._id) {
      throw new Error(
        `Responsavel "${responsavel}" possui IDs diferentes entre Gestta (${gesttaUser._id}) ` +
          `e API local (${localMatches[0].employee_id}).`,
      );
    }

    return {
      userId: gesttaUser._id,
      userNome: gesttaUser.name,
      origem: "gestta",
    };
  }

  if (!localLookup.available) {
    const extra = localLookup.error ? ` API local indisponivel: ${localLookup.error}` : "";
    throw new Error(`Responsavel nao encontrado: ${responsavel}.${extra}`);
  }

  if (localMatches.length > 1) {
    throw new Error(`Responsavel ambiguo na API local: ${responsavel}.`);
  }

  if (localMatches.length === 1) {
    return {
      userId: localMatches[0].employee_id,
      userNome: localMatches[0].name,
      origem: "local-fallback",
    };
  }

  throw new Error(`Responsavel nao encontrado: ${responsavel}.`);
}
