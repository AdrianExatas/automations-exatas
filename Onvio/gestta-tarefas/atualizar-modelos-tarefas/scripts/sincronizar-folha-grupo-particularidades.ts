/**
 * Backup e sincronização da Folha Geral Grupo 1/2 com as planilhas de Particularidades.
 * Não altera checklist, frequência nem documentos dos modelos.
 * Não migra entre normal e VIA WHATSAPP; só alinha o grupo.
 *
 *   npx ts-node scripts/sincronizar-folha-grupo-particularidades.ts --backup-only
 *   npx ts-node scripts/sincronizar-folha-grupo-particularidades.ts --dry-run
 *   npx ts-node scripts/sincronizar-folha-grupo-particularidades.ts --apply
 *   npx ts-node scripts/sincronizar-folha-grupo-particularidades.ts --apply --regen-pessoal
 *   npx ts-node scripts/sincronizar-folha-grupo-particularidades.ts --rollback relatorios/backup_....json
 */
import fs from "fs";
import path from "path";
import { AxiosInstance } from "axios";
import * as XLSX from "xlsx";
import { getJwt } from "../src/auth";
import { createGesttaClient } from "../src/client";
import {
  adicionarClientesNaTarefa,
  listarClientesDaTarefa,
  listarTarefasDoCliente,
  listarTarefasRecorrentes,
  patchGroupCustomerConfig,
  regenerarTarefasCliente,
  removerGroupCustomers,
} from "../src/endpoints";
import { GesttaTask } from "../src/types";
import {
  AdditionRow,
  ClassificacaoEmpresa,
  DEFAULT_PARTICULARIDADES_DIR,
  KeepRow,
  LinkAtual,
  REQUIRED_TASK_NAMES,
  RemovalRow,
  TARGET_NAMES,
  TargetTaskName,
  axiosErrorDetail,
  contarStatus,
  emptySheet,
  findTaskByNameOptional,
  findUniqueTaskByName,
  getArgValue,
  indexarClientes,
  lerParticularidades,
  listarClientes,
  montarPlano,
  snapshotLinks,
  sleep,
  stamp,
  withRetry,
} from "./lib/folha-grupo-particularidades";

const POLL_ATTEMPTS = 20;
const POLL_MS = 3000;
const COMPETENCE_PESSOAL = { month: 8, year: 2026 };
const PESSOAL_DEPT_NAME = "Pessoal";

interface RegenRow {
  customerId: string;
  codigo: string;
  empresa: string;
  eraseOk: boolean;
  eraseStatus: number;
  generateOk: boolean;
  generateStatus: number;
  result: "success" | "failure";
  detalhe: string;
}

interface BackupFile {
  generatedAt: string;
  mode: "backup-only" | "dry-run" | "apply";
  sourceDir: string;
  arquivos: string[];
  tasks: Partial<Record<TargetTaskName, { id: string; name: string }>>;
  currentLinks: LinkAtual[];
  classificacoes: ClassificacaoEmpresa[];
  keeps: KeepRow[];
  removals: RemovalRow[];
  additions: AdditionRow[];
}

function parseArgs(argv: string[]): {
  apply: boolean;
  backupOnly: boolean;
  dryRun: boolean;
  regenPessoal: boolean;
  dirPath: string;
  reportsDir: string;
  rollbackPath?: string;
} {
  const rollbackFlag = argv.findIndex((item) => item === "--rollback");
  const applyFlag = argv.includes("--apply");
  const backupOnly = argv.includes("--backup-only");
  return {
    apply: applyFlag && !backupOnly && rollbackFlag < 0,
    backupOnly,
    dryRun: !applyFlag || argv.includes("--dry-run") || backupOnly,
    regenPessoal: argv.includes("--regen-pessoal"),
    dirPath: path.resolve(
      getArgValue(argv, "--dir") || DEFAULT_PARTICULARIDADES_DIR,
    ),
    reportsDir: path.resolve(
      getArgValue(argv, "--reports-dir") ||
        path.join(__dirname, "..", "..", "relatorios"),
    ),
    rollbackPath:
      rollbackFlag >= 0 && argv[rollbackFlag + 1]
        ? path.resolve(argv[rollbackFlag + 1])
        : undefined,
  };
}

