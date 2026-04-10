const PORTAL_BASE = "https://contribuinte.sefaz.al.gov.br/parcelamento";

export const HTTP_PATHS = {
  autenticar: `${PORTAL_BASE}/sfz-security-api/api/autenticar`,
  account: `${PORTAL_BASE}/api/account`,
  consolidacaoConsultar: `${PORTAL_BASE}/sfz-parcelamento-api/api/consolidacao/consultar`,
  consolidacaoDetalhe: (id: number) =>
    `${PORTAL_BASE}/sfz-parcelamento-api/api/consolidacao/consultarPorId/${id}`,
  parcelamentoGerar: (seq: number, qty: number, date: string) =>
    `${PORTAL_BASE}/sfz-parcelamento-api/api/parcelamento/gerar/${seq}/${qty}/${date}`,
  parcelamentoEmitir: (seq: number, qty: number, date: string) =>
    `${PORTAL_BASE}/sfz-parcelamento-api/api/parcelamento/${seq}/${qty}/${date}`,
  darVisualizar: `${PORTAL_BASE}/sfz-parcelamento-api/api/dar/visualizar`,
} as const;

export const SITUACOES_ATIVAS = new Set(["DAR", "CONFIRMADO", "PARCELADO", "ATRASO", "SIMULACAO"]);

export interface ConsolidacaoItem {
  id?: number | null;
  situacao?: string | null;
  mensagemNaoEmitirDAR?: string | null;
  [key: string]: unknown;
}

export interface EmitirResult {
  numeroProcessamento: number | null;
  dataVencimentoMaximo: string;
  idConsolidacao: number;
  quantidadeParcelaEmitida: number;
}

export interface GerarResult {
  valorUmaParcela: number | null;
  chaveRedis: string | null;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, Accept: "application/json" };
}

function pessoaHeaders(token: string, numeroPessoa: number): Record<string, string> {
  return { ...authHeaders(token), "x-pessoadetrabalho": String(numeroPessoa) };
}

export async function autenticar(username: string, password: string): Promise<string> {
  const res = await fetch(HTTP_PATHS.autenticar, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ username, password, rememberMe: true }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const msg = typeof data.message === "string" ? data.message : JSON.stringify(data);
    throw new Error(`Autenticacao falhou (${res.status}): ${msg}`);
  }
  const token =
    (typeof data.token === "string" && data.token) ||
    (typeof data.id_token === "string" && data.id_token) ||
    (typeof data.access_token === "string" && data.access_token);
  if (!token) {
    throw new Error(`Token nao encontrado na resposta: ${JSON.stringify(Object.keys(data))}`);
  }
  return token;
}

export async function fetchAccount(token: string): Promise<{ numeroPessoa: number; login: string }> {
  const res = await fetch(HTTP_PATHS.account, { headers: authHeaders(token) });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`GET account falhou (${res.status}): ${JSON.stringify(data).slice(0, 400)}`);
  }
  const np = data.numeroPessoa;
  if (typeof np !== "number" || !Number.isFinite(np)) {
    throw new Error(`numeroPessoa ausente/invalido em account: ${JSON.stringify(Object.keys(data))}`);
  }
  return { numeroPessoa: np, login: typeof data.login === "string" ? data.login : "" };
}

