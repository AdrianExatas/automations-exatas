import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as XLSX from "xlsx";
import { afterEach, describe, expect, it } from "vitest";
import { readServiceRequests } from "./service-requests-reader";

describe("readServiceRequests", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function writeWorkbook(rows: Record<string, string>[]): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "service-requests-reader-"));
    tempDirs.push(dir);
    const filePath = path.join(dir, "planilha.xlsx");
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, "Planilha");
    XLSX.writeFile(workbook, filePath);
    return filePath;
  }

  it("mapeia coluna RESPONSAVEL para solicitante", () => {
    const excelPath = writeWorkbook([
      {
        CODIGO: "8",
        "CNPJ EMPRESA": "10965766000164",
        EMPRESA: "SUPERMERCADO DORIA",
        "RESPONSÁVEL": "EMANUEL - FUNCIONARIO NOVO",
        DEPARTAMENTO: "SETOR CONTABIL",
      },
    ]);

    const rows = readServiceRequests(excelPath);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.solicitante).toBe("EMANUEL - FUNCIONARIO NOVO");
  });
});
