import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import * as XLSX from "xlsx";
import { listarTarefasGeradasPorStatus } from "../src/api/endpoints";
import {
  aplicarPreviaPessoalPendentes,
  executarPreviaPessoalPendentes,
  isSetorPessoal,
  lerFontePessoalPendentes,
  reverterExecucaoPessoalPendentes,
  STATUS_PENDENTES_PESSOAL,
  type ExecucaoPessoalPendentes,
} from "../src/reatribuicao-pessoal-pendentes";

function response<T>(config: InternalAxiosRequestConfig, data: T): AxiosResponse<T> {
  return { config, data, headers: {}, status: 200, statusText: "OK" };
}

function bodyOf(config: InternalAxiosRequestConfig): Record<string, unknown> {
  return typeof config.data === "string" ? JSON.parse(config.data) as Record<string, unknown> : config.data as Record<string, unknown>;
}

function criarFonte(dir: string): string {
  const file = path.join(dir, "empresas.xlsx");
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["COD.", "RAZÃO SOCIAL"],
    ["10", "Empresa Teste"],
    ["11", "JOAO VICTOR FONSECA OLIVEIRA &#x20;"],
  ]), "Empresas");
  XLSX.writeFile(workbook, file);
  return file;
}

test("le fonte, converte entidade de espaco e reconhece aliases do Pessoal", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pessoal-pendentes-fonte-"));
  try {
    const rows = lerFontePessoalPendentes(criarFonte(dir));
    assert.deepEqual(rows, [
      { linha: 2, codigo: "10", empresa: "Empresa Teste" },
      { linha: 3, codigo: "11", empresa: "JOAO VICTOR FONSECA OLIVEIRA" },
    ]);
    assert.equal(isSetorPessoal("Pessoal"), true);
    assert.equal(isSetorPessoal("DP"), true);
    assert.equal(isSetorPessoal("Departamento Pessoal"), true);
    assert.equal(isSetorPessoal("Fiscal"), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("pagina a busca de instancias usando os status solicitados", async () => {
  const client = axios.create();
  const pages: number[] = [];
  client.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const body = bodyOf(config) as { page: number; status: string[] };
    pages.push(body.page);
    assert.deepEqual(body.status, [...STATUS_PENDENTES_PESSOAL]);
    if (body.page === 1) return response(config, { docs: [{ _id: "a" }], hasNextPage: true });
    return response(config, { docs: [{ _id: "b" }], hasNextPage: false });
  };
  const tasks = await listarTarefasGeradasPorStatus(client, "customer", STATUS_PENDENTES_PESSOAL);
  assert.deepEqual(tasks.map((item) => item._id), ["a", "b"]);
  assert.deepEqual(pages, [1, 2]);
});

interface MockState {
  owners: Map<string, string>;
  transfers: Array<{ task: string; owner: string }>;
  searchStatuses: string[][];
}

function createFlowClient(state: MockState) {
  const client = axios.create({ baseURL: "https://api.gestta.com.br" });
  const taskDefinitions = new Map<string, { customer: string; model: string; name: string; status: string }>([
    ["open", { customer: "customer-10", model: "p-model", name: "Folha", status: "OPEN" }],
    ["impediment", { customer: "customer-10", model: "service-model", name: "Admissao", status: "IMPEDIMENT" }],
    ["fiscal", { customer: "customer-10", model: "f-model", name: "ICMS", status: "OPEN" }],
    ["unknown", { customer: "customer-10", model: "unknown-model", name: "Sem setor", status: "OPEN" }],
    ["samara", { customer: "customer-10", model: "p-model", name: "Ja Samara", status: "OPEN" }],
  ]);

  const generated = (id: string) => {
    const def = taskDefinitions.get(id)!;
    const ownerId = state.owners.get(id)!;
    return {
      _id: id,
      name: def.name,
      status: def.status,
      competence_date: "2026-09-01",
      customer: { _id: def.customer, name: "Empresa Teste" },
      company_task: { _id: def.model, name: def.name },
      company_user: { _id: ownerId, name: ownerId === "kamilly" ? "Kamilly Vitoria" : ownerId === "samara" ? "Samara Lima" : "Outra Pessoa" },
    };
  };

  client.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const method = config.method?.toLowerCase();
    const url = config.url ?? "";
    if (method === "get" && url === "/admin/customer") {
      const active = (config.params as { active?: boolean }).active;
      return response(config, active === false
        ? { docs: [{ _id: "customer-11", code: "11", cnpj: "11111111000111", name: "JOAO VICTOR FONSECA OLIVEIRA", active: false }], hasNextPage: false }
        : { docs: [{ _id: "customer-10", code: "10", cnpj: "10101010000110", name: "Empresa Teste", active: true }], hasNextPage: false });
    }
    if (method === "get" && url === "/admin/company/user") {
      const active = (config.params as { active?: boolean }).active;
      return response(config, active === false
        ? { docs: [], hasNextPage: false }
        : { docs: [{ _id: "kamilly", name: "Kamilly Vitoria", active: true }, { _id: "samara", name: "Samara Lima", active: true }], hasNextPage: false });
    }
    if (method === "get" && url === "/admin/company/department") {
      return response(config, { docs: [{ _id: "dp", name: "Departamento Pessoal" }, { _id: "fiscal-dept", name: "Fiscal" }], hasNextPage: false });
    }
    if (method === "get" && url === "/admin/company/task") {
      const type = (config.params as { type?: string }).type;
      return response(config, type === "SERVICE_ORDER"
        ? { docs: [{ _id: "service-model", name: "Admissao", company_department: { _id: "dp", name: "Departamento Pessoal" } }], hasNextPage: false }
        : { docs: [
          { _id: "p-model", name: "Folha", company_department: "dp" },
          { _id: "f-model", name: "ICMS", company_department: "fiscal-dept" },
          { _id: "unknown-model", name: "Sem setor" },
        ], hasNextPage: false });
    }
    if (method === "post" && url === "/core/customer/task/search") {
      const body = bodyOf(config) as { customer: string[]; status: string[] };
      state.searchStatuses.push(body.status);
      const customerId = body.customer[0];
      const docs = [...taskDefinitions.keys()]
        .filter((id) => taskDefinitions.get(id)!.customer === customerId)
        .filter((id) => body.status.includes(taskDefinitions.get(id)!.status))
        .map(generated);
      return response(config, { docs, hasNextPage: false });
    }
    if (method === "get" && url.startsWith("/core/customer/task/")) {
      return response(config, generated(url.split("/").pop()!));
    }
    if (method === "put" && url === "/core/customer/task/transfer") {
      const body = bodyOf(config) as { customer_task: string; new_owner: string };
      state.owners.set(body.customer_task, body.new_owner);
      state.transfers.push({ task: body.customer_task, owner: body.new_owner });
      return response(config, {});
    }
    throw new Error(`Unexpected ${method} ${url}`);
  };
  return client;
}

test("preflight seleciona todos os status pendentes aceitos, aplica, verifica e reverte", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pessoal-pendentes-flow-"));
  const previousReports = process.env.GESTTA_RELATORIOS_DIR;
  process.env.GESTTA_RELATORIOS_DIR = path.join(dir, "reports");
  const state: MockState = {
    owners: new Map([
      ["open", "kamilly"], ["impediment", "kamilly"],
      ["fiscal", "kamilly"], ["unknown", "kamilly"], ["samara", "samara"],
    ]),
    transfers: [],
    searchStatuses: [],
  };
  try {
    const source = criarFonte(dir);
    const client = createFlowClient(state);
    const preview = await executarPreviaPessoalPendentes(source, "Kamilly Vitoria", "Samara Lima", client);
    assert.equal(preview.execucao.bloqueado, false);
    assert.equal(preview.execucao.empresasResolvidas, 2);
    assert.equal(preview.tarefas.length, 2);
    assert.deepEqual(new Set(preview.tarefas.map((item) => item.statusAtual)), new Set(STATUS_PENDENTES_PESSOAL));
    assert.equal(preview.exclusoes.filter((item) => item.motivo === "outro_setor").length, 1);
    assert.equal(preview.exclusoes.filter((item) => item.motivo === "setor_nao_comprovado").length, 1);
    assert.equal(preview.exclusoes.filter((item) => item.motivo === "outro_responsavel").length, 1);
    assert.equal(preview.empresas.find((item) => item.codigo === "11")?.status, "sem_tarefas_elegiveis");

    const previewPath = path.join(dir, "preview.json");
    fs.writeFileSync(previewPath, JSON.stringify(preview), "utf8");
    const execution = await aplicarPreviaPessoalPendentes(previewPath, client);
    assert.equal(execution.execucao.aplicadas, 2);
    assert.equal(execution.execucao.falhas, 0);
    assert.equal(execution.verificacao.ok, true);
    assert.deepEqual(state.transfers.map((item) => item.task).sort(), ["impediment", "open"]);
    assert.equal(state.owners.get("fiscal"), "kamilly");
    assert.equal(state.owners.get("unknown"), "kamilly");
    assert.equal(state.owners.get("samara"), "samara");

    const executionPath = path.join(dir, "execution.json");
    fs.writeFileSync(executionPath, JSON.stringify(execution), "utf8");
    const rollback = await reverterExecucaoPessoalPendentes(executionPath, client);
    assert.equal(rollback.execucao.sucesso, 2);
    assert.equal(rollback.execucao.falha, 0);
    for (const id of ["open", "impediment"]) assert.equal(state.owners.get(id), "kamilly");
  } finally {
    if (previousReports == null) delete process.env.GESTTA_RELATORIOS_DIR;
    else process.env.GESTTA_RELATORIOS_DIR = previousReports;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("aplicacao bloqueia instancia cujo responsavel mudou depois da previa e continua as demais", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pessoal-pendentes-race-"));
  const previousReports = process.env.GESTTA_RELATORIOS_DIR;
  process.env.GESTTA_RELATORIOS_DIR = path.join(dir, "reports");
  const state: MockState = {
    owners: new Map([
      ["open", "kamilly"], ["impediment", "kamilly"],
      ["fiscal", "kamilly"], ["unknown", "kamilly"], ["samara", "samara"],
    ]),
    transfers: [],
    searchStatuses: [],
  };
  try {
    const client = createFlowClient(state);
    const preview = await executarPreviaPessoalPendentes(criarFonte(dir), "Kamilly Vitoria", "Samara Lima", client);
    const previewPath = path.join(dir, "preview.json");
    fs.writeFileSync(previewPath, JSON.stringify(preview), "utf8");
    state.owners.set("open", "other");
    const execution = await aplicarPreviaPessoalPendentes(previewPath, client);
    assert.equal(execution.resultados.find((item) => item.customerTaskId === "open")?.resultado, "bloqueado");
    assert.equal(execution.execucao.aplicadas, 1);
    assert.equal(execution.execucao.falhas, 1);
    assert.equal(state.transfers.some((item) => item.task === "open"), false);
  } finally {
    if (previousReports == null) delete process.env.GESTTA_RELATORIOS_DIR;
    else process.env.GESTTA_RELATORIOS_DIR = previousReports;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("rollback nao sobrescreve responsavel que divergiu do destino", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pessoal-pendentes-rollback-"));
  const state: MockState = {
    owners: new Map([
      ["open", "other"], ["impediment", "kamilly"],
      ["fiscal", "kamilly"], ["unknown", "kamilly"], ["samara", "samara"],
    ]),
    transfers: [],
    searchStatuses: [],
  };
  try {
    const execution: ExecucaoPessoalPendentes = {
      tipo: "execucao-reatribuicao-pessoal-pendentes-v1",
      execucao: { inicio: "2026-09-14", fim: "2026-09-14", previaOrigem: "preview.json", total: 1, aplicadas: 1, jaEstavamNoDestino: 0, falhas: 0 },
      previa: { inicio: "2026-09-14", fim: "2026-09-14", planilhaFonte: "source.xlsx", responsavelOrigem: "Kamilly Vitoria", responsavelOrigemId: "kamilly", responsavelDestino: "Samara Lima", responsavelDestinoId: "samara", statuses: [...STATUS_PENDENTES_PESSOAL], totalFonte: 1, empresasResolvidas: 1, tarefasElegiveis: 1, exclusoes: 0, pendencias: 0, bloqueado: false },
      resultados: [{ codigo: "10", empresa: "Empresa Teste", customerId: "customer-10", customerTaskId: "open", tarefa: "Folha", modeloId: "p-model", modelo: "Folha", setor: "Pessoal", statusAtual: "OPEN", responsavelOrigemId: "kamilly", responsavelOrigem: "Kamilly Vitoria", responsavelDestinoId: "samara", responsavelDestino: "Samara Lima", resultado: "aplicado", alteradoNestaExecucao: true, mensagem: "ok" }],
      verificacao: { ok: true, restantesComOrigem: [], transferenciasNaoConfirmadas: [], erros: [] },
    };
    const executionPath = path.join(dir, "execution.json");
    fs.writeFileSync(executionPath, JSON.stringify(execution), "utf8");
    const rollback = await reverterExecucaoPessoalPendentes(executionPath, createFlowClient(state));
    assert.equal(rollback.execucao.sucesso, 0);
    assert.equal(rollback.execucao.falha, 1);
    assert.equal(state.transfers.length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
