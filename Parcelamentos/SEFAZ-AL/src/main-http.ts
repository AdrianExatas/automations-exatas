import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { chromium, type Browser } from "playwright";
import {
  HttpRequestError,
  SITUACOES_ATIVAS,
  autenticar,
  consultarConsolidacoes,
  fetchAccount,
  fetchConsolidacaoDetalhe,
  fetchDarPdf,
  fetchEmitirParcela,
  fetchGerar,
  toMaceioMidnight,
  todayIso,
} from "./http-client.js";
import { processPortalRow } from "./portal.js";
import type { InputRow, RunResult } from "./types.js";
import {
  buildExecutionOutputDir,
  buildHttpOutputPath,
  formatVencimento,
} from "./utils.js";
import { readInputWorkbook, writeResultWorkbook } from "./workbook.js";

const DEFAULT_INPUT_PATH = "EmpresasAlagoas.xlsx";
const DEFAULT_OUTPUT_DIR = path.join("output", "downloads");

interface HttpCliOptions {
  inputPath: string;
  outputDir: string;
  rowFilter?: number;
  browserFallback: boolean;
}

interface BrowserFallbackCandidate {
  consolidacaoId: number;
  httpMessage: string;
}

interface ProcessRowHttpOptions {
  browserFallback: boolean;
}

function parseCliArgs(args: string[]): HttpCliOptions {
  let inputPath = DEFAULT_INPUT_PATH;
  let outputDir = DEFAULT_OUTPUT_DIR;
  let rowFilter: number | undefined;
  let browserFallback = true;

  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === "--input") { inputPath = args[i + 1] ?? inputPath; i += 1; continue; }
    if (a === "--output") { outputDir = args[i + 1] ?? outputDir; i += 1; continue; }
    if (a === "--no-browser-fallback") { browserFallback = false; continue; }
    if (a === "--row") {
      const n = Number.parseInt(args[i + 1] ?? "", 10);
      if (Number.isFinite(n)) rowFilter = n;
      i += 1;
      continue;
    }
  }

  return { inputPath, outputDir, rowFilter, browserFallback };
}

