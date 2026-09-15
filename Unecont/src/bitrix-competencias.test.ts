import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readBitrixCompetenciaCodes, referenceMonthSheetName, resolveCurrentMonthReference } from "./bitrix-competencias";

describe("competencias Bitrix", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-bitrix-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("le os codigos da aba informada e resolve o mes vigente", async () => {
    const filePath = path.join(tempDir, "competencias.xlsx");
    const workbook = new ExcelJS.Workbook();
    const julho = workbook.addWorksheet("07");
    julho.addRow(["CÓD.", "EMPRESA"]);
    julho.addRow(["001", "Empresa Julho"]);
    julho.addRow(["2", "Empresa Julho 2"]);
    julho.addRow(["001", "Empresa Duplicada"]);
    const agosto = workbook.addWorksheet("08");
    agosto.addRow(["CÓD.", "EMPRESA"]);
    agosto.addRow(["3", "Empresa Agosto"]);
    const setembro = workbook.addWorksheet("09");
    setembro.addRow(["CÓD.", "EMPRESA"]);
    setembro.addRow(["4", "Empresa Setembro"]);
    await workbook.xlsx.writeFile(filePath);

    expect(referenceMonthSheetName("07/2026")).toBe("07");
    expect(resolveCurrentMonthReference(new Date(2026, 8, 2))).toBe("09/2026");
    expect(readBitrixCompetenciaCodes(filePath, "07/2026")).toEqual(["1", "2"]);
    expect(readBitrixCompetenciaCodes(filePath, "09/2026")).toEqual(["4"]);
  });

  it("falha para aba ou coluna de codigo ausente", async () => {
    const filePath = path.join(tempDir, "competencias-invalida.xlsx");
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("07").addRow(["EMPRESA"]);
    await workbook.xlsx.writeFile(filePath);

    expect(() => readBitrixCompetenciaCodes(filePath, "08/2026")).toThrow(
      'Aba de competencia "08" nao encontrada',
    );
    expect(() => readBitrixCompetenciaCodes(filePath, "07/2026")).toThrow(
      "precisa conter a coluna CÓD.",
    );
  });
});