function taskIdOfConfig(config: {
  company_task?: string | { _id?: string };
}): string {
  const task = config.company_task;
  if (!task) return "";
  return typeof task === "string" ? task : task._id ?? "";
}

async function waitForLink(
  client: AxiosInstance,
  customerId: string,
  taskId: string,
): Promise<{ _id: string }> {
  for (let attempt = 1; attempt <= POLL_ATTEMPTS; attempt += 1) {
    const links = await listarClientesDaTarefa(client, taskId);
    const found = links.find((item) => {
      const customer = item.customer;
      const id = typeof customer === "string" ? customer : customer._id;
      return id === customerId;
    });
    if (found) return found;
    await sleep(POLL_MS);
  }
  throw new Error(
    `Vinculo da tarefa ${taskId} nao apareceu para o cliente ${customerId} apos ${POLL_ATTEMPTS} tentativas.`,
  );
}

async function resolverDepartamentoPessoal(
  client: AxiosInstance,
): Promise<{ id: string; name: string }> {
  const { data } = await client.get<
    | Array<{ _id: string; name: string }>
    | { docs?: Array<{ _id: string; name: string }> }
  >("/admin/company/department", { params: { limit: 500, page: 1 } });
  const depts = Array.isArray(data) ? data : data.docs ?? [];
  const matches = depts.filter((item) => item.name.trim() === PESSOAL_DEPT_NAME);
  if (matches.length !== 1) {
    throw new Error(
      `Departamento Pessoal nao resolvido de forma unica (${matches.length}). Abortando regen para nao afetar outros setores.`,
    );
  }
  return { id: matches[0]._id, name: matches[0].name };
}

function empresasAlteradas(backup: BackupFile): Array<{
  customerId: string;
  codigo: string;
  empresa: string;
}> {
  const byId = new Map<string, { customerId: string; codigo: string; empresa: string }>();
  for (const row of backup.removals) {
    if (row.applyStatus !== "ok") continue;
    byId.set(row.customerId, {
      customerId: row.customerId,
      codigo: row.customerCode,
      empresa: row.customerName,
    });
  }
  for (const row of backup.additions) {
    if (row.applyStatus !== "ok") continue;
    byId.set(row.customerId, {
      customerId: row.customerId,
      codigo: row.codigoPlanilha,
      empresa: row.nomeGestta,
    });
  }
  return [...byId.values()].sort((a, b) =>
    a.codigo.localeCompare(b.codigo, undefined, { numeric: true }),
  );
}

function writeRegenReport(
  reportsDir: string,
  prefix: string,
  department: { id: string; name: string },
  rows: RegenRow[],
): { excelPath: string; jsonPath: string } {
  const sheet = rows.map((row) => ({
    Código: row.codigo,
    Empresa: row.empresa,
    "Customer ID": row.customerId,
    Departamento: department.name,
    Competência: `${COMPETENCE_PESSOAL.month}/${COMPETENCE_PESSOAL.year}`,
    "DELETE ok": row.eraseOk ? "sim" : "não",
    "DELETE HTTP": row.eraseStatus,
    "POST ok": row.generateOk ? "sim" : "não",
    "POST HTTP": row.generateStatus,
    Resultado: row.result,
    Detalhe: row.detalhe,
  }));
  const resumo = [
    { Item: "Empresas", Qtd: rows.length },
    { Item: "Sucesso", Qtd: rows.filter((item) => item.result === "success").length },
    { Item: "Falha", Qtd: rows.filter((item) => item.result === "failure").length },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      sheet.length > 0 ? sheet : emptySheet(["Código", "Empresa", "Resultado"]),
    ),
    "Regeneracao Pessoal",
  );
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(resumo), "Resumo");
  const excelPath = path.join(reportsDir, `${prefix}.xlsx`);
  const jsonPath = path.join(reportsDir, `${prefix}.json`);
  XLSX.writeFile(workbook, excelPath);
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        competence: COMPETENCE_PESSOAL,
        department,
        forceEraseInteraction: false,
        rows,
      },
      null,
      2,
    ),
    "utf8",
  );
  return { excelPath, jsonPath };
}