export async function consultarConsolidacoes(token: string, numeroPessoa: number): Promise<ConsolidacaoItem[]> {
  const res = await fetch(HTTP_PATHS.consolidacaoConsultar, {
    method: "POST",
    headers: {
      ...pessoaHeaders(token, numeroPessoa),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  const text = await res.text();

  if (res.status === 404) {
    try {
      const d = JSON.parse(text) as ConsolidacaoItem[];
      if (Array.isArray(d) && d.length === 1 && !d[0].id && !d[0].situacao) {
        return [];
      }
    } catch { /* sem registros */ }
    return [];
  }
  if (!res.ok) {
    throw new Error(`POST consolidacao/consultar falhou (${res.status}): ${text.slice(0, 800)}`);
  }
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`Resposta consultar nao e array: ${text.slice(0, 200)}`);
  }
  return parsed as ConsolidacaoItem[];
}

export async function fetchGerar(
  token: string,
  numeroPessoa: number,
  consolidacaoId: number,
  dataPagamento: string,
): Promise<GerarResult> {
  const url = HTTP_PATHS.parcelamentoGerar(consolidacaoId, 1, dataPagamento);
  const res = await fetch(url, { headers: pessoaHeaders(token, numeroPessoa) });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GET parcelamento/gerar falhou (${res.status}): ${text.slice(0, 800)}`);
  }
  const data = JSON.parse(text) as Record<string, unknown>;
  return {
    valorUmaParcela: typeof data.valorUmaParcela === "number" ? data.valorUmaParcela : null,
    chaveRedis: typeof data.chaveRedis === "string" ? data.chaveRedis : null,
  };
}

export async function fetchEmitirParcela(
  token: string,
  numeroPessoa: number,
  consolidacaoId: number,
  dataPagamento: string,
): Promise<EmitirResult> {
  const url = HTTP_PATHS.parcelamentoEmitir(consolidacaoId, 1, dataPagamento);
  const res = await fetch(url, { headers: pessoaHeaders(token, numeroPessoa) });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GET parcelamento emitir falhou (${res.status}): ${text.slice(0, 800)}`);
  }
  const data = JSON.parse(text) as Record<string, unknown>;
  const numeroProcessamento = typeof data.numeroProcessamento === "number" ? data.numeroProcessamento : null;
  const dataVencimentoMaximo =
    typeof data.dataVencimentoMaximo === "string"
      ? data.dataVencimentoMaximo
      : `${dataPagamento}T23:59:59-03:00`;

  return {
    numeroProcessamento,
    dataVencimentoMaximo,
    idConsolidacao: typeof data.idConsolidacao === "number" ? data.idConsolidacao : consolidacaoId,
    quantidadeParcelaEmitida: typeof data.quantidadeParcelaEmitida === "number" ? data.quantidadeParcelaEmitida : 1,
  };
}

export interface ConsolidacaoDetalhe {
  quantidadeParcelas: number;
  quantidadeParcelasPagas: number;
  idParcelamento: number | null;
}

export async function fetchConsolidacaoDetalhe(
  token: string,
  numeroPessoa: number,
  consolidacaoId: number,
): Promise<ConsolidacaoDetalhe> {
  const url = HTTP_PATHS.consolidacaoDetalhe(consolidacaoId);
  const res = await fetch(url, { headers: pessoaHeaders(token, numeroPessoa) });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GET consolidacao/consultarPorId falhou (${res.status}): ${text.slice(0, 800)}`);
  }
  const data = JSON.parse(text) as Record<string, unknown>;
  const quantidadeParcelas = typeof data.quantidadeParcelas === "number" ? data.quantidadeParcelas : 1;
  const quantidadeParcelasPagas = typeof data.quantidadeParcelasPagas === "number" ? data.quantidadeParcelasPagas : 0;
  const idParcelamento = typeof data.idParcelamento === "number" ? data.idParcelamento : null;
  return { quantidadeParcelas, quantidadeParcelasPagas, idParcelamento };
}

export interface DarPdfResult {
  pdf: Buffer;
  /** Nome do arquivo sugerido pelo servidor via header x-filename (ex: "PARCELA N°4 DE 60 - 11839802.pdf"). */
  filename: string | null;
}

export async function fetchDarPdf(
  token: string,
  numeroPessoa: number,
  numeroProcessamento: number,
  dataVencimento: string,
): Promise<DarPdfResult> {
  const body = { informacoesDar: [{ numeroProcessamento, dataVencimento }] };
  const res = await fetch(HTTP_PATHS.darVisualizar, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/octet-stream",
      "x-pessoadetrabalho": String(numeroPessoa),
    },
    body: JSON.stringify(body),
  });
  const buf = Buffer.from(await res.arrayBuffer());
  if (!res.ok) {
    throw new Error(`POST dar/visualizar falhou (${res.status}): ${buf.toString("utf8").slice(0, 800)}`);
  }
  const filename = res.headers.get("x-filename");
  return { pdf: buf, filename };
}

export function toMaceioMidnight(isoDate: string): string {
  const datePart = isoDate.split("T")[0];
  return `${datePart}T00:00:00-03:00`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
