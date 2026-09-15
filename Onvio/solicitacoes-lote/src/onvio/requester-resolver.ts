import type { ServiceRequestRow } from "@exatas/onvio-solicitacoes-servico";
import type { ClientUser, ClientUserLookupResult, OnvioHttpClientUsersProvider } from "./client-users";
import { normalizeCodigo, normalizeForMatch } from "./normalize";

export function matchClientUserBySolicitante(users: ClientUser[], solicitante: string): ClientUser | undefined {
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
  return candidates.length === 1 ? candidates[0] : undefined;
}

export function createClientUsersRequesterResolver(
  provider: OnvioHttpClientUsersProvider,
): (row: ServiceRequestRow) => Promise<{ requesterId?: string; warnings?: string[] } | undefined> {
  const usersByCode = new Map<string, Promise<ClientUserLookupResult>>();

  return async (row) => {
    if (row.onvioRequesterId?.trim()) {
      return { requesterId: row.onvioRequesterId.trim() };
    }

    const solicitante = row.solicitante.trim();
    if (!solicitante) return undefined;

    const codigo = normalizeCodigo(row.codigo);
    if (!codigo) {
      return { warnings: [`Solicitante "${solicitante}" sem codigo de cliente para consultar usuarios no Onvio.`] };
    }

    let lookup = usersByCode.get(codigo);
    if (!lookup) {
      lookup = provider.lookupUsers({ codigo });
      usersByCode.set(codigo, lookup);
    }

    const { users, warnings } = await lookup;
    const itemWarnings = [...(warnings ?? [])];
    if (users.length === 0) {
      itemWarnings.push(`Nenhum usuario do cliente retornado pelo Onvio para codigo ${codigo}.`);
      return { warnings: itemWarnings };
    }

    const exactMatch = matchClientUserBySolicitante(users, solicitante);
    if (exactMatch?.id?.trim()) {
      return { requesterId: exactMatch.id.trim(), warnings: itemWarnings.length ? itemWarnings : undefined };
    }

    const partialMatch = matchClientUserBySolicitantePartial(users, solicitante);
    if (partialMatch?.id?.trim()) {
      return { requesterId: partialMatch.id.trim(), warnings: itemWarnings.length ? itemWarnings : undefined };
    }

    itemWarnings.push(`Nenhum usuario do cliente bate com o solicitante "${solicitante}".`);
    return { warnings: itemWarnings };
  };
}
