import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import * as XLSX from "xlsx";
import {
  createPatchValidacaoBody,
  executarAtualizacaoValidacao,
} from "../src/execution";
import { deduplicarLinhasPorCnpjSetor, lerPlanilha } from "../src/planilha";
import { LinhaPlanilha } from "../src/types";

test("mapeia VALIDAÇÃO com cabecalhos acentuados e espacos finais", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "adicionar-validacao-headers-"));
  const planilhaPath = path.join(tempDir, "teste.xlsx");

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["NUMERO", "NOME EMPRESA", "CNPJ", "SETOR", "RESPONSÁVEL ", "VALIDAÇÃO "],
    ["8", "SUPERMERCADO DORIA", "10965766000164", "Fiscal", "Maria Tatiane", "Cibelle Cristina"],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Dados");
  XLSX.writeFile(workbook, planilhaPath);

  const linhas = lerPlanilha(planilhaPath);
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].numero, "8");
  assert.equal(linhas[0].empresa, "SUPERMERCADO DORIA");
  assert.equal(linhas[0].setor, "Fiscal");
  assert.equal(linhas[0].responsavel, "Maria Tatiane");
  assert.equal(linhas[0].validador, "Cibelle Cristina");
});

test("deduplica linhas identicas por cnpj e setor e rejeita conflitos de validador", () => {
  const linhas: LinhaPlanilha[] = [
    {
      numero: "1",
      empresa: "Empresa 1",
      cnpj: "10965766000164",
      setor: "Fiscal",
      responsavel: "Maria",
      validador: "Cibelle Cristina",
    },
    {
      numero: "2",
      empresa: "Empresa 1",
      cnpj: "10965766000164",
      setor: "Fiscal",
      responsavel: "Maria",
      validador: "Cibelle Cristina",
    },
    {
      numero: "3",
      empresa: "Empresa 2",
      cnpj: "02500000000199",
      setor: "Fiscal",
      responsavel: "Joyce",
      validador: "Cibelle Cristina",
    },
    {
      numero: "4",
      empresa: "Empresa 2",
      cnpj: "02500000000199",
      setor: "Fiscal",
      responsavel: "Joyce",
      validador: "Vinni Fontes",
    },
  ];

  const resultado = deduplicarLinhasPorCnpjSetor(linhas);
  assert.equal(resultado.linhas.length, 1);
  assert.equal(resultado.duplicatasIgnoradas, 1);
  assert.equal(resultado.conflitos.length, 2);
  assert.match(resultado.conflitos[0].mensagem, /Conflito de duplicidade/);
});

test("monta o body do PATCH com approve, approvers e approve_type fixo", () => {
  const body = createPatchValidacaoBody(["id-1", "id-2"], "user-123");
  assert.deepEqual(body, {
    ids: ["id-1", "id-2"],
    approvers: ["user-123"],
    approve: true,
    approve_type: ["DONE", "DISCONSIDERED"],
  });
});

test("dry-run nao chama PATCH mutavel", async () => {
  let patchCalls = 0;

  const resultado = await executarAtualizacaoValidacao(
    {
      patchValidacao: async () => {
        patchCalls += 1;
      },
    },
    {
      ids: ["group-1"],
      approverId: "user-1",
      modo: "dry-run",
    },
  );

  assert.equal(resultado.executouPatch, false);
  assert.equal(patchCalls, 0);
});

test("apply chama PATCH uma vez com o body esperado", async () => {
  let patchCalls = 0;
  let payload: unknown;

  const resultado = await executarAtualizacaoValidacao(
    {
      patchValidacao: async (body) => {
        patchCalls += 1;
        payload = body;
      },
    },
    {
      ids: ["group-1", "group-2"],
      approverId: "user-9",
      modo: "apply",
    },
  );

  assert.equal(resultado.executouPatch, true);
  assert.equal(patchCalls, 1);
  assert.deepEqual(payload, {
    ids: ["group-1", "group-2"],
    approvers: ["user-9"],
    approve: true,
    approve_type: ["DONE", "DISCONSIDERED"],
  });
});
