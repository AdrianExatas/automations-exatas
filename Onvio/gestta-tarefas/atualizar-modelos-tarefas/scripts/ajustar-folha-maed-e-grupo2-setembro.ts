/**
 * 1) Remove Folha Geral G1/G2 (e VIA WHATSAPP) das empresas MAED sem movimento.
 * 2) No Grupo 2 restante: apaga Pessoal ago/2026 (só sem interação) e gera Pessoal set/2026.
 *
 *   npx ts-node scripts/ajustar-folha-maed-e-grupo2-setembro.ts --dry-run
 *   npx ts-node scripts/ajustar-folha-maed-e-grupo2-setembro.ts --apply
 */
import fs from "fs";
import path from "path";
import { AxiosInstance } from "axios";
import * as XLSX from "xlsx";
import { getJwt } from "../src/auth";
import { createGesttaClient } from "../src/client";
import {
  apagarGeracaoCliente,
  gerarTarefasCliente,
  listarTarefasRecorrentes,
  removerGroupCustomers,
} from "../src/endpoints";
import { GesttaTask } from "../src/types";
import {
  DEFAULT_PARTICULARIDADES_DIR,
  LinkAtual,
  PlanilhaEmpresa,
  REQUIRED_TASK_NAMES,
  TARGET_NAMES,
  TASK_G2,
  TASK_G2_WA,
  TargetTaskName,
  axiosErrorDetail,
  digitsOnly,
  emptySheet,
  findTaskByNameOptional,
  findUniqueTaskByName,
  getArgValue,
  indexarClientes,
  listarClientes,
  resolverCliente,
  sleep,
  snapshotLinks,
  stamp,
  withRetry,
} from "./lib/folha-grupo-particularidades";

const DEFAULT_MAED_EXCEL = path.join(
  DEFAULT_PARTICULARIDADES_DIR,
  "Levantamento de Maed sem movimento.xlsx",
);
const PESSOAL_DEPT_NAME = "Pessoal";
const AUG = { month: 8, year: 2026 };
const SEP = { month: 9, year: 2026 };

interface MaedEmpresa {
  codigoPlanilha: string;
  nomePlanilha: string;
  documento: string;
  documentoDigits: string;
}

interface MaedRemoval {
  customerId: string;
  codigo: string;
  empresa: string;
  cnpj: string;
  taskName: TargetTaskName;
  taskId: string;
  linkId: string;
  applyStatus?: "planned" | "ok" | "failed" | "skipped";
  applyDetail?: string;
}

interface Grupo2Row {
  customerId: string;
  codigo: string;
  empresa: string;
  cnpj: string;
  tarefas: string[];
  eraseAugOk?: boolean;
  eraseAugStatus?: number;
  eraseSepOk?: boolean;
  eraseSepStatus?: number;
  generateSepOk?: boolean;
  generateSepStatus?: number;
  result?: "planned" | "success" | "failure";
  detalhe?: string;
}

function parseArgs(argv: string[]): {
  apply: boolean;
  excelPath: string;
  reportsDir: string;
} {
  return {
    apply: argv.includes("--apply") && !argv.includes("--dry-run"),
    excelPath: path.resolve(getArgValue(argv, "--excel") || DEFAULT_MAED_EXCEL),
    reportsDir: path.resolve(
      getArgValue(argv, "--reports-dir") ||
        path.join(__dirname, "..", "..", "relatorios"),
    ),
  };
}

