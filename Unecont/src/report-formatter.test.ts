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
        "Código CNAE 2.1",
        "Descrição do Código CNAE 2.0",
        "Item da Lista",
        "Descrição do Item da Lista (LC Nº 116/2003)",
      ],
      ["6201-5/00", "Descricao", "1.05", "Analise   e desenvolvimento de sistemas."],
      ["6201-5/00", "Descricao", "01.05", "Analise e desenvolvimento de sistemas."],
      [
        "6202-3/00",
        "Descricao",
        "17.25",
        "Inserção de textos, desenhos e outros materiais de propaganda e publicidade, em qualquer meio.",
      ],
      ["6202-3/00", "Descricao", "17.25", "Outra descricao realmente diferente."],
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

  it("formata a planilha e preenche os codigos vistos no caso real", async () => {
    const modelPath = path.join(tempDir, "modelo.xlsx");
    const reportPath = path.join(tempDir, "download.xlsx");
    const serviceMapPath = path.join(tempDir, "mapa.xlsx");

    const modelWorkbook = new ExcelJS.Workbook();
    const modelSheet = modelWorkbook.addWorksheet("Serviços Tomados");
    modelSheet.columns = [
      { width: 18 },
      { width: 24 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
    ];
    modelSheet.getRow(1).values = [
      "",
      "Cnpj Empresa",
      "Empresa",
      "Serviço Federal",
      "DESCRIÇÃO DO SERVIÇO",
      "QUAL SERVIÇO CONTRATO",
    ];
    modelSheet.getCell("D1").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFF00" },
    };
    modelSheet.getCell("E1").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFF00" },
    };
    for (let col = 1; col <= 6; col++) {
      modelSheet.getCell(2, col).style = {
        font: { name: "Calibri", size: 11 },
        alignment: { vertical: "middle", wrapText: true },
      };
    }
    modelSheet.getRow(2).height = 22;
    await modelWorkbook.xlsx.writeFile(modelPath);

    const reportWorkbook = XLSX.utils.book_new();
    const reportSheet = XLSX.utils.aoa_to_sheet([
      ["Cnpj Empresa", "Empresa", "Serviço Federal", "DESCRIÇÃO DO SERVIÇO", "Outra Coluna"],
      ["11.111.111/0001-11", "Empresa A", "09.01", "", "x"],
      ["22.222.222/0001-22", "Empresa B", "10.05", "", "y"],
      ["33.333.333/0001-33", "Empresa C", "10.09", "", "z"],
      ["44.444.444/0001-44", "Empresa D", "99.99", "nao deve manter", "w"],
    ]);
    XLSX.utils.book_append_sheet(reportWorkbook, reportSheet, "Bruto");
    XLSX.writeFile(reportWorkbook, reportPath);

    const serviceWorkbook = XLSX.utils.book_new();
    const serviceSheet = XLSX.utils.aoa_to_sheet([
      [
        "Código CNAE 2.1",
        "Descrição do Código CNAE 2.0",
        "Item da Lista",
        "Descrição do Item da Lista (LC Nº 116/2003)",
      ],
      [
        "5510-8/01",
        "Descricao",
        "09.01",
        "Hospedagem de qualquer natureza em hotéis, apart-service condominiais, flat, apart-hotéis, hotéis residência, residence-service, suite service, hotelaria marítima, motéis, pensões e congêneres; ocupação por temporada com fornecimento de serviço (o valor da alimentação e gorjeta, quando incluído no preço da diária, fica sujeito ao Imposto Sobre Serviços).",
      ],
      [
        "6821-8/01",
        "Descricao",
        "10.05",
        "Agenciamento, corretagem ou intermediação de bens móveis ou imóveis, não abrangidos em outros itens ou subitens, inclusive aqueles realizados no âmbito de Bolsas de Mercadorias e Futuros, por quaisquer meios.",
      ],
      ["4619-2/00", "Descricao", "10.09", "Representação de qualquer natureza, inclusive comercial."],
    ]);
    XLSX.utils.book_append_sheet(serviceWorkbook, serviceSheet, "Mapa");
    XLSX.writeFile(serviceWorkbook, serviceMapPath);

    const result = await formatDownloadedReport(reportPath, {
      enabled: true,
      modelPath,
      serviceMapPath,
      overwrite: true,
    });

    expect(result.outputPath).toBe(reportPath);
    expect(result.warnings).toEqual([
      "Linha 5: Servico Federal sem mapeamento para DESCRIÇÃO DO SERVIÇO (99.99).",
    ]);
    expect(result.filledCount).toBe(3);
    expect(result.missingMappedCount).toBe(0);
    expect(result.missingUnmappedCount).toBe(1);
    expect(result.issues).toEqual([
      {
        rowNumber: 5,
        serviceItem: "99.99",
        reason: "missing_unmapped",
      },
    ]);

    const formattedWorkbook = new ExcelJS.Workbook();
    await formattedWorkbook.xlsx.readFile(reportPath);
    const sheet = formattedWorkbook.getWorksheet("Serviços Tomados");

    expect(sheet.getRow(2).getCell(4).value).toBe("09.01");
    expect(sheet.getRow(2).getCell(5).value).toBe(
      "Hospedagem de qualquer natureza em hotéis, apart-service condominiais, flat, apart-hotéis, hotéis residência, residence-service, suite service, hotelaria marítima, motéis, pensões e congêneres; ocupação por temporada com fornecimento de serviço (o valor da alimentação e gorjeta, quando incluído no preço da diária, fica sujeito ao Imposto Sobre Serviços).",
    );
    expect(sheet.getRow(3).getCell(5).value).toBe(
      "Agenciamento, corretagem ou intermediação de bens móveis ou imóveis, não abrangidos em outros itens ou subitens, inclusive aqueles realizados no âmbito de Bolsas de Mercadorias e Futuros, por quaisquer meios.",
    );
    expect(sheet.getRow(4).getCell(5).value).toBe(
      "Representação de qualquer natureza, inclusive comercial.",
    );
    expect(sheet.getRow(5).getCell(5).value).toBeNull();
    expect(sheet.getRow(5).getCell(6).value).toBeNull();
    expect(sheet.getColumn(2).width).toBe(24);
    expect(sheet.getCell("E1").fill).toMatchObject({
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFF00" },
    });
    expect(sheet.getRow(2).height).toBe(22);
  });

  it("mantem item realmente sem correspondencia em branco", async () => {
    const modelPath = path.join(tempDir, "modelo-sem-match.xlsx");
    const reportPath = path.join(tempDir, "download-sem-match.xlsx");
    const serviceMapPath = path.join(tempDir, "mapa-sem-match.xlsx");

    const modelWorkbook = new ExcelJS.Workbook();
    const modelSheet = modelWorkbook.addWorksheet("Serviços Tomados");
    modelSheet.getRow(1).values = ["", "Serviço Federal", "DESCRIÇÃO DO SERVIÇO"];
    await modelWorkbook.xlsx.writeFile(modelPath);

    const reportWorkbook = XLSX.utils.book_new();
    const reportSheet = XLSX.utils.aoa_to_sheet([["Serviço Federal"], ["17.25"]]);
    XLSX.utils.book_append_sheet(reportWorkbook, reportSheet, "Bruto");
    XLSX.writeFile(reportWorkbook, reportPath);

    const serviceWorkbook = XLSX.utils.book_new();
    const serviceSheet = XLSX.utils.aoa_to_sheet([
      [
        "Código CNAE 2.1",
        "Descrição do Código CNAE 2.0",
        "Item da Lista",
        "Descrição do Item da Lista (LC Nº 116/2003)",
      ],
      ["6201-5/00", "Descricao", "01.05", "Licenciamento ou cessão de direito de uso de programas de computação."],
    ]);
    XLSX.utils.book_append_sheet(serviceWorkbook, serviceSheet, "Mapa");
    XLSX.writeFile(serviceWorkbook, serviceMapPath);

    const result = await formatDownloadedReport(reportPath, {
      enabled: true,
      modelPath,
      serviceMapPath,
      overwrite: true,
    });

    expect(result.warnings).toEqual([
      "Linha 2: Servico Federal sem mapeamento para DESCRIÇÃO DO SERVIÇO (17.25).",
    ]);
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
    expect(sheet.getRow(2).getCell(3).value).toBeNull();
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
      ["10.09", "Representação de qualquer natureza, inclusive comercial."],
    ]);
    XLSX.utils.book_append_sheet(reportWorkbook, reportSheet, "Serviços Tomados");
    XLSX.writeFile(reportWorkbook, reportPath);

    const serviceWorkbook = XLSX.utils.book_new();
    const serviceSheet = XLSX.utils.aoa_to_sheet([
      [
        "Código CNAE 2.1",
        "Descrição do Código CNAE 2.0",
        "Item da Lista",
        "Descrição do Item da Lista (LC Nº 116/2003)",
      ],
      ["5510-8/01", "Descricao", "09.01", "Hospedagem de qualquer natureza em hotéis."],
      ["5250-8/03", "Descricao", "10.05", "Agenciamento, corretagem ou intermediação."],
      ["4619-2/00", "Descricao", "10.09", "Representação de qualquer natureza, inclusive comercial."],
    ]);
    XLSX.utils.book_append_sheet(serviceWorkbook, serviceSheet, "Mapa");
    XLSX.writeFile(serviceWorkbook, serviceMapPath);

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
