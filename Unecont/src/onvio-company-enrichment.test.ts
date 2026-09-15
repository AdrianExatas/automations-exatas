import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { afterEach, describe, expect, it } from "vitest";
import { enrichPlanilhaWithOnvioCompanies, isEligibleOnvioCompany } from "./onvio-company-enrichment";

const tempDirs: string[] = [];
function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-onvio-company-"));
  tempDirs.push(dir);
  return dir;
}
async function writeSheet(filePath: string, rows: Array<[string, string, string]> = [["001", "11111111000111", "Empresa Unecont"]]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Planilha1");
  ws.addRow(["CODIGO", "CNPJ EMPRESA", "EMPRESA", "RESPONSÁVEL", "ONVIO_CLIENT_ID", "USUARIOS_CLIENTE"]);
  for (const row of rows) ws.addRow([row[0], row[1], row[2], "", "", ""]);
  await wb.xlsx.writeFile(filePath);
}
afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("enrichPlanilhaWithOnvioCompanies", () => {
  it("preenche somente os campos Onvio e gera relatorio", async () => {
    const dir = tempDir();
    const filePath = path.join(dir, "planilha.xlsx");
    await writeSheet(filePath);
    const result = await enrichPlanilhaWithOnvioCompanies({
      planilhaPath: filePath,
      outputDir: dir,
      provider: {
        lookupCompany: async () => ({
          codigo: "1",
          clientId: "client-1",
          status: "ATIVO",
          fonte: "client-core-ativo",
        }),
      },
    });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);
    const ws = wb.worksheets[0];
    const headers = (Array.isArray(ws.getRow(1).values) ? ws.getRow(1).values.slice(1) : []).map(String);
    const idx = (name: string) => headers.indexOf(name) + 1;
    expect(ws.getRow(2).getCell(idx("CNPJ EMPRESA")).text).toBe("11111111000111");
    expect(ws.getRow(2).getCell(idx("EMPRESA")).text).toBe("Empresa Unecont");
    expect(ws.getRow(2).getCell(idx("ONVIO_CLIENT_ID")).text).toBe("client-1");
    expect(ws.getRow(2).getCell(idx("ONVIO_STATUS")).text).toBe("ATIVO");
    expect(ws.getRow(2).getCell(idx("ONVIO_CLIENT_SOURCE")).text).toBe("client-core-ativo");
    expect(result.kept).toBe(1);
    expect(result.removed).toBe(0);
    expect(fs.existsSync(result.reportPath)).toBe(true);
  });

  it("remove da planilha empresas inativas ou nao localizadas sem bloquear a publicacao", async () => {
    const dir = tempDir();
    const filePath = path.join(dir, "planilha.xlsx");
    await writeSheet(filePath, [
      ["001", "11111111000111", "Ativa"],
      ["002", "22222222000122", "Inativa"],
      ["003", "33333333000133", "Ausente"],
    ]);

    const result = await enrichPlanilhaWithOnvioCompanies({
      planilhaPath: filePath,
      outputDir: dir,
      provider: {
        async lookupCompany(request) {
          if (request.codigo === "1" || request.codigo === "001") {
            return { codigo: "1", clientId: "client-1", status: "ATIVO", fonte: "client-core-ativo" };
          }
          if (request.codigo === "2" || request.codigo === "002") {
            return { codigo: "2", clientId: "client-2", status: "INATIVO", fonte: "client-core" };
          }
          return { codigo: request.codigo, status: "NAO_LOCALIZADO" };
        },
      },
    });

    expect(result.total).toBe(3);
    expect(result.kept).toBe(1);
    expect(result.removed).toBe(2);
    expect(fs.existsSync(result.reportPath)).toBe(true);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);
    const ws = wb.worksheets[0];
    expect(ws.rowCount).toBe(2);
    expect(ws.getRow(2).getCell(1).text).toBe("001");
    const headers = (Array.isArray(ws.getRow(1).values) ? ws.getRow(1).values.slice(1) : []).map(String);
    expect(ws.getRow(2).getCell(headers.indexOf("ONVIO_CLIENT_ID") + 1).text).toBe("client-1");
  });

  it("considera elegivel apenas ATIVO e LOCALIZADO_SEM_STATUS com clientId", () => {
    expect(isEligibleOnvioCompany({ codigo: "1", clientId: "x", status: "ATIVO" })).toBe(true);
    expect(
      isEligibleOnvioCompany({ codigo: "1", clientId: "x", status: "LOCALIZADO_SEM_STATUS" }),
    ).toBe(true);
    expect(isEligibleOnvioCompany({ codigo: "1", clientId: "x", status: "INATIVO" })).toBe(false);
    expect(isEligibleOnvioCompany({ codigo: "1", status: "NAO_LOCALIZADO" })).toBe(false);
    expect(isEligibleOnvioCompany({ codigo: "1", status: "ATIVO" })).toBe(false);
  });
});
