import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import XLSX from "xlsx";
import { readInputWorkbook, writeResultWorkbook } from "../src/workbook.js";

test("readInputWorkbook loads valid rows", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sefaz-ts-"));
  const workbookPath = path.join(tempDir, "input.xlsx");

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet([
    {
      CODIGO: "001",
      EMPRESA: "Empresa Teste",
      CNPJ: "12.345.678/0001-90",
      "INSCRICAO ESTADUAL": "27.121.985-8",
      CPF: "026.103.645-98",
      "LOCAL PARA SALVAR ARQUIVO": "boletos",
    },
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Planilha1");
  XLSX.writeFile(workbook, workbookPath);

  const rows = readInputWorkbook(workbookPath);
  assert.ok(rows);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.inscricaoEstadual, "271219858");
  assert.equal(rows[0]?.cpf, "02610364598");
  assert.equal(rows[0]?.cnpj, "12345678000190");
});

test("writeResultWorkbook creates output xlsx", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sefaz-ts-"));
  const reportPath = await writeResultWorkbook(
    [
      {
        rowNumber: 2,
        codigo: "001",
        empresa: "Empresa Teste",
        cnpj: "12.345.678/0001-90",
        protocolo: "202501021663",
        vencimento: "16/03/2026",
        valorParcela: "R$ 421,35",
        parcelLabel: "04-07",
        nomeOriginalPdf: "DAE_20260310396010.pdf",
        pdfPath: path.join(tempDir, "PARCELA 04-07 N\u00BA 20260310396010.pdf"),
        status: "sucesso",
        mensagem: "ok",
      },
      {
        rowNumber: 2,
        codigo: "001",
        empresa: "Empresa Teste",
        cnpj: "12.345.678/0001-90",
        protocolo: "202501021664",
        vencimento: "16/04/2026",
        valorParcela: "R$ 422,35",
        parcelLabel: "05-07",
        status: "erro",
        mensagem: "falha",
      },
    ],
    tempDir,
  );

  const stats = await fs.stat(reportPath);
  assert.ok(stats.isFile());

  const workbook = XLSX.readFile(reportPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0] ?? "Resultados"];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: "" });

  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.PROTOCOLO, "202501021663");
  assert.equal(rows[0]?.VENCIMENTO, "16/03/2026");
  assert.equal(rows[0]?.VALOR_PARCELA, "R$ 421,35");
  assert.equal(rows[1]?.STATUS, "erro");
});
