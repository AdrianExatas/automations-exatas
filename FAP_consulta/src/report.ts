import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import ExcelJS from "exceljs";
import type { Worksheet } from "exceljs";

import type {
  FailureRecord,
  FapCalculoItem,
  FapEmpresaSummary,
  FapEstabelecimentoResult,
  RunReport,
} from "./types.js";
import { formatCnpj, formatCnpjRaiz } from "./utils.js";

type Header<T extends object> = [keyof T, string];

const ESTABELECIMENTO_HEADERS: Array<Header<FapEstabelecimentoResult>> = [
  ["dominioCode", "CODIGO_DOMINIO"],
  ["cnpjRaiz", "CNPJ_RAIZ"],
  ["cnpj", "CNPJ"],
  ["razaoSocial", "RAZAO_SOCIAL"],
  ["anoVigencia", "ANO_VIGENCIA"],
  ["consultaCompetencia", "DATA_INICIO_CONSULTA_FAP"],
  ["fap", "FAP_FINAL"],
  ["fapOriginal", "FAP_ORIGINAL"],
  ["cnaeSubclasse", "CNAE_CODIGO"],
  ["cnaeDescricao", "CNAE_DESCRICAO"],
  ["dataProcessamento", "DATA_PROCESSAMENTO"],
  ["tipoProcessamento", "TIPO_PROCESSAMENTO"],
  ["taxaRotatividade", "TAXA_ROTATIVIDADE"],
  ["massaSalarial", "MASSA_SALARIAL"],
  ["mediaVinculos", "MEDIA_VINCULOS"],
  ["beneficiosPagos", "BENEFICIOS_PAGOS"],
  ["quantidadeCat", "QTD_CAT"],
  ["quantidadeB91", "QTD_B91_AUXILIO_ACIDENTARIO"],
  ["quantidadeB92", "QTD_B92_APOSENTADORIA_INVALIDEZ"],
  ["quantidadeB93", "QTD_B93_PENSAO_MORTE"],
  ["quantidadeB94", "QTD_B94_AUXILIO_ACIDENTE"],
  ["indiceFrequencia", "INDICE_FREQUENCIA_IF"],
  ["indiceGravidade", "INDICE_GRAVIDADE_IG"],
  ["indiceCusto", "INDICE_CUSTO_IC"],
  ["percentilFrequencia", "PERCENTIL_FREQUENCIA"],
  ["percentilGravidade", "PERCENTIL_GRAVIDADE"],
  ["percentilCusto", "PERCENTIL_CUSTO"],
  ["bloqueado", "BLOQUEADO"],
  ["reprocessado", "REPROCESSADO"],
  ["mensagens", "NOTIFICACOES_MENSAGENS"],
  ["status", "STATUS"],
];

const EMPRESA_HEADERS: Array<Header<FapEmpresaSummary>> = [
  ["dominioCode", "CODIGO_DOMINIO"],
  ["cnpjRaiz", "CNPJ_RAIZ"],
  ["corporateName", "RAZAO_SOCIAL"],
  ["source", "ORIGEM_PROCURACAO"],
  ["estabelecimentosEncontrados", "ESTABELECIMENTOS_ENCONTRADOS"],
  ["estabelecimentosProcessados", "ESTABELECIMENTOS_PROCESSADOS"],
  ["status", "STATUS"],
  ["error", "ERRO"],
];

const FAILURE_HEADERS: Array<Header<FailureRecord>> = [
  ["cnpj", "CNPJ"],
  ["corporateName", "RAZAO_SOCIAL"],
  ["stage", "ETAPA"],
  ["category", "CATEGORIA"],
  ["httpStatus", "STATUS_HTTP"],
  ["message", "ERRO"],
  ["retryable", "REPETIVEL"],
];

export interface WrittenReports {
  jsonPath: string;
  estabelecimentosCsvPath: string;
  empresasCsvPath: string;
  failuresCsvPath: string;
  workbookPath: string;
}

export async function writeReports(runDir: string, report: RunReport): Promise<WrittenReports> {
  await mkdir(runDir, { recursive: true });

  const jsonPath = path.join(runDir, "execucao.json");
  const estabelecimentosCsvPath = path.join(runDir, "fap_calculos.csv");
  const empresasCsvPath = path.join(runDir, "empresas.csv");
  const failuresCsvPath = path.join(runDir, "falhas.csv");
  const workbookPath = path.join(runDir, "relatorio_fap.xlsx");

  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(estabelecimentosCsvPath, toCsv(report.estabelecimentos, ESTABELECIMENTO_HEADERS), "utf8"),
    writeFile(empresasCsvPath, toCsv(report.empresas, EMPRESA_HEADERS), "utf8"),
    writeFile(failuresCsvPath, toCsv(report.falhas, FAILURE_HEADERS), "utf8"),
  ]);

  await writeWorkbook(workbookPath, report);

  return {
    jsonPath,
    estabelecimentosCsvPath,
    empresasCsvPath,
    failuresCsvPath,
    workbookPath,
  };
}

