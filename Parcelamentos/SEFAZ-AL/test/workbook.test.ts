import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import XLSX from "xlsx";
import { readInputWorkbook, writeResultWorkbook } from "../src/workbook.js";

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

test("escreve o relatorio com colunas diagnosticas opcionais", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "sefaz-al-report-"));
  const reportPath = await writeResultWorkbook(
    [
      {
        rowNumber: 2,
        empresa: "EMPRESA X",
        usuario: "123",
        consolidacao: "11839802",
        parcelamento: "18473534",
        parcelasTotais: "3/60",
        parcelasJaPagas: 3,
        numeroParcelaEmitida: 4,
        totalParcelas: 60,
        arquivoSalvo: "C:\\saida\\boleto.pdf",
        tempoCalculoMs: 18024,
        tentativasCalculo: 1,
        resultadoCalculo: "rows_after_retry_1",
        tempoTentativa1Ms: 18024,
        tempoTentativa2Ms: undefined,
        mensagemDiagnostico: "tempo_abertura_modal_ms=230; tempo_calculo_ms=18024",
        status: "sucesso",
        mensagem: "Boleto atual baixado com sucesso.",
      },
    ],
    cwd,
  );

  const workbook = XLSX.readFile(reportPath, { cellDates: false, raw: false });
  const worksheet = workbook.Sheets.Resultados;
  const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(worksheet, { defval: "" });

  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    LINHA: 2,
    EMPRESA: "EMPRESA X",
    USUARIO: "123",
    CONSOLIDACAO: "11839802",
    PARCELAMENTO: "18473534",
    PARCELAS_TOTAIS: "3/60",
    PARCELAS_JA_PAGAS: 3,
    PARCELA_EMITIDA: 4,
    TOTAL_PARCELAS: 60,
    ARQUIVO_SALVO: "C:\\saida\\boleto.pdf",
    TEMPO_CALCULO_MS: 18024,
    TENTATIVAS_CALCULO: 1,
    RESULTADO_CALCULO: "rows_after_retry_1",
    TEMPO_TENTATIVA_1_MS: 18024,
    TEMPO_TENTATIVA_2_MS: "",
    MENSAGEM_DIAGNOSTICO: "tempo_abertura_modal_ms=230; tempo_calculo_ms=18024",
    STATUS: "sucesso",
    MENSAGEM: "Boleto atual baixado com sucesso.",
  });
});

test("escreve erro de autenticacao na coluna de mensagem sem alterar o layout", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "sefaz-al-report-"));
  const reportPath = await writeResultWorkbook(
    [
      {
        rowNumber: 2,
        empresa: "EMPRESA Y",
        usuario: "24009718",
        status: "erro",
        mensagem: "Erro de autenticacao! Por favor verifique suas credenciais e tente novamente.",
      },
    ],
    cwd,
  );

  const workbook = XLSX.readFile(reportPath, { cellDates: false, raw: false });
  const worksheet = workbook.Sheets.Resultados;
  const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(worksheet, { defval: "" });

  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    LINHA: 2,
    EMPRESA: "EMPRESA Y",
    USUARIO: "24009718",
    CONSOLIDACAO: "",
    PARCELAMENTO: "",
    PARCELAS_TOTAIS: "",
    PARCELAS_JA_PAGAS: "",
    PARCELA_EMITIDA: "",
    TOTAL_PARCELAS: "",
    ARQUIVO_SALVO: "",
    TEMPO_CALCULO_MS: "",
    TENTATIVAS_CALCULO: "",
    RESULTADO_CALCULO: "",
    TEMPO_TENTATIVA_1_MS: "",
    TEMPO_TENTATIVA_2_MS: "",
    MENSAGEM_DIAGNOSTICO: "",
    STATUS: "erro",
    MENSAGEM: "Erro de autenticacao! Por favor verifique suas credenciais e tente novamente.",
  });
});
