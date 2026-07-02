import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { processarLinha } from "../src/automation";
import {
  carregarRollbackItemsDoRelatorio,
  executarReversaoRelatorio,
} from "../src/rollback";
import { gerarRelatorioExecucao } from "../src/relatorio";
import type { LinhaPlanilha, ResultadoLinha, RollbackResponsavelItem } from "../src/types";

function response<T>(config: InternalAxiosRequestConfig, data: T): AxiosResponse<T> {
  return {
    config,
    data,
    headers: {},
    status: 200,
    statusText: "OK",
  };
}

function makeLinha(): LinhaPlanilha {
  return {
    cod: "1",
    cnpj: "12345678000190",
    responsavel: "Novo Usuario",
    mesGeracao: { month: 5, year: 2026 },
    setor: "Fiscal",
  };
}

test("processarLinha captura snapshot de rollback antes do PATCH", async () => {
  const client = axios.create({ baseURL: "https://api.gestta.com.br" });
  let patchBody: unknown = null;

  client.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    if (config.method === "get" && config.url === "/admin/customer") {
      return response(config, {
        docs: [{ _id: "customer-1", cnpj: "12345678000190", name: "Cliente" }],
      });
    }
    if (config.method === "get" && config.url === "/admin/company/user") {
      return response(config, [{ _id: "user-new", name: "Novo Usuario" }]);
    }
    if (config.method === "get" && config.url === "/admin/customer/customer-1/company/task") {
      return response(config, [
        {
          _id: "group-1",
          company_task: {
            name: "Apuracao",
            company_department: { name: "Fiscal" },
          },
          company_user: { _id: "user-old", name: "Usuario Antigo" },
        },
      ]);
    }
    if (config.method === "patch" && config.url === "/admin/group/customer/config") {
      patchBody = JSON.parse(String(config.data));
      return response(config, { ok: true });
    }
    throw new Error(`Unexpected request: ${config.method} ${config.url}`);
  };

  const resultado = await processarLinha(client, makeLinha());

  assert.equal(resultado.sucesso, true);
  assert.deepEqual(patchBody, { ids: ["group-1"], company_user: "user-new" });
  assert.deepEqual(resultado.rollbackItems, [
    {
      cnpj: "12345678000190",
      customerId: "customer-1",
      groupCustomerId: "group-1",
      taskName: "Apuracao",
      departmentName: "Fiscal",
      previousCompanyUserId: "user-old",
      previousCompanyUserName: "Usuario Antigo",
      appliedCompanyUserId: "user-new",
      appliedCompanyUserName: "Novo Usuario",
    },
  ]);
});

