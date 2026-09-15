/**
 * Gerador de Relatório Excel (.xlsx) com 6 abas oficiais:
 * Resumo, Divergências, Detalhes, Pendências, Erros e Metadados.
 */
import ExcelJS from "exceljs";
import type { BatchSummary, ReconciliationResult } from "../types.ts";
import { maskCnpj } from "../config.ts";

export class ExcelExporter {
  public async generateReport(summary: BatchSummary): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Automação REINF × DCTFWeb × Domínio";
    workbook.created = new Date();

    this.createResumoSheet(workbook, summary);
    this.createDivergenciasSheet(workbook, summary.resultados);
    this.createDetalhesSheet(workbook, summary.resultados);
    this.createPendenciasSheet(workbook, summary.resultados);
    this.createErrosSheet(workbook, summary.resultados);
    this.createMetadadosSheet(workbook, summary);

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  private createResumoSheet(workbook: ExcelJS.Workbook, summary: BatchSummary): void {
    const sheet = workbook.addWorksheet("Resumo", { views: [{ showGridLines: true }] });

    // Cabeçalho institucional
    sheet.mergeCells("A1:I1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `CONFERÊNCIA FISCAL EFD-REINF × DCTFWEB × DOMÍNIO — COMPETÊNCIA ${summary.competencia}`;
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 35;

    // Indicadores KPI
    sheet.addRow([]);
    sheet.addRow(["INDICADOR", "QUANTIDADE", "% DO TOTAL"]);
    const kpiHeader = sheet.getRow(3);
    kpiHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
    kpiHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };

    const total = summary.totalEmpresas || 1;
    const kpis = [
      ["Total de Empresas Avaliadas", summary.totalEmpresas, 1],
      ["Conformes (100% Coincidentes)", summary.conformes, summary.conformes / total],
      ["Divergentes (Diferença >= R$ 0,01)", summary.divergentes, summary.divergentes / total],
      ["Pendentes de Fechamento / Reabertas", summary.pendentes, summary.pendentes / total],
      ["Sem DCTFWeb no SERPRO", summary.semDctfweb, summary.semDctfweb / total],
      ["Com Erro Operacional / Conexão", summary.erros, summary.erros / total],
    ];

    for (const k of kpis) {
      const r = sheet.addRow(k);
      r.getCell(3).numFmt = "0.0%";
    }

    sheet.addRow([]);
    sheet.addRow(["TABELA EXECUTIVA POR EMPRESA"]);
    sheet.getCell(`A${sheet.rowCount}`).font = { bold: true, size: 12 };

    // Tabela detalhada de empresas
    const empHeaders = [
      "Código",
      "CNPJ",
      "Razão Social",
      "Situação",
      "Total Domínio (R$)",
      "Total DCTFWeb (R$)",
      "Diferença (R$)",
      "Recibos REINF",
      "Recibo DCTFWeb",
    ];
    const tableHeader = sheet.addRow(empHeaders);
    tableHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
    tableHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };

