import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildServiceDescriptionLookup,
  canonicalizeHeader,
  formatDownloadedReport,
  normalizeDescriptionText,
  normalizeServiceItem,
  validateFormattedReport,
} from "./report-formatter";

const JSZip = require("jszip");

describe("report-formatter", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-formatter-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("normaliza headers, itens de servico e colapsa espacos na descricao", () => {
    expect(canonicalizeHeader("DESCRIÇÃO DO SERVIÇO")).toBe("DESCRICAO DO SERVICO");
    expect(canonicalizeHeader("  Serviço   Federal ")).toBe("SERVICO FEDERAL");
    expect(normalizeServiceItem("1.05")).toBe("01.05");
    expect(normalizeServiceItem("01.05")).toBe("01.05");
    expect(normalizeDescriptionText(" Analise   e\ndesenvolvimento\tde sistemas. ")).toBe(
      "Analise e desenvolvimento de sistemas.",
    );
  });

  it("constroi lookup com item unico, sem match e ambiguidade real", () => {
    const filePath = path.join(tempDir, "mapa.xlsx");
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      [
        "Codigo CNAE 2.1",
        "Descricao do Codigo CNAE 2.0",
        "Item da Lista",
        "Descricao do Item da Lista",
      ],
      ["6201-5/00", "Descricao", "1.05", "Analise   e desenvolvimento de sistemas."],
      ["6201-5/00", "Descricao", "01.05", "Analise e desenvolvimento de sistemas."],
      ["6202-3/00", "Descricao", "17.25", "Descricao 1"],
      ["6202-3/00", "Descricao", "17.25", "Descricao 2"],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Mapa");
    XLSX.writeFile(workbook, filePath);

    const lookup = buildServiceDescriptionLookup(filePath);

    expect(lookup.get("01.05")).toEqual({
      description: "Analise e desenvolvimento de sistemas.",
      ambiguous: false,
    });
    expect(lookup.get("17.25")).toEqual({
      description: undefined,
      ambiguous: true,
    });
    expect(lookup.get("99.99")).toBeUndefined();
  });

  it("reaplica o template real preservando tabela, link, datas, numeros e tachado", async () => {
    const modelPath = path.resolve("assets/templates/report-layout-example.xlsx");
    const reportPath = path.join(tempDir, "download.xlsx");
    const serviceMapPath = path.join(tempDir, "mapa.xlsx");
    const longDescription =
      "Hospedagem, recepção, intermediação, conferência documental e suporte operacional em ambiente de prestação de serviços continuados com atendimento recorrente, validação de cadastros e controles acessórios.";

    writeReportWorkbook(reportPath, [
      {
        cnpjEmpresa: "11.111.111/0001-11",
        empresa: "Empresa A",
        municipioTomador: "Maceió - AL",
        conferido: "Não",
        numeroNfe: "38132",
        codigoVerificador: "410690222025358",
        dataCompetenciaSerial: 46035,
        emissaoNfeSerial: 46035,
        cancelamentoSerial: null,
        prestador: "SERVICOS CORPORATIVOS ALFA",
        cnpjPrestador: "12.345.678/0001-90",
        ccmPrestador: "11698895",
        municipioPrestador: "Curitiba - PR",
        regimeTributario: "Lucro Real/Presumido",
        cnae: 7490104,
        cnaeDescricao: "Atividades de intermediação e agenciamento de serviços e negócios em geral",
        valorNfe: 1036.5,
        servicoFederal: "09.01",
        servicoMunicipal: "1724",
        servicoDentroMunicipio: "Fora",
        baseCalculoIss: 1036.5,
        valorLiquido: 1036.5,
        linkText: "Link NFS",
        linkUrl: "https://example.com/nfse/1",
      },
      {
        cnpjEmpresa: "22.222.222/0001-22",
        empresa: "Empresa B",
        municipioTomador: "Recife - PE",
        conferido: "Não",
        numeroNfe: "4065",
        codigoVerificador: "261160622203278",
        dataCompetenciaSerial: 46024,
        emissaoNfeSerial: 46024,
        cancelamentoSerial: 46046,
        prestador: "CONSULTORIA TECNICA RECIFE",
        cnpjPrestador: "23.456.789/0001-01",
        ccmPrestador: "5078288",
        municipioPrestador: "Recife - PE",
        regimeTributario: "Lucro Real/Presumido",
        cnae: "6204000",
        cnaeDescricao: "Consultoria em tecnologia da informação",
        valorNfe: 225.75,
        servicoFederal: "10.05",
        servicoMunicipal: "1724",
        servicoDentroMunicipio: "Dentro",
        baseCalculoIss: 225.75,
        valorLiquido: 225.75,
        linkText: "Link NFS",
        linkUrl: "https://example.com/nfse/2?a=1&b=2",
      },
    ]);
    writeServiceMapWorkbook(serviceMapPath, [
      ["09.01", longDescription],
      ["10.05", "Agenciamento."],
    ]);

    const result = await formatDownloadedReport(reportPath, {
      enabled: true,
      modelPath,
      serviceMapPath,
      overwrite: true,
    });

    expect(result.outputPath).toBe(reportPath);
    expect(result.warnings).toEqual([]);
    expect(result.filledCount).toBe(2);
    expect(result.missingMappedCount).toBe(0);
    expect(result.missingUnmappedCount).toBe(0);
    expect(result.issues).toEqual([]);

    const expectedHeaders = await getTemplateHeaders(modelPath);
    const formattedWorkbook = new ExcelJS.Workbook();
    await formattedWorkbook.xlsx.readFile(reportPath);
    const sheet = formattedWorkbook.getWorksheet("Serviços Tomados");
    const actualHeaders = Array.from({ length: sheet.columnCount }, (_, index) =>
      sheet.getRow(1).getCell(index + 1).text,
    );

    expect(actualHeaders).toEqual(expectedHeaders);
    expect(sheet.rowCount).toBe(3);
    expect(sheet.getColumn(20).width).toBe(30);
    expect(sheet.getCell("T1").fill).toMatchObject({
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFF00" },
    });
    expect(sheet.getCell("T1").font).toMatchObject({
      color: { argb: "FF000000" },
    });
    expect(sheet.getCell("T2").text).toContain("\n");
    expect(sheet.getCell("T2").text.replace(/\n/g, " ")).toBe(longDescription);
    expect(sheet.getCell("T2").alignment).toMatchObject({
      wrapText: true,
      vertical: "top",
    });
    expect(sheet.getRow(2).height).toBeGreaterThan(12);
    expect(sheet.getCell("T3").text).toBe("Agenciamento.");
    expect(sheet.getCell("U2").value).toBeNull();
    expect(sheet.getCell("V2").text).toBe("Fora");
    expect(sheet.getCell("Y2").value).toMatchObject({
      text: "Link NFS",
      hyperlink: "https://example.com/nfse/1",
    });
    expect(sheet.getCell("Y3").value).toMatchObject({
      text: "Link NFS",
      hyperlink: "https://example.com/nfse/2?a=1&b=2",
    });
    expect(sheet.getCell("A3").font?.strike).toBe(true);
    expect(sheet.getCell("Y3").font?.strike).toBe(true);
    expect(sheet.model?.tables?.[0]).toMatchObject({
      style: expect.objectContaining({
        theme: "TableStyleMedium21",
        showRowStripes: true,
      }),
      autoFilterRef: "A1:Y3",
      tableRef: "A1:Y3",
    });

    const rawWorkbook = XLSX.readFile(reportPath, { cellNF: true, cellStyles: true });
    const rawSheet = rawWorkbook.Sheets[rawWorkbook.SheetNames[0]];
    expect(rawSheet.G2?.v).toBe(46035);
    expect(rawSheet.G2?.z).toBe("dd/mm/yyyy");
    expect(rawSheet.I3?.v).toBe(46046);
    expect(rawSheet.I3?.z).toBe("dd/mm/yyyy");
    expect(rawSheet.O2?.v).toBe(7490104);
    expect(rawSheet.O2?.z).toBe("00\\.00-0-00");
    expect(rawSheet.O2?.w).toBe("74.90-1-04");
    expect(rawSheet.O3?.v).toBe(6204000);
    expect(rawSheet.O3?.z).toBe("00\\.00-0-00");
    expect(rawSheet.O3?.w).toBe("62.04-0-00");
    expect(rawSheet.Q2?.v).toBe(1036.5);
    expect(rawSheet.Y2?.l?.Target).toBe("https://example.com/nfse/1");
    expect(rawSheet.Y3?.l?.Target).toBe("https://example.com/nfse/2?a=1&amp;b=2");

    const zip = await JSZip.loadAsync(fs.readFileSync(reportPath));
    const tableEntries = Object.keys(zip.files).filter((entry) => /^xl\/tables\/table\d+\.xml$/.test(entry));
    expect(tableEntries).toHaveLength(1);
    const tableXml = await zip.file(tableEntries[0]).async("string");
    expect(tableXml).toContain('TableStyleMedium21');
    expect(tableXml).toContain('ref="A1:Y3"');
    expect(tableXml).toContain('<autoFilter ref="A1:Y3"/>');
    expect(tableXml).toContain('tableColumns count="25"');
  });

  it("mantem item realmente sem correspondencia em branco", async () => {
    const modelPath = path.resolve("assets/templates/report-layout-example.xlsx");
    const reportPath = path.join(tempDir, "download-sem-match.xlsx");
    const serviceMapPath = path.join(tempDir, "mapa-sem-match.xlsx");

    writeReportWorkbook(reportPath, [
      {
        cnpjEmpresa: "33.333.333/0001-33",
        empresa: "Empresa C",
        municipioTomador: "Paulista - PE",
        conferido: "Não",
        numeroNfe: "456",
        codigoVerificador: "261160712200600",
        dataCompetenciaSerial: 46018,
        emissaoNfeSerial: 46018,
        cancelamentoSerial: null,
        prestador: "SOFTWARE HOUSE MODELO LTDA",
        cnpjPrestador: "34.567.890/0001-12",
        ccmPrestador: "5137209",
        municipioPrestador: "Paulista - PE",
        regimeTributario: "Simples Nacional",
        cnae: 6203100,
        cnaeDescricao: "Desenvolvimento e licenciamento de programas",
        valorNfe: 58,
        servicoFederal: "17.25",
        servicoMunicipal: "1725",
        servicoDentroMunicipio: "Dentro",
        baseCalculoIss: 58,
        valorLiquido: 58,
        linkText: "Link NFS",
        linkUrl: "https://example.com/nfse/3",
      },
    ]);
    writeServiceMapWorkbook(serviceMapPath, [["01.05", "Licenciamento."]]);

    const result = await formatDownloadedReport(reportPath, {
      enabled: true,
      modelPath,
      serviceMapPath,
      overwrite: true,
    });

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("(17.25)");
    expect(result.filledCount).toBe(0);
    expect(result.missingMappedCount).toBe(0);
    expect(result.missingUnmappedCount).toBe(1);
    expect(result.issues).toEqual([
      {
        rowNumber: 2,
        serviceItem: "17.25",
        reason: "missing_unmapped",
      },
    ]);

    const formattedWorkbook = new ExcelJS.Workbook();
    await formattedWorkbook.xlsx.readFile(reportPath);
    const sheet = formattedWorkbook.getWorksheet("Serviços Tomados");
    expect(sheet.getCell("T2").value).toBeNull();
  });

  it("valida planilha final e detecta codigos mapeaveis sem descricao", () => {
    const reportPath = path.join(tempDir, "formatado.xlsx");
    const serviceMapPath = path.join(tempDir, "mapa-validacao.xlsx");

    const reportWorkbook = XLSX.utils.book_new();
    const reportSheet = XLSX.utils.aoa_to_sheet([
      ["Serviço Federal", "DESCRIÇÃO DO SERVIÇO"],
      ["09.01", ""],
      ["10.05", ""],
      ["99.99", ""],
      ["10.09", "Representação."],
    ]);
    XLSX.utils.book_append_sheet(reportWorkbook, reportSheet, "Serviços Tomados");
    XLSX.writeFile(reportWorkbook, reportPath);

    writeServiceMapWorkbook(serviceMapPath, [
      ["09.01", "Hospedagem."],
      ["10.05", "Agenciamento."],
      ["10.09", "Representação."],
    ]);

    expect(validateFormattedReport(reportPath, serviceMapPath)).toEqual({
      filledCount: 1,
      missingMappedCount: 2,
      missingUnmappedCount: 1,
      issues: [
        {
          rowNumber: 2,
          serviceItem: "09.01",
          reason: "missing_mapped",
        },
        {
          rowNumber: 3,
          serviceItem: "10.05",
          reason: "missing_mapped",
        },
        {
          rowNumber: 4,
          serviceItem: "99.99",
          reason: "missing_unmapped",
        },
      ],
    });
  });
});

