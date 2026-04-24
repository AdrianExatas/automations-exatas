import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import * as XLSX from "xlsx";
import { normalizarCnpjDetalhado } from "../src/cnpj";
import { lerPlanilha } from "../src/planilha";

test("normaliza CNPJ valido com 14 digitos sem alterar", () => {
  const cnpj = normalizarCnpjDetalhado("07273339000100");
  assert.equal(cnpj.valor, "07273339000100");
  assert.equal(cnpj.valido, true);
  assert.equal(cnpj.ajustado, false);
});

test("preenche zero a esquerda quando o Excel entrega 13 digitos", () => {
  const cnpj = normalizarCnpjDetalhado("7273339000100");
  assert.equal(cnpj.valor, "07273339000100");
  assert.equal(cnpj.valido, true);
  assert.equal(cnpj.ajustado, true);
});

test("limpa mascara e mantem o CNPJ normalizado", () => {
  const cnpj = normalizarCnpjDetalhado("07.273.339/0001-00");
  assert.equal(cnpj.valor, "07273339000100");
  assert.equal(cnpj.valido, true);
  assert.equal(cnpj.ajustado, false);
});

test("trata CNPJ com mais de 14 digitos como invalido", () => {
  const cnpj = normalizarCnpjDetalhado("123456789012345");
  assert.equal(cnpj.valor, "");
  assert.equal(cnpj.valido, false);
  assert.equal(cnpj.ajustado, false);
});

test("reproduz leitura de workbook com celula numerica truncada pelo Excel", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "adicionar-validacao-"));
  const planilhaPath = path.join(tempDir, "teste.xlsx");

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["NUMERO", "NOME EMPRESA", "CNPJ", "SETOR", "RESPONSÁVEL", "VALIDAÇÃO"],
    ["1", "Empresa Teste", "", "Fiscal", "Maria", "Cibelle Cristina"],
  ]);
  sheet.C2 = { t: "n", v: 7273339000100, z: "0", w: "7273339000100" };
  XLSX.utils.book_append_sheet(workbook, sheet, "Dados");
  XLSX.writeFile(workbook, planilhaPath);

  const linhas = lerPlanilha(planilhaPath);
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].cnpj, "07273339000100");
  assert.equal(linhas[0].cnpjOriginal, "7273339000100");
  assert.equal(linhas[0].cnpjFoiAjustado, true);
  assert.equal(linhas[0].cnpjInvalido, undefined);
});
