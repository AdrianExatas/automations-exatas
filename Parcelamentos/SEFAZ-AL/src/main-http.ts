import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
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
import type { RunResult } from "./types.js";
import {
  buildCompanyDirectoryName,
  buildParcelamentoDirectoryName,
  buildPdfFileNameHttp,
  formatVencimento,
} from "./utils.js";
import { readInputWorkbook, writeResultWorkbook } from "./workbook.js";

const DEFAULT_INPUT_PATH = "EmpresasAlagoas.xlsx";
const DEFAULT_OUTPUT_DIR = path.join("output", "downloads");

interface HttpCliOptions {
  inputPath: string;
  outputDir: string;
  rowFilter?: number;
}

function parseCliArgs(args: string[]): HttpCliOptions {
  let inputPath = DEFAULT_INPUT_PATH;
  let outputDir = DEFAULT_OUTPUT_DIR;
  let rowFilter: number | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === "--input") { inputPath = args[i + 1] ?? inputPath; i += 1; continue; }
    if (a === "--output") { outputDir = args[i + 1] ?? outputDir; i += 1; continue; }
    if (a === "--row") {
      const n = Number.parseInt(args[i + 1] ?? "", 10);
      if (Number.isFinite(n)) rowFilter = n;
      i += 1;
      continue;
    }
  }

  return { inputPath, outputDir, rowFilter };
}

async function processRowHttp(
  row: { rowNumber: number; empresa: string; usuario: string; senha: string },
  outputRoot: string,
  dataPagamento: string,
): Promise<RunResult[]> {
  const results: RunResult[] = [];

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
    const inicioMs = Date.now();

    try {
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
      const filePath = path.join(
        outputRoot,
        buildCompanyDirectoryName(row.empresa),
        buildParcelamentoDirectoryName(String(consolidacaoId)),
        buildPdfFileNameHttp(String(consolidacaoId), row.empresa, numeroParcelaEmitida, totalParcelas, vencimento),
      );

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, pdf);

      const fileName = path.basename(filePath);
      const tempoCalculoMs = Date.now() - inicioMs;

      results.push({
        rowNumber: row.rowNumber,
        empresa: row.empresa,
        usuario: row.usuario,
        consolidacao: String(consolidacaoId),
        parcelamento: String(emitirResult.idConsolidacao),
        numeroParcelaEmitida,
        arquivoSalvo: filePath,
        tempoCalculoMs,
        status: "sucesso",
        mensagem: `PDF salvo (${pdf.length} bytes)`,
      });

      console.log(
        `  [ok] consolidacao=${consolidacaoId}, arquivo=${fileName} (${pdf.length} bytes, ${tempoCalculoMs}ms)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        rowNumber: row.rowNumber,
        empresa: row.empresa,
        usuario: row.usuario,
        consolidacao: String(consolidacaoId),
        status: "erro",
        mensagem: message,
      });
      console.error(`  [erro] consolidacao=${consolidacaoId}: ${message}`);
    }
  }

  return results;
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const { inputPath, outputDir, rowFilter } = parseCliArgs(argv);
  const cwd = process.cwd();
  const absoluteInput = path.resolve(cwd, inputPath);
  const outputRoot = path.resolve(cwd, outputDir);

  const allRows = readInputWorkbook(absoluteInput);
  const rows = rowFilter !== undefined ? allRows.filter((_, i) => i === rowFilter) : allRows;

  console.log(`Planilha: ${absoluteInput}`);
  console.log(`Saida: ${outputRoot}`);
  if (rowFilter !== undefined) {
    console.log(`Processando somente rowIndex=${rowFilter}`);
  }
  console.log(`Empresas para processar: ${rows.length}`);

  const dataPagamento = todayIso();
  console.log(`Data de pagamento: ${dataPagamento}`);

  const results: RunResult[] = [];

  for (const row of rows) {
    console.log(`\n[linha ${row.rowNumber}] Processando empresa ${row.empresa}...`);
    try {
      const rowResults = await processRowHttp(row, outputRoot, dataPagamento);
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