async function regenerarPessoalAgosto(
  client: AxiosInstance,
  backup: BackupFile,
  reportsDir: string,
): Promise<void> {
  const department = await resolverDepartamentoPessoal(client);
  if (department.name !== PESSOAL_DEPT_NAME) {
    throw new Error(`Departamento inesperado: ${department.name}`);
  }
  const empresas = empresasAlteradas(backup);
  console.log(
    `[folha-grupo] regen Pessoal ${COMPETENCE_PESSOAL.month}/${COMPETENCE_PESSOAL.year} dept=${department.id} empresas=${empresas.length} force_erase_interaction=false`,
  );
  if (empresas.length === 0) {
    console.warn("[folha-grupo] nenhuma empresa alterada com sucesso; regen pulada");
    return;
  }

  const rows: RegenRow[] = [];
  for (const [index, empresa] of empresas.entries()) {
    const progress = `${index + 1}/${empresas.length}`;
    const run = () =>
      regenerarTarefasCliente(client, empresa.customerId, {
        ...COMPETENCE_PESSOAL,
        company_department: department.id,
        force_erase_interaction: false,
      });
    let result = await run();
    if (!(result.erase.ok && result.generate.ok)) {
      await sleep(1500);
      result = await run();
    }
    const ok = result.erase.ok && result.generate.ok;
    const row: RegenRow = {
      customerId: empresa.customerId,
      codigo: empresa.codigo,
      empresa: empresa.empresa,
      eraseOk: result.erase.ok,
      eraseStatus: result.erase.status,
      generateOk: result.generate.ok,
      generateStatus: result.generate.status,
      result: ok ? "success" : "failure",
      detalhe: ok
        ? "Pessoal ago/2026 regenerado (somente sem interacao)"
        : `erase HTTP ${result.erase.status}; generate HTTP ${result.generate.status}`,
    };
    rows.push(row);
    console.log(
      `[REGEN ${progress}] ${empresa.codigo} ${ok ? "ok" : "FALHOU"} erase=${result.erase.status} gen=${result.generate.status}`,
    );
    await sleep(200);
  }

  const dateStamp = new Date().toISOString().slice(0, 10);
  const { excelPath, jsonPath } = writeRegenReport(
    reportsDir,
    `regeneracao_folha_grupo_pessoal_${dateStamp}`,
    department,
    rows,
  );
  const falhas = rows.filter((item) => item.result === "failure").length;
  console.log(`[folha-grupo] regen Excel: ${excelPath}`);
  console.log(`[folha-grupo] regen JSON: ${jsonPath}`);
  console.log(
    `[folha-grupo] regen sucesso=${rows.length - falhas} falha=${falhas}`,
  );
}

