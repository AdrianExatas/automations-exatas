import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { compareEmpresasPlanilhas } from "./compare-empresas";

function writeWorkbook(filePath: string, sheetName: string, rows: Record<string, unknown>[]): void {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filePath);
}

function readSheet(filePath: string, sheetName: string): Record<string, string>[] {
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false }) as Record<string, string>[];
}

async function readExcelJsWorkbook(filePath: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  return workbook;
}

describe("compareEmpresasPlanilhas", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-compare-"));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it("gera relatorio e planilha final comparando por CNPJ", async () => {
    const atualizadaPath = path.join(tempDir, "atualizada.xlsx");
    const operacionalPath = path.join(tempDir, "operacional.xlsx");
    const outputDir = path.join(tempDir, "saida");

    writeWorkbook(atualizadaPath, "Empresas", [
      {
        "Cnpj Empresa": "11.111.111/0001-11",
        "Código": "0200",
        "Razão Social": "Empresa A LTDA",
        "Ativo?": "Sim",
        "Data Exclusão": "",
      },
      {
        "Cnpj Empresa": "22.222.222/0001-22",
        "Código": "0300",
        "Razão Social": "Empresa Nova LTDA",
        "Ativo?": "Sim",
        "Data Exclusão": "",
      },
      {
        "Cnpj Empresa": "44.444.444/0001-44",
        "Código": "0400",
        "Razão Social": "Empresa Inativa LTDA",
        "Ativo?": "Nao",
        "Data Exclusão": "",
      },
      {
        "Cnpj Empresa": "55.555.555/0001-55",
        "Código": "0500",
        "Razão Social": "Empresa Excluida LTDA",
        "Ativo?": "Sim",
        "Data Exclusão": "01/06/2026",
      },
    ]);

    writeWorkbook(operacionalPath, "Planilha1", [
      {
        CODIGO: "100",
        "CNPJ EMPRESA": "11111111000111",
        EMPRESA: "Empresa A LTDA",
        RESPONSÁVEL: "Alice",
        Departamento: "SETOR FISCAL",
        Assunto: "Relatorio Unecont",
        Descrição: "Descricao padrao",
        QTD_ARQUIVOS: "2",
        ARQUIVOS: "A.pdf;B.xlsx",
        ONVIO_CLIENT_ID: "client-1",
      },
      {
        CODIGO: "300",
        "CNPJ EMPRESA": "33333333000133",
        EMPRESA: "Empresa Removida LTDA",
        RESPONSÁVEL: "Bruno",
        Departamento: "SETOR FISCAL",
        Assunto: "Relatorio Unecont",
        Descrição: "Descricao padrao",
      },
    ]);

    const result = await compareEmpresasPlanilhas({
      atualizadaPath,
      operacionalPath,
      outputDir,
    });

    expect(result.summary).toEqual({
      atualizadas: 2,
      operacionais: 2,
      final: 2,
      novas: 1,
      removidas: 1,
      alteradas: 1,
      conflitosCodigo: 1,
      usuariosConsultados: 0,
      usuariosPreenchidos: 0,
      usuariosMultiplaEscolha: 0,
      usuariosNaoEncontrados: 0,
      usuariosComErro: 0,
    });
    expect(result.alteradas).toEqual([
      {
        cnpj: "11111111000111",
        oldCnpj: "11111111000111",
        newCnpj: "11.111.111/0001-11",
        oldCodigo: "100",
        newCodigo: "200",
        oldNome: "Empresa A LTDA",
        newNome: "Empresa A LTDA",
      },
    ]);
    expect(result.novas).toEqual([
      {
        cnpj: "22222222000122",
        codigo: "300",
        nome: "Empresa Nova LTDA",
      },
    ]);
    expect(result.removidas).toEqual([
      {
        cnpj: "33333333000133",
        codigo: "300",
        nome: "Empresa Removida LTDA",
      },
    ]);
    expect(result.conflitosCodigo).toEqual([
      {
        codigo: "300",
        operacionalCnpj: "33333333000133",
        operacionalNome: "Empresa Removida LTDA",
        atualizadaCnpj: "22222222000122",
        atualizadaNome: "Empresa Nova LTDA",
      },
    ]);

    expect(fs.existsSync(result.reportPath)).toBe(true);
    expect(fs.existsSync(result.finalPlanilhaPath)).toBe(true);

    const finalRows = readSheet(result.finalPlanilhaPath, "Planilha1");
    expect(finalRows).toHaveLength(2);
    expect(finalRows[0]).toMatchObject({
      CODIGO: "200",
      "CNPJ EMPRESA": "11111111000111",
      EMPRESA: "Empresa A LTDA",
      RESPONSÁVEL: "Alice",
      Departamento: "SETOR FISCAL",
      Assunto: "Relatorio Unecont",
      Descrição: "Descricao padrao",
      QTD_ARQUIVOS: "2",
      ARQUIVOS: "A.pdf;B.xlsx",
      ONVIO_CLIENT_ID: "client-1",
    });
    expect(finalRows[1]).toMatchObject({
      CODIGO: "300",
      "CNPJ EMPRESA": "22222222000122",
      EMPRESA: "Empresa Nova LTDA",
      RESPONSÁVEL: "",
      Departamento: "SETOR FISCAL",
      Assunto: "Relatorio Unecont",
      Descrição: "Descricao padrao",
    });

    const resumo = readSheet(result.reportPath, "Resumo");
    expect(resumo).toEqual([
      { CAMPO: "ATUALIZADAS_ATIVAS", VALOR: "2" },
      { CAMPO: "OPERACIONAIS", VALOR: "2" },
      { CAMPO: "PLANILHA_FINAL", VALOR: "2" },
      { CAMPO: "NOVAS", VALOR: "1" },
      { CAMPO: "REMOVIDAS", VALOR: "1" },
      { CAMPO: "ALTERADAS", VALOR: "1" },
      { CAMPO: "CONFLITOS_CODIGO", VALOR: "1" },
      { CAMPO: "USUARIOS_CONSULTADOS", VALOR: "0" },
      { CAMPO: "USUARIOS_PREENCHIDOS", VALOR: "0" },
      { CAMPO: "USUARIOS_MULTIPLA_ESCOLHA", VALOR: "0" },
      { CAMPO: "USUARIOS_NAO_ENCONTRADOS", VALOR: "0" },
      { CAMPO: "USUARIOS_COM_ERRO", VALOR: "0" },
    ]);
    expect(readSheet(result.reportPath, "Planilha Final")).toHaveLength(2);
  });

  it("enriquece novas e linhas sem responsavel com usuarios do cliente", async () => {
    const atualizadaPath = path.join(tempDir, "atualizada-usuarios.xlsx");
    const operacionalPath = path.join(tempDir, "operacional-usuarios.xlsx");
    const outputDir = path.join(tempDir, "saida-usuarios");

    writeWorkbook(atualizadaPath, "Empresas", [
      {
        "Cnpj Empresa": "11.111.111/0001-11",
        "Código": "100",
        "Razão Social": "Empresa Com Responsavel LTDA",
        "Ativo?": "Sim",
        "Data Exclusão": "",
      },
      {
        "Cnpj Empresa": "22.222.222/0001-22",
        "Código": "200",
        "Razão Social": "Empresa Sem Responsavel LTDA",
        "Ativo?": "Sim",
        "Data Exclusão": "",
      },
      {
        "Cnpj Empresa": "33.333.333/0001-33",
        "Código": "300",
        "Razão Social": "Empresa Nova Unica LTDA",
        "Ativo?": "Sim",
        "Data Exclusão": "",
      },
      {
        "Cnpj Empresa": "44.444.444/0001-44",
        "Código": "400",
        "Razão Social": "Empresa Nova Multipla LTDA",
        "Ativo?": "Sim",
        "Data Exclusão": "",
      },
      {
        "Cnpj Empresa": "55.555.555/0001-55",
        "Código": "500",
        "Razão Social": "Empresa Nova Erro LTDA",
        "Ativo?": "Sim",
        "Data Exclusão": "",
      },
      {
        "Cnpj Empresa": "66.666.666/0001-66",
        "Código": "600",
        "Razão Social": "Empresa Responsavel Invalido Multipla LTDA",
        "Ativo?": "Sim",
        "Data Exclusão": "",
      },
      {
        "Cnpj Empresa": "77.777.777/0001-77",
        "Código": "700",
        "Razão Social": "Empresa Responsavel Invalido Unico LTDA",
        "Ativo?": "Sim",
        "Data Exclusão": "",
      },
      {
        "Cnpj Empresa": "88.888.888/0001-88",
        "Código": "800",
        "Razão Social": "Empresa Responsavel Pontuacao LTDA",
        "Ativo?": "Sim",
        "Data Exclusão": "",
      },
    ]);

    writeWorkbook(operacionalPath, "Planilha1", [
      {
        CODIGO: "100",
        "CNPJ EMPRESA": "11111111000111",
        EMPRESA: "Empresa Com Responsavel LTDA",
        RESPONSÁVEL: "Responsavel Existente",
        Departamento: "SETOR FISCAL",
        Assunto: "Relatorio Unecont",
        Descrição: "Descricao padrao",
      },
      {
        CODIGO: "200",
        "CNPJ EMPRESA": "22222222000122",
        EMPRESA: "Empresa Sem Responsavel LTDA",
        RESPONSÁVEL: "",
        Departamento: "SETOR FISCAL",
        Assunto: "Relatorio Unecont",
        Descrição: "Descricao padrao",
      },
      {
        CODIGO: "600",
        "CNPJ EMPRESA": "66666666000166",
        EMPRESA: "Empresa Responsavel Invalido Multipla LTDA",
        RESPONSÁVEL: "Usuario De Outra Empresa",
        Departamento: "SETOR FISCAL",
        Assunto: "Relatorio Unecont",
        Descrição: "Descricao padrao",
        ONVIO_REQUESTER_ID: "requester-antigo-multipla",
      },
      {
        CODIGO: "700",
        "CNPJ EMPRESA": "77777777000177",
        EMPRESA: "Empresa Responsavel Invalido Unico LTDA",
        RESPONSÁVEL: "Usuario Antigo",
        Departamento: "SETOR FISCAL",
        Assunto: "Relatorio Unecont",
        Descrição: "Descricao padrao",
        ONVIO_REQUESTER_ID: "requester-antigo-unico",
      },
      {
        CODIGO: "800",
        "CNPJ EMPRESA": "88888888000188",
        EMPRESA: "Empresa Responsavel Pontuacao LTDA",
        RESPONSÁVEL: "JACIARA NERIS DOS SANTOS",
        Departamento: "SETOR FISCAL",
        Assunto: "Relatorio Unecont",
        Descrição: "Descricao padrao",
        ONVIO_REQUESTER_ID: "requester-antigo-pontuacao",
      },
    ]);

    const result = await compareEmpresasPlanilhas({
      atualizadaPath,
      operacionalPath,
      outputDir,
      clientUsersProvider: {
        async lookupUsers(request) {
          if (request.codigo === "100") {
            return [{ nome: "Responsavel Existente", id: "requester-100" }];
          }
          if (request.codigo === "200") {
            return [{ nome: "Usuario Existente", id: "requester-200" }];
          }
          if (request.codigo === "300") {
            return [{ nome: "Usuario Unico", email: "unico@example.com", id: "requester-300" }];
          }
          if (request.codigo === "400") return [{ nome: "Usuario A" }, { nome: "Usuario B" }];
          if (request.codigo === "500") throw new Error("falha portal");
          if (request.codigo === "600") {
            return [
              { nome: "Usuario Certo A", id: "requester-600-a" },
              { nome: "Usuario Certo B", id: "requester-600-b" },
            ];
          }
          if (request.codigo === "700") {
            return [{ nome: "Usuario Corrigido", id: "requester-700" }];
          }
          if (request.codigo === "800") {
            return [{ nome: "JACIARA NERIS DOS SANTOS'", id: "requester-800" }];
          }
          throw new Error(`codigo inesperado: ${request.codigo}`);
        },
      },
    });

    expect(result.summary).toMatchObject({
      usuariosConsultados: 8,
      usuariosPreenchidos: 5,
      usuariosMultiplaEscolha: 2,
      usuariosNaoEncontrados: 0,
      usuariosComErro: 1,
    });

    const finalRows = readSheet(result.finalPlanilhaPath, "Planilha1");
    expect(finalRows.find((row) => row.CODIGO === "100")).toMatchObject({
      RESPONSÁVEL: "Responsavel Existente",
      ONVIO_REQUESTER_ID: "requester-100",
      STATUS_USUARIOS_CLIENTE: "preenchido_unico",
    });
    expect(finalRows.find((row) => row.CODIGO === "200")).toMatchObject({
      RESPONSÁVEL: "Usuario Existente",
      ONVIO_REQUESTER_ID: "requester-200",
      USUARIOS_CLIENTE: "Usuario Existente",
      QTD_USUARIOS_CLIENTE: "1",
      STATUS_USUARIOS_CLIENTE: "preenchido_unico",
    });
    expect(finalRows.find((row) => row.CODIGO === "300")).toMatchObject({
      RESPONSÁVEL: "Usuario Unico",
      ONVIO_REQUESTER_ID: "requester-300",
      USUARIOS_CLIENTE: "Usuario Unico",
      STATUS_USUARIOS_CLIENTE: "preenchido_unico",
    });
    expect(finalRows.find((row) => row.CODIGO === "400")).toMatchObject({
      RESPONSÁVEL: "",
      USUARIOS_CLIENTE: "Usuario A; Usuario B",
      QTD_USUARIOS_CLIENTE: "2",
      STATUS_USUARIOS_CLIENTE: "multipla_escolha",
    });
    expect(finalRows.find((row) => row.CODIGO === "500")).toMatchObject({
      RESPONSÁVEL: "",
      USUARIOS_CLIENTE: "",
      QTD_USUARIOS_CLIENTE: "0",
      STATUS_USUARIOS_CLIENTE: "erro_consulta",
    });
    expect(finalRows.find((row) => row.CODIGO === "600")).toMatchObject({
      RESPONSÁVEL: "",
      ONVIO_REQUESTER_ID: "",
      USUARIOS_CLIENTE: "Usuario Certo A; Usuario Certo B",
      QTD_USUARIOS_CLIENTE: "2",
      STATUS_USUARIOS_CLIENTE: "responsavel_invalido_multipla_escolha",
    });
    expect(finalRows.find((row) => row.CODIGO === "700")).toMatchObject({
      RESPONSÁVEL: "Usuario Corrigido",
      ONVIO_REQUESTER_ID: "requester-700",
      USUARIOS_CLIENTE: "Usuario Corrigido",
      QTD_USUARIOS_CLIENTE: "1",
      STATUS_USUARIOS_CLIENTE: "responsavel_corrigido_unico",
    });
    expect(finalRows.find((row) => row.CODIGO === "800")).toMatchObject({
      RESPONSÁVEL: "JACIARA NERIS DOS SANTOS'",
      ONVIO_REQUESTER_ID: "requester-800",
      USUARIOS_CLIENTE: "JACIARA NERIS DOS SANTOS'",
      QTD_USUARIOS_CLIENTE: "1",
      STATUS_USUARIOS_CLIENTE: "preenchido_unico",
    });

    const usuariosSheet = readSheet(result.reportPath, "Usuarios Cliente");
    expect(usuariosSheet).toHaveLength(8);
    expect(usuariosSheet.find((row) => row.codigo === "500")).toMatchObject({
      statusUsuariosCliente: "erro_consulta",
      mensagem: "falha portal",
    });
    expect(usuariosSheet.find((row) => row.codigo === "300")).toMatchObject({
      usuariosCliente: "Usuario Unico",
    });
    expect(usuariosSheet.find((row) => row.codigo === "600")).toMatchObject({
      statusUsuariosCliente: "responsavel_invalido_multipla_escolha",
    });
    expect(usuariosSheet.find((row) => row.codigo === "700")).toMatchObject({
      statusUsuariosCliente: "responsavel_corrigido_unico",
    });

    const finalWorkbook = await readExcelJsWorkbook(result.finalPlanilhaPath);
    const finalSheet = finalWorkbook.getWorksheet("Planilha1");
    const optionsSheet = finalWorkbook.getWorksheet("Opcoes Usuarios");
    expect(finalSheet).toBeDefined();
    expect(optionsSheet).toBeDefined();
    expect(optionsSheet?.state).toBe("hidden");
    expect(optionsSheet?.getRow(1).values).toEqual([
      undefined,
      "CODIGO",
      "CNPJ",
      "EMPRESA",
      "USUARIO",
    ]);
    expect(optionsSheet?.getCell("D2").value).toBe("Responsavel Existente");
    expect(optionsSheet?.getCell("D3").value).toBe("Usuario Existente");
    expect(optionsSheet?.getCell("D4").value).toBe("Usuario Unico");
    expect(optionsSheet?.getCell("D5").value).toBe("Usuario A");
    expect(optionsSheet?.getCell("D6").value).toBe("Usuario B");
    expect(finalSheet?.getCell("D2").dataValidation?.formulae).toEqual([
      "'Opcoes Usuarios'!$D$2:$D$2",
    ]);
    expect(finalSheet?.getCell("D3").dataValidation?.formulae).toEqual([
      "'Opcoes Usuarios'!$D$3:$D$3",
    ]);
    expect(finalSheet?.getCell("D4").dataValidation?.formulae).toEqual([
      "'Opcoes Usuarios'!$D$4:$D$4",
    ]);
    expect(finalSheet?.getCell("D5").dataValidation?.formulae).toEqual([
      "'Opcoes Usuarios'!$D$5:$D$6",
    ]);
    expect(finalSheet?.getCell("D6").dataValidation).toBeUndefined();

    const reportWorkbook = await readExcelJsWorkbook(result.reportPath);
    const reportFinalSheet = reportWorkbook.getWorksheet("Planilha Final");
    const reportOptionsSheet = reportWorkbook.getWorksheet("Opcoes Usuarios");
    expect(reportOptionsSheet?.state).toBe("hidden");
    expect(reportFinalSheet?.getCell("D5").dataValidation?.formulae).toEqual([
      "'Opcoes Usuarios'!$D$5:$D$6",
    ]);
  });
});
