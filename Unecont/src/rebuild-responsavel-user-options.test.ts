import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { afterEach, describe, expect, it } from "vitest";
import { rebuildResponsavelUserOptions } from "./rebuild-responsavel-user-options";

const tempDirs: string[] = [];

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-rebuild-users-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("rebuildResponsavelUserOptions", () => {
  it("reconstrói dropdowns por empresa e remove cruzamentos após remoção de linhas", async () => {
    const dir = tempDir();
    const filePath = path.join(dir, "planilha.xlsx");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Planilha1");
    sheet.addRow([
      "CODIGO",
      "CNPJ EMPRESA",
      "EMPRESA",
      "RESPONSÁVEL",
      "USUARIOS_CLIENTE",
      "STATUS_USUARIOS_CLIENTE",
    ]);
    sheet.addRow(["603", "60093425000203", "VS SERVICOS LTDA", "Leila BY & INFOTEC", "Cleide; Leila BY & INFOTEC", "multipla_escolha"]);
    sheet.addRow(["604", "05230649000112", "MMM UTILIDADES DO LAR LTDA", "Leila BY & INFOTEC", "", "nenhum_usuario"]);
    sheet.addRow(["607", "13800072000165", "ALVES FRANCA COMERCIO DE MOVEIS LTDA", "Sheila BY e INFOTEC", "", "nenhum_usuario"]);

    // Simula validacoes desalinhadas apontando para usuarios da VS SERVICOS.
    sheet.getCell("D2").dataValidation = {
      type: "list",
      formulae: ["'Opcoes Usuarios'!$D$2:$D$3"],
      allowBlank: true,
    };
    sheet.getCell("D3").dataValidation = {
      type: "list",
      formulae: ["'Opcoes Usuarios'!$D$2:$D$2"],
      allowBlank: true,
    };
    sheet.getCell("D4").dataValidation = {
      type: "list",
      formulae: ["'Opcoes Usuarios'!$D$3:$D$3"],
      allowBlank: true,
    };

    const options = workbook.addWorksheet("Opcoes Usuarios");
    options.addRow(["CODIGO", "CNPJ", "EMPRESA", "USUARIO"]);
    options.addRow(["603", "60093425000203", "VS SERVICOS LTDA", "Cleide"]);
    options.addRow(["603", "60093425000203", "VS SERVICOS LTDA", "Leila BY & INFOTEC"]);
    await workbook.xlsx.writeFile(filePath);

    const result = await rebuildResponsavelUserOptions(filePath);
    expect(result.dropdownsApplied).toBe(1);
    expect(result.dropdownsCleared).toBe(2);
    expect(result.invalidResponsaveisCleared).toBe(2);

    const fixed = new ExcelJS.Workbook();
    await fixed.xlsx.readFile(filePath);
    const planilha = fixed.getWorksheet("Planilha1")!;
    const opcoes = fixed.getWorksheet("Opcoes Usuarios")!;

    expect(String(planilha.getRow(3).getCell(4).value ?? "")).toBe("");
    expect(String(planilha.getRow(4).getCell(4).value ?? "")).toBe("");
    expect(planilha.getRow(3).getCell(4).dataValidation).toBeUndefined();
    expect(planilha.getRow(4).getCell(4).dataValidation).toBeUndefined();

    const vsValidation = planilha.getRow(2).getCell(4).dataValidation?.formulae?.[0];
    expect(vsValidation).toMatch(/\$D\$2:\$D\$3$/);
    expect(String(opcoes.getRow(2).getCell(1).value)).toBe("603");
    expect(String(opcoes.getRow(3).getCell(1).value)).toBe("603");
    expect(opcoes.rowCount).toBe(3);
  });
});
