import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  buildExecutionOutputDir,
  buildCompanyDirectoryName,
  buildHttpOutputPath,
  buildOutputPath,
  buildParcelamentoDirectoryName,
  buildPdfFileName,
  buildVencimentoMonthDirectoryName,
  parseParcelasTotais,
  timestampForDirectory,
} from "../src/utils.js";

test("monta o caminho final no formato esperado para um parcelamento com 3/14", () => {
  const actual = buildOutputPath("C:\\saida", "DONA MARIA VARIEDADES LTDA", "11839421", 4, 14, "29-05-2026");
  const expected = path.join(
    "C:\\saida",
    "05-2026",
    "DONA MARIA VARIEDADES LTDA",
    "PARCELAMENTO N° 11839421",
    "PARCELA N°4 DE 14 - 11839421.pdf",
  );

  assert.equal(actual, expected);
});

test("monta caminho HTTP separado por mes de vencimento", () => {
  const actual = buildHttpOutputPath("C:\\saida", "BONSONO", "11153712", 9, 14, "29-05-2026");
  const expected = path.join(
    "C:\\saida",
    "05-2026",
    "BONSONO",
    "PARCELAMENTO N° 11153712",
    "PARCELA N°9 DE 14 - 11153712 - BONSONO - Vencimento 29-05-2026.pdf",
  );

  assert.equal(actual, expected);
});

test("normaliza mes de vencimento a partir de datas BR e ISO", () => {
  assert.equal(buildVencimentoMonthDirectoryName("29-05-2026"), "05-2026");
  assert.equal(buildVencimentoMonthDirectoryName("29/05/2026"), "05-2026");
  assert.equal(buildVencimentoMonthDirectoryName("2026-05-29T23:59:59-03:00"), "05-2026");
  assert.equal(buildVencimentoMonthDirectoryName(undefined), "SEM VENCIMENTO");
});

test("monta diretorio de execucao com data e hora", () => {
  const date = new Date(2026, 6, 6, 12, 9, 8);

  assert.equal(timestampForDirectory(date), "2026-07-06_12-09-08");
  assert.equal(
    buildExecutionOutputDir("C:\\saida", date),
    path.join("C:\\saida", "execucoes", "2026-07-06_12-09-08"),
  );
});

test("cada parcelamento usa sua proxima parcela no nome do arquivo", () => {
  assert.equal(buildPdfFileName("11839421", 4, 14), "PARCELA N°4 DE 14 - 11839421.pdf");
  assert.equal(buildPdfFileName("11839569", 2, 60), "PARCELA N°2 DE 60 - 11839569.pdf");
  assert.equal(buildPdfFileName("11839716", 4, 19), "PARCELA N°4 DE 19 - 11839716.pdf");
});

test("sanitiza nome da empresa e dos diretorios", () => {
  assert.equal(buildCompanyDirectoryName("EMPRESA: TESTE / FILIAL"), "EMPRESA TESTE FILIAL");
  assert.equal(buildParcelamentoDirectoryName("11839421"), "PARCELAMENTO N° 11839421");
});

test("interpreta Parcelas Totais como parcelas ja pagas de um total", () => {
  assert.deepEqual(parseParcelasTotais("3 /14"), { parcelasJaPagas: 3, totalParcelas: 14 });
  assert.deepEqual(parseParcelasTotais("1/ 60"), { parcelasJaPagas: 1, totalParcelas: 60 });
  assert.deepEqual(parseParcelasTotais("10 / 20"), { parcelasJaPagas: 10, totalParcelas: 20 });
});

test("falha ao interpretar Parcelas Totais invalido", () => {
  assert.throws(
    () => parseParcelasTotais("sem formato"),
    /Nao foi possivel interpretar o campo "Parcelas Totais"|Não foi possível interpretar o campo "Parcelas Totais"/,
  );
  assert.throws(
    () => parseParcelasTotais("15/14"),
    /total de parcelas precisa ser maior ou igual as parcelas ja pagas|total de parcelas precisa ser maior ou igual às parcelas já pagas/i,
  );
  assert.throws(
    () => parseParcelasTotais("14/14"),
    /nao existe proxima parcela para emissao|não existe próxima parcela para emissão/i,
  );
});
