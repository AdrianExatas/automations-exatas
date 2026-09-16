import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as XLSX from "xlsx";
import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import {
  aplicarPreviaPessoal,
  deduplicarFontePessoal,
  executarPreviaPessoal,
  filtrarInstanciasAgostoOpen,
  lerFontePessoal,
  resolverClientePessoal,
} from "../src/reatribuicao-pessoal";

function response<T>(config: InternalAxiosRequestConfig, data: T): AxiosResponse<T> {
  return { config, data, headers: {}, status: 200, statusText: "OK" };
}

test("le a fonte bruta sem exigir CNPJ, setor ou mes de geracao", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pessoal-source-"));
  const file = path.join(dir, "fonte.xlsx");
  try {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ["CÓD.", "RAZÃO SOCIAL", "RESPONSÁVEL INTERNO PELO CLIENTE"],
      ["10", "Empresa teste", "Samara"],
    ]), "Planilha1");
    XLSX.writeFile(workbook, file);
    assert.deepEqual(lerFontePessoal(file), [
      { linha: 2, codigo: "10", empresa: "Empresa teste", responsavel: "Samara" },
    ]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("bloqueia codigo com responsaveis conflitantes e deduplica repeticao identica", () => {
  const result = deduplicarFontePessoal([
    { linha: 2, codigo: "10", empresa: "Empresa", responsavel: "Samara" },
    { linha: 3, codigo: "10", empresa: "Empresa", responsavel: "Kamilly" },
    { linha: 4, codigo: "11", empresa: "Outra", responsavel: "Camilla" },
    { linha: 5, codigo: "11", empresa: "Outra", responsavel: "Camilla" },
  ]);
  assert.equal(result.validas.length, 1);
  assert.equal(result.validas[0].codigo, "11");
  assert.equal(result.pendencias.length, 1);
  assert.equal(result.pendencias[0].categoria, "responsabilidade_conflitante");
});

test("distingue empresas com codigo repetido pelo nome sem aceitar empate", () => {
  const clientes = [
    { _id: "alvo", code: "554", name: "LINKSE PROVEDOR DE INTERNET LTDA", cnpj: "11111111000111" },
    { _id: "outro", code: "554", name: "BORDADOS DE TOBIAS LTDA", cnpj: "22222222000122" },
  ];
  assert.equal(resolverClientePessoal({ codigo: "554", empresa: "LINKSE PROVEDOR D EINTERNET LTDA" }, clientes)?._id, "alvo");
  assert.equal(resolverClientePessoal({ codigo: "554", empresa: "BORDADOS DE TOBIAS LTDA (sem movimento)" }, clientes)?._id, "outro");
  assert.equal(resolverClientePessoal({ codigo: "554", empresa: "Empresa desconhecida" }, clientes), null);
  assert.equal(resolverClientePessoal({ codigo: "554", empresa: "LINKSE PROVEDOR DE INTERNET LTDA" }, [clientes[0], { ...clientes[0], _id: "duplicado" }]), null);
});

test("seleciona somente instancias OPEN de agosto de ambos os modelos", () => {
  const selected = filtrarInstanciasAgostoOpen([
    { _id: "normal", status: "OPEN", competence_date: "2026-08-01", name: "Tarefa normal" },
    { _id: "whatsapp", status: "OPEN", competence_date: "2026-08-20", name: "Tarefa normal - VIA WHATSAPP" },
    { _id: "closed", status: "DONE", competence_date: "2026-08-20", company_task: { _id: "normal-model" } },
    { _id: "september", status: "OPEN", competence_date: "2026-09-01", company_task: { _id: "normal-model" } },
    { _id: "other", status: "OPEN", competence_date: "2026-08-01", company_task: { _id: "other-model" } },
  ], "normal-model", "wa-model", "Tarefa normal", "Tarefa normal - VIA WHATSAPP");
  assert.deepEqual(selected.map((item) => item._id), ["normal", "whatsapp"]);
});

test("previa une Pessoal aos dois modelos e aplica vinculos e instancias OPEN", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pessoal-flow-"));
  const source = path.join(dir, "fonte.xlsx");
  try {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ["COD.", "RAZÃO SOCIAL", "RESPONSÁVEL"],
      ["10", "Empresa teste", "Samara"],
    ]), "Planilha1");
    XLSX.writeFile(workbook, source);

    const owners = new Map<string, string>([
      ["link-normal", "old"], ["link-wa", "old"], ["link-other", "old"],
      ["instance-normal", "old"], ["instance-wa", "old"],
    ]);
    const client = axios.create({ baseURL: "https://api.gestta.com.br" });
    client.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      const method = config.method?.toLowerCase();
      const url = config.url ?? "";
      if (method === "get" && url === "/admin/customer") {
        const active = (config.params as { active?: boolean }).active;
        return response(config, active === false ? { docs: [], hasNextPage: false } : { docs: [{ _id: "customer-1", code: "10", cnpj: "12345678000190", name: "Empresa teste" }], hasNextPage: false });
      }
      if (method === "get" && url === "/admin/company/user") return response(config, [{ _id: "samara", name: "Samara Lima" }]);
      if (method === "get" && url === "/admin/company/task/6a7e38a6690fac807b46646f") return response(config, { _id: "6a7e38a6690fac807b46646f", name: "VERIFICAR PENDENCIAS - RECEITA FEDERAL (DP)" });
      if (method === "get" && url === "/admin/company/task") return response(config, { docs: [
        { _id: "6a7e38a6690fac807b46646f", name: "VERIFICAR PENDENCIAS - RECEITA FEDERAL (DP)" },
        { _id: "wa-model", name: "VERIFICAR PENDENCIAS - RECEITA FEDERAL (DP) - VIA WHATSAPP" },
      ], hasNextPage: false });
      if (method === "get" && url === "/admin/customer/customer-1/company/task") return response(config, [
        { _id: "link-normal", company_task: { _id: "6a7e38a6690fac807b46646f", name: "VERIFICAR PENDENCIAS - RECEITA FEDERAL (DP)", company_department: { name: "Pessoal" } }, company_user: { _id: owners.get("link-normal"), name: "Antigo" } },
        { _id: "link-wa", company_task: { _id: "wa-model", name: "VERIFICAR PENDENCIAS - RECEITA FEDERAL (DP) - VIA WHATSAPP", company_department: { name: "Pessoal" } }, company_user: { _id: owners.get("link-wa"), name: "Antigo" } },
        { _id: "link-other", company_task: { _id: "other", name: "Folha", company_department: { name: "Pessoal" } }, company_user: { _id: owners.get("link-other"), name: "Antigo" } },
      ]);
      if (method === "post" && url === "/core/customer/task/search") return response(config, { docs: [
        { _id: "instance-normal", status: "OPEN", competence_date: "2026-08-01", name: "VERIFICAR PENDENCIAS - RECEITA FEDERAL (DP)", owner: { _id: owners.get("instance-normal"), name: "Antigo" } },
        { _id: "instance-wa", status: "OPEN", competence_date: "2026-08-01", name: "VERIFICAR PENDENCIAS - RECEITA FEDERAL (DP) - VIA WHATSAPP", owner: { _id: owners.get("instance-wa"), name: "Antigo" } },
      ] });
      if (method === "patch" && url === "/admin/group/customer/config") {
        const body = JSON.parse(String(config.data)) as { ids: string[]; company_user: string };
        body.ids.forEach((id) => owners.set(id, body.company_user));
        return response(config, {});
      }
      if (method === "get" && url.startsWith("/core/customer/task/")) {
        const id = url.split("/").pop()!;
        const model = id === "instance-normal" ? "6a7e38a6690fac807b46646f" : "wa-model";
        return response(config, { _id: id, status: "OPEN", competence_date: "2026-08-01", name: id === "instance-normal" ? "VERIFICAR PENDENCIAS - RECEITA FEDERAL (DP)" : "VERIFICAR PENDENCIAS - RECEITA FEDERAL (DP) - VIA WHATSAPP", company_task: { _id: model }, owner: { _id: owners.get(id), name: owners.get(id) === "samara" ? "Samara Lima" : "Antigo" } });
      }
      if (method === "put" && url === "/core/customer/task/transfer") {
        const body = JSON.parse(String(config.data)) as { customer_task: string; new_owner: string };
        owners.set(body.customer_task, body.new_owner);
        return response(config, {});
      }
      throw new Error(`Unexpected ${method} ${url}`);
    };

    const previous = await executarPreviaPessoal(source, client);
    assert.equal(previous.vinculos.length, 3);
    assert.equal(previous.vinculos.find((item) => item.groupCustomerId === "link-normal")?.escopos.includes("modelo_normal"), true);
    assert.equal(previous.vinculos.find((item) => item.groupCustomerId === "link-wa")?.escopos.includes("modelo_whatsapp"), true);
    assert.equal(previous.instancias.length, 2);

    const previousPath = path.join(dir, "previa.json");
    fs.writeFileSync(previousPath, JSON.stringify(previous), "utf8");
    const execution = await aplicarPreviaPessoal(previousPath, client);
    assert.equal(execution.execucao.sucesso, 5);
    assert.equal(owners.get("link-other"), "samara");
    assert.equal(owners.get("instance-normal"), "samara");
    assert.equal(owners.get("instance-wa"), "samara");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
