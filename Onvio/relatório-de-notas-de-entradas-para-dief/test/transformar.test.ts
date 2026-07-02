import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import * as XLSX from "xlsx";
import { caminhoSaidaParaEntrada, gerarPlanilhaSaida } from "../src/gerar-saida";
import { lerPlanilhaEntrada } from "../src/ler-entrada";
import { COLUNAS_SAIDA, transformarLinhas } from "../src/transformar";

const CNPJ_EMITENTE_TESTE = ["00", "000", "000", "0000", "00"].join("");
const CNPJ_DESTINATARIO_TESTE = ["11", "111", "111", "0001", "11"].join("");
const CHAVE_ACESSO_TESTE = ["NFeTESTE", "0001"].join("-");

function criarPlanilhaEntrada(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dief-entrada-"));
  const inputPath = path.join(tempDir, "ENTRADAS.xls");
  const header = [
    "UF Emit.",
    "Cnpj Emit.",
    "Razao Social Emit.",
    "CNPJ Dest.",
    "IE Dest.",
    "Razao Social Dest",
    "Numero",
    "Data Emissao",
    "Valor N.F.",
    "Chave Acesso",
    "ICMS Removido",
    "Operacao Removida",
    "Serie Removida",
  ];
  const linhas = Array.from({ length: 14 }, (_, index) => [
    "SP",
    CNPJ_EMITENTE_TESTE,
    "EMPRESA EMITENTE TESTE LTDA",
    CNPJ_DESTINATARIO_TESTE,
    "ISENTO",
    "EMPRESA DESTINATARIA TESTE LTDA",
    String(198167 + index),
    "14/05/2026",
    1260,
    `${CHAVE_ACESSO_TESTE}-${index + 1}`,
    "remover",
    "remover",
    "remover",
  ]);

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([["Relatorio de notas"], header, ...linhas]);
  XLSX.utils.book_append_sheet(workbook, sheet, "RelatorioNotas");
  XLSX.writeFile(workbook, inputPath);
  return inputPath;
}

test("ler ENTRADAS.xls retorna 14 linhas", () => {
  const ENTRADAS_PATH = criarPlanilhaEntrada();
  const linhas = lerPlanilhaEntrada(ENTRADAS_PATH);
  assert.equal(linhas.length, 14);
});

test("transformar mantem 10 colunas mapeadas e deixa Recebida/Finalidade vazias", () => {
  const ENTRADAS_PATH = criarPlanilhaEntrada();
  const linhasEntrada = lerPlanilhaEntrada(ENTRADAS_PATH);
  const linhasSaida = transformarLinhas(linhasEntrada);

  assert.equal(linhasSaida.length, 14);

  const primeira = linhasSaida[0];
  assert.equal(primeira["UF Emit."], "SP");
  assert.equal(primeira["Cnpj Emit."], CNPJ_EMITENTE_TESTE);
  assert.equal(primeira["Razao Social Emit."], "EMPRESA EMITENTE TESTE LTDA");
  assert.equal(primeira["CNPJ Dest."], CNPJ_DESTINATARIO_TESTE);
  assert.equal(primeira["Numero"], "198167");
  assert.equal(primeira["Data Emissao"], "14/05/2026");
  assert.equal(primeira["Valor N.F."], 1260);
  assert.equal(primeira["Chave Acesso"], `${CHAVE_ACESSO_TESTE}-1`);
  assert.equal(primeira["Recebida "], "");
  assert.equal(primeira["Finalidade dos produtos "], "");

  for (const linha of linhasSaida) {
    assert.equal(linha["Recebida "], "");
    assert.equal(linha["Finalidade dos produtos "], "");
  }
});

test("ordem das colunas de saida segue o modelo", () => {
  assert.deepEqual([...COLUNAS_SAIDA], [
    "UF Emit.",
    "Cnpj Emit.",
    "Razao Social Emit.",
    "CNPJ Dest.",
    "IE Dest.",
    "Razao Social Dest",
    "Numero",
    "Data Emissao",
    "Valor N.F.",
    "Chave Acesso",
    "Recebida ",
    "Finalidade dos produtos ",
  ]);
});

test("colunas removidas nao aparecem na saida", () => {
  const ENTRADAS_PATH = criarPlanilhaEntrada();
  const linhasSaida = transformarLinhas(lerPlanilhaEntrada(ENTRADAS_PATH));
  const chaves = Object.keys(linhasSaida[0]);

  assert.ok(!chaves.some((k) => k.includes("ICMS")));
  assert.ok(!chaves.some((k) => k.includes("Operacao")));
  assert.ok(!chaves.some((k) => k.includes("Serie")));
  assert.equal(chaves.length, 12);
});

test("caminhoSaidaParaEntrada adiciona sufixo - tratada", () => {
  const saida = caminhoSaidaParaEntrada("C:\\docs\\ENTRADAS.xls");
  assert.equal(saida, "C:\\docs\\ENTRADAS - tratada.xls");
});

test("gerarPlanilhaSaida produz arquivo com layout do template", () => {
  const inputCopy = criarPlanilhaEntrada();

  const linhasSaida = transformarLinhas(lerPlanilhaEntrada(inputCopy));
  const outputPath = gerarPlanilhaSaida(inputCopy, linhasSaida);

  assert.equal(outputPath, path.join(path.dirname(inputCopy), "ENTRADAS - tratada.xls"));
  assert.ok(fs.existsSync(outputPath));

  const wb = XLSX.readFile(outputPath);
  assert.ok(wb.SheetNames.includes("RelatorioNotas"));
  assert.ok(wb.SheetNames.includes("Lista de finalidades"));

  const sheet = wb.Sheets["RelatorioNotas"];
  const headerAddr = XLSX.utils.encode_cell({ r: 1, c: 0 });
  assert.equal(sheet[headerAddr]?.v, "UF Emit.");

  const recebidaHeader = XLSX.utils.encode_cell({ r: 1, c: 10 });
  assert.equal(sheet[recebidaHeader]?.v, "Recebida ");

  const dataRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    range: 2,
  });
  assert.equal(dataRows.length, 14);

  const primeiraLinha = dataRows[0];
  assert.equal(primeiraLinha[10], "");
  assert.equal(primeiraLinha[11], "");
});