export function toCsv<T extends object>(rows: T[], headers: Array<Header<T>>): string {
  const lines = [headers.map(([, label]) => csvCell(label)).join(";")];
  for (const row of rows) {
    lines.push(headers.map(([key]) => csvCell(row[key])).join(";"));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const stringified = String(value);
  if (/[;"\r\n]/.test(stringified)) {
    return `"${stringified.replace(/"/g, '""')}"`;
  }
  return stringified;
}

async function writeWorkbook(filePath: string, report: RunReport): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Exatas Contabilidade - FAP Consulta";
  workbook.created = new Date();

  // Aba 1: Painel Geral
  buildDashboardSheet(workbook.addWorksheet("Painel Geral"), report);

  // Aba 2: Calculos FAP por Estabelecimento
  buildEstabelecimentosSheet(workbook.addWorksheet("Cálculos FAP"), report.estabelecimentos);

  // Aba 3: Resumo Empresas
  buildEmpresasSheet(workbook.addWorksheet("Empresas"), report.empresas);

  // Aba 4: Falhas e Avisos
  buildFailuresSheet(workbook.addWorksheet("Falhas e Inconsistências"), report.falhas);

  await workbook.xlsx.writeFile(filePath);
}

function buildDashboardSheet(sheet: Worksheet, report: RunReport): void {
  sheet.views = [{ showGridLines: true }];

  sheet.mergeCells("B2:F2");
  const title = sheet.getCell("B2");
  title.value = `Relatório de Consulta do FAP - Vigência ${report.anoVigencia}`;
  title.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(2).height = 35;

  const fapValues = report.estabelecimentos
    .map((e) => (typeof e.fap === "number" ? e.fap : parseFloat(String(e.fap))))
    .filter((n) => !isNaN(n));
  const avgFap = fapValues.length ? (fapValues.reduce((a, b) => a + b, 0) / fapValues.length).toFixed(4) : "-";
  const minFap = fapValues.length ? Math.min(...fapValues).toFixed(4) : "-";
  const maxFap = fapValues.length ? Math.max(...fapValues).toFixed(4) : "-";

  const cards = [
    ["Ano de Vigência", report.anoVigencia],
    ["Início da Consulta (Competência)", report.consultaCompetencia || "-"],
    ["Empresas Pesquisadas", report.summary.empresasAlvo],
    ["Empresas com Acesso", report.summary.empresasProcessadas],
    ["Sem Procuração / Não Autorizadas", report.summary.empresasSemProcuracao],
    ["Estabelecimentos com FAP", report.summary.totalCalculosFap],
    ["FAP Médio Calculado", avgFap],
    ["FAP Mínimo Encontrado", minFap],
    ["FAP Máximo Encontrado", maxFap],
    ["Execução Iniciada em", new Date(report.startedAt).toLocaleString("pt-BR")],
    ["Execução Concluída em", new Date(report.finishedAt).toLocaleString("pt-BR")],
  ];

  sheet.getRow(4).values = ["", "Indicador", "Valor"];
  sheet.getCell("B4").font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getCell("B4").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
  sheet.getCell("C4").font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getCell("C4").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };

  cards.forEach(([label, val], idx) => {
    const rowNum = 5 + idx;
    const r = sheet.getRow(rowNum);
    r.values = ["", label, val];
    r.getCell(2).font = { bold: true };
    r.getCell(3).alignment = { horizontal: "right" };
    r.getCell(2).border = thinBorder();
    r.getCell(3).border = thinBorder();
  });

  sheet.getColumn(2).width = 35;
  sheet.getColumn(3).width = 25;
}

