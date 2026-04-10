import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { readInputWorkbook } from "../workbook.js";

const PORTAL_BASE = "https://contribuinte.sefaz.al.gov.br/parcelamento";

const PATHS = {
  autenticar: `${PORTAL_BASE}/sfz-security-api/api/autenticar`,
  pessoa: `${PORTAL_BASE}/sfz-pessoa-api/api/pessoa`,
  consolidacaoConsultar: `${PORTAL_BASE}/sfz-parcelamento-api/api/consolidacao/consultar`,
  parcelamentoGerar: (sequencial: number, quantidade: number, dataPagamento: string | null) =>
    `${PORTAL_BASE}/sfz-parcelamento-api/api/parcelamento/gerar/${sequencial}/${quantidade}/${dataPagamento === null ? "null" : dataPagamento}`,
  parcelamentoEmitir: (sequencial: number, quantidade: number, dataPagamento: string | null) =>
    `${PORTAL_BASE}/sfz-parcelamento-api/api/parcelamento/${sequencial}/${quantidade}/${dataPagamento === null ? "null" : dataPagamento}`,
} as const;

function parseArgs(argv: string[]): {
  inputPath: string;
  rowIndex: number;
  outPdf: string;
  sequencialOverride?: number;
} {
  let inputPath = "EmpresasAlagoas.xlsx";
  let rowIndex = 0;
  let outPdf = path.join("output", "spike", "boleto-http-spike.pdf");
  let sequencialOverride: number | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--input") {
      inputPath = argv[i + 1] ?? inputPath;
      i += 1;
      continue;
    }
    if (a === "--row") {
      rowIndex = Math.max(0, Number.parseInt(argv[i + 1] ?? "0", 10) || 0);
      i += 1;
      continue;
    }
    if (a === "--out") {
      outPdf = argv[i + 1] ?? outPdf;
      i += 1;
      continue;
    }
    if (a === "--sequencial") {
      sequencialOverride = Number.parseInt(argv[i + 1] ?? "", 10);
      i += 1;
      continue;
    }
  }

  return { inputPath, rowIndex, outPdf, sequencialOverride };
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

async function autenticar(username: string, password: string): Promise<string> {
  const res = await fetch(PATHS.autenticar, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
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
    throw new Error(`Resposta de autenticacao sem token conhecido: ${JSON.stringify(Object.keys(data))}`);
  }
  return token;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

async function fetchPessoa(token: string, numeroDocumento: string): Promise<Record<string, unknown>> {
  const url = `${PATHS.pessoa}?numeroDocumento=${encodeURIComponent(numeroDocumento)}`;
  const res = await fetch(url, { headers: authHeaders(token) });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GET pessoa falhou (${res.status}): ${text.slice(0, 600)}`);
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`Resposta pessoa nao e JSON: ${text.slice(0, 200)}`);
  }
}

function numeroPessoaFrom(pessoa: Record<string, unknown>): string {
  const n = pessoa.numeroPessoa;
  if (typeof n === "number" && Number.isFinite(n)) {
    return String(n);
  }
  if (typeof n === "string" && n.trim()) {
    return n.trim();
  }
  throw new Error(`Campo numeroPessoa ausente ou invalido em pessoa: ${JSON.stringify(Object.keys(pessoa))}`);
}

async function consultarConsolidacoes(token: string, body: unknown): Promise<unknown> {
  const res = await fetch(PATHS.consolidacaoConsultar, {
    method: "POST",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`POST consolidacao/consultar falhou (${res.status}): ${text.slice(0, 800)}`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Resposta consultar nao e JSON: ${text.slice(0, 400)}`);
  }
}

function extractSequencial(consultarPayload: unknown): number {
  if (!Array.isArray(consultarPayload)) {
    throw new Error(`Esperado array na consulta de consolidacoes, veio: ${typeof consultarPayload}`);
  }
  for (const item of consultarPayload) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const o = item as Record<string, unknown>;
    const seq = o.sequencial;
    if (typeof seq === "number" && Number.isFinite(seq)) {
      return seq;
    }
    if (typeof seq === "string" && /^\d+$/.test(seq)) {
      return Number.parseInt(seq, 10);
    }
  }
  throw new Error("Nenhuma consolidacao com campo sequencial encontrada na lista.");
}

async function fetchGerar(token: string, sequencial: number): Promise<void> {
  const url = PATHS.parcelamentoGerar(sequencial, 1, null);
  const res = await fetch(url, { headers: authHeaders(token) });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GET parcelamento/gerar falhou (${res.status}): ${text.slice(0, 800)}`);
  }
}

async function fetchEmitirPdf(token: string, sequencial: number): Promise<Buffer> {
  const url = PATHS.parcelamentoEmitir(sequencial, 1, null);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/pdf,*/*" } });
  const buf = Buffer.from(await res.arrayBuffer());
  if (!res.ok) {
    throw new Error(`GET parcelamento emitir falhou (${res.status}): ${buf.toString("utf8").slice(0, 800)}`);
  }
  return buf;
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const { inputPath, rowIndex, outPdf, sequencialOverride } = parseArgs(argv);
  const cwd = process.cwd();
  const absoluteInput = path.resolve(cwd, inputPath);
  const rows = readInputWorkbook(absoluteInput);
  const row = rows[rowIndex];
  if (!row) {
    throw new Error(`Linha indice ${rowIndex} inexistente (total ${rows.length}).`);
  }

  const docDigits = onlyDigits(row.usuario);
  const numeroDocumento = docDigits || row.usuario.trim();
  if (!numeroDocumento) {
    throw new Error("USUARIO na planilha esta vazio.");
  }

  const logDoc = docDigits ? `${docDigits.slice(0, 4)}…` : `${row.usuario.slice(0, 4)}…`;
  console.log(`HTTP spike: empresa=${row.empresa}, documento=${logDoc}, linha planilha=${row.rowNumber}`);

  const token = await autenticar(row.usuario, row.senha);
  const pessoa = await fetchPessoa(token, numeroDocumento);
  const numPessoa = numeroPessoaFrom(pessoa);

  const consultBodies: unknown[] = [
    { numPessoa },
    { numPessoa: Number.parseInt(numPessoa, 10) },
    { placa: null, renavam: null },
  ];

  let lista: unknown;
  let lastErr: Error | undefined;
  for (const body of consultBodies) {
    try {
      lista = await consultarConsolidacoes(token, body);
      console.log(`POST consolidacao/consultar ok com corpo ${JSON.stringify(body)}`);
      lastErr = undefined;
      break;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      console.warn(`Tentativa consultar falhou: ${lastErr.message}`);
    }
  }
  if (lastErr) {
    throw lastErr;
  }

  const sequencial = sequencialOverride ?? extractSequencial(lista);
  console.log(`Sequencial consolidacao: ${sequencial}`);

  await fetchGerar(token, sequencial);
  const pdf = await fetchEmitirPdf(token, sequencial);

  const head = pdf.subarray(0, 5).toString("utf8");
  if (!head.startsWith("%PDF")) {
    console.warn("Aviso: bytes iniciais nao parecem PDF; conferir arquivo e content-type no portal.");
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
