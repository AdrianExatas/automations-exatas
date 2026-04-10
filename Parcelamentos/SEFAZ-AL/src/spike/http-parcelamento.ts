import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { readInputWorkbook } from "../workbook.js";

const PORTAL_BASE = "https://contribuinte.sefaz.al.gov.br/parcelamento";

const PATHS = {
  autenticar: `${PORTAL_BASE}/sfz-security-api/api/autenticar`,
  account: `${PORTAL_BASE}/api/account`,
  consolidacaoConsultar: `${PORTAL_BASE}/sfz-parcelamento-api/api/consolidacao/consultar`,
  parcelamentoGerar: (seq: number, qty: number, date: string) =>
    `${PORTAL_BASE}/sfz-parcelamento-api/api/parcelamento/gerar/${seq}/${qty}/${date}`,
  parcelamentoEmitir: (seq: number, qty: number, date: string) =>
    `${PORTAL_BASE}/sfz-parcelamento-api/api/parcelamento/${seq}/${qty}/${date}`,
  darVisualizar: `${PORTAL_BASE}/sfz-parcelamento-api/api/dar/visualizar`,
} as const;

const SITUACOES_ATIVAS = new Set(["DAR", "CONFIRMADO", "PARCELADO", "ATRASO", "SIMULACAO"]);

function parseArgs(argv: string[]): {
  inputPath: string;
  rowIndex: number;
  outPdf: string;
  consolidacaoOverride?: number;
} {
  let inputPath = "EmpresasAlagoas.xlsx";
  let rowIndex = 0;
  let outPdf = path.join("output", "spike", "boleto-http-spike.pdf");
  let consolidacaoOverride: number | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--input") { inputPath = argv[i + 1] ?? inputPath; i += 1; continue; }
    if (a === "--row") { rowIndex = Math.max(0, Number.parseInt(argv[i + 1] ?? "0", 10) || 0); i += 1; continue; }
    if (a === "--out") { outPdf = argv[i + 1] ?? outPdf; i += 1; continue; }
    if (a === "--consolidacao") { consolidacaoOverride = Number.parseInt(argv[i + 1] ?? "", 10); i += 1; continue; }
  }

  return { inputPath, rowIndex, outPdf, consolidacaoOverride };
}

async function autenticar(username: string, password: string): Promise<string> {
  const res = await fetch(PATHS.autenticar, {
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
  if (!token) throw new Error(`Token nao encontrado: ${JSON.stringify(Object.keys(data))}`);
  return token;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, Accept: "application/json" };
}

async function fetchAccount(token: string): Promise<{ numeroPessoa: number; login: string }> {
  const res = await fetch(PATHS.account, { headers: authHeaders(token) });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`GET account falhou (${res.status}): ${JSON.stringify(data).slice(0, 400)}`);
  const np = data.numeroPessoa;
  if (typeof np !== "number" || !Number.isFinite(np)) {
    throw new Error(`numeroPessoa ausente/invalido em account: ${JSON.stringify(Object.keys(data))}`);
  }
  return { numeroPessoa: np, login: typeof data.login === "string" ? data.login : "" };
}

interface ConsolidacaoItem {
  id?: number | null;
  situacao?: string | null;
  mensagemNaoEmitirDAR?: string | null;
  [key: string]: unknown;
}

async function consultarConsolidacoes(token: string, numeroPessoa: number): Promise<ConsolidacaoItem[]> {
  const res = await fetch(PATHS.consolidacaoConsultar, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json", "x-pessoadetrabalho": String(numeroPessoa) },
    body: JSON.stringify({}),
  });
  const text = await res.text();

  if (res.status === 404) {
    try {
      const d = JSON.parse(text) as ConsolidacaoItem[];
      if (Array.isArray(d) && d.length === 1 && !d[0].id && !d[0].situacao) {
        return [];
      }
    } catch { /* ignore */ }
    return [];
  }
  if (!res.ok) throw new Error(`POST consolidacao/consultar falhou (${res.status}): ${text.slice(0, 800)}`);

  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) throw new Error(`Resposta consultar nao e array: ${text.slice(0, 200)}`);
  return parsed as ConsolidacaoItem[];
}

function pickConsolidacaoId(lista: ConsolidacaoItem[]): number {
  const ativas = lista.filter((i) => i.situacao && SITUACOES_ATIVAS.has(i.situacao) && !i.mensagemNaoEmitirDAR);
  const candidatos = ativas.length > 0 ? ativas : lista.filter((i) => i.situacao && SITUACOES_ATIVAS.has(i.situacao));

  for (const item of candidatos) {
    const v = item.id;
    if (typeof v === "number" && v > 0) return v;
    if (typeof v === "string" && /^\d+$/.test(v)) return Number.parseInt(v, 10);
  }
  const situacoes = lista.map((i) => i.situacao).join(", ");
  throw new Error(`Nenhuma consolidacao ativa com id encontrada (situacoes: ${situacoes}).`);
}

interface EmitirResult {
  numeroProcessamento: number | null;
  dataVencimentoMaximo: string;
  idConsolidacao: number;
}

