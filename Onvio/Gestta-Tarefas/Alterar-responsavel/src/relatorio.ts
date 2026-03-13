/**
 * Relatório de execução: metadados + resultados por linha.
 * Usado para persistir cada execução em JSON, XLSX e manter índice das últimas N execuções.
 */

import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { ResultadoLinha } from "./types";

/** Metadados da execução (data/hora, planilha, totais). */
export interface MetadadosExecucao {
  inicio: string;
  fim: string;
  planilha: string;
  total: number;
  sucesso: number;
  falha: number;
  /** Indica se esta execução foi um reprocessamento de falhas. */
  reprocessamento?: boolean;
  /** Arquivo de relatório de origem (quando reprocessamento a partir de relatório). */
  origemRelatorio?: string;
}

/** Item de resultado serializável para o JSON (permite reconstruir LinhaPlanilha). */
export interface ResultadoItemRelatorio {
  cnpj: string;
  responsavel: string;
  mesGeracao: string;
  departamento?: string;
  setor?: string;
  sucesso: boolean;
  mensagem: string;
  etapaFalha?: string;
}

/** Relatório completo de uma execução. */
export interface RelatorioExecucao {
  execucao: MetadadosExecucao;
  resultados: ResultadoItemRelatorio[];
}

/** Entrada no índice de execuções. */
export interface EntradaIndice {
  arquivo: string;
  inicio: string;
  planilha: string;
  total: number;
  sucesso: number;
  falha: number;
}

const PASTA_RELATORIOS = "relatorios";
const ARQUIVO_INDICE = "indice.json";
const MAX_ENTRADAS_INDICE = 50;

/** Diretório base: Alterar-responsavel (onde roda o processo). */
function getRelatoriosDir(): string {
  return path.join(process.cwd(), PASTA_RELATORIOS);
}

function formatMesGeracao(month: number, year: number): string {
  return `${String(month).padStart(2, "0")}/${year}`;
}

/** Converte ResultadoLinha para o formato serializável do relatório. */
function resultadoParaItem(r: ResultadoLinha): ResultadoItemRelatorio {
  const { linha, sucesso, mensagem, etapaFalha } = r;
  const mesGeracao = formatMesGeracao(linha.mesGeracao.month, linha.mesGeracao.year);
  return {
    cnpj: linha.cnpj,
    responsavel: linha.responsavel,
    mesGeracao,
    departamento: linha.departamento,
    setor: linha.setor,
    sucesso,
    mensagem,
    etapaFalha,
  };
}

/**
 * Monta o objeto do relatório (metadados + resultados).
 * @param planilhaPath Caminho da planilha
 * @param resultados Array de ResultadoLinha
 * @param inicioExecucao Data/hora ISO de início (opcional; usa agora se omitido)
 * @param reprocessamento Se true, marca execucao.reprocessamento
 * @param origemRelatorio Nome do arquivo de relatório de origem (reprocessamento a partir de arquivo)
 */
export function gerarRelatorioExecucao(
  planilhaPath: string,
  resultados: ResultadoLinha[],
  inicioExecucao?: string,
  reprocessamento?: boolean,
  origemRelatorio?: string
): RelatorioExecucao {
  const inicio = inicioExecucao || new Date().toISOString();
  const fim = new Date().toISOString();
  const sucesso = resultados.filter((r) => r.sucesso).length;
  const falha = resultados.length - sucesso;

  return {
    execucao: {
      inicio,
      fim,
      planilha: planilhaPath,
      total: resultados.length,
      sucesso,
      falha,
      ...(reprocessamento && { reprocessamento: true }),
      ...(origemRelatorio && { origemRelatorio }),
    },
    resultados: resultados.map(resultadoParaItem),
  };
}

/**
 * Garante que a pasta relatorios existe, gera nome do arquivo, grava o JSON e retorna o caminho.
 * Em caso de erro (disco, permissão), loga e retorna null (não lança).
 */
