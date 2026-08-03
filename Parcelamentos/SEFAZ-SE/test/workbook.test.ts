import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import XLSX from "xlsx";
import { readInputWorkbook, TEMPLATE_HEADERS, writeResultWorkbook, writeTemplateWorkbook } from "../src/workbook.js";

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
        situacaoVencimento: "vencida",
        qtdeParcelas: 7,
        parcelasPagas: 3,
        parcelasAtrasadas: 1,
        parcelLabel: "04-07",
        criterioRotulo: "fallback",
        nomeOriginalPdf: "DAE_20260310396010.pdf",
        pdfPath: path.join(tempDir, "PARCELA 04-07 N\u00BA 20260310396010.pdf"),
        transport: "http",
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
        situacaoVencimento: "futura",
        qtdeParcelas: 7,
        parcelasPagas: 3,
        parcelasAtrasadas: 0,
        parcelLabel: "05-07",
        criterioRotulo: "tela",
        toast: "Ooops... Ocorreu um erro!: Socio/Solicitante nao esta apto a fazer o pagamento",
        transport: "http_fallback_browser",
        status: "ignorado",
        mensagem: "parcela futura ignorada",
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
  assert.equal(rows[0]?.SITUACAO_VENCIMENTO, "vencida");
  assert.equal(rows[0]?.QTDE_PARCELAS, 7);
  assert.equal(rows[0]?.PARCELAS_PAGAS, 3);
  assert.equal(rows[0]?.PARCELAS_ATRASADAS, 1);
  assert.equal(rows[0]?.CRITERIO_ROTULO, "fallback");
  assert.equal(rows[0]?.TRANSPORTE, "http");
  assert.equal(rows[0]?.TOAST, "");
  assert.equal(rows[1]?.STATUS, "ignorado");
  assert.equal(rows[1]?.SITUACAO_VENCIMENTO, "futura");
  assert.equal(rows[1]?.CRITERIO_ROTULO, "tela");
  assert.equal(rows[1]?.TRANSPORTE, "http_fallback_browser");
  assert.equal(rows[1]?.TOAST, "Ooops... Ocorreu um erro!: Socio/Solicitante nao esta apto a fazer o pagamento");
});

test("writeTemplateWorkbook creates an empty workbook with expected headers", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sefaz-template-"));
  const templatePath = path.join(tempDir, "modelo.xlsx");

  await writeTemplateWorkbook(templatePath);

  const workbook = XLSX.readFile(templatePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0] ?? "Entrada"];
  const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, raw: false });

  assert.equal(workbook.SheetNames[0], "Entrada");
  assert.deepEqual(rows[0], [...TEMPLATE_HEADERS]);
  assert.equal(rows.length, 1);
});