async function processRowHttp(
  row: InputRow,
  outputRoot: string,
  dataPagamento: string,
  options: ProcessRowHttpOptions,
): Promise<RunResult[]> {
  const results: RunResult[] = [];
  const fallbackCandidates: BrowserFallbackCandidate[] = [];

  const token = await autenticar(row.usuario, row.senha);
  const { numeroPessoa, login } = await fetchAccount(token);
  console.log(`  login=${login}, numeroPessoa=${numeroPessoa}`);

  const lista = await consultarConsolidacoes(token, numeroPessoa);
  const ativas = lista.filter(
    (i) => i.situacao && SITUACOES_ATIVAS.has(i.situacao) && !i.mensagemNaoEmitirDAR,
  );
  console.log(`  Consolidacoes: ${lista.length} total, ${ativas.length} ativas`);

  if (ativas.length === 0) {
    results.push({
      rowNumber: row.rowNumber,
      empresa: row.empresa,
      usuario: row.usuario,
      status: "erro",
      mensagem: "Nenhuma consolidacao ativa disponivel.",
    });
    return results;
  }

  for (const consolidacao of ativas) {
    const consolidacaoId = consolidacao.id as number;

    try {
      const result = await processConsolidacaoHttp(row, outputRoot, token, numeroPessoa, consolidacaoId, dataPagamento);
      results.push(result);

      console.log(`  [ok] consolidacao=${consolidacaoId}, arquivo=${path.basename(result.arquivoSalvo ?? "")} (${result.tempoCalculoMs}ms)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (options.browserFallback && shouldUseBrowserFallback(error)) {
        fallbackCandidates.push({ consolidacaoId, httpMessage: message });
        console.error(`  [erro-http] consolidacao=${consolidacaoId}: ${message} (fallback navegador agendado)`);
      } else {
        results.push(buildHttpErrorResult(row, consolidacaoId, message));
        console.error(`  [erro] consolidacao=${consolidacaoId}: ${message}`);
      }
    }
  }

  if (fallbackCandidates.length > 0) {
    const fallbackResults = await processBrowserFallback(row, outputRoot, fallbackCandidates);
    results.push(...fallbackResults);
  }

  return results;
}

async function processConsolidacaoHttp(
  row: InputRow,
  outputRoot: string,
  token: string,
  numeroPessoa: number,
  consolidacaoId: number,
  dataPagamento: string,
): Promise<RunResult> {
  const inicioMs = Date.now();
  const detalhe = await fetchConsolidacaoDetalhe(token, numeroPessoa, consolidacaoId);
  const numeroParcelaEmitida = detalhe.quantidadeParcelasPagas + 1;
  const totalParcelas = detalhe.quantidadeParcelas;

  await fetchGerar(token, numeroPessoa, consolidacaoId, dataPagamento);

  let emitirResult = await fetchEmitirParcela(token, numeroPessoa, consolidacaoId, dataPagamento);

  if (!emitirResult.numeroProcessamento) {
    await new Promise((r) => setTimeout(r, 1000));
    await fetchGerar(token, numeroPessoa, consolidacaoId, dataPagamento);
    emitirResult = await fetchEmitirParcela(token, numeroPessoa, consolidacaoId, dataPagamento);
    if (!emitirResult.numeroProcessamento) {
      throw new Error(`numeroProcessamento nulo para consolidacao ${consolidacaoId} (cache Redis ativo).`);
    }
  }

  const dataVencimento = toMaceioMidnight(emitirResult.dataVencimentoMaximo);
  const { pdf } = await fetchDarPdf(token, numeroPessoa, emitirResult.numeroProcessamento, dataVencimento);

  const head = pdf.subarray(0, 5).toString("ascii");
  if (!head.startsWith("%PDF")) {
    throw new Error(
      `Resposta de dar/visualizar nao e PDF (bytes: ${pdf.subarray(0, 10).toString("hex")}).`,
    );
  }

  const vencimento = formatVencimento(emitirResult.dataVencimentoMaximo);
  const filePath = buildHttpOutputPath(
    outputRoot,
    row.empresa,
    String(consolidacaoId),
    numeroParcelaEmitida,
    totalParcelas,
    vencimento,
  );

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, pdf);

  return {
    rowNumber: row.rowNumber,
    empresa: row.empresa,
    usuario: row.usuario,
    consolidacao: String(consolidacaoId),
    parcelamento: String(emitirResult.idConsolidacao),
    numeroParcelaEmitida,
    vencimento,
    arquivoSalvo: filePath,
    tempoCalculoMs: Date.now() - inicioMs,
    status: "sucesso",
    mensagem: `PDF salvo (${pdf.length} bytes)`,
  };
}

async function processBrowserFallback(
  row: InputRow,
  outputRoot: string,
  candidates: BrowserFallbackCandidate[],
): Promise<RunResult[]> {
  const consolidacoes = candidates.map((candidate) => candidate.consolidacaoId);
  console.log(`  [fallback] tentando via navegador: consolidacoes=${consolidacoes.join(", ")}`);

  let portalResults: RunResult[] = [];
  let fatalFallbackMessage: string | undefined;
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    portalResults = await processPortalRow(browser, row, outputRoot, { consolidacoes });
  } catch (error) {
    fatalFallbackMessage = error instanceof Error ? error.message : String(error);
  } finally {
    await browser?.close();
  }

  const resultsByConsolidacao = new Map(portalResults.map((result) => [result.consolidacao, result]));

  return candidates.map((candidate) => {
    const consolidacao = String(candidate.consolidacaoId);
    const portalResult = fatalFallbackMessage === undefined ? resultsByConsolidacao.get(consolidacao) : undefined;

    if (fatalFallbackMessage !== undefined) {
      const failed = buildBrowserFallbackFailureResult(row, candidate.consolidacaoId, candidate.httpMessage, fatalFallbackMessage);
      console.error(`  [fallback-erro] consolidacao=${consolidacao}: ${failed.mensagem}`);
      return failed;
    }

    if (!portalResult) {
      const failed = buildBrowserFallbackFailureResult(
        row,
        candidate.consolidacaoId,
        candidate.httpMessage,
        "O fallback via navegador nao retornou resultado para a consolidacao.",
      );
      console.error(`  [fallback-erro] consolidacao=${consolidacao}: ${failed.mensagem}`);
      return failed;
    }

    if (portalResult.status === "sucesso") {
      const recovered = withBrowserFallbackDiagnostics(portalResult, candidate.httpMessage);
      console.log(`  [fallback-ok] consolidacao=${consolidacao}, arquivo=${path.basename(recovered.arquivoSalvo ?? "")}`);
      return recovered;
    }

    const failed = buildBrowserFallbackFailureResult(row, candidate.consolidacaoId, candidate.httpMessage, portalResult.mensagem);
    console.error(`  [fallback-erro] consolidacao=${consolidacao}: ${failed.mensagem}`);
    return failed;
  });
}

export function shouldUseBrowserFallback(error: unknown): boolean {
  return (
    error instanceof HttpRequestError &&
    (error.step === "parcelamento_gerar" || error.step === "parcelamento_emitir" || error.step === "dar_visualizar")
  );
}

export function withBrowserFallbackDiagnostics(result: RunResult, httpMessage: string): RunResult {
  return {
    ...result,
    mensagem: `${result.mensagem} Recuperado via navegador apos falha HTTP.`,
    mensagemDiagnostico: appendDiagnostic(result.mensagemDiagnostico, `falha_http=${sanitizeDiagnosticValue(httpMessage)}`),
  };
}

export function buildBrowserFallbackFailureResult(
  row: InputRow,
  consolidacaoId: number,
  httpMessage: string,
  fallbackMessage: string,
): RunResult {
  return {
    rowNumber: row.rowNumber,
    empresa: row.empresa,
    usuario: row.usuario,
    consolidacao: String(consolidacaoId),
    status: "erro",
    mensagem: `HTTP falhou: ${httpMessage}; fallback navegador falhou: ${fallbackMessage}`,
    mensagemDiagnostico: [
      `falha_http=${sanitizeDiagnosticValue(httpMessage)}`,
      `falha_fallback_navegador=${sanitizeDiagnosticValue(fallbackMessage)}`,
    ].join("; "),
  };
}

function buildHttpErrorResult(row: InputRow, consolidacaoId: number, message: string): RunResult {
  return {
    rowNumber: row.rowNumber,
    empresa: row.empresa,
    usuario: row.usuario,
    consolidacao: String(consolidacaoId),
    status: "erro",
    mensagem: message,
  };
}

function appendDiagnostic(current: string | undefined, next: string): string {
  return current ? `${current}; ${next}` : next;
}

function sanitizeDiagnosticValue(value: string): string {
  return value.replace(/\s+/g, " ").replace(/;/g, ",").trim();
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const { inputPath, outputDir, rowFilter, browserFallback } = parseCliArgs(argv);
  const cwd = process.cwd();
  const absoluteInput = path.resolve(cwd, inputPath);
  const outputBaseDir = path.resolve(cwd, outputDir);
  const outputRoot = buildExecutionOutputDir(outputBaseDir);

  const allRows = readInputWorkbook(absoluteInput);
  const rows = rowFilter !== undefined ? allRows.filter((_, i) => i === rowFilter) : allRows;

  console.log(`Planilha: ${absoluteInput}`);
  console.log(`Raiz de downloads: ${outputBaseDir}`);
  console.log(`Pasta desta execucao: ${outputRoot}`);
  if (rowFilter !== undefined) {
    console.log(`Processando somente rowIndex=${rowFilter}`);
  }
  console.log(`Fallback via navegador: ${browserFallback ? "ativo" : "desativado"}`);
  console.log(`Empresas para processar: ${rows.length}`);

  const dataPagamento = todayIso();
  console.log(`Data de pagamento: ${dataPagamento}`);

  const results: RunResult[] = [];

  for (const row of rows) {
    console.log(`\n[linha ${row.rowNumber}] Processando empresa ${row.empresa}...`);
    try {
      const rowResults = await processRowHttp(row, outputRoot, dataPagamento, { browserFallback });
      results.push(...rowResults);

      const ok = rowResults.filter((r) => r.status === "sucesso").length;
      const err = rowResults.filter((r) => r.status === "erro").length;
      console.log(`[linha ${row.rowNumber}] Concluido. Sucesso: ${ok}. Erro: ${err}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        rowNumber: row.rowNumber,
        empresa: row.empresa,
        usuario: row.usuario,
        status: "erro",
        mensagem: message,
      });
      console.error(`[linha ${row.rowNumber}] Erro fatal: ${message}`);
    }
  }

  const reportPath = await writeResultWorkbook(results, cwd);
  const successCount = results.filter((r) => r.status === "sucesso").length;
  const errorCount = results.filter((r) => r.status === "erro").length;

  console.log(`\nProcessamento concluido. Sucessos: ${successCount}. Erros: ${errorCount}.`);
  console.log(`Relatorio salvo em: ${reportPath}`);

  if (errorCount > 0) {
    process.exitCode = 1;
  }
}

const executedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (executedFilePath && pathToFileURL(executedFilePath).href === import.meta.url) {
  main().catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