type ReportRow = {
  cnpjEmpresa: string;
  empresa: string;
  municipioTomador: string;
  conferido: string;
  numeroNfe: string;
  codigoVerificador: string;
  dataCompetenciaSerial: number;
  emissaoNfeSerial: number;
  cancelamentoSerial: number | null;
  prestador: string;
  cnpjPrestador: string;
  ccmPrestador: string;
  municipioPrestador: string;
  regimeTributario: string;
  cnae: number | string;
  cnaeDescricao: string;
  valorNfe: number;
  servicoFederal: string;
  servicoMunicipal: string;
  servicoDentroMunicipio: string;
  baseCalculoIss: number;
  valorLiquido: number;
  linkText: string;
  linkUrl: string;
};

function writeReportWorkbook(reportPath: string, rows: ReportRow[]): void {
  const headers = [
    "Cnpj Empresa",
    "Empresa",
    "Municipio Tomador",
    "Conferido?",
    "Número NFe",
    "Código Verificador",
    "Data Competência",
    "Emissão NFe",
    "Cancelamento",
    "Prestador",
    "Cnpj/Cpf Prestador",
    "CCM/IM Prestador",
    "Município Prestador",
    "Regime Tributário",
    "CNAE",
    "CNAE Descrição",
    "Valor NFe",
    "Serviço Federal",
    "Serviço Municipal",
    "Serviço Dentro do Município",
    "Base de Cálculo ISS",
    "Valor Líquido",
    "Link para NFSe",
  ];

  const aoa = [
    headers,
    ...rows.map((row) => [
      row.cnpjEmpresa,
      row.empresa,
      row.municipioTomador,
      row.conferido,
      row.numeroNfe,
      row.codigoVerificador,
      row.dataCompetenciaSerial,
      row.emissaoNfeSerial,
      row.cancelamentoSerial,
      row.prestador,
      row.cnpjPrestador,
      row.ccmPrestador,
      row.municipioPrestador,
      row.regimeTributario,
      row.cnae,
      row.cnaeDescricao,
      row.valorNfe,
      row.servicoFederal,
      row.servicoMunicipal,
      row.servicoDentroMunicipio,
      row.baseCalculoIss,
      row.valorLiquido,
      row.linkText,
    ]),
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const headerIndex = new Map<string, number>(headers.map((header, index) => [header, index]));

  rows.forEach((row, index) => {
    const excelRow = index + 2;
    setWorksheetCell(worksheet, excelRow, headerIndex.get("Data Competência")!, {
      t: "n",
      v: row.dataCompetenciaSerial,
      z: "m/d/yy",
    });
    setWorksheetCell(worksheet, excelRow, headerIndex.get("Emissão NFe")!, {
      t: "n",
      v: row.emissaoNfeSerial,
      z: "m/d/yy",
    });
    if (row.cancelamentoSerial != null) {
      setWorksheetCell(worksheet, excelRow, headerIndex.get("Cancelamento")!, {
        t: "n",
        v: row.cancelamentoSerial,
        z: "m/d/yy",
      });
    }
    setWorksheetCell(worksheet, excelRow, headerIndex.get("CNAE")!, {
      t: typeof row.cnae === "number" ? "n" : "s",
      v: row.cnae,
      z: "00\\.00-0-00",
    });
    setWorksheetCell(worksheet, excelRow, headerIndex.get("Valor NFe")!, {
      t: "n",
      v: row.valorNfe,
      z: '_-R$* #,##0.00_-;-R$* #,##0.00_-_-R$* "-"??_-;_-@_-',
    });
    setWorksheetCell(worksheet, excelRow, headerIndex.get("Base de Cálculo ISS")!, {
      t: "n",
      v: row.baseCalculoIss,
      z: '_-R$* #,##0.00_-;-R$* #,##0.00_-_-R$* "-"??_-;_-@_-',
    });
    setWorksheetCell(worksheet, excelRow, headerIndex.get("Valor Líquido")!, {
      t: "n",
      v: row.valorLiquido,
      z: '_-R$* #,##0.00_-;-R$* #,##0.00_-_-R$* "-"??_-;_-@_-',
    });
    const linkAddress = XLSX.utils.encode_cell({
      r: excelRow - 1,
      c: headerIndex.get("Link para NFSe")!,
    });
    worksheet[linkAddress].l = { Target: row.linkUrl };
  });

  XLSX.utils.book_append_sheet(workbook, worksheet, "Bruto");
  XLSX.writeFile(workbook, reportPath);
}

function setWorksheetCell(
  worksheet: XLSX.WorkSheet,
  rowNumber: number,
  columnIndex: number,
  cell: XLSX.CellObject,
): void {
  const address = XLSX.utils.encode_cell({ r: rowNumber - 1, c: columnIndex });
  worksheet[address] = cell;
}

function writeServiceMapWorkbook(
  filePath: string,
  mappings: Array<[string, string]>,
): void {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    [
      "Codigo CNAE 2.1",
      "Descricao do Codigo CNAE 2.0",
      "Item da Lista",
      "Descricao do Item da Lista",
    ],
    ...mappings.map(([item, description]) => ["0000-0/00", "Descricao", item, description]),
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Mapa");
  XLSX.writeFile(workbook, filePath);
}

async function getTemplateHeaders(modelPath: string): Promise<string[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(modelPath);
  const worksheet = workbook.worksheets[0];
  return Array.from({ length: worksheet.columnCount }, (_, index) =>
    worksheet.getRow(1).getCell(index + 1).text,
  );
}
