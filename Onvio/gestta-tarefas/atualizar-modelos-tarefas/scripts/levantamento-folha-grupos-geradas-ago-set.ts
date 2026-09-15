/**
 * Levantamento somente leitura: empresas com instâncias geradas de
 * FOLHA DE PAGAMENTO GERAL GRUPO 1 e GRUPO 2 na janela ago/set 2026.
 *
 *   npx ts-node scripts/levantamento-folha-grupos-geradas-ago-set.ts
 *   npx ts-node scripts/levantamento-folha-grupos-geradas-ago-set.ts --dir "C:\\path\\Particularidades"
 */
import fs from "fs";
import path from "path";
import { AxiosInstance } from "axios";
import * as XLSX from "xlsx";
import { getJwt } from "../src/auth";
import { createGesttaClient } from "../src/client";
import {
  buscarTarefasGeradasCliente,
  GeneratedCustomerTask,
  listarTarefasRecorrentes,
} from "../src/endpoints";
import {
  ClienteGestta,
  DEFAULT_PARTICULARIDADES_DIR,
  FolhaGrupo,
  LinkAtual,
  PlanilhaEmpresa,
  REQUIRED_TASK_NAMES,
  TARGET_NAMES,
  TargetTaskName,
  axiosErrorDetail,
  emptySheet,
  findTaskByNameOptional,
  findUniqueTaskByName,
  getArgValue,
  grupoOfTaskName,
  indexarClientes,
  lerParticularidades,
  listarClientes,
  oppositeGrupo,
  resolverCliente,
  snapshotLinks,
  withRetry,
} from "./lib/folha-grupo-particularidades";

const COMPETENCES = ["2026-08", "2026-09"] as const;
type CompetenceKey = (typeof COMPETENCES)[number];

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Aberta",
  IMPEDIMENT: "Impedimento",
  DONE: "Concluída",
  DISCONSIDERED: "Desconsiderada",
  IGNORED: "Ignorada",
  DELAYED: "Atrasada",
  REVIEW: "Revisão",
};

interface Args {
  dirPath: string;
  reportsDir: string;
  concurrency: number;
}

interface PlanilhaMatch {
  origemArquivo: string;
  codigoPlanilha: string;
  nomePlanilha: string;
  documento: string;
  grupoPlanilha?: FolhaGrupo;
  grupoBruto: string;
  responsavelPlanilha: string;
}

interface InstanciaFolha {
  taskId: string;
  name: string;
  grupo: FolhaGrupo;
  viaWhatsapp: boolean;
  status: string;
  competence: CompetenceKey;
  competenceDate: string;
  legalDate: string;
  dueDate: string;
  closeDate: string;
  responsible: string;
}

interface EmpresaConsulta {
  customerId: string;
  codigoGestta: string;
  nomeGestta: string;
  cnpj: string;
  ativoGestta?: boolean;
  vinculos: string[];
  gruposVinculo: FolhaGrupo[];
  planilha?: PlanilhaMatch;
  instancias: InstanciaFolha[];
  erro?: string;
}

interface ConflitoEmpresa {
  customerId: string;
  codigoGestta: string;
  nomeGestta: string;
  cnpj: string;
  ativoGestta?: boolean;
  origemArquivo: string;
  codigoPlanilha: string;
  nomePlanilha: string;
  grupoPlanilha: string;
  vinculosAtuais: string;
  gruposVinculo: string;
  grupoExtra: string;
  temG1Ago: boolean;
  temG2Ago: boolean;
  temG1Set: boolean;
  temG2Set: boolean;
  conflitoAgosto: boolean;
  conflitoSetembro: boolean;
  conflitoJanela: boolean;
  statusG1Ago: string;
  statusG2Ago: string;
  statusG1Set: string;
  statusG2Set: string;
  responsavelPlanilha: string;
  responsavelGestta: string;
  instancias: InstanciaFolha[];
}

function parseArgs(argv: string[]): Args {
  const concurrencyRaw = getArgValue(argv, "--concurrency");
  const concurrency = concurrencyRaw ? Number(concurrencyRaw) : 6;
  return {
    dirPath: path.resolve(
      getArgValue(argv, "--dir") || DEFAULT_PARTICULARIDADES_DIR,
    ),
    reportsDir: path.resolve(
      getArgValue(argv, "--reports-dir") ||
        path.join(__dirname, "..", "..", "relatorios"),
    ),
    concurrency:
      Number.isFinite(concurrency) && concurrency >= 1
        ? Math.min(Math.floor(concurrency), 12)
        : 6,
  };
}