function buildEstabelecimentosSheet(sheet: Worksheet, items: FapEstabelecimentoResult[]): void {
  sheet.views = [{ showGridLines: true }];

  const columns = [
    { header: "Cód. Domínio", key: "dominioCode", width: 14 },
    { header: "CNPJ Estabelecimento", key: "cnpj", width: 22 },
    { header: "Razão Social", key: "razaoSocial", width: 38 },
    { header: "Vigência", key: "anoVigencia", width: 10 },
    { header: "Início Consulta (FAP)", key: "consultaCompetencia", width: 20 },
    { header: "FAP Final", key: "fap", width: 12 },
    { header: "FAP Original", key: "fapOriginal", width: 14 },
    { header: "CNAE", key: "cnaeSubclasse", width: 12 },
    { header: "Descrição CNAE", key: "cnaeDescricao", width: 35 },
    { header: "Tx. Rotatividade", key: "taxaRotatividade", width: 16 },
    { header: "Massa Salarial", key: "massaSalarial", width: 16 },
    { header: "Média Vínculos", key: "mediaVinculos", width: 15 },
    { header: "Benefícios Pagos", key: "beneficiosPagos", width: 16 },
    { header: "CATs", key: "quantidadeCat", width: 10 },
    { header: "B91", key: "quantidadeB91", width: 10 },
    { header: "B92", key: "quantidadeB92", width: 10 },
    { header: "B93", key: "quantidadeB93", width: 10 },
    { header: "B94", key: "quantidadeB94", width: 10 },
    { header: "Índice Freq (IF)", key: "indiceFrequencia", width: 15 },
    { header: "Índice Grav (IG)", key: "indiceGravidade", width: 15 },
    { header: "Índice Custo (IC)", key: "indiceCusto", width: 15 },
    { header: "Bloqueado", key: "bloqueado", width: 12 },
    { header: "Status", key: "status", width: 14 },
  ];

  sheet.columns = columns;

  const headerRow = sheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = thinBorder();
  });

  items.forEach((item, index) => {
    const row = sheet.addRow({
      dominioCode: item.dominioCode ?? "-",
      cnpj: formatCnpj(item.cnpj),
      razaoSocial: item.razaoSocial,
      anoVigencia: item.anoVigencia,
      consultaCompetencia: item.consultaCompetencia || "-",
      fap: item.fap,
      fapOriginal: item.fapOriginal,
      cnaeSubclasse: item.cnaeSubclasse,
      cnaeDescricao: item.cnaeDescricao,
      taxaRotatividade: item.taxaRotatividade,
      massaSalarial: item.massaSalarial,
      mediaVinculos: item.mediaVinculos,
      beneficiosPagos: item.beneficiosPagos,
      quantidadeCat: item.quantidadeCat,
      quantidadeB91: item.quantidadeB91,
      quantidadeB92: item.quantidadeB92,
      quantidadeB93: item.quantidadeB93,
      quantidadeB94: item.quantidadeB94,
      indiceFrequencia: item.indiceFrequencia,
      indiceGravidade: item.indiceGravidade,
      indiceCusto: item.indiceCusto,
      bloqueado: item.bloqueado ? "Sim" : "Não",
      status: item.status,
    });

    row.height = 20;
    const isEven = index % 2 === 0;
    row.eachCell((cell, colNumber) => {
      cell.border = thinBorder();
      if (!isEven) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }
      if ([4, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].includes(colNumber)) {
        cell.alignment = { horizontal: "right" };
      }
    });
  });
}

function buildEmpresasSheet(sheet: Worksheet, items: FapEmpresaSummary[]): void {
  sheet.views = [{ showGridLines: true }];

  sheet.columns = [
    { header: "Cód. Domínio", key: "dominioCode", width: 14 },
    { header: "CNPJ Raiz", key: "cnpjRaiz", width: 16 },
    { header: "Razão Social", key: "corporateName", width: 40 },
    { header: "Origem", key: "source", width: 22 },
    { header: "Estabelecimentos", key: "estabelecimentosEncontrados", width: 18 },
    { header: "Com Cálculo FAP", key: "estabelecimentosProcessados", width: 18 },
    { header: "Status", key: "status", width: 18 },
    { header: "Observação / Erro", key: "error", width: 35 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = thinBorder();
  });

  items.forEach((item, index) => {
    const row = sheet.addRow({
      dominioCode: item.dominioCode ?? "-",
      cnpjRaiz: formatCnpjRaiz(item.cnpjRaiz),
      corporateName: item.corporateName,
      source: item.source,
      estabelecimentosEncontrados: item.estabelecimentosEncontrados,
      estabelecimentosProcessados: item.estabelecimentosProcessados,
      status: item.status,
      error: item.error,
    });
    row.height = 20;
    const isEven = index % 2 === 0;
    row.eachCell((cell) => {
      cell.border = thinBorder();
      if (!isEven) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDFA" } };
      }
    });
  });
}

function buildFailuresSheet(sheet: Worksheet, items: FailureRecord[]): void {
  sheet.views = [{ showGridLines: true }];

  sheet.columns = [
    { header: "CNPJ", key: "cnpj", width: 20 },
    { header: "Razão Social", key: "corporateName", width: 40 },
    { header: "Etapa", key: "stage", width: 16 },
    { header: "Categoria", key: "category", width: 16 },
    { header: "Status HTTP", key: "httpStatus", width: 14 },
    { header: "Mensagem de Erro", key: "message", width: 50 },
    { header: "Repetível", key: "retryable", width: 12 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBE123C" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = thinBorder();
  });

  items.forEach((item, index) => {
    const row = sheet.addRow({
      cnpj: formatCnpj(item.cnpj),
      corporateName: item.corporateName,
      stage: item.stage,
      category: item.category,
      httpStatus: item.httpStatus ?? "-",
      message: item.message,
      retryable: item.retryable ? "Sim" : "Não",
    });
    row.height = 20;
    const isEven = index % 2 === 0;
    row.eachCell((cell) => {
      cell.border = thinBorder();
      if (!isEven) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF1F2" } };
      }
    });
  });
}

function thinBorder(): Partial<ExcelJS.Borders> {
  return {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  };
}