test("relatorio novo persiste rollbackItems e relatorio antigo e bloqueado", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rollback-report-"));
  try {
    const rollbackItem: RollbackResponsavelItem = {
      cnpj: "12345678000190",
      customerId: "customer-1",
      groupCustomerId: "group-1",
      previousCompanyUserId: "user-old",
      previousCompanyUserName: "Usuario Antigo",
      appliedCompanyUserId: "user-new",
      appliedCompanyUserName: "Novo Usuario",
    };
    const resultado: ResultadoLinha = {
      linha: makeLinha(),
      sucesso: true,
      mensagem: "Responsavel alterado com sucesso.",
      rollbackItems: [rollbackItem],
    };
    const relatorioNovo = gerarRelatorioExecucao("entrada.xlsx", [resultado], "2026-05-04T00:00:00.000Z");
    const novoPath = path.join(dir, "novo.json");
    fs.writeFileSync(novoPath, JSON.stringify(relatorioNovo), "utf8");

    assert.deepEqual(carregarRollbackItemsDoRelatorio(novoPath), [rollbackItem]);

    const antigoPath = path.join(dir, "antigo.json");
    fs.writeFileSync(
      antigoPath,
      JSON.stringify({
        execucao: { inicio: "", fim: "", planilha: "x", total: 1, sucesso: 1, falha: 0 },
        resultados: [{ cnpj: "1", responsavel: "Novo", mesGeracao: "05/2026", sucesso: true, mensagem: "OK" }],
      }),
      "utf8"
    );
    assert.throws(
      () => carregarRollbackItemsDoRelatorio(antigoPath),
      /Relatorio nao possui dados de rollback/
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("executarReversaoRelatorio valida estado atual e agrupa PATCH por responsavel anterior", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rollback-run-"));
  const previousCwd = process.cwd();
  try {
    process.chdir(dir);
    const reportPath = path.join(dir, "execucao.json");
    const rollbackItems: RollbackResponsavelItem[] = [
      {
        cnpj: "1",
        customerId: "customer-1",
        groupCustomerId: "group-1",
        previousCompanyUserId: "user-old",
        previousCompanyUserName: "Usuario Antigo",
        appliedCompanyUserId: "user-new",
        appliedCompanyUserName: "Novo Usuario",
      },
      {
        cnpj: "2",
        customerId: "customer-2",
        groupCustomerId: "group-2",
        previousCompanyUserId: "user-old",
        previousCompanyUserName: "Usuario Antigo",
        appliedCompanyUserId: "user-new",
        appliedCompanyUserName: "Novo Usuario",
      },
    ];
    fs.writeFileSync(
      reportPath,
      JSON.stringify({
        execucao: { inicio: "", fim: "", planilha: "x", total: 2, sucesso: 2, falha: 0 },
        resultados: rollbackItems.map((item) => ({
          cnpj: item.cnpj,
          responsavel: "Novo Usuario",
          mesGeracao: "05/2026",
          sucesso: true,
          mensagem: "OK",
          rollbackItems: [item],
        })),
      }),
      "utf8"
    );

    const client = axios.create({ baseURL: "https://api.gestta.com.br" });
    const patches: unknown[] = [];
    client.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      if (config.method === "get" && config.url === "/admin/customer/customer-1/company/task") {
        return response(config, [{ _id: "group-1", company_user: { _id: "user-new", name: "Novo Usuario" } }]);
      }
      if (config.method === "get" && config.url === "/admin/customer/customer-2/company/task") {
        return response(config, [{ _id: "group-2", company_user: { _id: "user-new", name: "Novo Usuario" } }]);
      }
      if (config.method === "patch" && config.url === "/admin/group/customer/config") {
        patches.push(JSON.parse(String(config.data)));
        return response(config, { ok: true });
      }
      throw new Error(`Unexpected request: ${config.method} ${config.url}`);
    };

    const relatorio = await executarReversaoRelatorio(reportPath, client);

    assert.equal(relatorio.reversao.sucesso, 2);
    assert.equal(relatorio.reversao.falha, 0);
    assert.deepEqual(patches, [{ ids: ["group-1", "group-2"], company_user: "user-old" }]);
  } finally {
    process.chdir(previousCwd);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("executarReversaoRelatorio nao reverte vinculo cujo responsavel atual divergiu", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rollback-diverge-"));
  const previousCwd = process.cwd();
  try {
    process.chdir(dir);
    const reportPath = path.join(dir, "execucao.json");
    const rollbackItem: RollbackResponsavelItem = {
      cnpj: "1",
      customerId: "customer-1",
      groupCustomerId: "group-1",
      previousCompanyUserId: "user-old",
      previousCompanyUserName: "Usuario Antigo",
      appliedCompanyUserId: "user-new",
      appliedCompanyUserName: "Novo Usuario",
    };
    fs.writeFileSync(
      reportPath,
      JSON.stringify({
        execucao: { inicio: "", fim: "", planilha: "x", total: 1, sucesso: 1, falha: 0 },
        resultados: [{ cnpj: "1", responsavel: "Novo", mesGeracao: "05/2026", sucesso: true, mensagem: "OK", rollbackItems: [rollbackItem] }],
      }),
      "utf8"
    );

    const client = axios.create({ baseURL: "https://api.gestta.com.br" });
    let patchCalls = 0;
    client.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      if (config.method === "get" && config.url === "/admin/customer/customer-1/company/task") {
        return response(config, [{ _id: "group-1", company_user: { _id: "user-other", name: "Outro" } }]);
      }
      if (config.method === "patch") {
        patchCalls += 1;
        return response(config, { ok: true });
      }
      throw new Error(`Unexpected request: ${config.method} ${config.url}`);
    };

    const relatorio = await executarReversaoRelatorio(reportPath, client);

    assert.equal(relatorio.reversao.sucesso, 0);
    assert.equal(relatorio.reversao.falha, 1);
    assert.equal(patchCalls, 0);
    assert.match(relatorio.resultados[0].mensagem, /diverge/);
  } finally {
    process.chdir(previousCwd);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