function writeReports(
  reportsDir: string,
  prefix: string,
  backup: BackupFile,
): { excelPath: string; jsonPath: string } {
  const inventario = backup.currentLinks.map((link) => ({
    Tarefa: link.taskName,
    Grupo: link.grupo,
    "Via WhatsApp": link.viaWhatsapp ? "sim" : "não",
    "ID modelo": link.taskId,
    Código: link.customerCode,
    Empresa: link.customerName,
    CNPJ: link.cnpj,
    Responsável: link.companyUserName ?? "",
    "ID vínculo": link.linkId,
    "Customer ID": link.customerId,
  }));
  const manter = backup.keeps.map((row) => ({
    Tarefa: row.taskName,
    Status: row.statusEmpresa,
    Código: row.codigo,
    Empresa: row.empresa,
    CNPJ: row.cnpj,
    Responsável: row.responsavelAtual,
    "ID vínculo": row.linkId,
  }));
  const remover = backup.removals.map((row) => ({
    Tarefa: row.taskName,
    Motivo: row.reason,
    "Grupo esperado": row.grupoEsperado,
    Código: row.customerCode,
    Empresa: row.customerName,
    CNPJ: row.cnpj,
    Responsável: row.companyUserName ?? "",
    "ID vínculo": row.linkId,
    Status: row.applyStatus ?? "",
    Detalhe: row.applyDetail ?? "",
  }));
  const adicionar = backup.additions.map((row) => ({
    Tarefa: row.taskName,
    "Grupo esperado": row.grupoEsperado,
    "Vem de": row.fromTaskName ?? "",
    "Código planilha": row.codigoPlanilha,
    Empresa: row.nomeGestta,
    CNPJ: row.cnpj,
    Responsável: row.responsavelAtual ?? "",
    Status: row.applyStatus ?? "",
    Detalhe: row.applyDetail ?? "",
    "ID vínculo novo": row.newLinkId ?? "",
  }));
  const statusSheet = backup.classificacoes.map((row) => ({
    Arquivo: row.origemArquivo,
    "Código planilha": row.codigoPlanilha,
    Empresa: row.nomeGestta || row.nomePlanilha,
    CNPJ: row.documento,
    "Grupo planilha": row.grupoPlanilha ?? "",
    "Grupo Gestta": row.grupoGestta,
    Status: row.status,
    Detalhe: row.detalhe,
    "Tarefas atuais": row.tarefasAtuais.join(" | "),
  }));
  const naoResolvidas = backup.classificacoes.filter((row) =>
    [
      "nao_encontrada",
      "ambiguo",
      "grupo_vazio_planilha",
      "conflito_planilha",
    ].includes(row.status),
  );
  const contagem = contarStatus(backup.classificacoes);
  const resumo = [
    { Item: "Inventário atual (4 tarefas)", Qtd: backup.currentLinks.length },
    { Item: "Manter", Qtd: backup.keeps.length },
    { Item: "Remover", Qtd: backup.removals.length },
    { Item: "Adicionar", Qtd: backup.additions.length },
    ...Object.entries(contagem).map(([status, qtd]) => ({
      Item: `Status ${status}`,
      Qtd: qtd,
    })),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      inventario.length > 0
        ? inventario
        : emptySheet(["Tarefa", "Empresa", "CNPJ"]),
    ),
    "Inventario atual",
  );
  if (backup.mode !== "backup-only") {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        statusSheet.length > 0
          ? statusSheet
          : emptySheet(["Código planilha", "Status"]),
      ),
      "Status empresas",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        manter.length > 0 ? manter : emptySheet(["Tarefa", "Empresa", "CNPJ"]),
      ),
      "Manter",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        remover.length > 0
          ? remover
          : emptySheet(["Tarefa", "Empresa", "Motivo"]),
      ),
      "Remover",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        adicionar.length > 0
          ? adicionar
          : emptySheet(["Tarefa", "Empresa", "CNPJ"]),
      ),
      "Adicionar",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        naoResolvidas.length > 0
          ? naoResolvidas.map((row) => ({
              Status: row.status,
              "Código planilha": row.codigoPlanilha,
              Empresa: row.nomePlanilha,
              CNPJ: row.documento,
              Detalhe: row.detalhe,
            }))
          : emptySheet(["Código planilha", "Empresa", "Status"]),
      ),
      "Nao resolvidas",
    );
  }
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(resumo),
    "Resumo",
  );

  const excelPath = path.join(reportsDir, `${prefix}.xlsx`);
  const jsonPath = path.join(reportsDir, `${prefix}.json`);
  XLSX.writeFile(workbook, excelPath);
  fs.writeFileSync(jsonPath, JSON.stringify(backup, null, 2), "utf8");
  return { excelPath, jsonPath };
}