async function fetchGerar(token: string, numeroPessoa: number, consolidacaoId: number, dataPagamento: string): Promise<void> {
  const url = PATHS.parcelamentoGerar(consolidacaoId, 1, dataPagamento);
  const res = await fetch(url, { headers: { ...authHeaders(token), "x-pessoadetrabalho": String(numeroPessoa) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET parcelamento/gerar falhou (${res.status}): ${text.slice(0, 800)}`);
  const data = JSON.parse(text) as Record<string, unknown>;
  console.log(`GET gerar: ok | valorUmaParcela=${data.valorUmaParcela} | chaveRedis=${data.chaveRedis}`);
}

async function fetchEmitirParcela(
  token: string,
  numeroPessoa: number,
  consolidacaoId: number,
  dataPagamento: string,
): Promise<EmitirResult> {
  const url = PATHS.parcelamentoEmitir(consolidacaoId, 1, dataPagamento);
  const res = await fetch(url, { headers: { ...authHeaders(token), "x-pessoadetrabalho": String(numeroPessoa) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET parcelamento emitir falhou (${res.status}): ${text.slice(0, 800)}`);
  const data = JSON.parse(text) as Record<string, unknown>;
  console.log(`GET emitir: ok | numeroProcessamento=${data.numeroProcessamento} | dataVencimentoMaximo=${data.dataVencimentoMaximo}`);

  const numeroProcessamento = typeof data.numeroProcessamento === "number" ? data.numeroProcessamento : null;
  const dataVencimentoMaximo =
    typeof data.dataVencimentoMaximo === "string" ? data.dataVencimentoMaximo : dataPagamento + "T23:59:59-03:00";
  const idConsolidacao = typeof data.idConsolidacao === "number" ? data.idConsolidacao : consolidacaoId;

  return { numeroProcessamento, dataVencimentoMaximo, idConsolidacao };
}

function toMaceioMidnight(isoDate: string): string {
  const datePart = isoDate.split("T")[0];
  return `${datePart}T00:00:00-03:00`;
}

async function fetchDarPdf(
  token: string,
  numeroPessoa: number,
  numeroProcessamento: number,
  dataVencimento: string,
): Promise<Buffer> {
  const body = {
    informacoesDar: [{ numeroProcessamento, dataVencimento }],
  };
  const res = await fetch(PATHS.darVisualizar, {
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
  return buf;
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const { inputPath, rowIndex, outPdf, consolidacaoOverride } = parseArgs(argv);
  const cwd = process.cwd();
  const absoluteInput = path.resolve(cwd, inputPath);
  const rows = readInputWorkbook(absoluteInput);
  const row = rows[rowIndex];
  if (!row) throw new Error(`Linha indice ${rowIndex} inexistente (total ${rows.length}).`);

  console.log(`HTTP spike: empresa=${row.empresa}, linha planilha=${row.rowNumber}`);

  const token = await autenticar(row.usuario, row.senha);
  const { numeroPessoa, login } = await fetchAccount(token);
  console.log(`Autenticado: login=${login}, numeroPessoa=${numeroPessoa}`);

  const lista = await consultarConsolidacoes(token, numeroPessoa);
  const ativas = lista.filter((i) => i.situacao && SITUACOES_ATIVAS.has(i.situacao));
  console.log(`Consolidacoes encontradas: ${lista.length} (ativas: ${ativas.length})`);

  if (ativas.length === 0) {
    console.log("Nenhuma consolidacao ativa disponivel para esta empresa.");
    return;
  }

  const consolidacaoId = consolidacaoOverride ?? pickConsolidacaoId(lista);
  console.log(`Usando consolidacao id=${consolidacaoId}`);

  const dataPagamento = new Date().toISOString().slice(0, 10);
  console.log(`dataPagamento=${dataPagamento}`);

  await fetchGerar(token, numeroPessoa, consolidacaoId, dataPagamento);

  const emitirResult = await fetchEmitirParcela(token, numeroPessoa, consolidacaoId, dataPagamento);

  let numeroProcessamento = emitirResult.numeroProcessamento;
  if (!numeroProcessamento) {
    console.warn("numeroProcessamento nulo na resposta emitir. Tentando consolidacao diferente...");
    const outraConsolidacao = ativas.find((i) => typeof i.id === "number" && i.id !== consolidacaoId);
    if (!outraConsolidacao || !outraConsolidacao.id) {
      throw new Error("Nao foi possivel obter numeroProcessamento de nenhuma consolidacao ativa.");
    }
    const altId = outraConsolidacao.id as number;
    console.log(`Tentando consolidacao alternativa id=${altId}`);
    await fetchGerar(token, numeroPessoa, altId, dataPagamento);
    const altEmitir = await fetchEmitirParcela(token, numeroPessoa, altId, dataPagamento);
    if (!altEmitir.numeroProcessamento) {
      throw new Error("numeroProcessamento continua nulo mesmo em consolidacao alternativa.");
    }
    numeroProcessamento = altEmitir.numeroProcessamento;
    emitirResult.dataVencimentoMaximo = altEmitir.dataVencimentoMaximo;
  }

  const dataVencimento = toMaceioMidnight(emitirResult.dataVencimentoMaximo);
  console.log(`POST dar/visualizar: numeroProcessamento=${numeroProcessamento}, dataVencimento=${dataVencimento}`);

  const pdf = await fetchDarPdf(token, numeroPessoa, numeroProcessamento, dataVencimento);
  const head = pdf.subarray(0, 5).toString("ascii");

  if (!head.startsWith("%PDF")) {
    console.warn(`Aviso: bytes iniciais nao parecem PDF: ${pdf.subarray(0, 20).toString("hex")}`);
    console.warn(`Conteudo (ate 400 chars): ${pdf.toString("utf8").slice(0, 400)}`);
  } else {
    console.log("Validacao %PDF: OK");
  }

  const outAbs = path.resolve(cwd, outPdf);
  await fs.mkdir(path.dirname(outAbs), { recursive: true });
  await fs.writeFile(outAbs, pdf);
  console.log(`PDF salvo em: ${outAbs} (${pdf.length} bytes)`);
}

const executedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (executedFilePath && pathToFileURL(executedFilePath).href === import.meta.url) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.stack ?? e.message : e);
    process.exitCode = 1;
  });
}
