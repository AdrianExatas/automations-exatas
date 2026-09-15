/**
 * Levantamento somente leitura: modelos recorrentes do setor Pessoal
 * vinculados às empresas da planilha MAED sem movimento.
 *
 *   npx ts-node scripts/levantamento-pessoal-maed-sem-movimento.ts
 *   npx ts-node scripts/levantamento-pessoal-maed-sem-movimento.ts --excel "C:\\path\\arquivo.xlsx"
 */
import fs from "fs";
import path from "path";
import { AxiosInstance } from "axios";
import * as XLSX from "xlsx";
import { getJwt } from "../src/auth";
import { createGesttaClient } from "../src/client";
import {
  listarTarefasDoCliente,
  listarTarefasRecorrentes,
} from "../src/endpoints";
import { departmentIdOf } from "../src/payload";
import { CustomerTaskConfig, GesttaTask } from "../src/types";

const DEFAULT_EXCEL =
  "C:\\Users\\Exatas\\Downloads\\Levantamento de Maed sem movimento.xlsx";
const LIMIT = 500;

interface PlanilhaEmpresa {
  codigoPlanilha: string;
  nomePlanilha: string;
  documento: string;
  documentoDigits: string;
}

interface ClienteGestta {
  _id: string;
  name: string;
  cnpj?: string;
  code?: string | number;
  active?: boolean;
}

type EmpresaStatus =
  | "encontrada"
  | "nao_encontrada"
  | "ambiguo"
  | "sem_tarefa_pessoal"
  | "erro";

interface EmpresaResultado {
  codigoPlanilha: string;
  nomePlanilha: string;
  documento: string;
  status: EmpresaStatus;
  detalhe: string;
  customerId?: string;
  codigoGestta?: string;
  nomeGestta?: string;
  ativoGestta?: boolean;
  qtdTarefasPessoal: number;
}

interface LinhaTarefa {
  codigoPlanilha: string;
  codigoGestta: string;
  nomePlanilha: string;
  nomeGestta: string;
  documento: string;
  tarefa: string;
  frequencia: string;
  subtipo: string;
  modeloAtivo: string;
  vinculoAtivo: string;
  responsavel: string;
  taskId: string;
  customerId: string;
  linkId: string;
  deptName: string;
}

function digitsOnly(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarSetor(setor: unknown): string {
  const key = normalizeText(setor);
  if (!key) return "Sem setor";
  if (key === "DP" || key === "PESSOAL" || key === "DEPARTAMENTO PESSOAL") {
    return "Pessoal";
  }
  return String(setor ?? "").trim() || "Sem setor";
}

function isPessoal(setor: unknown): boolean {
  return normalizarSetor(setor) === "Pessoal";
}

function getArgValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  return args[index + 1];
}

function asArray<T>(data: unknown, docsKey = "docs"): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && docsKey in data) {
    const docs = (data as Record<string, unknown>)[docsKey];
    return Array.isArray(docs) ? (docs as T[]) : [];
  }
  return [];
}

function taskIdOf(config: CustomerTaskConfig): string {
  const task = config.company_task;
  if (!task) return "";
  return typeof task === "string" ? task : task._id;
}

function userNameOf(config: CustomerTaskConfig): string {
  const user = config.company_user;
  if (!user || typeof user === "string") return "";
  return user.name ?? "";
}

function codeOf(cliente: ClienteGestta): string {
  if (cliente.code == null || cliente.code === "") return "";
  return String(cliente.code).trim();
}