function competenceOf(value: unknown): string | undefined {
  if (!value) return undefined;
  const raw = String(value);
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    if (year && month) return `${year}-${month}`;
  }
  const match = /^(\d{4})-(\d{2})/.exec(raw);
  return match ? `${match[1]}-${match[2]}` : undefined;
}

function formatDate(value: unknown): string {
  if (!value) return "";
  const raw = String(value);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${day}/${month}/${year}` : raw;
}

function statusLabel(status: string): string {
  const key = String(status || "").toUpperCase();
  return STATUS_LABEL[key] || status || "";
}

function nameOfUnknown(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "name" in value) {
    const name = (value as { name?: unknown }).name;
    return name == null ? "" : String(name);
  }
  return "";
}

function isCompetence(value: string | undefined): value is CompetenceKey {
  return value === "2026-08" || value === "2026-09";
}

function toInstancia(task: GeneratedCustomerTask): InstanciaFolha | undefined {
  const name = String(task.name || "");
  const grupo = grupoOfTaskName(name);
  if (!grupo) return undefined;
  const competence = competenceOf(task.competence_date);
  if (!isCompetence(competence)) return undefined;
  return {
    taskId: String(task._id || ""),
    name,
    grupo,
    viaWhatsapp: /via whatsapp/i.test(name),
    status: String(task.status || ""),
    competence,
    competenceDate: formatDate(task.competence_date),
    legalDate: formatDate(task.legal_date),
    dueDate: formatDate(task.due_date),
    closeDate: formatDate(task.close_date),
    responsible: nameOfUnknown(task.company_user),
  };
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

function vinculosPorCliente(links: LinkAtual[]): Map<string, LinkAtual[]> {
  const map = new Map<string, LinkAtual[]>();
  for (const link of links) {
    const list = map.get(link.customerId) ?? [];
    list.push(link);
    map.set(link.customerId, list);
  }
  return map;
}

function mapearPlanilha(
  empresas: PlanilhaEmpresa[],
  indexes: ReturnType<typeof indexarClientes>,
): Map<string, PlanilhaMatch[]> {
  const map = new Map<string, PlanilhaMatch[]>();
  for (const empresa of empresas) {
    const resolved = resolverCliente(empresa, indexes);
    if (resolved.status !== "ok") continue;
    const list = map.get(resolved.cliente._id) ?? [];
    list.push({
      origemArquivo: empresa.origemArquivo,
      codigoPlanilha: empresa.codigoPlanilha,
      nomePlanilha: empresa.nomePlanilha,
      documento: empresa.documento,
      grupoPlanilha: empresa.grupoPlanilha,
      grupoBruto: empresa.grupoBruto,
      responsavelPlanilha: empresa.responsavelPlanilha,
    });
    map.set(resolved.cliente._id, list);
  }
  return map;
}

function escolherPlanilha(rows: PlanilhaMatch[] | undefined): PlanilhaMatch | undefined {
  if (!rows || rows.length === 0) return undefined;
  const comGrupo = rows.filter((row) => row.grupoPlanilha);
  const grupos = new Set(comGrupo.map((row) => row.grupoPlanilha));
  if (grupos.size > 1) {
    return {
      ...rows[0],
      grupoPlanilha: undefined,
      grupoBruto: `conflito: ${[...grupos].join(" + ")}`,
    };
  }
  return comGrupo[0] ?? rows[0];
}

function gruposUnicos(values: FolhaGrupo[]): FolhaGrupo[] {
  return [...new Set(values)];
}

function temGrupo(
  instancias: InstanciaFolha[],
  grupo: FolhaGrupo,
  competence?: CompetenceKey,
): boolean {
  return instancias.some(
    (item) =>
      item.grupo === grupo && (!competence || item.competence === competence),
  );
}

function statusDoGrupo(
  instancias: InstanciaFolha[],
  grupo: FolhaGrupo,
  competence: CompetenceKey,
): string {
  return instancias
    .filter((item) => item.grupo === grupo && item.competence === competence)
    .map((item) => `${statusLabel(item.status)}${item.viaWhatsapp ? " (WA)" : ""}`)
    .join(" | ");
}

function grupoExtra(
  grupoPlanilha: FolhaGrupo | undefined,
  gruposVinculo: FolhaGrupo[],
): string {
  if (grupoPlanilha) return oppositeGrupo(grupoPlanilha);
  const unicos = gruposUnicos(gruposVinculo);
  if (unicos.length === 1) return oppositeGrupo(unicos[0]);
  return "revisar";
}

function simNao(value: boolean): string {
  return value ? "sim" : "não";
}

function montarConflito(empresa: EmpresaConsulta): ConflitoEmpresa | undefined {
  const instancias = empresa.instancias;
  if (instancias.length === 0) return undefined;
  const temG1 = temGrupo(instancias, "GRUPO 1");
  const temG2 = temGrupo(instancias, "GRUPO 2");
  if (!temG1 || !temG2) return undefined;

  const temG1Ago = temGrupo(instancias, "GRUPO 1", "2026-08");
  const temG2Ago = temGrupo(instancias, "GRUPO 2", "2026-08");
  const temG1Set = temGrupo(instancias, "GRUPO 1", "2026-09");
  const temG2Set = temGrupo(instancias, "GRUPO 2", "2026-09");
  const planilha = empresa.planilha;
  const gruposVinculo = gruposUnicos(empresa.gruposVinculo);

  return {
    customerId: empresa.customerId,
    codigoGestta: empresa.codigoGestta,
    nomeGestta: empresa.nomeGestta,
    cnpj: empresa.cnpj,
    ativoGestta: empresa.ativoGestta,
    origemArquivo: planilha?.origemArquivo ?? "",
    codigoPlanilha: planilha?.codigoPlanilha ?? "",
    nomePlanilha: planilha?.nomePlanilha ?? "",
    grupoPlanilha: planilha?.grupoPlanilha ?? planilha?.grupoBruto ?? "",
    vinculosAtuais: empresa.vinculos.join(" | "),
    gruposVinculo: gruposVinculo.join("+") || "",
    grupoExtra: grupoExtra(planilha?.grupoPlanilha, gruposVinculo),
    temG1Ago,
    temG2Ago,
    temG1Set,
    temG2Set,
    conflitoAgosto: temG1Ago && temG2Ago,
    conflitoSetembro: temG1Set && temG2Set,
    conflitoJanela: true,
    statusG1Ago: statusDoGrupo(instancias, "GRUPO 1", "2026-08"),
    statusG2Ago: statusDoGrupo(instancias, "GRUPO 2", "2026-08"),
    statusG1Set: statusDoGrupo(instancias, "GRUPO 1", "2026-09"),
    statusG2Set: statusDoGrupo(instancias, "GRUPO 2", "2026-09"),
    responsavelPlanilha: planilha?.responsavelPlanilha ?? "",
    responsavelGestta:
      instancias.map((item) => item.responsible).find(Boolean) ?? "",
    instancias,
  };
}

async function consultarEmpresa(
  client: AxiosInstance,
  customerId: string,
  cliente: ClienteGestta | undefined,
  links: LinkAtual[],
  planilha: PlanilhaMatch | undefined,
): Promise<EmpresaConsulta> {
  const primeiro = links[0];
  const consulta: EmpresaConsulta = {
    customerId,
    codigoGestta: primeiro?.customerCode || (cliente?.code != null ? String(cliente.code) : ""),
    nomeGestta: primeiro?.customerName || cliente?.name || customerId,
    cnpj: primeiro?.cnpj || cliente?.cnpj || "",
    ativoGestta: cliente?.active,
    vinculos: [...new Set(links.map((link) => link.taskName))],
    gruposVinculo: gruposUnicos(links.map((link) => link.grupo)),
    planilha,
    instancias: [],
  };
  try {
    const geradas = await withRetry(
      `search ${consulta.codigoGestta || customerId}`,
      () => buscarTarefasGeradasCliente(client, customerId),
    );
    consulta.instancias = geradas
      .map(toInstancia)
      .filter((item): item is InstanciaFolha => Boolean(item));
  } catch (error) {
    consulta.erro = axiosErrorDetail(error);
  }
  return consulta;
}

function writeWorkbook(
  filePath: string,
  resumo: Record<string, string | number>[],
  conflitos: ConflitoEmpresa[],
  tarefas: Record<string, string>[],
): void {
  const conflitosSheet = conflitos.map((row) => ({
    "Código Gestta": row.codigoGestta,
    Empresa: row.nomeGestta,
    CNPJ: row.cnpj,
    "Ativo Gestta":
      row.ativoGestta == null ? "" : row.ativoGestta ? "sim" : "não",
    "Código planilha": row.codigoPlanilha,
    "Nome planilha": row.nomePlanilha,
    Arquivo: row.origemArquivo,
    "Grupo planilha": row.grupoPlanilha,
    "Vínculos atuais": row.vinculosAtuais,
    "Grupo vínculo": row.gruposVinculo,
    "Grupo extra (revisar)": row.grupoExtra,
    "G1 ago": simNao(row.temG1Ago),
    "G2 ago": simNao(row.temG2Ago),
    "G1 set": simNao(row.temG1Set),
    "G2 set": simNao(row.temG2Set),
    "Conflito agosto": simNao(row.conflitoAgosto),
    "Conflito setembro": simNao(row.conflitoSetembro),
    "Status G1 ago": row.statusG1Ago,
    "Status G2 ago": row.statusG2Ago,
    "Status G1 set": row.statusG1Set,
    "Status G2 set": row.statusG2Set,
    "Responsável planilha": row.responsavelPlanilha,
    "Responsável tarefa": row.responsavelGestta,
    "Customer ID": row.customerId,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(resumo), "Resumo");
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      conflitosSheet.length > 0
        ? conflitosSheet
        : emptySheet(["Código Gestta", "Empresa", "Grupo planilha"]),
    ),
    "Conflitos",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      tarefas.length > 0
        ? tarefas
        : emptySheet(["Código Gestta", "Empresa", "Tarefa", "Competência"]),
    ),
    "Tarefas",
  );
  XLSX.writeFile(workbook, filePath);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.reportsDir, { recursive: true });

  let empresasPlanilha: PlanilhaEmpresa[] = [];
  let avisos: string[] = [];
  let arquivos: string[] = [];
  if (fs.existsSync(args.dirPath)) {
    const parsed = lerParticularidades(args.dirPath);
    empresasPlanilha = parsed.empresas;
    avisos = parsed.avisos;
    arquivos = parsed.arquivos;
    for (const aviso of avisos) console.warn(`[folha-geradas] aviso: ${aviso}`);
    console.log(
      `[folha-geradas] particularidades=${args.dirPath} arquivos=${arquivos.length} empresas=${empresasPlanilha.length}`,
    );
  } else {
    console.warn(
      `[folha-geradas] pasta de particularidades ausente: ${args.dirPath}`,
    );
  }

  const client = createGesttaClient(getJwt());
  console.log("[folha-geradas] carregando clientes...");
  const ativos = await listarClientes(client, true);
  const inativos = await listarClientes(client, false);
  const indexes = indexarClientes([...ativos, ...inativos]);

  console.log("[folha-geradas] carregando modelos recorrentes...");
  const allTasks = await listarTarefasRecorrentes(client);
  const tasks: Partial<Record<TargetTaskName, ReturnType<typeof findUniqueTaskByName>>> =
    {};
  for (const name of REQUIRED_TASK_NAMES) {
    tasks[name] = findUniqueTaskByName(allTasks, name);
    console.log(`[folha-geradas] ${name} = ${tasks[name]!._id}`);
  }
  for (const name of TARGET_NAMES) {
    if (tasks[name]) continue;
    const found = findTaskByNameOptional(allTasks, name);
    if (found) {
      tasks[name] = found;
      console.log(`[folha-geradas] ${name} = ${found._id}`);
    } else {
      console.warn(`[folha-geradas] modelo opcional ausente: ${name}`);
    }
  }

  const currentLinks = await snapshotLinks(client, tasks, indexes);
  const linksByCustomer = vinculosPorCliente(currentLinks);
  const planilhaByCustomer = mapearPlanilha(empresasPlanilha, indexes);

  const customerIds = new Set<string>([
    ...linksByCustomer.keys(),
    ...planilhaByCustomer.keys(),
  ]);
  const orderedIds = [...customerIds].sort((a, b) => {
    const left = linksByCustomer.get(a)?.[0]?.customerCode || indexes.byId.get(a)?.code || a;
    const right = linksByCustomer.get(b)?.[0]?.customerCode || indexes.byId.get(b)?.code || b;
    return String(left).localeCompare(String(right), undefined, { numeric: true });
  });

  console.log(
    `[folha-geradas] candidatos=${orderedIds.length} vinculos=${currentLinks.length} concorrencia=${args.concurrency}`,
  );

  let done = 0;
  const consultas = await mapPool(
    orderedIds,
    args.concurrency,
    async (customerId) => {
      const result = await consultarEmpresa(
        client,
        customerId,
        indexes.byId.get(customerId),
        linksByCustomer.get(customerId) ?? [],
        escolherPlanilha(planilhaByCustomer.get(customerId)),
      );
      done += 1;
      if (done % 25 === 0 || done === orderedIds.length) {
        console.log(`[folha-geradas] consultadas ${done}/${orderedIds.length}`);
      }
      return result;
    },
  );

  const conflitos = consultas
    .map(montarConflito)
    .filter((item): item is ConflitoEmpresa => Boolean(item))
    .sort(
      (a, b) =>
        a.codigoGestta.localeCompare(b.codigoGestta, undefined, { numeric: true }) ||
        a.nomeGestta.localeCompare(b.nomeGestta, "pt-BR"),
    );

  const tarefas = conflitos.flatMap((empresa) =>
    empresa.instancias
      .slice()
      .sort(
        (a, b) =>
          a.competence.localeCompare(b.competence) ||
          a.grupo.localeCompare(b.grupo) ||
          a.name.localeCompare(b.name, "pt-BR"),
      )
      .map((task) => ({
        "Código Gestta": empresa.codigoGestta,
        Empresa: empresa.nomeGestta,
        CNPJ: empresa.cnpj,
        "Grupo planilha": empresa.grupoPlanilha,
        "Grupo extra (revisar)": empresa.grupoExtra,
        Competência: task.competence === "2026-08" ? "Agosto/2026" : "Setembro/2026",
        Grupo: task.grupo,
        Tarefa: task.name,
        Status: statusLabel(task.status),
        "Via WhatsApp": task.viaWhatsapp ? "sim" : "não",
        "Data competência": task.competenceDate,
        Meta: task.dueDate || task.closeDate,
        "Data legal": task.legalDate,
        Responsável: task.responsible,
        "Task ID": task.taskId,
        "Customer ID": empresa.customerId,
      })),
  );

  const erros = consultas.filter((item) => item.erro);
  const resumo = [
    { Item: "Empresas consultadas", Qtd: consultas.length },
    { Item: "Empresas com Folha G1 e G2 na janela ago/set 2026", Qtd: conflitos.length },
    {
      Item: "Conflito no mesmo mês (agosto)",
      Qtd: conflitos.filter((item) => item.conflitoAgosto).length,
    },
    {
      Item: "Conflito no mesmo mês (setembro)",
      Qtd: conflitos.filter((item) => item.conflitoSetembro).length,
    },
    {
      Item: "Conflito só na janela (meses diferentes)",
      Qtd: conflitos.filter((item) => !item.conflitoAgosto && !item.conflitoSetembro).length,
    },
    {
      Item: "Com grupo na planilha",
      Qtd: conflitos.filter((item) => item.grupoPlanilha === "GRUPO 1" || item.grupoPlanilha === "GRUPO 2").length,
    },
    {
      Item: "Grupo extra = GRUPO 1",
      Qtd: conflitos.filter((item) => item.grupoExtra === "GRUPO 1").length,
    },
    {
      Item: "Grupo extra = GRUPO 2",
      Qtd: conflitos.filter((item) => item.grupoExtra === "GRUPO 2").length,
    },
    { Item: "Falhas de consulta", Qtd: erros.length },
  ];

  const dateStamp = new Date().toISOString().slice(0, 10);
  const baseName = `levantamento_folha_grupos_geradas_ago_set_${dateStamp}`;
  const excelOut = path.join(args.reportsDir, `${baseName}.xlsx`);
  const jsonOut = path.join(args.reportsDir, `${baseName}.json`);
  writeWorkbook(excelOut, resumo, conflitos, tarefas);
  fs.writeFileSync(
    jsonOut,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourceDir: args.dirPath,
        arquivos,
        avisos,
        competences: COMPETENCES,
        criterio:
          "Empresa com pelo menos uma instância Folha Grupo 1 e uma Folha Grupo 2 em agosto e/ou setembro/2026 (qualquer status, inclusive Desconsiderada).",
        totalConsultadas: consultas.length,
        totalConflitos: conflitos.length,
        resumo,
        falhas: erros.map((item) => ({
          customerId: item.customerId,
          codigoGestta: item.codigoGestta,
          nomeGestta: item.nomeGestta,
          erro: item.erro,
        })),
        conflitos,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`[folha-geradas] Excel: ${excelOut}`);
  console.log(`[folha-geradas] JSON: ${jsonOut}`);
  console.log(
    `[folha-geradas] conflitos=${conflitos.length} agosto=${
      conflitos.filter((item) => item.conflitoAgosto).length
    } setembro=${
      conflitos.filter((item) => item.conflitoSetembro).length
    } falhas=${erros.length}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