async function applyPlan(
  client: AxiosInstance,
  backup: BackupFile,
  backupPath: string,
): Promise<void> {
  const persist = () => {
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
  };
  persist();

  for (const [index, addition] of backup.additions.entries()) {
    const progress = `${index + 1}/${backup.additions.length}`;
    try {
      await withRetry(
        `add ${addition.codigoPlanilha} ${addition.taskName}`,
        () =>
          adicionarClientesNaTarefa(client, addition.taskId, [
            addition.customerId,
          ]),
      );
      const link = await withRetry(
        `waitLink ${addition.codigoPlanilha} ${addition.taskName}`,
        () => waitForLink(client, addition.customerId, addition.taskId),
      );
      addition.newLinkId = link._id;
      if (addition.responsibleId) {
        try {
          await withRetry(
            `patchUser ${addition.codigoPlanilha} ${addition.taskName}`,
            () =>
              patchGroupCustomerConfig(client, {
                ids: [link._id],
                company_user: addition.responsibleId,
              }),
          );
        } catch (error) {
          console.warn(
            `  aviso responsavel ${addition.codigoPlanilha}: ${axiosErrorDetail(error)}`,
          );
        }
      }
      addition.applyStatus = "ok";
      addition.applyDetail = `adicionado link=${link._id}`;
      console.log(
        `[ADD ${progress}] ${addition.codigoPlanilha} ${addition.taskName}`,
      );
    } catch (error) {
      addition.applyStatus = "failed";
      addition.applyDetail = axiosErrorDetail(error);
      console.error(
        `[ADD ${progress}] ${addition.codigoPlanilha} FALHOU: ${addition.applyDetail}`,
      );
    }
    persist();
    await sleep(200);
  }

  const linkIds = backup.removals.map((item) => item.linkId).filter(Boolean);
  for (let i = 0; i < linkIds.length; i += 50) {
    const chunk = backup.removals.slice(i, i + 50);
    const ids = chunk.map((item) => item.linkId);
    try {
      await withRetry(`remove chunk=${i / 50 + 1}`, () =>
        removerGroupCustomers(client, ids),
      );
      for (const item of chunk) {
        item.applyStatus = "ok";
        item.applyDetail = "removido";
      }
      console.log(
        `[REMOVE] ${i + 1}-${Math.min(i + 50, linkIds.length)}/${linkIds.length}`,
      );
    } catch (error) {
      for (const item of chunk) {
        item.applyStatus = "failed";
        item.applyDetail = axiosErrorDetail(error);
      }
      console.error(`[REMOVE] chunk falhou: ${axiosErrorDetail(error)}`);
    }
    persist();
    await sleep(200);
  }
}

async function rollback(
  client: AxiosInstance,
  backupPath: string,
): Promise<void> {
  const backup = JSON.parse(fs.readFileSync(backupPath, "utf8")) as BackupFile;
  console.log(`[rollback] arquivo=${backupPath}`);

  for (const addition of [...backup.additions].reverse()) {
    if (addition.applyStatus !== "ok") continue;
    console.log(
      `[rollback add] ${addition.codigoPlanilha} ${addition.taskName}`,
    );
    const atuais = await listarTarefasDoCliente(client, addition.customerId);
    const onTarget = atuais.find(
      (item) => taskIdOfConfig(item) === addition.taskId,
    );
    if (onTarget) {
      await removerGroupCustomers(client, [onTarget._id]);
    }
    await sleep(150);
  }

  for (const removed of [...backup.removals].reverse()) {
    if (removed.applyStatus !== "ok") continue;
    console.log(
      `[rollback remove] ${removed.customerCode} ${removed.taskName}`,
    );
    const atuais = await listarTarefasDoCliente(client, removed.customerId);
    const already = atuais.find(
      (item) => taskIdOfConfig(item) === removed.taskId,
    );
    let linkId = already?._id;
    if (!already) {
      await adicionarClientesNaTarefa(client, removed.taskId, [
        removed.customerId,
      ]);
      const restored = await waitForLink(
        client,
        removed.customerId,
        removed.taskId,
      );
      linkId = restored._id;
    }
    if (linkId && removed.companyUserId) {
      try {
        await patchGroupCustomerConfig(client, {
          ids: [linkId],
          company_user: removed.companyUserId,
          approve: removed.approve,
          approvers: removed.approvers,
          approve_type: removed.approveType,
        });
      } catch (error) {
        console.warn(
          `  aviso restaurar responsavel ${removed.taskName}: ${axiosErrorDetail(error)}`,
        );
      }
    }
    await sleep(150);
  }
  console.log("[rollback] concluido");
}

