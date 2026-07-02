import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import * as XLSX from "xlsx";
import { normalizarCnpjDetalhado } from "../src/cnpj";
import { lerPlanilha, PlanilhaObrigatoriaError } from "../src/planilha";
import { gerarRelatorioExecucao, reconstruirLinhaDoRelatorio, salvarRelatorioXlsx, type ResultadoItemRelatorio } from "../src/relatorio";

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
    ["CÓD.", "CNPJ", "EMPRESA", "RESPONSÁVEL", "MES GERACAO", "SETOR"],
    ["1", "", "Empresa Teste LTDA", "Pessoa Teste", "04/2026", "FISCAL"],
  ]);
  sheet.B2 = { t: "n", v: 7273339000100, z: "0", w: "7273339000100" };
  XLSX.utils.book_append_sheet(workbook, sheet, "Dados");
  XLSX.writeFile(workbook, planilhaPath);

  const linhas = lerPlanilha(planilhaPath);
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].cnpj, "07273339000100");
  assert.equal(linhas[0].empresa, "Empresa Teste LTDA");
  assert.equal(linhas[0].cnpjOriginal, "7273339000100");
  assert.equal(linhas[0].cnpjFoiAjustado, true);
  assert.equal(linhas[0].cnpjInvalido, undefined);
});

test("reconstrói linha de relatório antigo com CNPJ curto", () => {
  const item: ResultadoItemRelatorio = {
    cnpj: "543242000121",
    empresa: "Empresa Relatorio LTDA",
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
  assert.equal(linha.empresa, "Empresa Relatorio LTDA");
  assert.equal(linha.cnpjFoiAjustado, true);
  assert.equal(linha.cnpjInvalido, undefined);
});

test("relatorio inclui empresa no JSON e na planilha XLSX", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "alterar-responsavel-relatorio-"));
  const previousCwd = process.cwd();

  try {
    process.chdir(tempDir);
    const relatorio = gerarRelatorioExecucao(
      "entrada.xlsx",
      [
        {
          linha: {
            cod: "1",
            cnpj: "12345678000190",
            empresa: "Empresa Teste LTDA",
            responsavel: "Maria",
            mesGeracao: { month: 5, year: 2026 },
            setor: "Fiscal",
          },
          sucesso: false,
          mensagem: "Falha de teste",
        },
      ],
      "2026-05-13T00:00:00.000Z"
    );

    assert.equal(relatorio.resultados[0].empresa, "Empresa Teste LTDA");

    const xlsxPath = salvarRelatorioXlsx(relatorio, path.join(tempDir, "execucao.json"));
    assert.ok(xlsxPath);

    const workbook = XLSX.readFile(xlsxPath);
    const resultados = XLSX.utils.sheet_to_json<string[]>(
      workbook.Sheets.Resultados,
      { header: 1 }
    );
    assert.deepEqual(resultados[0].slice(0, 4), ["CNPJ", "CNPJ Original", "Empresa", "Responsável"]);
    assert.equal(resultados[1][2], "Empresa Teste LTDA");
  } finally {
    process.chdir(previousCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("bloqueia leitura de planilha com linha sem SETOR", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "alterar-responsavel-setor-"));
  const planilhaPath = path.join(tempDir, "sem-setor.xlsx");

  try {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["CNPJ", "RESPONSAVEL", "SETOR"],
      ["07.273.339/0001-00", "Pessoa Teste", ""],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Dados");
    XLSX.writeFile(workbook, planilhaPath);

    assert.throws(
      () => lerPlanilha(planilhaPath),
      (error) =>
        error instanceof PlanilhaObrigatoriaError &&
        error.message.includes("CNPJ + RESPONSAVEL + SETOR obrigatorios") &&
        error.message.includes("Linha 2") &&
        error.message.includes("SETOR")
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("aceita DEPARTAMENTO como alias legado de SETOR obrigatorio", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "alterar-responsavel-departamento-"));
  const planilhaPath = path.join(tempDir, "departamento.xlsx");

  try {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["CNPJ", "RESPONSAVEL", "DEPARTAMENTO"],
      ["07.273.339/0001-00", "Pessoa Teste", "FISCAL"],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Dados");
    XLSX.writeFile(workbook, planilhaPath);

    const linhas = lerPlanilha(planilhaPath);
    assert.equal(linhas.length, 1);
    assert.equal(linhas[0].setor, "FISCAL");
    assert.equal(linhas[0].departamento, "FISCAL");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
