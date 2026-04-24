import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { ModoExecucao, ResultadoLinha } from "./types";

export interface MetadadosExecucao {
  inicio: string;
  fim: string;
  planilha: string;
  modo: ModoExecucao;
  total: number;
  sucesso: number;
  falha: number;
}

export interface ResultadoItemRelatorio {
  numero: string;
  empresa: string;
  cnpj: string;
  cnpjOriginal?: string;
  setor: string;
  responsavel: string;
  validador: string;
  customerId?: string;
  approverId?: string;
  groupIds: string[];
  modo: ModoExecucao;
  sucesso: boolean;
  mensagem: string;
  etapaFalha?: string;
}

export interface RelatorioExecucao {
  execucao: MetadadosExecucao;
  resultados: ResultadoItemRelatorio[];
}

export interface EntradaIndice {
  arquivo: string;
  inicio: string;
  planilha: string;
  modo: ModoExecucao;
  total: number;
  sucesso: number;
  falha: number;
}

const PASTA_RELATORIOS = "relatorios";
const ARQUIVO_INDICE = "indice.json";
const MAX_ENTRADAS_INDICE = 50;

function getRelatoriosDir(): string {
  return path.join(process.cwd(), PASTA_RELATORIOS);
}

function resultadoParaItem(r: ResultadoLinha, modo: ModoExecucao): ResultadoItemRelatorio {
  return {
    numero: r.linha.numero,
    empresa: r.linha.empresa,
    cnpj: r.linha.cnpj,
    cnpjOriginal: r.linha.cnpjOriginal,
    setor: r.linha.setor,
    responsavel: r.linha.responsavel,
    validador: r.linha.validador,
    customerId: r.customerId,
    approverId: r.approverId,
    groupIds: r.groupIds ?? [],
    modo,
    sucesso: r.sucesso,
    mensagem: r.mensagem,
    etapaFalha: r.etapaFalha,
  };
}

export function gerarRelatorioExecucao(
  planilhaPath: string,
  modo: ModoExecucao,
  resultados: ResultadoLinha[],
  inicioExecucao?: string,
): RelatorioExecucao {
  const inicio = inicioExecucao || new Date().toISOString();
  const fim = new Date().toISOString();
  const sucesso = resultados.filter((item) => item.sucesso).length;
  const falha = resultados.length - sucesso;

  return {
    execucao: {
      inicio,
      fim,
      planilha: planilhaPath,
      modo,
      total: resultados.length,
      sucesso,
      falha,
    },
    resultados: resultados.map((item) => resultadoParaItem(item, modo)),
  };
}

export function salvarRelatorio(relatorio: RelatorioExecucao): string | null {
  try {
    const dir = getRelatoriosDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const now = new Date();
    const nomeArquivo =
      `execucao_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_` +
      `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}.json`;
    const caminho = path.join(dir, nomeArquivo);
    fs.writeFileSync(caminho, JSON.stringify(relatorio, null, 2), "utf8");
    return caminho;
  } catch (err) {
    console.error("[relatorio] Erro ao salvar relatorio:", err instanceof Error ? err.message : err);
    return null;
  }
}

export function atualizarIndice(
  caminhoRelatorio: string,
  totais: { total: number; sucesso: number; falha: number },
  planilhaPath: string,
  inicio: string,
  modo: ModoExecucao,
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

    ultimasExecucoes.unshift({
      arquivo: path.basename(caminhoRelatorio),
      inicio,
      planilha: planilhaPath,
      modo,
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

    fs.writeFileSync(indicePath, JSON.stringify({ ultimasExecucoes }, null, 2), "utf8");
  } catch (err) {
    console.error("[relatorio] Erro ao atualizar indice:", err instanceof Error ? err.message : err);
  }
}

export function salvarRelatorioXlsx(
  relatorio: RelatorioExecucao,
  caminhoJson: string | null,
): string | null {
  try {
    const dir = getRelatoriosDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const nomeArquivo =
      caminhoJson && caminhoJson.toLowerCase().endsWith(".json")
        ? path.basename(caminhoJson).replace(/\.json$/i, ".xlsx")
        : `execucao_${Date.now()}.xlsx`;
    const caminho = path.join(dir, nomeArquivo);

    const workbook = XLSX.utils.book_new();
    const { execucao, resultados } = relatorio;

    const resumoData = [
      ["Campo", "Valor"],
      ["Inicio", execucao.inicio],
      ["Fim", execucao.fim],
      ["Planilha", execucao.planilha],
      ["Modo", execucao.modo],
      ["Total", execucao.total],
      ["Sucesso", execucao.sucesso],
      ["Falha", execucao.falha],
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(resumoData), "Resumo");

    const headers = [
      "Numero",
      "Empresa",
      "CNPJ",
      "CNPJ Original",
      "Setor",
      "Responsavel",
      "Validador",
      "Customer ID",
      "Approver ID",
      "Group IDs",
      "Modo",
      "Sucesso",
      "Mensagem",
      "Etapa Falha",
    ];
    const rows = resultados.map((item) => [
      item.numero,
      item.empresa,
      item.cnpj,
      item.cnpjOriginal ?? "",
      item.setor,
      item.responsavel,
      item.validador,
      item.customerId ?? "",
      item.approverId ?? "",
      item.groupIds.join(", "),
      item.modo,
      item.sucesso ? "Sim" : "Nao",
      item.mensagem,
      item.etapaFalha ?? "",
    ]);
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([headers, ...rows]),
      "Resultados",
    );

    XLSX.writeFile(workbook, caminho);
    return caminho;
  } catch (err) {
    console.error("[relatorio] Erro ao salvar XLSX:", err instanceof Error ? err.message : err);
    return null;
  }
}