async function resolveTasks(
  allTasks: GesttaTask[],
): Promise<Partial<Record<TargetTaskName, GesttaTask>>> {
  const tasks: Partial<Record<TargetTaskName, GesttaTask>> = {};
  for (const name of REQUIRED_TASK_NAMES) {
    tasks[name] = findUniqueTaskByName(allTasks, name);
    console.log(`[folha-grupo] ${name} = ${tasks[name]!._id}`);
  }
  for (const name of TARGET_NAMES) {
    if (tasks[name]) continue;
    const found = findTaskByNameOptional(allTasks, name);
    if (found) {
      tasks[name] = found;
      console.log(`[folha-grupo] ${name} = ${found._id}`);
    } else {
      console.warn(`[folha-grupo] modelo opcional ausente: ${name}`);
    }
  }
  return tasks;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.reportsDir, { recursive: true });
  const client = createGesttaClient(getJwt());

  if (args.rollbackPath) {
    await rollback(client, args.rollbackPath);
    return;
  }

  const mode: BackupFile["mode"] = args.apply
    ? "apply"
    : args.backupOnly
      ? "backup-only"
      : "dry-run";
  console.log(`[folha-grupo] modo=${mode}`);
  console.log(`[folha-grupo] pasta=${args.dirPath}`);

  const parsed = lerParticularidades(args.dirPath);
  for (const aviso of parsed.avisos) {
    console.warn(`[folha-grupo] aviso: ${aviso}`);
  }
  console.log(
    `[folha-grupo] arquivos=${parsed.arquivos.length} empresas=${parsed.empresas.length} g1=${
      parsed.empresas.filter((item) => item.grupoPlanilha === "GRUPO 1").length
    } g2=${
      parsed.empresas.filter((item) => item.grupoPlanilha === "GRUPO 2").length
    } vazio=${parsed.empresas.filter((item) => !item.grupoPlanilha).length}`,
  );

  console.log("[folha-grupo] carregando clientes...");
  const ativos = await listarClientes(client, true);
  const inativos = await listarClientes(client, false);
  const indexes = indexarClientes([...ativos, ...inativos]);

  console.log("[folha-grupo] carregando modelos...");
  const allTasks = await listarTarefasRecorrentes(client);
  const tasks = await resolveTasks(allTasks);
  const currentLinks = await snapshotLinks(client, tasks, indexes);
  const planned = args.backupOnly
    ? { classificacoes: [], keeps: [], removals: [], additions: [] }
    : montarPlano(parsed.empresas, indexes, tasks, currentLinks);

  const backup: BackupFile = {
    generatedAt: new Date().toISOString(),
    mode,
    sourceDir: args.dirPath,
    arquivos: parsed.arquivos,
    tasks: Object.fromEntries(
      TARGET_NAMES.filter((name) => tasks[name]).map((name) => [
        name,
        { id: tasks[name]!._id, name },
      ]),
    ),
    currentLinks,
    classificacoes: planned.classificacoes,
    keeps: planned.keeps,
    removals: planned.removals,
    additions: planned.additions,
  };

  const dateStamp = new Date().toISOString().slice(0, 10);
  const backupPath = path.join(
    args.reportsDir,
    `backup_folha_grupo_particularidades_${stamp()}.json`,
  );
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
  console.log(`[folha-grupo] backup=${backupPath}`);
  console.log(
    `[folha-grupo] inventario=${currentLinks.length} manter=${planned.keeps.length} remover=${planned.removals.length} adicionar=${planned.additions.length}`,
  );
  if (!args.backupOnly) {
    console.log(
      `[folha-grupo] status=${JSON.stringify(contarStatus(planned.classificacoes))}`,
    );
  }

  if (args.apply) {
    await applyPlan(client, backup, backupPath);
    if (args.regenPessoal) {
      await regenerarPessoalAgosto(client, backup, args.reportsDir);
    }
  } else if (args.regenPessoal) {
    throw new Error("--regen-pessoal so pode ser usado junto com --apply.");
  }

  const prefix = args.apply
    ? `execucao_folha_grupo_particularidades_${dateStamp}`
    : args.backupOnly
      ? `backup_folha_grupo_particularidades_${dateStamp}`
      : `planejado_folha_grupo_particularidades_${dateStamp}`;
  const { excelPath, jsonPath } = writeReports(args.reportsDir, prefix, backup);
  console.log(`[folha-grupo] Excel: ${excelPath}`);
  console.log(`[folha-grupo] JSON: ${jsonPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