    for (const r of summary.resultados) {
      const recibosReinf = [
        r.reciboReinfR2000 ? `R-2000: ${r.reciboReinfR2000}` : null,
        r.reciboReinfR4000 ? `R-4000: ${r.reciboReinfR4000}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const row = sheet.addRow([
        r.empresa.codiEmp,
        maskCnpj(r.empresa.cnpj),
        r.empresa.razaoSocial,
        r.status,
        r.totalGeralDominio,
        r.totalGeralDctfweb,
        r.diferencaGeral,
        recibosReinf || "(nenhum)",
        r.reciboDctfweb || "(nenhum)",
      ]);

      row.getCell(5).numFmt = "R$ #,##0.00";
      row.getCell(6).numFmt = "R$ #,##0.00";
      row.getCell(7).numFmt = "R$ #,##0.00";

      // Formatação de cor pelo status
      const statusCell = row.getCell(4);
      if (r.status === "CONFORME") {
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
      } else if (r.status === "DIVERGENTE") {
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
      } else if (r.status === "PENDENTE") {
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
      }
    }

    this.autoFitColumns(sheet);
  }

  private createDivergenciasSheet(workbook: ExcelJS.Workbook, results: ReconciliationResult[]): void {
    const sheet = workbook.addWorksheet("Divergências", { views: [{ showGridLines: true }] });

    const headers = [
      "Código Emp",
      "CNPJ",
      "Razão Social",
      "Série",
      "Origem",
      "Código Receita",
      "Tipo de Valor",
      "Valor Domínio (R$)",
      "Valor DCTFWeb (R$)",
      "Diferença (R$)",
      "Situação",
      "Diagnóstico",
    ];

    const hRow = sheet.addRow(headers);
    hRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    hRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF991B1B" } };

    for (const r of results) {
      const divs = r.detalhes.filter(
        (d) => d.situacao !== "conforme" || Math.abs(d.diferenca) >= 0.01,
      );

      for (const d of divs) {
        const row = sheet.addRow([
          r.empresa.codiEmp,
          maskCnpj(r.empresa.cnpj),
          r.empresa.razaoSocial,
          d.serie,
          d.origem === 6 ? "Reinf CP (6)" : "Reinf RET (7)",
          d.codigoReceita,
          d.tipoValor,
          d.valorDominio,
          d.valorDctfweb,
          d.diferenca,
          d.situacao,
          d.observacao || "",
        ]);

        row.getCell(8).numFmt = "R$ #,##0.00";
        row.getCell(9).numFmt = "R$ #,##0.00";
        row.getCell(10).numFmt = "R$ #,##0.00";
        row.getCell(10).font = { bold: true, color: { argb: "FFDC2626" } };
      }
    }

    this.autoFitColumns(sheet);
  }

  private createDetalhesSheet(workbook: ExcelJS.Workbook, results: ReconciliationResult[]): void {
    const sheet = workbook.addWorksheet("Detalhes", { views: [{ showGridLines: true }] });

    const headers = [
      "Código Emp",
      "CNPJ",
      "Razão Social",
      "Status Geral",
      "Série",
      "Origem",
      "Código Receita",
      "Tipo de Valor",
      "Valor Domínio (R$)",
      "Valor DCTFWeb (R$)",
      "Diferença (R$)",
      "Situação",
      "Observação",
    ];

    const hRow = sheet.addRow(headers);
    hRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    hRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF374151" } };

    for (const r of results) {
      for (const d of r.detalhes) {
        const row = sheet.addRow([
          r.empresa.codiEmp,
          maskCnpj(r.empresa.cnpj),
          r.empresa.razaoSocial,
          r.status,
          d.serie,
          d.origem === 6 ? "Reinf CP (6)" : "Reinf RET (7)",
          d.codigoReceita,
          d.tipoValor,
          d.valorDominio,
          d.valorDctfweb,
          d.diferenca,
          d.situacao,
          d.observacao || "",
        ]);

        row.getCell(9).numFmt = "R$ #,##0.00";
        row.getCell(10).numFmt = "R$ #,##0.00";
        row.getCell(11).numFmt = "R$ #,##0.00";
      }
    }

    this.autoFitColumns(sheet);
  }

  private createPendenciasSheet(workbook: ExcelJS.Workbook, results: ReconciliationResult[]): void {
    const sheet = workbook.addWorksheet("Pendências", { views: [{ showGridLines: true }] });

    const headers = [
      "Código Emp",
      "CNPJ",
      "Razão Social",
      "Situação",
      "Fechamentos Registrados",
      "Pendência / Bloqueio Identificado",
    ];

    const hRow = sheet.addRow(headers);
    hRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    hRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD97706" } };

    for (const r of results) {
      if (r.status === "PENDENTE" || r.pendencias.length > 0) {
        sheet.addRow([
          r.empresa.codiEmp,
          maskCnpj(r.empresa.cnpj),
          r.empresa.razaoSocial,
          r.status,
          r.fechamentosUtilizados.join(" | ") || "(nenhum aceito)",
          r.pendencias.join(" \n "),
        ]);
      }
    }

    this.autoFitColumns(sheet);
  }

  private createErrosSheet(workbook: ExcelJS.Workbook, results: ReconciliationResult[]): void {
    const sheet = workbook.addWorksheet("Erros", { views: [{ showGridLines: true }] });

    const headers = [
      "Código Emp",
      "CNPJ",
      "Razão Social",
      "Situação",
      "Mensagens do SERPRO / Domínio",
    ];

    const hRow = sheet.addRow(headers);
    hRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    hRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4B5563" } };

    for (const r of results) {
      if (r.status === "ERRO" || r.status === "SEM_DCTFWEB") {
        sheet.addRow([
          r.empresa.codiEmp,
          maskCnpj(r.empresa.cnpj),
          r.empresa.razaoSocial,
          r.status,
          r.mensagens.join(" \n ") || "Nenhuma mensagem registrada.",
        ]);
      }
    }

    this.autoFitColumns(sheet);
  }

  private createMetadadosSheet(workbook: ExcelJS.Workbook, summary: BatchSummary): void {
    const sheet = workbook.addWorksheet("Metadados", { views: [{ showGridLines: true }] });

    sheet.addRow(["METADADOS DE EXECUÇÃO E AUDITORIA"]);
    sheet.getCell("A1").font = { bold: true, size: 12 };
    sheet.addRow([]);

    const meta = [
      ["Competência Avaliada", summary.competencia],
      ["Data/Hora do Processamento", new Date().toISOString()],
      ["Tempo Total de Execução", `${summary.tempoExecucaoMs} ms`],
      ["Total de Empresas no Lote", summary.totalEmpresas],
      ["Chamadas SERPRO Estimadas", summary.chamadasSerproEstimadas],
      ["Chamadas SERPRO Realizadas", summary.chamadasSerproRealizadas],
      ["Origens DCTFWeb Avaliadas", "Reinf CP = 6 | Reinf RET = 7"],
      ["Regra de Tolerância de Valores", "R$ 0,00 (diferença >= 0,01 apurada como divergência)"],
      ["Versão da Ferramenta", "1.0.0 (TypeScript/Bun)"],
      ["Invariante de Segurança", "Todas as consultas ao Domínio foram SELECT; nenhum segredo exportado."],
    ];

    for (const m of meta) {
      const row = sheet.addRow(m);
      row.getCell(1).font = { bold: true };
    }

    this.autoFitColumns(sheet);
  }

  private autoFitColumns(sheet: ExcelJS.Worksheet): void {
    sheet.columns.forEach((column) => {
      let maxLen = 12;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const val = cell.value;
        if (val !== null && val !== undefined) {
          const str = String(val);
          const firstLine = str.split("\n")[0];
          if (firstLine.length > maxLen) {
            maxLen = Math.min(firstLine.length + 3, 50);
          }
        }
      });
      column.width = maxLen;
    });
  }
}