function lerPlanilha(excelPath: string): PlanilhaEmpresa[] {
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Planilha nao encontrada: ${excelPath}`);
  }
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  const empresas: PlanilhaEmpresa[] = [];
  for (let i = 2; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const codigo = row[0];
    const nome = row[1];
    const documento = row[2];
    if (codigo == null && !nome && !documento) continue;
    const documentoDigits = digitsOnly(documento);
    empresas.push({
      codigoPlanilha: codigo == null ? "" : String(codigo).trim(),
      nomePlanilha: nome == null ? "" : String(nome).trim(),
      documento: documento == null ? "" : String(documento).trim(),
      documentoDigits,
    });
  }
  return empresas;
}

async function listarClientes(
  client: AxiosInstance,
  active?: boolean,
): Promise<ClienteGestta[]> {
  const clientes: ClienteGestta[] = [];
  let page = 1;
  for (;;) {
    const params: Record<string, string | number | boolean> = {
      limit: LIMIT,
      page,
      search: "",
    };
    if (active !== undefined) params.active = active;
    const { data } = await client.get<{
      docs?: ClienteGestta[];
      hasNextPage?: boolean;
    }>("/admin/customer", { params });
    clientes.push(...(data.docs ?? []));
    if (!data.hasNextPage) break;
    page += 1;
  }
  return clientes;
}

async function listarDepartamentos(
  client: AxiosInstance,
): Promise<Map<string, string>> {
  const deptNames = new Map<string, string>();
  const { data } = await client.get<
    | { docs?: Array<{ _id: string; name: string }> }
    | Array<{ _id: string; name: string }>
  >("/admin/company/department", { params: { limit: LIMIT, page: 1 } });
  const depts = asArray<{ _id: string; name: string }>(data);
  for (const dept of depts) deptNames.set(dept._id, dept.name);
  return deptNames;
}

function indexarClientes(clientes: ClienteGestta[]): {
  byDoc: Map<string, ClienteGestta[]>;
  byCode: Map<string, ClienteGestta[]>;
} {
  const byDoc = new Map<string, ClienteGestta[]>();
  const byCode = new Map<string, ClienteGestta[]>();
  for (const cliente of clientes) {
    const doc = digitsOnly(cliente.cnpj);
    if (doc) {
      const list = byDoc.get(doc) ?? [];
      list.push(cliente);
      byDoc.set(doc, list);
    }
    const code = codeOf(cliente);
    if (code) {
      const list = byCode.get(code) ?? [];
      list.push(cliente);
      byCode.set(code, list);
    }
  }
  return { byDoc, byCode };
}

function escolherUnico(
  matches: ClienteGestta[],
): { ok: true; cliente: ClienteGestta } | { ok: false; detalhe: string } {
  if (matches.length === 0) {
    return { ok: false, detalhe: "Nenhum cliente correspondente" };
  }
  if (matches.length === 1) {
    return { ok: true, cliente: matches[0] };
  }
  const ativos = matches.filter((item) => item.active !== false);
  if (ativos.length === 1) {
    return { ok: true, cliente: ativos[0] };
  }
  const ids = [...new Set(matches.map((item) => item._id))];
  if (ids.length === 1) {
    return { ok: true, cliente: matches[0] };
  }
  return {
    ok: false,
    detalhe: `Ambiguo: ${matches.length} clientes (${ids.slice(0, 5).join(", ")})`,
  };
}

function resolverCliente(
  empresa: PlanilhaEmpresa,
  indexes: ReturnType<typeof indexarClientes>,
):
  | { status: "encontrada"; cliente: ClienteGestta; detalhe: string }
  | { status: "nao_encontrada" | "ambiguo"; detalhe: string } {
  if (empresa.documentoDigits) {
    const byDoc = indexes.byDoc.get(empresa.documentoDigits) ?? [];
    const picked = escolherUnico(byDoc);
    if (picked.ok) {
      return {
        status: "encontrada",
        cliente: picked.cliente,
        detalhe: "Resolvido por documento",
      };
    }
    if (byDoc.length > 1) {
      return { status: "ambiguo", detalhe: picked.detalhe };
    }
  }

  if (empresa.codigoPlanilha) {
    const byCode = indexes.byCode.get(empresa.codigoPlanilha) ?? [];
    const picked = escolherUnico(byCode);
    if (picked.ok) {
      return {
        status: "encontrada",
        cliente: picked.cliente,
        detalhe: "Resolvido por codigo Gestta",
      };
    }
    if (byCode.length > 1) {
      return { status: "ambiguo", detalhe: picked.detalhe };
    }
  }

  return {
    status: "nao_encontrada",
    detalhe: "CNPJ/codigo nao encontrados no Gestta",
  };
}

function modelFromCatalog(
  config: CustomerTaskConfig,
  byId: Map<string, GesttaTask>,
): GesttaTask | undefined {
  const task = config.company_task;
  if (task && typeof task === "object" && task._id) {
    return byId.get(task._id) ?? task;
  }
  const id = taskIdOf(config);
  return id ? byId.get(id) : undefined;
}

function deptNameOf(
  model: GesttaTask,
  deptNames: Map<string, string>,
): string {
  const dept = model.company_department;
  if (dept && typeof dept === "object" && dept.name) {
    return dept.name;
  }
  const id = departmentIdOf(model);
  return deptNames.get(id) ?? id;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function writeWorkbook(
  filePath: string,
  linhas: LinhaTarefa[],
  empresas: EmpresaResultado[],
): void {
  const taskSheet = linhas.map((row) => ({
    "Código planilha": row.codigoPlanilha,
    "Código Gestta": row.codigoGestta,
    "Nome planilha": row.nomePlanilha,
    "Nome Gestta": row.nomeGestta,
    Documento: row.documento,
    Tarefa: row.tarefa,
    Frequência: row.frequencia,
    Subtipo: row.subtipo,
    "Modelo ativo": row.modeloAtivo,
    "Vínculo ativo": row.vinculoAtivo,
    Responsável: row.responsavel,
    "ID modelo": row.taskId,
    Departamento: row.deptName,
  }));

  const empresaSheet = empresas.map((row) => ({
    "Código planilha": row.codigoPlanilha,
    "Nome planilha": row.nomePlanilha,
    Documento: row.documento,
    Status: row.status,
    Detalhe: row.detalhe,
    "Código Gestta": row.codigoGestta ?? "",
    "Nome Gestta": row.nomeGestta ?? "",
    "Ativo Gestta":
      row.ativoGestta == null ? "" : row.ativoGestta ? "sim" : "não",
    "Qtd tarefas Pessoal": row.qtdTarefasPessoal,
    "Customer ID": row.customerId ?? "",
  }));

  const empresasComMatch = empresas.filter(
    (item) =>
      item.status === "encontrada" || item.status === "sem_tarefa_pessoal",
  ).length;
  const porTarefa = new Map<string, { taskId: string; count: number }>();
  for (const linha of linhas) {
    const current = porTarefa.get(linha.tarefa) ?? {
      taskId: linha.taskId,
      count: 0,
    };
    current.count += 1;
    porTarefa.set(linha.tarefa, current);
  }
  const resumoSheet = [...porTarefa.entries()]
    .map(([tarefa, info]) => ({
      Tarefa: tarefa,
      "ID modelo": info.taskId,
      "Qtd empresas": info.count,
      "Percentual da lista resolvida":
        empresasComMatch === 0
          ? "0%"
          : `${((info.count / empresasComMatch) * 100).toFixed(1)}%`,
    }))
    .sort(
      (a, b) =>
        Number(b["Qtd empresas"]) - Number(a["Qtd empresas"]) ||
        String(a.Tarefa).localeCompare(String(b.Tarefa), "pt-BR"),
    );

  const taskNames = [...porTarefa.keys()].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
  const tasksByCompany = new Map<string, Set<string>>();
  for (const linha of linhas) {
    const key = `${linha.codigoPlanilha}|${linha.documento}`;
    const set = tasksByCompany.get(key) ?? new Set<string>();
    set.add(linha.tarefa);
    tasksByCompany.set(key, set);
  }
  const matrizSheet = empresas.map((empresa) => {
    const key = `${empresa.codigoPlanilha}|${empresa.documento}`;
    const set = tasksByCompany.get(key) ?? new Set<string>();
    const row: Record<string, string | number> = {
      "Código planilha": empresa.codigoPlanilha,
      "Nome planilha": empresa.nomePlanilha,
      Documento: empresa.documento,
      Status: empresa.status,
    };
    for (const taskName of taskNames) {
      row[taskName] = set.has(taskName) ? "X" : "";
    }
    return row;
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      taskSheet.length > 0
        ? taskSheet
        : [
            {
              "Código planilha": "",
              "Código Gestta": "",
              "Nome planilha": "",
              "Nome Gestta": "",
              Documento: "",
              Tarefa: "",
              Frequência: "",
              Subtipo: "",
              "Modelo ativo": "",
              "Vínculo ativo": "",
              Responsável: "",
              "ID modelo": "",
              Departamento: "",
            },
          ],
    ),
    "Tarefas Pessoal",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(empresaSheet),
    "Empresas",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      resumoSheet.length > 0
        ? resumoSheet
        : [
            {
              Tarefa: "",
              "ID modelo": "",
              "Qtd empresas": 0,
              "Percentual da lista resolvida": "0%",
            },
          ],
    ),
    "Resumo tarefas",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(matrizSheet),
    "Matriz",
  );
  XLSX.writeFile(workbook, filePath);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const excelPath = path.resolve(
    getArgValue(args, "--excel") || DEFAULT_EXCEL,
  );
  const reportsDir = path.resolve(
    getArgValue(args, "--reports-dir") ||
      path.join(__dirname, "..", "..", "relatorios"),
  );
  fs.mkdirSync(reportsDir, { recursive: true });

  console.log(`[levantamento-pessoal-maed] planilha=${excelPath}`);
  const empresasPlanilha = lerPlanilha(excelPath);
  console.log(`[levantamento-pessoal-maed] empresas na planilha=${empresasPlanilha.length}`);

  const client = createGesttaClient(getJwt());
  console.log("[levantamento-pessoal-maed] carregando clientes ativos...");
  const ativos = await listarClientes(client, true);
  console.log(`[levantamento-pessoal-maed] clientes ativos=${ativos.length}`);
  console.log("[levantamento-pessoal-maed] carregando clientes inativos...");
  const inativos = await listarClientes(client, false);
  console.log(`[levantamento-pessoal-maed] clientes inativos=${inativos.length}`);

  const byIdCliente = new Map<string, ClienteGestta>();
  for (const cliente of [...ativos, ...inativos]) {
    if (!byIdCliente.has(cliente._id)) byIdCliente.set(cliente._id, cliente);
  }
  const indexes = indexarClientes([...byIdCliente.values()]);

  console.log("[levantamento-pessoal-maed] carregando departamentos...");
  const deptNames = await listarDepartamentos(client);
  console.log("[levantamento-pessoal-maed] carregando modelos recorrentes...");
  const allTasks = await listarTarefasRecorrentes(client);
  const byTaskId = new Map(allTasks.map((task) => [task._id, task]));
  console.log(`[levantamento-pessoal-maed] modelos recorrentes=${allTasks.length}`);

  const linhas: LinhaTarefa[] = [];
  const empresas: EmpresaResultado[] = [];

  for (const [index, empresa] of empresasPlanilha.entries()) {
    const progress = `${index + 1}/${empresasPlanilha.length}`;
    const resolved = resolverCliente(empresa, indexes);
    if (resolved.status !== "encontrada") {
      empresas.push({
        codigoPlanilha: empresa.codigoPlanilha,
        nomePlanilha: empresa.nomePlanilha,
        documento: empresa.documento,
        status: resolved.status,
        detalhe: resolved.detalhe,
        qtdTarefasPessoal: 0,
      });
      console.log(
        `[${progress}] ${empresa.codigoPlanilha} ${resolved.status}: ${resolved.detalhe}`,
      );
      continue;
    }

    const cliente = resolved.cliente;
    try {
      const configs = await listarTarefasDoCliente(client, cliente._id);
      const pessoais: LinhaTarefa[] = [];
      for (const config of configs) {
        const model = modelFromCatalog(config, byTaskId);
        if (!model) continue;
        const deptName = deptNameOf(model, deptNames);
        if (!isPessoal(deptName)) continue;
        pessoais.push({
          codigoPlanilha: empresa.codigoPlanilha,
          codigoGestta: codeOf(cliente),
          nomePlanilha: empresa.nomePlanilha,
          nomeGestta: cliente.name,
          documento: empresa.documento,
          tarefa: model.name,
          frequencia: String(model.frequency ?? ""),
          subtipo: String(model.subtype ?? ""),
          modeloAtivo: model.active === false ? "não" : "sim",
          vinculoAtivo: config.active === false ? "não" : "sim",
          responsavel: userNameOf(config),
          taskId: model._id,
          customerId: cliente._id,
          linkId: config._id,
          deptName: normalizarSetor(deptName),
        });
      }
      pessoais.sort((a, b) => a.tarefa.localeCompare(b.tarefa, "pt-BR"));
      linhas.push(...pessoais);

      const status: EmpresaStatus =
        pessoais.length === 0 ? "sem_tarefa_pessoal" : "encontrada";
      empresas.push({
        codigoPlanilha: empresa.codigoPlanilha,
        nomePlanilha: empresa.nomePlanilha,
        documento: empresa.documento,
        status,
        detalhe:
          pessoais.length === 0
            ? `${resolved.detalhe}; sem modelos Pessoal vinculados`
            : resolved.detalhe,
        customerId: cliente._id,
        codigoGestta: codeOf(cliente),
        nomeGestta: cliente.name,
        ativoGestta: cliente.active !== false,
        qtdTarefasPessoal: pessoais.length,
      });
      console.log(
        `[${progress}] ${empresa.codigoPlanilha} ${cliente.name}: ${pessoais.length} tarefa(s) Pessoal`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      empresas.push({
        codigoPlanilha: empresa.codigoPlanilha,
        nomePlanilha: empresa.nomePlanilha,
        documento: empresa.documento,
        status: "erro",
        detalhe: message.slice(0, 400),
        customerId: cliente._id,
        codigoGestta: codeOf(cliente),
        nomeGestta: cliente.name,
        ativoGestta: cliente.active !== false,
        qtdTarefasPessoal: 0,
      });
      console.warn(`[${progress}] ERRO ${empresa.codigoPlanilha}: ${message}`);
    }

    if ((index + 1) % 25 === 0) await sleep(150);
  }

  linhas.sort(
    (a, b) =>
      a.codigoPlanilha.localeCompare(b.codigoPlanilha, undefined, {
        numeric: true,
      }) || a.tarefa.localeCompare(b.tarefa, "pt-BR"),
  );

  const dateStamp = new Date().toISOString().slice(0, 10);
  const baseName = `levantamento_pessoal_maed_sem_movimento_${dateStamp}`;
  const excelOut = path.join(reportsDir, `${baseName}.xlsx`);
  const jsonOut = path.join(reportsDir, `${baseName}.json`);

  writeWorkbook(excelOut, linhas, empresas);
  fs.writeFileSync(
    jsonOut,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourceExcel: excelPath,
        totalEmpresasPlanilha: empresasPlanilha.length,
        totalLinhasTarefa: linhas.length,
        empresas,
        tarefas: linhas,
      },
      null,
      2,
    ),
    "utf8",
  );

  const contagem = empresas.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`[levantamento-pessoal-maed] Excel: ${excelOut}`);
  console.log(`[levantamento-pessoal-maed] JSON: ${jsonOut}`);
  console.log(
    `[levantamento-pessoal-maed] linhas=${linhas.length} status=${JSON.stringify(contagem)}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