function lerMaed(excelPath: string): MaedEmpresa[] {
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Planilha MAED nao encontrada: ${excelPath}`);
  }
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });
  const empresas: MaedEmpresa[] = [];
  for (let i = 2; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const codigo = row[0] == null ? "" : String(row[0]).trim();
    const nome = row[1] == null ? "" : String(row[1]).trim();
    const documento = row[2] == null ? "" : String(row[2]).trim();
    if (!codigo && !nome && !documento) continue;
    empresas.push({
      codigoPlanilha: codigo,
      nomePlanilha: nome,
      documento,
      documentoDigits: digitsOnly(documento),
    });
  }
  return empresas;
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
      `Departamento Pessoal nao resolvido (${matches.length}). Abortando para nao afetar outros setores.`,
    );
  }
  return { id: matches[0]._id, name: matches[0].name };
}

function asPlanilha(empresa: MaedEmpresa): PlanilhaEmpresa {
  return {
    origemArquivo: "MAED sem movimento",
    codigoPlanilha: empresa.codigoPlanilha,
    nomePlanilha: empresa.nomePlanilha,
    documento: empresa.documento,
    documentoDigits: empresa.documentoDigits,
    responsavelPlanilha: "",
    grupoBruto: "",
  };
}

function writeReports(
  reportsDir: string,
  prefix: string,
  payload: {
    generatedAt: string;
    mode: "dry-run" | "apply";
    sourceExcel: string;
    department: { id: string; name: string };
    maedTotal: number;
    maedUnresolved: Array<{
      codigo: string;
      empresa: string;
      documento: string;
      status: string;
      detalhe: string;
    }>;
    maedRemovals: MaedRemoval[];
    grupo2: Grupo2Row[];
  },
): { excelPath: string; jsonPath: string } {
  const maedSheet = payload.maedRemovals.map((row) => ({
    Código: row.codigo,
    Empresa: row.empresa,
    CNPJ: row.cnpj,
    Tarefa: row.taskName,
    "ID vínculo": row.linkId,
    Status: row.applyStatus ?? "",
    Detalhe: row.applyDetail ?? "",
  }));
  const g2Sheet = payload.grupo2.map((row) => ({
    Código: row.codigo,
    Empresa: row.empresa,
    CNPJ: row.cnpj,
    Tarefas: row.tarefas.join(" | "),
    "DELETE ago HTTP": row.eraseAugStatus ?? "",
    "DELETE set HTTP": row.eraseSepStatus ?? "",
    "POST set HTTP": row.generateSepStatus ?? "",
    Resultado: row.result ?? "",
    Detalhe: row.detalhe ?? "",
  }));
  const resumo = [
    { Item: "MAED na planilha", Qtd: payload.maedTotal },
    { Item: "MAED nao resolvidas", Qtd: payload.maedUnresolved.length },
    { Item: "Vínculos Folha a remover (MAED)", Qtd: payload.maedRemovals.length },
    {
      Item: "Empresas MAED com Folha",
      Qtd: new Set(payload.maedRemovals.map((item) => item.customerId)).size,
    },
    { Item: "Grupo 2 para set/2026", Qtd: payload.grupo2.length },
    {
      Item: "Grupo 2 sucesso",
      Qtd: payload.grupo2.filter((item) => item.result === "success").length,
    },
    {
      Item: "Grupo 2 falha",
      Qtd: payload.grupo2.filter((item) => item.result === "failure").length,
    },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      maedSheet.length > 0
        ? maedSheet
        : emptySheet(["Código", "Empresa", "Tarefa"]),
    ),
    "Remover Folha MAED",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      payload.maedUnresolved.length > 0
        ? payload.maedUnresolved
        : emptySheet(["codigo", "empresa", "status"]),
    ),
    "MAED nao resolvidas",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      g2Sheet.length > 0 ? g2Sheet : emptySheet(["Código", "Empresa"]),
    ),
    "Grupo 2 set-2026",
  );
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(resumo), "Resumo");
  const excelPath = path.join(reportsDir, `${prefix}.xlsx`);
  const jsonPath = path.join(reportsDir, `${prefix}.json`);
  XLSX.writeFile(workbook, excelPath);
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");
  return { excelPath, jsonPath };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.reportsDir, { recursive: true });
  const mode = args.apply ? "apply" : "dry-run";
  console.log(`[maed-g2] modo=${mode}`);
  console.log(`[maed-g2] planilha=${args.excelPath}`);

  const maed = lerMaed(args.excelPath);
  console.log(`[maed-g2] empresas MAED=${maed.length}`);

  const client = createGesttaClient(getJwt());
  const department = await resolverDepartamentoPessoal(client);
  console.log(`[maed-g2] Pessoal=${department.id}`);

  const ativos = await listarClientes(client, true);
  const inativos = await listarClientes(client, false);
  const indexes = indexarClientes([...ativos, ...inativos]);

  const allTasks = await listarTarefasRecorrentes(client);
  const tasks: Partial<Record<TargetTaskName, GesttaTask>> = {};
  for (const name of REQUIRED_TASK_NAMES) {
    tasks[name] = findUniqueTaskByName(allTasks, name);
  }
  for (const name of TARGET_NAMES) {
    if (tasks[name]) continue;
    const found = findTaskByNameOptional(allTasks, name);
    if (found) tasks[name] = found;
  }
  const currentLinks = await snapshotLinks(client, tasks, indexes);

  const maedCustomerIds = new Set<string>();
  const maedUnresolved: Array<{
    codigo: string;
    empresa: string;
    documento: string;
    status: string;
    detalhe: string;
  }> = [];
  for (const empresa of maed) {
    const resolved = resolverCliente(asPlanilha(empresa), indexes);
    if (resolved.status !== "ok") {
      maedUnresolved.push({
        codigo: empresa.codigoPlanilha,
        empresa: empresa.nomePlanilha,
        documento: empresa.documento,
        status: resolved.status,
        detalhe: resolved.detalhe,
      });
      continue;
    }
    maedCustomerIds.add(resolved.cliente._id);
  }
  console.log(
    `[maed-g2] MAED resolvidas=${maedCustomerIds.size} naoResolvidas=${maedUnresolved.length}`,
  );

  const maedRemovals: MaedRemoval[] = [];
  for (const link of currentLinks) {
    if (!maedCustomerIds.has(link.customerId)) continue;
    maedRemovals.push({
      customerId: link.customerId,
      codigo: link.customerCode,
      empresa: link.customerName,
      cnpj: link.cnpj,
      taskName: link.taskName,
      taskId: link.taskId,
      linkId: link.linkId,
      applyStatus: "planned",
    });
  }

  const grupo2Map = new Map<string, Grupo2Row>();
  for (const link of currentLinks) {
    if (link.taskName !== TASK_G2 && link.taskName !== TASK_G2_WA) continue;
    if (maedCustomerIds.has(link.customerId)) continue;
    const current = grupo2Map.get(link.customerId);
    if (current) {
      current.tarefas.push(link.taskName);
      continue;
    }
    grupo2Map.set(link.customerId, {
      customerId: link.customerId,
      codigo: link.customerCode,
      empresa: link.customerName,
      cnpj: link.cnpj,
      tarefas: [link.taskName],
      result: "planned",
      detalhe: "Apagar Pessoal ago/2026 (sem interacao) e gerar set/2026",
    });
  }
  const grupo2 = [...grupo2Map.values()].sort((a, b) =>
    a.codigo.localeCompare(b.codigo, undefined, { numeric: true }),
  );
  console.log(
    `[maed-g2] vinculos Folha MAED=${maedRemovals.length} empresas=${
      new Set(maedRemovals.map((item) => item.customerId)).size
    } grupo2=${grupo2.length}`,
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    mode: mode as "dry-run" | "apply",
    sourceExcel: args.excelPath,
    department,
    maedTotal: maed.length,
    maedUnresolved,
    maedRemovals,
    grupo2,
  };

  const backupPath = path.join(
    args.reportsDir,
    `backup_folha_maed_grupo2_setembro_${stamp()}.json`,
  );
  fs.writeFileSync(backupPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`[maed-g2] backup=${backupPath}`);

  if (args.apply) {
    const persist = () =>
      fs.writeFileSync(backupPath, JSON.stringify(payload, null, 2), "utf8");

    const linkIds = maedRemovals.map((item) => item.linkId).filter(Boolean);
    for (let i = 0; i < linkIds.length; i += 50) {
      const chunk = maedRemovals.slice(i, i + 50);
      try {
        await withRetry(`remove maed folha chunk=${i / 50 + 1}`, () =>
          removerGroupCustomers(
            client,
            chunk.map((item) => item.linkId),
          ),
        );
        for (const item of chunk) {
          item.applyStatus = "ok";
          item.applyDetail = "vinculo Folha removido";
        }
        console.log(
          `[MAED REMOVE] ${i + 1}-${Math.min(i + 50, linkIds.length)}/${linkIds.length}`,
        );
      } catch (error) {
        for (const item of chunk) {
          item.applyStatus = "failed";
          item.applyDetail = axiosErrorDetail(error);
        }
        console.error(`[MAED REMOVE] chunk falhou: ${axiosErrorDetail(error)}`);
      }
      persist();
      await sleep(200);
    }

    for (const [index, empresa] of grupo2.entries()) {
      const progress = `${index + 1}/${grupo2.length}`;
      const competenceBase = {
        company_department: department.id,
        force_erase_interaction: false,
      };
      try {
        const eraseAug = await apagarGeracaoCliente(client, empresa.customerId, {
          ...AUG,
          ...competenceBase,
        });
        empresa.eraseAugOk = eraseAug.ok;
        empresa.eraseAugStatus = eraseAug.status;
        const eraseSep = await apagarGeracaoCliente(client, empresa.customerId, {
          ...SEP,
          ...competenceBase,
        });
        empresa.eraseSepOk = eraseSep.ok;
        empresa.eraseSepStatus = eraseSep.status;
        const generateSep = await gerarTarefasCliente(client, empresa.customerId, {
          ...SEP,
          company_department: department.id,
        });
        empresa.generateSepOk = generateSep.ok;
        empresa.generateSepStatus = generateSep.status;
        const generateOk = generateSep.ok;
        const eraseAugOk = eraseAug.ok || eraseAug.status === 404;
        empresa.result = generateOk && eraseAugOk ? "success" : "failure";
        empresa.detalhe = generateOk
          ? "Pessoal ago removido (sem interacao); set/2026 gerado"
          : `ago HTTP ${eraseAug.status}; set erase HTTP ${eraseSep.status}; set gen HTTP ${generateSep.status}`;
        console.log(
          `[G2 ${progress}] ${empresa.codigo} ${empresa.result} ago=${eraseAug.status} setDel=${eraseSep.status} setGen=${generateSep.status}`,
        );
      } catch (error) {
        empresa.result = "failure";
        empresa.detalhe = axiosErrorDetail(error);
        console.error(`[G2 ${progress}] ${empresa.codigo} FALHOU: ${empresa.detalhe}`);
      }
      persist();
      await sleep(200);
    }
  }

  const dateStamp = new Date().toISOString().slice(0, 10);
  const prefix = args.apply
    ? `execucao_folha_maed_grupo2_setembro_${dateStamp}`
    : `planejado_folha_maed_grupo2_setembro_${dateStamp}`;
  const { excelPath, jsonPath } = writeReports(args.reportsDir, prefix, payload);
  console.log(`[maed-g2] Excel: ${excelPath}`);
  console.log(`[maed-g2] JSON: ${jsonPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
