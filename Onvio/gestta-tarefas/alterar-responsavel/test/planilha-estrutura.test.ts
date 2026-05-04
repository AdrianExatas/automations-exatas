import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as XLSX from "xlsx";
import { lerEstruturaPlanilha } from "../src/planilha-estrutura";

test("le estrutura da planilha com colunas, total e previa", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "planilha-estrutura-"));
  const filePath = path.join(dir, "entrada.xlsx");

  try {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["COD.", "CNPJ", "RESPONSAVEL", "MES GERACAO", "SETOR"],
      ["001", "12.345.678/0001-90", "Maria", "05/2026", "Fiscal"],
      ["002", "98.765.432/0001-10", "Joao", "05/2026", "Pessoal"],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Preenchimento");
    XLSX.writeFile(workbook, filePath);

    const estrutura = lerEstruturaPlanilha(filePath, 1);

    assert.equal(estrutura.activeSheetName, "Preenchimento");
    assert.deepEqual(estrutura.headers, ["COD.", "CNPJ", "RESPONSAVEL", "MES GERACAO", "SETOR"]);
    assert.equal(estrutura.totalRows, 2);
    assert.deepEqual(estrutura.previewRows, [
      {
        "COD.": "001",
        CNPJ: "12.345.678/0001-90",
        RESPONSAVEL: "Maria",
        "MES GERACAO": "05/2026",
        SETOR: "Fiscal",
      },
    ]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
