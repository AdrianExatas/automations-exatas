import type { ServiceRequestRow } from "@exatas/onvio-solicitacoes-servico";
import { normalizeCode, normalizeForMatch } from "./scripts/upload-onvio-helpers";
import type { ClientUser, ClientUserLookupResult, ClientUsersProvider } from "./types";

interface ResolveRequesterIdResult {
  requesterId?: string;
  warnings?: string[];
}

function normalizeLookupResult(result: ClientUser[] | ClientUserLookupResult): {
  users: ClientUser[];
  warnings: string[];
} {
  if (Array.isArray(result)) return { users: result, warnings: [] };
  return { users: result.users, warnings: result.warnings ?? [] };
}

export function matchClientUserBySolicitante(
  users: ClientUser[],
  solicitante: string,
): ClientUser | undefined {
  const wanted = normalizeForMatch(solicitante);
  if (!wanted) return undefined;

  const matches = users.filter((user) => normalizeForMatch(user.nome) === wanted);
  if (matches.length === 1) return matches[0];

  const withId = matches.filter((user) => user.id?.trim());
  if (withId.length === 1) return withId[0];

  return undefined;
}

export function matchClientUserBySolicitantePartial(
  users: ClientUser[],
  solicitante: string,
): ClientUser | undefined {
  const wanted = normalizeForMatch(solicitante);
  if (!wanted) return undefined;

  const candidates = users.filter((user) => {
    const name = normalizeForMatch(user.nome);
    if (!name || !user.id?.trim()) return false;
    return name.includes(wanted) || wanted.includes(name);
  });

  if (candidates.length !== 1) return undefined;
  return candidates[0];
}

export function createClientUsersRequesterResolver(
  provider: ClientUsersProvider,
): (row: ServiceRequestRow) => Promise<ResolveRequesterIdResult | undefined> {
  const usersByCode = new Map<string, Promise<ClientUser[] | ClientUserLookupResult>>();

  return async (row: ServiceRequestRow): Promise<ResolveRequesterIdResult | undefined> => {
    if (row.onvioRequesterId?.trim()) {
      return { requesterId: row.onvioRequesterId.trim() };
    }

    const solicitante = row.solicitante.trim();
    if (!solicitante) return undefined;

    const codigo = normalizeCode(row.codigo);
    if (!codigo) {
      return {
        warnings: [`Solicitante "${solicitante}" sem codigo de cliente para consultar usuarios no Onvio.`],
      };
    }

    let lookup = usersByCode.get(codigo);
    if (!lookup) {
      lookup = provider.lookupUsers({
        codigo,
        cnpj: row.cnpj,
        nome: row.nome,
        onvioClientId: row.onvioClientId,
      });
      usersByCode.set(codigo, lookup);
    }

    const { users, warnings } = normalizeLookupResult(await lookup);
    const itemWarnings = [...warnings];

    if (users.length === 0) {
      itemWarnings.push(
        `Nenhum usuario do cliente retornado pelo Onvio para codigo ${codigo} (client-core ou lista vazia).`,
      );
      return { warnings: itemWarnings };
    }

    const exactMatch = matchClientUserBySolicitante(users, solicitante);
    if (exactMatch?.id?.trim()) {
      return { requesterId: exactMatch.id.trim(), warnings: itemWarnings.length > 0 ? itemWarnings : undefined };
    }

    const partialMatch = matchClientUserBySolicitantePartial(users, solicitante);
    if (partialMatch?.id?.trim()) {
      return {
        requesterId: partialMatch.id.trim(),
        warnings: itemWarnings.length > 0 ? itemWarnings : undefined,
      };
    }

    itemWarnings.push(
      `Encontrados ${users.length} usuarios do cliente, nenhum bate com RESPONSAVEL "${solicitante}".`,
    );
    return { warnings: itemWarnings };
  };
}
