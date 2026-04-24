import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import * as XLSX from "xlsx";
import { normalizarCnpjDetalhado } from "../src/cnpj";
import { lerPlanilha } from "../src/planilha";
import { reconstruirLinhaDoRelatorio, type ResultadoItemRelatorio } from "../src/relatorio";

test("normaliza CNPJ válido com 14 dígitos sem alterar", () => {
  const cnpj = normalizarCnpjDetalhado("07273339000100");
  assert.equal(cnpj.valor, "07273339000100");
  assert.equal(cnpj.valido, true);
  assert.equal(cnpj.ajustado, false);
});

test("preenche zero à esquerda quando o Excel entrega 13 dígitos", () => {
  const cnpj = normalizarCnpjDetalhado("7273339000100");
  assert.equal(cnpj.valor, "07273339000100");
  assert.equal(cnpj.valido, true);
  assert.equal(cnpj.ajustado, true);
});

test("limpa máscara e mantém o CNPJ normalizado", () => {
  const cnpj = normalizarCnpjDetalhado("07.273.339/0001-00");
  assert.equal(cnpj.valor, "07273339000100");
  assert.equal(cnpj.valido, true);
  assert.equal(cnpj.ajustado, false);
});

test("trata CNPJ com mais de 14 dígitos como inválido", () => {
  const cnpj = normalizarCnpjDetalhado("123456789012345");
  assert.equal(cnpj.valor, "");
  assert.equal(cnpj.valido, false);
  assert.equal(cnpj.ajustado, false);
});

test("reproduz leitura de workbook com célula numérica truncada pelo Excel", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "alterar-responsavel-"));
  const planilhaPath = path.join(tempDir, "teste.xlsx");

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["CÓD.", "CNPJ", "RESPONSÁVEL", "MES GERACAO", "SETOR"],
    ["1", "", "Naely Matos", "04/2026", "FISCAL"],
  ]);
  sheet.B2 = { t: "n", v: 7273339000100, z: "0", w: "7273339000100" };
  XLSX.utils.book_append_sheet(workbook, sheet, "Dados");
  XLSX.writeFile(workbook, planilhaPath);

  const linhas = lerPlanilha(planilhaPath);
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].cnpj, "07273339000100");
  assert.equal(linhas[0].cnpjOriginal, "7273339000100");
  assert.equal(linhas[0].cnpjFoiAjustado, true);
  assert.equal(linhas[0].cnpjInvalido, undefined);
});

test("reconstrói linha de relatório antigo com CNPJ curto", () => {
  const item: ResultadoItemRelatorio = {
    cnpj: "543242000121",
    responsavel: "Tamara Dantas",
    mesGeracao: "04/2026",
    setor: "CONTÁBIL",
    sucesso: false,
    mensagem: "Cliente não encontrado para CNPJ 543242000121",
  };

  const linha = reconstruirLinhaDoRelatorio(item);
  assert.ok(linha);
  assert.equal(linha.cnpj, "00543242000121");
  assert.equal(linha.cnpjOriginal, "543242000121");
  assert.equal(linha.cnpjFoiAjustado, true);
  assert.equal(linha.cnpjInvalido, undefined);
});
