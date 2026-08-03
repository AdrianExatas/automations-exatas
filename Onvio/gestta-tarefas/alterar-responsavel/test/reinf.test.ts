import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import * as XLSX from "xlsx";
import { lerPlanilha } from "../src/planilha";
import { gerarBackupLinha, prepararLinhasParaExecucao, processarLinha } from "../src/automation";
import type { LinhaPlanilha } from "../src/types";

function response<T>(config: InternalAxiosRequestConfig, data: T): AxiosResponse<T> {
  return {
    config,
    data,
    headers: {},
    status: 200,
    statusText: "OK",
  };
}

function makeLinha(overrides: Partial<LinhaPlanilha> = {}): LinhaPlanilha {
  return {
    cod: "1",
    cnpj: "12345678000190",
    empresa: "Empresa Teste",
    responsavel: "Marta Graziely",
    mesGeracao: { month: 7, year: 2026 },
    setor: "Contabil",
    tarefa: "REINF - SETOR CONTABIL",
    ...overrides,
  };
}

function makeClient(options: { duplicateTask?: boolean } = {}) {
  const client = axios.create({ baseURL: "https://api.gestta.com.br" });
  const patches: unknown[] = [];

  client.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    if (config.method === "get" && config.url === "/admin/customer") {
      return response(config, {
        docs: [{ _id: "customer-1", cnpj: "12345678000190", name: "Empresa Teste" }],
      });
    }
    if (config.method === "get" && config.url === "/admin/company/user") {
      return response(config, [{ _id: "user-new", name: "Marta Graziely" }]);
    }
    if (config.method === "get" && config.url === "/admin/customer/customer-1/company/task") {
      const target = {
        _id: "group-reinf",
        company_task: {
          name: "REINF - SETOR CONTÁBIL",
          company_department: { name: "Contábil" },
        },
        company_user: { _id: "user-old", name: "Usuario Antigo" },
      };
      return response(config, [
        target,
        ...(options.duplicateTask ? [{ ...target, _id: "group-reinf-2" }] : []),
        {
          _id: "group-contabil-outra",
          company_task: {
            name: "Balancete - SETOR CONTÁBIL",
            company_department: { name: "Contábil" },
          },
          company_user: { _id: "user-other", name: "Outro Usuario" },
        },
      ]);
    }
    if (config.method === "patch" && config.url === "/admin/group/customer/config") {
      patches.push(JSON.parse(String(config.data)));
      return response(config, { ok: true });
    }
    throw new Error(`Unexpected request: ${config.method} ${config.url}`);
  };

  return { client, patches };
}

test("le layout REINF com CNPJ EMPRESA, RESPONSAVEL, SETOR e TAREFA", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reinf-layout-"));
  const filePath = path.join(dir, "reinf.xlsx");

  try {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["CODIGO", "CNPJ EMPRESA", "EMPRESA", "RESPONSÁVEL", "SETOR", "TAREFA"],
      ["001", "12.345.678/0001-90", "Empresa Teste", "Marta Graziely", "Contábil", "REINF - SETOR CONTÁBIL"],
      ["002", "", "Sem CNPJ", "Marta Graziely", "Contábil", "REINF - SETOR CONTÁBIL"],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "06-2025");
    XLSX.writeFile(workbook, filePath);

    const linhas = lerPlanilha(filePath);

    assert.equal(linhas.length, 2);
    assert.equal(linhas[0].cod, "001");
    assert.equal(linhas[0].cnpj, "12345678000190");
    assert.equal(linhas[0].responsavel, "Marta Graziely");
    assert.equal(linhas[0].setor, "Contábil");
    assert.equal(linhas[0].tarefa, "REINF - SETOR CONTÁBIL");
    assert.equal(linhas[1].cnpj, "");
    assert.equal(linhas[1].cnpjInvalido, true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("processarLinha com tarefa altera somente a tarefa exata", async () => {
  const { client, patches } = makeClient();

  const resultado = await processarLinha(client, makeLinha());

  assert.equal(resultado.sucesso, true);
  assert.deepEqual(patches, [{ ids: ["group-reinf"], company_user: "user-new" }]);
  assert.equal(resultado.rollbackItems?.[0].taskName, "REINF - SETOR CONTÁBIL");
});

test("processarLinha bloqueia tarefa exata ambigua sem PATCH", async () => {
  const { client, patches } = makeClient({ duplicateTask: true });

  const resultado = await processarLinha(client, makeLinha());

  assert.equal(resultado.sucesso, false);
  assert.match(resultado.mensagem, /Mais de um vinculo/);
  assert.deepEqual(patches, []);
});

test("gerarBackupLinha captura responsavel atual sem executar PATCH", async () => {
  const { client, patches } = makeClient();

  const resultado = await gerarBackupLinha(client, makeLinha());

  assert.equal(resultado.sucesso, true);
  assert.equal(resultado.mensagem, "Backup criado; nenhum PATCH executado.");
  assert.equal(resultado.rollbackItems?.[0].previousCompanyUserName, "Usuario Antigo");
  assert.equal(resultado.rollbackItems?.[0].appliedCompanyUserName, "Marta Graziely");
  assert.deepEqual(patches, []);
});

test("prepararLinhasParaExecucao bloqueia CNPJ duplicado com responsaveis diferentes", () => {
  assert.throws(
    () =>
      prepararLinhasParaExecucao([
        makeLinha({ cod: "549", responsavel: "Marta Graziely" }),
        makeLinha({ cod: "298", responsavel: "Gleice Santos Santana" }),
      ]),
    /CNPJs duplicados com responsaveis diferentes/
  );
});
