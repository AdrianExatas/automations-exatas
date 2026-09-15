import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import XLSX from "xlsx";
import { DEFAULT_TIPO_RECEITA } from "../src/utils.js";
import { readInputWorkbook, writeResultWorkbook } from "../src/workbook.js";

test("readInputWorkbook loads official empresas model", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sefaz-pi-"));
  const workbookPath = path.join(tempDir, "input.xlsx");

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet([
    {
      CODIGO: "591",
      EMPRESA: "Empresa Teste",
      CNPJ: "12.345.678/0001-90",
      "INSCRICAO ESTADUAL": "197859259",
      "LOCAL PARA SALVAR ARQUIVO": "boletos",
    },
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Planilha1");
  XLSX.writeFile(workbook, workbookPath);

  const rows = readInputWorkbook(workbookPath);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.inscricaoEstadual, "197859259");
  assert.equal(rows[0]?.codigo, "591");
  assert.equal(rows[0]?.tipoReceita, DEFAULT_TIPO_RECEITA);
  assert.equal(rows[0]?.numeroParcelamento, undefined);
  assert.equal(rows[0]?.cnpj, "12345678000190");
});

test("readInputWorkbook still supports legacy parcel columns", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sefaz-pi-"));
  const workbookPath = path.join(tempDir, "input.xlsx");

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet([
    {
      CODIGO: "001",
      EMPRESA: "Empresa Teste",
      CNPJ: "12.345.678/0001-90",
      "INSCRICAO ESTADUAL": "197859259",
      "NUMERO PARCELAMENTO": "220006040003294",
      PARCELA: "4",
      VENCIMENTO: "15/04/2026",
      "TIPO RECEITA": "",
      "LOCAL PARA SALVAR ARQUIVO": "boletos",
    },
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Planilha1");
  XLSX.writeFile(workbook, workbookPath);

  const rows = readInputWorkbook(workbookPath);
  assert.equal(rows[0]?.numeroParcelamento, "220006040003294");
  assert.equal(rows[0]?.parcela, "4");
  assert.equal(rows[0]?.vencimento, "15/04/2026");
});

test("writeResultWorkbook creates output xlsx", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sefaz-pi-"));
  const reportPath = await writeResultWorkbook(
    [
      {
        rowNumber: 2,
        codigo: "001",
        empresa: "Empresa Teste",
        cnpj: "12345678000190",
        numeroParcelamento: "220006040003294",
        parcela: "4",
        vencimento: "15/04/2026",
        nomeOriginalPdf: "doc.pdf",
        pdfPath: path.join(tempDir, "out.pdf"),
        status: "sucesso",
        mensagem: "ok",
      },
      {
        rowNumber: 3,
        codigo: "002",
        vencimento: "01/05/2026",
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
  assert.equal(rows[0]?.NUMERO_PARCELAMENTO, "220006040003294");
  assert.equal(rows[0]?.PARCELA, "4");
  assert.equal(rows[0]?.STATUS, "sucesso");
  assert.equal(rows[1]?.STATUS, "erro");
});
