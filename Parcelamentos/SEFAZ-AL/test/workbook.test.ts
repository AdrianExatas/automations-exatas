import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import XLSX from "xlsx";
import { readInputWorkbook } from "../src/workbook.js";

async function createWorkbook(rows: Record<string, unknown>[]): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sefaz-al-"));
  const filePath = path.join(tempDir, "model.xlsx");
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Entrada");
  XLSX.writeFile(workbook, filePath);
  return filePath;
}

test("le a planilha de entrada com colunas obrigatorias", async () => {
  const filePath = await createWorkbook([
    { EMPRESA: "DONA MARIA VARIEDADES LTDA", USUARIO: "24009718", SENHA: "segredo" },
  ]);

  const rows = readInputWorkbook(filePath);
  assert.deepEqual(rows, [
    {
      rowNumber: 2,
      empresa: "DONA MARIA VARIEDADES LTDA",
      usuario: "24009718",
      senha: "segredo",
    },
  ]);
});

test("falha quando falta coluna obrigatoria", async () => {
  const filePath = await createWorkbook([{ EMPRESA: "EMPRESA X", USUARIO: "123" }]);

  assert.throws(
    () => readInputWorkbook(filePath),
    /A planilha de entrada precisa conter a coluna obrigatoria "SENHA"|A planilha de entrada precisa conter a coluna obrigatória "SENHA"/,
  );
});

test("falha quando uma linha possui senha vazia", async () => {
  const filePath = await createWorkbook([{ EMPRESA: "EMPRESA X", USUARIO: "123", SENHA: "" }]);

  assert.throws(
    () => readInputWorkbook(filePath),
    /Linha 2: a coluna SENHA esta vazia|Linha 2: a coluna SENHA está vazia/,
  );
});

test("le o model.xlsx versionado no pacote", () => {
  const filePath = path.resolve(process.cwd(), "model.xlsx");
  const rows = readInputWorkbook(filePath);

  assert.deepEqual(rows, [
    {
      rowNumber: 2,
      empresa: "EMPRESA EXEMPLO LTDA",
      usuario: "USUARIO_EXEMPLO",
      senha: "SENHA_EXEMPLO",
    },
  ]);
});