export function salvarRelatorio(relatorio: RelatorioExecucao): string | null {
  try {
    const dir = getRelatoriosDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const now = new Date();
    const nomeArquivo = `execucao_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}.json`;
    const caminho = path.join(dir, nomeArquivo);
    fs.writeFileSync(caminho, JSON.stringify(relatorio, null, 2), "utf8");
    return caminho;
  } catch (err) {
    console.error("[relatório] Erro ao salvar relatório:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Lê ou cria o índice, adiciona a nova entrada no início, mantém só as últimas N entradas e grava.
 * Em caso de erro, loga e não lança.
 */
export function atualizarIndice(
  caminhoRelatorio: string,
  totais: { total: number; sucesso: number; falha: number },
  planilhaPath: string,
  inicio: string
): void {
  try {
    const dir = getRelatoriosDir();
    const indicePath = path.join(dir, ARQUIVO_INDICE);
    let ultimasExecucoes: EntradaIndice[] = [];

    if (fs.existsSync(indicePath)) {
      const raw = fs.readFileSync(indicePath, "utf8");
      try {
        const data = JSON.parse(raw) as { ultimasExecucoes?: EntradaIndice[] };
        ultimasExecucoes = Array.isArray(data.ultimasExecucoes) ? data.ultimasExecucoes : [];
      } catch {
        ultimasExecucoes = [];
      }
    }

    const nomeArquivo = path.basename(caminhoRelatorio);
    ultimasExecucoes.unshift({
      arquivo: nomeArquivo,
      inicio,
      planilha: planilhaPath,
      total: totais.total,
      sucesso: totais.sucesso,
      falha: totais.falha,
    });

    if (ultimasExecucoes.length > MAX_ENTRADAS_INDICE) {
      ultimasExecucoes = ultimasExecucoes.slice(0, MAX_ENTRADAS_INDICE);
    }

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      indicePath,
      JSON.stringify({ ultimasExecucoes }, null, 2),
      "utf8"
    );
  } catch (err) {
    console.error("[relatório] Erro ao atualizar índice:", err instanceof Error ? err.message : err);
  }
}

/**
 * Gera arquivo .xlsx com o mesmo conteúdo do relatório (aba Resumo + aba Resultados).
 * Usa o mesmo nome base do JSON quando caminhoJson é informado (ex.: execucao_2026-03-11_15-57-32.xlsx).
 * Em caso de erro, loga e retorna null (não lança).
 */
export function salvarRelatorioXlsx(
  relatorio: RelatorioExecucao,
  caminhoJson: string | null
): string | null {
  try {
    const dir = getRelatoriosDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let nomeArquivo: string;
    if (caminhoJson && caminhoJson.toLowerCase().endsWith(".json")) {
      nomeArquivo = path.basename(caminhoJson).replace(/\.json$/i, ".xlsx");
    } else {
      const now = new Date();
      nomeArquivo = `execucao_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}.xlsx`;
    }
    const caminho = path.join(dir, nomeArquivo);

    const workbook = XLSX.utils.book_new();
    const { execucao, resultados } = relatorio;

    // Aba Resumo
    const resumoData = [
      ["Campo", "Valor"],
      ["Início", execucao.inicio],
      ["Fim", execucao.fim],
      ["Planilha", execucao.planilha],
      ["Total", execucao.total],
      ["Sucesso", execucao.sucesso],
      ["Falha", execucao.falha],
      ...(execucao.reprocessamento ? [["Reprocessamento", "Sim"]] : []),
      ...(execucao.origemRelatorio ? [["Origem (relatório)", execucao.origemRelatorio]] : []),
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
    XLSX.utils.book_append_sheet(workbook, wsResumo, "Resumo");

    // Aba Resultados
    const headers = [
      "CNPJ",
      "Responsável",
      "Mês Geração",
      "Departamento",
      "Setor",
      "Sucesso",
      "Mensagem",
      "Etapa Falha",
    ];
    const rows: (string | boolean)[][] = resultados.map((r) => [
      r.cnpj,
      r.responsavel,
      r.mesGeracao,
      r.departamento ?? "",
      r.setor ?? "",
      r.sucesso ? "Sim" : "Não",
      r.mensagem,
      r.etapaFalha ?? "",
    ]);
    const wsResultados = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(workbook, wsResultados, "Resultados");

    XLSX.writeFile(workbook, caminho);
    return caminho;
  } catch (err) {
    console.error("[relatório] Erro ao salvar XLSX:", err instanceof Error ? err.message : err);
    return null;
  }
}
