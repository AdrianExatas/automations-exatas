import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const compareEmpresasPlanilhas = vi.fn();
const downloadEmpresasUnecont = vi.fn();
const downloadBitrixAccountingCompanies = vi.fn();

vi.mock("./compare-empresas", () => ({
  compareEmpresasPlanilhas,
}));

vi.mock("./download-empresas-unecont", () => ({
  downloadEmpresasUnecont,
}));

vi.mock("./bitrix-competencias", () => ({
  downloadBitrixAccountingCompanies,
  downloadBitrixCompetencias: vi.fn(),
  readBitrixCompetenciaCodes: vi.fn(),
  resolveCurrentMonthReference: vi.fn(() => "09/2026"),
}));

async function writeOperationalWorkbook(
  filePath: string,
  descricao: string,
  departamento = "SETOR FISCAL",
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Planilha1");
  worksheet.addRow(["CODIGO", "CNPJ EMPRESA", "EMPRESA", "RESPONSÁVEL", "Departamento", "Descrição"]);
  worksheet.addRow(["001", "11111111000111", "Empresa A", "Alice", departamento, descricao]);
  await workbook.xlsx.writeFile(filePath);
}

async function readDescricaoAsync(filePath: string): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  return String(workbook.getWorksheet("Planilha1")?.getRow(2).getCell(6).value ?? "");
}

async function readDepartmentsAsync(filePath: string): Promise<string[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet("Planilha1");
  return [2, 3].map((rowNumber) => String(worksheet?.getRow(rowNumber).getCell(5).value ?? ""));
}

async function readResponsavelValidationAsync(filePath: string): Promise<ExcelJS.DataValidation | undefined> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  return workbook.getWorksheet("Planilha1")?.getCell("D2").dataValidation;
}

async function writeAccountingCompaniesWorkbook(filePath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const dashboard = workbook.addWorksheet("Dashboard");
  dashboard.addRow(["DASHBOARD - CONTROLE CONTÁBIL"]);
  const worksheet = workbook.addWorksheet("Empresas");
  worksheet.addRow(["CÓD.", "CNPJ", "EMPRESA"]);
  worksheet.addRow(["001", "11111111000111", "Empresa A"]);
  await workbook.xlsx.writeFile(filePath);
}

