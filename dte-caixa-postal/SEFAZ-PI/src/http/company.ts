/**
 * Busca o contribuinte via REST API do SIATWEB e seta os cookies
 * de contexto de empresa: ct (inscricao), pil (idPessoa), tcp, perfil.
 */

import type { Company } from "../companies.js";
import { normalizeDigits } from "../companies.js";
import { CONTRIBUINTES_SEARCH_URL } from "../config/siatweb-urls.js";
import type { CookieJar, HttpClient } from "./client.js";

type ContribuinteItem = {
  id: number;
  inscricao: string;
  nome?: string;
  documento?: string;
};

type ContribuinteResponse = {
  content: ContribuinteItem[];
  totalElements?: number;
};

export type CompanyContext = {
  idPessoa: number;
  inscricao: string;
};

export async function findAndSetCompanyContext(
  client: HttpClient,
  jar: CookieJar,
  company: Company,
  accessToken: string,
): Promise<CompanyContext> {
  const ie = normalizeDigits(company.stateRegistration);

  const url =
    `${CONTRIBUINTES_SEARCH_URL}?` +
    new URLSearchParams({
      page: "0",
      size: "5",
      idTipoCadastro: "1",
      inscricao: ie,
    }).toString();

  const response = await client.fetch(url, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    redirect: "follow",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `GET buscar-contribuintes falhou: ${response.status} ${response.statusText}\n${body}`,
    );
  }

  const data = (await response.json()) as ContribuinteResponse;
  const first = data.content?.[0];

  if (!first) {
    throw new Error(
      `Contribuinte não encontrado para IE="${company.stateRegistrationDisplay}" (${company.name})`,
    );
  }

  // Cookies que o portal SIATWEB seta ao selecionar uma empresa
  jar.set("perfil", "CONTRIBUINTE");
  jar.set("tcp", "1");
  jar.set("ct", first.inscricao);
  jar.set("pil", String(first.id));

  return { idPessoa: first.id, inscricao: first.inscricao };
}
