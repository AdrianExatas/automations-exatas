import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as XLSX from "xlsx";
import { readEmpresas } from "./empresas-reader";

describe("empresas-reader", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-test-"));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it("retorna array vazio para planilha sem CNPJs validos", () => {
    const filePath = path.join(tempDir, "empty.xlsx");
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["CNPJ", "Nome"],
      ["", "Vazio"],
      ["nan", "Invalido"],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Empresas");
    XLSX.writeFile(workbook, filePath);

    expect(readEmpresas(filePath)).toEqual([]);
  });

  it("le a estrutura atual com arquivos opcionais", () => {
    const filePath = path.join(tempDir, "empresas.xlsx");
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      [
        "CNPJ",
        "CODIGO",
        "EMPRESA",
        "SOLICITANTE",
        "DEPARTAMENTO",
        "ASSUNTO",
        "DESCRICAO",
        "QTD_ARQUIVOS",
        "ARQUIVOS",
      ],
      [
        "12.345.678/0001-90",
        "543",
        "Empresa A",
        "Fulano",
        "Fiscal",
        "Assunto A",
        "Descricao A",
        2,
        "Empresa 543 - A.pdf; Empresa 543 - B.xlsx",
      ],
      ["98.765.432/0001-10", "13", "Empresa B", "", "", "", "", "", ""],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Empresas");
    XLSX.writeFile(workbook, filePath);

    const result = readEmpresas(filePath);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      cnpj: "12.345.678/0001-90",
      codigo: "543",
      nome: "Empresa A",
      solicitante: "Fulano",
      departamento: "Fiscal",
      assunto: "Assunto A",
      descricao: "Descricao A",
      qtdArquivos: 2,
      arquivos: ["Empresa 543 - A.pdf", "Empresa 543 - B.xlsx"],
    });
    expect(result[1]).toMatchObject({
      cnpj: "98.765.432/0001-10",
      codigo: "13",
      nome: "Empresa B",
      arquivos: [],
    });
  });

  it("aceita quebra de linha no campo arquivos e ausencia de colunas opcionais", () => {
    const filePath = path.join(tempDir, "empresas-linhas.xlsx");
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["CNPJ", "Codigo", "Empresa", "Arquivos"],
      ["12.345.678/0001-90", "100", "Empresa A", "Arquivo A.pdf\nArquivo B.pdf"],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Empresas");
    XLSX.writeFile(workbook, filePath);

    const result = readEmpresas(filePath);
    expect(result[0]?.arquivos).toEqual(["Arquivo A.pdf", "Arquivo B.pdf"]);
    expect(result[0]?.qtdArquivos).toBeUndefined();
  });

  it("le colunas opcionais de override do Onvio sem quebrar planilhas antigas", () => {
    const filePath = path.join(tempDir, "empresas-onvio.xlsx");
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      [
        "CNPJ",
        "CODIGO",
        "EMPRESA",
        "ONVIO_CLIENT_ID",
        "ONVIO_REQUESTER_ID",
        "ONVIO_DEPARTMENT_ID",
      ],
      [
        "12.345.678/0001-90",
        "543",
        "Empresa A",
        "client-1",
        "requester-1",
        "department-1",
      ],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Empresas");
    XLSX.writeFile(workbook, filePath);

    const [empresa] = readEmpresas(filePath);
    expect(empresa).toMatchObject({
      onvioClientId: "client-1",
      onvioRequesterId: "requester-1",
      onvioDepartmentId: "department-1",
    });
  });

  it("rejeita codigo duplicado na planilha", () => {
    const filePath = path.join(tempDir, "duplicados.xlsx");
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["CNPJ", "Codigo", "Empresa"],
      ["12.345.678/0001-90", "100", "Empresa A"],
      ["98.765.432/0001-10", "100", "Empresa B"],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Empresas");
    XLSX.writeFile(workbook, filePath);

    expect(() => readEmpresas(filePath)).toThrow("Código duplicado na planilha: 100");
  });

  it("lanca erro para arquivo inexistente", () => {
    expect(() => readEmpresas(path.join(tempDir, "naoexiste.xlsx"))).toThrow(
      "Planilha não encontrada",
    );
  });
});