describe("updatePlanilhaOperacional", () => {
  let tempDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-update-planilha-"));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it("atualiza descricao, mantem runtime e publica a planilha mensal", async () => {
    const operacionalPath = path.join(tempDir, "planilha-operacional-maio-atualizada.xlsx");
    const outputDir = path.join(tempDir, "runtime");
    const publishDir = path.join(tempDir, "assets");
    const finalPath = path.join(outputDir, "planilha-operacional-atualizada.xlsx");
    const reportPath = path.join(outputDir, "relatorio-comparacao.xlsx");
    await writeOperationalWorkbook(operacionalPath, "Segue referente ao mês 05/2026.");

    downloadEmpresasUnecont.mockResolvedValue({
      outputDir,
      filePath: path.join(outputDir, "base-unecont.xlsx"),
      reportName: "base.xlsx",
      sizeBytes: 100,
    });
    compareEmpresasPlanilhas.mockImplementation(async () => {
      fs.mkdirSync(outputDir, { recursive: true });
      await writeOperationalWorkbook(finalPath, "Segue referente ao mês 05/2026.");
      fs.writeFileSync(reportPath, "stub");
      return {
        outputDir,
        reportPath,
        finalPlanilhaPath: finalPath,
        summary: {
          atualizadas: 1,
          operacionais: 1,
          final: 1,
          novas: 0,
          removidas: 0,
          alteradas: 0,
          conflitosCodigo: 0,
          usuariosConsultados: 0,
          usuariosPreenchidos: 0,
          usuariosMultiplaEscolha: 0,
          usuariosNaoEncontrados: 0,
          usuariosComErro: 0,
        },
        novas: [],
        removidas: [],
        alteradas: [],
        conflitosCodigo: [],
        usuariosCliente: [],
      };
    });

    const { updatePlanilhaOperacional } = await import("./update-planilha-operacional");
    const result = await updatePlanilhaOperacional({
      credentials: { email: "teste@example.com", senha: "123" },
      operacionalPath,
      outputDir,
      publishDir,
      now: new Date(2026, 6, 2),
    });

    expect(downloadEmpresasUnecont).toHaveBeenCalledWith(
      expect.objectContaining({
        outputDir,
        credentials: { email: "teste@example.com", senha: "123" },
      }),
    );
    expect(compareEmpresasPlanilhas).toHaveBeenCalledWith(
      expect.objectContaining({
        atualizadaPath: path.join(outputDir, "base-unecont.xlsx"),
        operacionalPath,
        outputDir,
      }),
    );
    expect(result.referenceMonth).toBe("06/2026");
    expect(result.publishedPlanilhaPath).toBe(
      path.join(publishDir, "planilha-operacional-junho-atualizada.xlsx"),
    );
    await expect(readDescricaoAsync(finalPath)).resolves.toBe("Segue referente ao mês 06/2026.");
    await expect(readDescricaoAsync(result.publishedPlanilhaPath)).resolves.toBe(
      "Segue referente ao mês 06/2026.",
    );
  });

  it("aplica descricao especifica para setor contabil", async () => {
    const workbookPath = path.join(tempDir, "contabil.xlsx");
    await writeOperationalWorkbook(workbookPath, "Descricao antiga mês 05/2026.", "SETOR CONTÁBIL");

    const { buildAccountingDescription, updateDescricaoReferenceMonth } = await import(
      "./update-planilha-operacional"
    );
    const updated = await updateDescricaoReferenceMonth(workbookPath, "06/2026");

    expect(updated).toBe(1);
    await expect(readDescricaoAsync(workbookPath)).resolves.toBe(
      buildAccountingDescription("06/2026"),
    );
  });

  it("identifica setor contabil sem acento e com caixa diferente", async () => {
    const workbookPath = path.join(tempDir, "contabil-normalizado.xlsx");
    await writeOperationalWorkbook(workbookPath, "Descricao antiga mês 05/2026.", " setor contabil ");

    const { buildAccountingDescription, updateDescricaoReferenceMonth } = await import(
      "./update-planilha-operacional"
    );
    await updateDescricaoReferenceMonth(workbookPath, "06/2026");

    await expect(readDescricaoAsync(workbookPath)).resolves.toBe(
      buildAccountingDescription("06/2026"),
    );
  });

  it("sincroniza departamento pela lista de empresas contabeis", async () => {
    const workbookPath = path.join(tempDir, "departamentos.xlsx");
    const accountingPath = path.join(tempDir, "empresas-contabil.xlsx");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Planilha1");
    worksheet.addRow(["CODIGO", "CNPJ EMPRESA", "EMPRESA", "RESPONSÃVEL", "Departamento", "DescriÃ§Ã£o"]);
    worksheet.addRow(["001", "11.111.111/0001-11", "Empresa A", "", "SETOR FISCAL", ""]);
    worksheet.addRow(["002", "22.222.222/0001-22", "Empresa B", "", "SETOR CONTÃBIL", ""]);
    await workbook.xlsx.writeFile(workbookPath);
    await writeAccountingCompaniesWorkbook(accountingPath);

    const { updateDepartamentosFromAccountingCompanies } = await import(
      "./update-planilha-operacional"
    );
    const result = await updateDepartamentosFromAccountingCompanies(workbookPath, accountingPath);

    expect(result.updated).toBe(2);
    expect(result.accountingRows).toBe(1);
    expect(result.fiscalRows).toBe(1);
    await expect(readDepartmentsAsync(workbookPath)).resolves.toEqual([
      "SETOR CONT\u00c1BIL",
      "SETOR FISCAL",
    ]);
  });

  it("usa a lista contabil baixada do Bitrix quando a URL e informada", async () => {
    const operacionalPath = path.join(tempDir, "operacional.xlsx");
    const outputDir = path.join(tempDir, "runtime-bitrix");
    const publishDir = path.join(tempDir, "assets-bitrix");
    const finalPath = path.join(outputDir, "planilha-operacional-atualizada.xlsx");
    const accountingPath = path.join(tempDir, "contabil-bitrix.xlsx");
    await writeOperationalWorkbook(operacionalPath, "Descricao mes 07/2026.");
    await writeAccountingCompaniesWorkbook(accountingPath);

    downloadEmpresasUnecont.mockResolvedValue({
      outputDir,
      filePath: path.join(outputDir, "base-unecont.xlsx"),
      reportName: "base.xlsx",
      sizeBytes: 100,
    });
    compareEmpresasPlanilhas.mockImplementation(async () => {
      fs.mkdirSync(outputDir, { recursive: true });
      await writeOperationalWorkbook(finalPath, "Descricao mes 07/2026.");
      return {
        outputDir,
        reportPath: path.join(outputDir, "relatorio-comparacao.xlsx"),
        finalPlanilhaPath: finalPath,
        summary: { atualizadas: 1, excluidasPorCompetencia: 0, operacionais: 1, final: 1, novas: 0, removidas: 0, alteradas: 0, conflitosCodigo: 0, usuariosConsultados: 0, usuariosPreenchidos: 0, usuariosMultiplaEscolha: 0, usuariosNaoEncontrados: 0, usuariosComErro: 0 },
        novas: [], excluidasPorCompetencia: [], removidas: [], alteradas: [], conflitosCodigo: [], usuariosCliente: [],
      };
    });
    downloadBitrixAccountingCompanies.mockResolvedValue({ filePath: accountingPath, sizeBytes: 100 });

    const { updatePlanilhaOperacional } = await import("./update-planilha-operacional");
    const result = await updatePlanilhaOperacional({
      credentials: { email: "teste@example.com", senha: "123" },
      operacionalPath,
      outputDir,
      publishDir,
      referenceMonth: "07/2026",
      bitrixAccountingUrl: "https://bitrix.example/sheet/contabil",
    });

    expect(downloadBitrixAccountingCompanies).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://bitrix.example/sheet/contabil", outputDir }),
    );
    expect(result.bitrixAccountingPath).toBe(accountingPath);
    await expect(readDepartmentsAsync(finalPath)).resolves.toEqual(["SETOR CONTÁBIL", ""]);
  });

  it("falha quando a aba Empresas da lista contabil nao possui CÓD. e CNPJ", async () => {
    const workbookPath = path.join(tempDir, "departamentos.xlsx");
    const accountingPath = path.join(tempDir, "empresas-contabil-invalida.xlsx");
    await writeOperationalWorkbook(workbookPath, "Descricao.");

    const accountingWorkbook = new ExcelJS.Workbook();
    accountingWorkbook.addWorksheet("Dashboard").addRow(["Painel"]);
    accountingWorkbook.addWorksheet("Empresas").addRow(["EMPRESA"]);
    await accountingWorkbook.xlsx.writeFile(accountingPath);

    const { updateDepartamentosFromAccountingCompanies } = await import(
      "./update-planilha-operacional"
    );
    await expect(
      updateDepartamentosFromAccountingCompanies(workbookPath, accountingPath),
    ).rejects.toThrow("precisa conter as colunas CÓD. e CNPJ");
  });

  it("restaura dropdown de responsavel pela aba de opcoes de usuarios", async () => {
    const workbookPath = path.join(tempDir, "dropdowns.xlsx");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Planilha1");
    worksheet.addRow(["CODIGO", "CNPJ EMPRESA", "EMPRESA", "RESPONS\u00c1VEL"]);
    worksheet.addRow(["001", "11.111.111/0001-11", "Empresa A", ""]);
    const optionsSheet = workbook.addWorksheet("Opcoes Usuarios");
    optionsSheet.addRow(["CODIGO", "CNPJ", "EMPRESA", "USUARIO"]);
    optionsSheet.addRow(["001", "11111111000111", "Empresa A", "Alice"]);
    optionsSheet.addRow(["001", "11111111000111", "Empresa A", "Bruno"]);
    await workbook.xlsx.writeFile(workbookPath);

    const { restoreResponsavelDropdowns } = await import("./update-planilha-operacional");
    const updated = await restoreResponsavelDropdowns(workbookPath);

    expect(updated).toBe(1);
    await expect(readResponsavelValidationAsync(workbookPath)).resolves.toMatchObject({
      type: "list",
      allowBlank: true,
      formulae: ["'Opcoes Usuarios'!$D$2:$D$3"],
    });
  });

  it("nao sobrescreve planilha publicada sem force", async () => {
    const operacionalPath = path.join(tempDir, "operacional.xlsx");
    const outputDir = path.join(tempDir, "runtime");
    const publishDir = path.join(tempDir, "assets");
    const finalPath = path.join(outputDir, "planilha-operacional-atualizada.xlsx");
    await writeOperationalWorkbook(operacionalPath, "Sem referencia.");
    fs.mkdirSync(publishDir, { recursive: true });
    fs.writeFileSync(path.join(publishDir, "planilha-operacional-junho-atualizada.xlsx"), "ja existe");

    downloadEmpresasUnecont.mockResolvedValue({
      outputDir,
      filePath: path.join(outputDir, "base-unecont.xlsx"),
      reportName: "base.xlsx",
      sizeBytes: 100,
    });
    compareEmpresasPlanilhas.mockImplementation(async () => {
      fs.mkdirSync(outputDir, { recursive: true });
      await writeOperationalWorkbook(finalPath, "Sem referencia.");
      return {
        outputDir,
        reportPath: path.join(outputDir, "relatorio-comparacao.xlsx"),
        finalPlanilhaPath: finalPath,
        summary: {
          atualizadas: 1,
          operacionais: 1,
          final: 1,
          novas: 0,
          removidas: 0,
          alteradas: 0,
          conflitosCodigo: 0,
          usuariosConsultados: 0,
          usuariosPreenchidos: 0,
          usuariosMultiplaEscolha: 0,
          usuariosNaoEncontrados: 0,
          usuariosComErro: 0,
        },
        novas: [],
        removidas: [],
        alteradas: [],
        conflitosCodigo: [],
        usuariosCliente: [],
      };
    });

    const { updatePlanilhaOperacional } = await import("./update-planilha-operacional");
    await expect(
      updatePlanilhaOperacional({
        credentials: { email: "teste@example.com", senha: "123" },
        operacionalPath,
        outputDir,
        publishDir,
        referenceMonth: "06/2026",
      }),
    ).rejects.toThrow("Use --force");
  });

  it("remove empresas nao localizadas no Onvio da planilha e ainda publica", async () => {
    const operacionalPath = path.join(tempDir, "operacional-onvio.xlsx");
    const outputDir = path.join(tempDir, "runtime-onvio");
    const publishDir = path.join(tempDir, "assets-onvio");
    const finalPath = path.join(outputDir, "planilha-operacional-atualizada.xlsx");
    await writeOperationalWorkbook(operacionalPath, "Descricao.");
    downloadEmpresasUnecont.mockResolvedValue({ outputDir, filePath: path.join(outputDir, "base.xlsx"), reportName: "base.xlsx", sizeBytes: 1 });
    compareEmpresasPlanilhas.mockImplementation(async () => {
      fs.mkdirSync(outputDir, { recursive: true });
      await writeOperationalWorkbook(finalPath, "Descricao.");
      return {
        outputDir, reportPath: path.join(outputDir, "relatorio.xlsx"), finalPlanilhaPath: finalPath,
        summary: { atualizadas: 1, excluidasPorCompetencia: 0, operacionais: 1, final: 1, novas: 0, removidas: 0, alteradas: 0, conflitosCodigo: 0, usuariosConsultados: 0, usuariosPreenchidos: 0, usuariosMultiplaEscolha: 0, usuariosNaoEncontrados: 0, usuariosComErro: 0 },
        novas: [], excluidasPorCompetencia: [], removidas: [], alteradas: [], conflitosCodigo: [], usuariosCliente: [],
      };
    });
    const { updatePlanilhaOperacional } = await import("./update-planilha-operacional");
    const result = await updatePlanilhaOperacional({
      credentials: { email: "teste@example.com", senha: "123" },
      operacionalPath,
      outputDir,
      publishDir,
      referenceMonth: "07/2026",
      force: true,
      onvioCompaniesProvider: { lookupCompany: async () => ({ codigo: "1", status: "NAO_LOCALIZADO" }) },
    });
    expect(result.publishedPlanilhaPath).toBe(
      path.join(publishDir, "planilha-operacional-julho-atualizada.xlsx"),
    );
    expect(fs.existsSync(result.publishedPlanilhaPath)).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "relatorio-onvio-clientes.xlsx"))).toBe(true);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(finalPath);
    expect(wb.worksheets[0].rowCount).toBe(1);
  });

  it("localiza a planilha operacional atualizada mais recente", async () => {
    const baseDir = path.join(tempDir, "planilhas");
    fs.mkdirSync(baseDir, { recursive: true });
    const older = path.join(baseDir, "planilha-operacional-abril-atualizada.xlsx");
    const newer = path.join(baseDir, "planilha-operacional-maio-atualizada.xlsx");
    fs.writeFileSync(older, "older");
    fs.writeFileSync(newer, "newer");
    const olderDate = new Date(2026, 4, 1);
    const newerDate = new Date(2026, 5, 1);
    fs.utimesSync(older, olderDate, olderDate);
    fs.utimesSync(newer, newerDate, newerDate);

    const { findLatestOperationalPlanilha } = await import("./update-planilha-operacional");
    expect(findLatestOperationalPlanilha(baseDir)).toBe(newer);
  });
});
