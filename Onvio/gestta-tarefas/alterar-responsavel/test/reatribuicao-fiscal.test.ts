import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import * as XLSX from "xlsx";
import {
  aplicarLevantamentoFiscal,
  executarLevantamentoFiscal,
  lerFonteFiscal,
} from "../src/reatribuicao-fiscal";
import { carregarRollbackItemsDoRelatorio } from "../src/rollback";

function response<T>(config: InternalAxiosRequestConfig, data: T): AxiosResponse<T> {
  return { config, data, headers: {}, status: 200, statusText: "OK" };
}

function criarPlanilha(dir: string): string {
  const arquivo = path.join(dir, "responsabilidades.xlsx");
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["NUMERO", "NOME EMPRESA", "CNPJ", "RESPONSÁVEL"],
    ["10", "Empresa fiscal", "", "Maria Fiscal"],
  ]), "Planilha1");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["Código", "Nome", "CNPJ"],
    ["10", "Empresa fiscal LTDA", "12.345.678/0001-90"],
  ]), "BD");
  XLSX.writeFile(workbook, arquivo);
  return arquivo;
}

function criarCliente() {
  const patches: unknown[] = [];
  const client = axios.create({ baseURL: "https://api.gestta.com.br" });
  client.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    if (config.method === "get" && config.url === "/admin/customer") {
      const active = (config.params as { active?: boolean } | undefined)?.active;
      return response(config, active === false ? { docs: [], hasNextPage: false } : {
        docs: [{ _id: "cliente-1", name: "Empresa fiscal LTDA", cnpj: "12345678000190", code: "10" }],
        hasNextPage: false,
      });
    }
    if (config.method === "get" && config.url === "/admin/company/user") {
      return response(config, [{ _id: "maria", name: "Maria Fiscal" }]);
    }
    if (config.method === "get" && config.url === "/admin/customer/cliente-1/company/task") {
      return response(config, [
        { _id: "alterar", company_task: { name: "Apuracao ICMS", company_department: { name: "Fiscal" } }, company_user: { _id: "antigo", name: "Responsavel Antigo" } },
        { _id: "joao", company_task: { name: "Parcelamento estadual", company_department: { name: "Fiscal - Simples Nacional" } }, company_user: { _id: "joao", name: "João Flavio" } },
        { _id: "joao-outra", company_task: { name: "Apuracao de ICMS", company_department: { name: "Fiscal" } }, company_user: { _id: "joao", name: "João Flavio" } },
        { _id: "pendente-joao", company_task: { name: "Emissão de Nota", company_department: { name: "Fiscal" } }, company_user: { _id: "outro", name: "Outro Usuario" } },
        { _id: "fora", company_task: { name: "Folha", company_department: { name: "Pessoal" } }, company_user: { _id: "outro", name: "Outro Usuario" } },
      ]);
    }
    if (config.method === "patch" && config.url === "/admin/group/customer/config") {
      patches.push(JSON.parse(String(config.data)));
      return response(config, { ok: true });
    }
    throw new Error(`Requisicao inesperada: ${config.method} ${config.url}`);
  };
  return { client, patches };
}

test("le a fonte fiscal e completa CNPJ pelo codigo da aba BD", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fiscal-source-"));
  try {
    const { empresas } = lerFonteFiscal(criarPlanilha(dir));
    assert.equal(empresas.length, 1);
    assert.equal(empresas[0].cnpjFonte, "");
    assert.equal(empresas[0].responsavelPlanejado, "Maria Fiscal");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("levantamento cria backup sem PATCH e separa excecoes de Joao Flavio", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fiscal-inventory-"));
  const previousDir = process.env.GESTTA_RELATORIOS_DIR;
  process.env.GESTTA_RELATORIOS_DIR = dir;
  try {
    const { client, patches } = criarCliente();
    const levantamento = await executarLevantamentoFiscal(criarPlanilha(dir), client);
    assert.equal(levantamento.execucao.tarefas, 4);
    assert.equal(levantamento.execucao.alteracoesPlanejadas, 1);
    assert.equal(levantamento.tarefas.find((item) => item.groupCustomerId === "joao")?.status, "excecao_joao_flavio");
    assert.equal(levantamento.tarefas.find((item) => item.groupCustomerId === "joao-outra")?.status, "excecao_joao_flavio");
    assert.equal(levantamento.tarefas.find((item) => item.groupCustomerId === "pendente-joao")?.status, "pendencia_joao_flavio");
    assert.deepEqual(patches, []);
    assert.equal(fs.readdirSync(dir).filter((name) => name.endsWith(".json")).length, 1);
    assert.equal(fs.readdirSync(dir).filter((name) => name.endsWith(".xlsx")).length, 2);
  } finally {
    if (previousDir === undefined) delete process.env.GESTTA_RELATORIOS_DIR;
    else process.env.GESTTA_RELATORIOS_DIR = previousDir;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("aplicacao usa apenas alteracoes planejadas e preserva as excecoes", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fiscal-apply-"));
  const previousDir = process.env.GESTTA_RELATORIOS_DIR;
  process.env.GESTTA_RELATORIOS_DIR = dir;
  try {
    const { client, patches } = criarCliente();
    await executarLevantamentoFiscal(criarPlanilha(dir), client);
    const backup = fs.readdirSync(dir).find((name) => name.startsWith("backup_") && name.endsWith(".json"));
    assert.ok(backup);
    const aplicacao = await aplicarLevantamentoFiscal(path.join(dir, backup), client);
    assert.equal(aplicacao.execucao.sucesso, 1);
    assert.deepEqual(patches, [{ ids: ["alterar"], company_user: "maria" }]);
    const execucao = fs.readdirSync(dir).find((name) => name.startsWith("execucao_reatribuicao_fiscal_") && name.endsWith(".json"));
    assert.ok(execucao);
    assert.deepEqual(carregarRollbackItemsDoRelatorio(path.join(dir, execucao)), [{
      cnpj: "12345678000190", empresa: "Empresa fiscal LTDA", customerId: "cliente-1", groupCustomerId: "alterar",
      taskName: "Apuracao ICMS", departmentName: "Fiscal", previousCompanyUserId: "antigo", previousCompanyUserName: "Responsavel Antigo",
      appliedCompanyUserId: "maria", appliedCompanyUserName: "Maria Fiscal",
    }]);
  } finally {
    if (previousDir === undefined) delete process.env.GESTTA_RELATORIOS_DIR;
    else process.env.GESTTA_RELATORIOS_DIR = previousDir;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
