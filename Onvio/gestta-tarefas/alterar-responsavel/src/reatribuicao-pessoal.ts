/**
 * Reatribuicao segura das tarefas existentes do setor Pessoal.
 *
 * A fonte recebida e propositalmente simples (codigo, razao social e responsavel).
 * Este modulo resolve os IDs atuais no Gestta, cria uma previa imutavel e somente
 * aceita aplicar/voltar alteracoes a partir desse snapshot.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import type { AxiosInstance } from "axios";
import { createGesttaClient, isGesttaAuthFatalError } from "./api/client";
import {
  getGroupCustomerItems,
  listarClientes,
  listarFuncionarios,
  listarModelosTarefa,
  listarTarefasGeradasAbertas,
  obterModeloTarefa,
  obterTarefaGerada,
  patchResponsavel,
  removerResponsavel,
  transferirTarefaGerada,
  type CompanyTaskItem,
  type ModeloTarefaGestta,
  type TarefaGeradaGestta,
} from "./api/endpoints";
import { resolveGesttaRuntimeAuth } from "./auth/runtime-auth";
import { loadRuntimeEnv, preflightGesttaAuth } from "./automation";
import type { ClienteGestta, UsuarioGestta } from "./types";

const TIPO = "reatribuicao-pessoal-v1";
const MODELO_NORMAL_ID = "6a7e38a6690fac807b46646f";
const SETOR = "Pessoal";
const COMPETENCIA = { year: 2026, month: 8 };
const REPORTS_ENV = "GESTTA_RELATORIOS_DIR";

export interface FontePessoal {
  linha: number;
  codigo: string;
  empresa: string;
  responsavel: string;
}

export interface PendenciaPessoal {
  codigo?: string;
  empresa?: string;
  responsavel?: string;
  categoria: string;
  mensagem: string;
}

interface VinculoPlanejado {
  codigo: string;
  empresa: string;
  cnpj: string;
  customerId: string;
  groupCustomerId: string;
  tarefaId?: string;
  tarefa: string;
  setor: string;
  escopos: string[];
  responsavelAtualId?: string;
  responsavelAtual?: string;
  responsavelPlanejadoId: string;
  responsavelPlanejado: string;
  status: "alteracao_planejada" | "sem_alteracao";
}

interface InstanciaPlanejada {
  codigo: string;
  empresa: string;
  cnpj: string;
  customerId: string;
  customerTaskId: string;
  modeloId: string;
  modelo: "normal" | "whatsapp";
  tarefa: string;
  competencia: string;
  statusAtual: string;
  responsavelAtualId?: string;
  responsavelAtual?: string;
  responsavelPlanejadoId: string;
  responsavelPlanejado: string;
  status: "alteracao_planejada" | "sem_alteracao" | "pendencia_sem_rollback";
}

export interface PreviaPessoal {
  tipo: typeof TIPO;
  execucao: {
    inicio: string;
    fim: string;
    planilhaFonte: string;
    modeloNormalId: string;
    modeloNormal: string;
    modeloWhatsappId: string;
    modeloWhatsapp: string;
    competencia: string;
    totalFonte: number;
    empresasAptas: number;
    alteracoesVinculo: number;
    alteracoesInstancia: number;
    pendencias: number;
  };
  empresas: Array<{
    codigo: string;
    empresa: string;
    cnpj: string;
    customerId: string;
    responsavel: string;
    responsavelId: string;
  }>;
  vinculos: VinculoPlanejado[];
  instancias: InstanciaPlanejada[];
  pendencias: PendenciaPessoal[];
}

interface ResultadoAplicacao {
  tipo: "vinculo" | "instancia";
  id: string;
  customerId: string;
  codigo: string;
  tarefa: string;
  aplicado: boolean;
  mensagem: string;
  responsavelAnteriorId?: string;
  responsavelAplicadoId: string;
}

interface ExecucaoPessoal {
  tipo: "execucao-reatribuicao-pessoal-v1";
  execucao: {
    inicio: string;
    fim: string;
    previaOrigem: string;
    total: number;
    sucesso: number;
    falha: number;
  };
  previa: PreviaPessoal["execucao"];
  resultados: ResultadoAplicacao[];
}

export function normalizarTexto(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

function texto(value: unknown): string {
  return String(value ?? "").trim();
}

function digitos(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function valorPorCabecalho(row: unknown[], headers: unknown[], names: string[]): string {
  const wanted = new Set(names.map(normalizarTexto));
  const index = headers.findIndex((header) => wanted.has(normalizarTexto(header)));
  return index >= 0 ? texto(row[index]) : "";
}

/** Le a primeira aba sem exigir MES GERACAO, CNPJ ou SETOR. */
export function lerFontePessoal(filePath: string): FontePessoal[] {
  const workbook = XLSX.readFile(filePath, { type: "file" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("A planilha nao possui aba de dados.");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  const headers = rows[0] ?? [];
  const fonte: FontePessoal[] = [];
  for (let index = 1; index < rows.length; index++) {
    const row = rows[index] ?? [];
    const codigo = valorPorCabecalho(row, headers, ["COD.", "COD", "CODIGO", "CÓD."]);
    const empresa = valorPorCabecalho(row, headers, ["RAZAO SOCIAL", "RAZÃO SOCIAL", "EMPRESA"]);
    const responsavel = valorPorCabecalho(row, headers, ["RESPONSAVEL INTERNO PELO CLIENTE", "RESPONSÁVEL INTERNO PELO CLIENTE", "RESPONSAVEL", "RESPONSÁVEL"]);
    if (!codigo && !empresa && !responsavel) continue;
    if (!codigo || !empresa || !responsavel) {
      throw new Error(`Linha ${index + 1}: COD., RAZAO SOCIAL e RESPONSAVEL sao obrigatorios.`);
    }
    fonte.push({ linha: index + 1, codigo, empresa, responsavel });
  }
  return fonte;
}

/** Mantem somente codigos sem divergencia de responsavel. */
export function deduplicarFontePessoal(fonte: FontePessoal[]): { validas: FontePessoal[]; pendencias: PendenciaPessoal[] } {
  const porCodigo = new Map<string, FontePessoal[]>();
  for (const item of fonte) {
    const atuais = porCodigo.get(item.codigo) ?? [];
    atuais.push(item);
    porCodigo.set(item.codigo, atuais);
  }
  const validas: FontePessoal[] = [];
  const pendencias: PendenciaPessoal[] = [];
  for (const [codigo, itens] of porCodigo) {
    const owners = new Set(itens.map((item) => normalizarTexto(item.responsavel)));
    if (owners.size > 1) {
      pendencias.push({
        codigo,
        empresa: itens.map((item) => item.empresa).join(" | "),
        categoria: "responsabilidade_conflitante",
        mensagem: `Codigo repetido nas linhas ${itens.map((item) => item.linha).join(", ")} com responsaveis: ${[...new Set(itens.map((item) => item.responsavel))].join(" | ")}.`,
      });
      continue;
    }
    validas.push(itens[0]);
  }
  return { validas, pendencias };
}

function nomeEmpresaSemObservacao(value: string): string {
  return normalizarTexto(value.replace(/\s*\([^)]*\)\s*$/u, ""));
}

function similaridadeNomes(left: string, right: string): number {
  const a = nomeEmpresaSemObservacao(left);
  const b = nomeEmpresaSemObservacao(right);
  if (!a || !b) return 0;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return 1 - previous[b.length] / Math.max(a.length, b.length);
}

export function resolverClientePessoal(
  row: Pick<FontePessoal, "codigo" | "empresa">,
  clientes: ClienteGestta[]
): ClienteGestta | null {
  const porCodigo = clientes.filter((item) => texto(item.code) === row.codigo);
  if (porCodigo.length === 1) return porCodigo[0];
  if (porCodigo.length > 1) {
    const exatos = porCodigo.filter((item) => normalizarTexto(item.name) === normalizarTexto(row.empresa));
    if (exatos.length === 1) return exatos[0];
    const semObservacao = porCodigo.filter((item) => nomeEmpresaSemObservacao(item.name) === nomeEmpresaSemObservacao(row.empresa));
    if (semObservacao.length === 1) return semObservacao[0];
    const ordenados = porCodigo.map((item) => ({ item, score: similaridadeNomes(item.name, row.empresa) }))
      .sort((a, b) => b.score - a.score);
    if (ordenados[0].score >= 0.9 && ordenados[0].score - (ordenados[1]?.score ?? 0) >= 0.15) {
      return ordenados[0].item;
    }
    return null;
  }
  const porNome = clientes.filter((item) => normalizarTexto(item.name) === normalizarTexto(row.empresa));
  return porNome.length === 1 ? porNome[0] : null;
}

function resolverUsuario(users: UsuarioGestta[], name: string): UsuarioGestta | null {
  const source = normalizarTexto(name);
  const exatos = users.filter((user) => normalizarTexto(user.name) === source);
  if (exatos.length === 1) return exatos[0];
  if (exatos.length > 1) return null;
  const prefixos = users.filter((user) => normalizarTexto(user.name).startsWith(`${source} `));
  return prefixos.length === 1 ? prefixos[0] : null;
}

function userId(value: CompanyTaskItem["company_user"] | TarefaGeradaGestta["company_user"]): string | undefined {
  if (typeof value === "string") return value;
  return value && typeof value === "object" ? value._id : undefined;
}

function userName(value: CompanyTaskItem["company_user"] | TarefaGeradaGestta["company_user"]): string | undefined {
  return value && typeof value === "object" ? value.name : undefined;
}

function generatedOwner(task: TarefaGeradaGestta): TarefaGeradaGestta["company_user"] {
  return task.company_user ?? task.owner;
}

function taskId(value: CompanyTaskItem["company_task"] | TarefaGeradaGestta["company_task"]): string | undefined {
  if (typeof value === "string") return value;
  return value && typeof value === "object" ? value._id : undefined;
}

function taskName(value: CompanyTaskItem["company_task"] | TarefaGeradaGestta["company_task"]): string {
  return value && typeof value === "object" ? texto(value.name) : "";
}

function departmentName(item: CompanyTaskItem): string {
  const task = item.company_task;
  return task && typeof task === "object" ? texto(task.company_department?.name) : "";
}

function isCompetenciaAgosto(task: TarefaGeradaGestta): boolean {
  const raw = task.competence_date;
  if (!raw) return false;
  const date = new Date(raw);
  return !Number.isNaN(date.getTime()) && date.getUTCFullYear() === COMPETENCIA.year && date.getUTCMonth() + 1 === COMPETENCIA.month;
}

export function filtrarInstanciasAgostoOpen(
  tasks: TarefaGeradaGestta[],
  normalId: string,
  whatsappId: string,
  normalName?: string,
  whatsappName?: string
): TarefaGeradaGestta[] {
  return tasks.filter((task) =>
    task.status === "OPEN" &&
    isCompetenciaAgosto(task) &&
    identificarModeloInstancia(task, normalId, whatsappId, normalName, whatsappName) !== null
  );
}

function identificarModeloInstancia(
  task: TarefaGeradaGestta,
  normalId: string,
  whatsappId: string,
  normalName?: string,
  whatsappName?: string
): "normal" | "whatsapp" | null {
  const id = taskId(task.company_task);
  if (id === normalId) return "normal";
  if (id === whatsappId) return "whatsapp";
  const name = normalizarTexto(task.name || taskName(task.company_task));
  if (normalName && name === normalizarTexto(normalName)) return "normal";
  if (whatsappName && name === normalizarTexto(whatsappName)) return "whatsapp";
  return null;
}

function getReportsDir(): string {
  const configured = process.env[REPORTS_ENV]?.trim();
  return configured ? path.resolve(configured) : path.join(process.cwd(), "relatorios");
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function saveJson(prefix: string, content: unknown): string {
  const filePath = path.join(getReportsDir(), `${prefix}_${stamp()}.json`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), "utf8");
  return filePath;
}

function saveWorkbook(previa: PreviaPessoal, jsonPath: string): string {
  const workbook = XLSX.utils.book_new();
  const add = (name: string, rows: Record<string, unknown>[]) => XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name);
  add("Resumo", [
    { Campo: "Fonte", Valor: previa.execucao.planilhaFonte },
    { Campo: "Competencia historica", Valor: previa.execucao.competencia },
    { Campo: "Empresas aptas", Valor: previa.execucao.empresasAptas },
    { Campo: "Alteracoes vinculo", Valor: previa.execucao.alteracoesVinculo },
    { Campo: "Alteracoes instancia", Valor: previa.execucao.alteracoesInstancia },
    { Campo: "Pendencias", Valor: previa.execucao.pendencias },
  ]);
  add("Planilha normalizada", previa.empresas.map((item) => ({
    "COD.": item.codigo,
    CNPJ: item.cnpj,
    EMPRESA: item.empresa,
    RESPONSAVEL: item.responsavel,
    SETOR,
  })));
  add("Empresas aptas", previa.empresas.map((item) => ({ Codigo: item.codigo, Empresa: item.empresa, CNPJ: item.cnpj, Responsavel: item.responsavel, "Customer ID": item.customerId })));
  add("Vinculos Pessoal", previa.vinculos.map((item) => ({ Codigo: item.codigo, Empresa: item.empresa, CNPJ: item.cnpj, Tarefa: item.tarefa, Setor: item.setor, Escopos: item.escopos.join(" | "), "Responsavel atual": item.responsavelAtual ?? "", "Responsavel planejado": item.responsavelPlanejado, Status: item.status, "Group customer ID": item.groupCustomerId })));
  add("Tarefa normal", previa.vinculos.filter((item) => item.escopos.includes("modelo_normal")).map((item) => ({ Codigo: item.codigo, Empresa: item.empresa, Tarefa: item.tarefa, "Responsavel atual": item.responsavelAtual ?? "", "Responsavel planejado": item.responsavelPlanejado, Status: item.status })));
  add("Tarefa WhatsApp", previa.vinculos.filter((item) => item.escopos.includes("modelo_whatsapp")).map((item) => ({ Codigo: item.codigo, Empresa: item.empresa, Tarefa: item.tarefa, "Responsavel atual": item.responsavelAtual ?? "", "Responsavel planejado": item.responsavelPlanejado, Status: item.status })));
  add("Instancias agosto OPEN", previa.instancias.map((item) => ({ Codigo: item.codigo, Empresa: item.empresa, Modelo: item.modelo, Tarefa: item.tarefa, Competencia: item.competencia, "Responsavel atual": item.responsavelAtual ?? "", "Responsavel planejado": item.responsavelPlanejado, Status: item.status, "Customer task ID": item.customerTaskId })));
  add("Pendencias", previa.pendencias.map((item) => ({ Codigo: item.codigo ?? "", Empresa: item.empresa ?? "", Responsavel: item.responsavel ?? "", Categoria: item.categoria, Mensagem: item.mensagem })));
  const xlsxPath = jsonPath.replace(/\.json$/i, ".xlsx");
  XLSX.writeFile(workbook, xlsxPath);
  return xlsxPath;
}

function nomeBaseModelo(name: string): string {
  return normalizarTexto(name).replace(/\s*-?\s*via whatsapp\s*$/, "").trim();
}

/** O ID informado pode apontar tanto para o modelo normal quanto para o VIA WHATSAPP. */
function localizarParModelos(
  modeloInformado: ModeloTarefaGestta,
  modelos: ModeloTarefaGestta[]
): { normal: ModeloTarefaGestta; whatsapp: ModeloTarefaGestta } | null {
  const informadoEhWhatsapp = normalizarTexto(modeloInformado.name).includes("via whatsapp");
  const base = nomeBaseModelo(modeloInformado.name);
  const counterparts = modelos.filter((model) =>
    model._id !== modeloInformado._id &&
    nomeBaseModelo(model.name) === base &&
    normalizarTexto(model.name).includes("via whatsapp") !== informadoEhWhatsapp
  );
  if (counterparts.length !== 1) return null;
  return informadoEhWhatsapp
    ? { normal: counterparts[0], whatsapp: modeloInformado }
    : { normal: modeloInformado, whatsapp: counterparts[0] };
}

export async function executarPreviaPessoal(sourcePath: string, client: AxiosInstance): Promise<PreviaPessoal> {
  const inicio = new Date().toISOString();
  const fullSourcePath = path.resolve(sourcePath);
  const fonte = lerFontePessoal(fullSourcePath);
  const { validas, pendencias } = deduplicarFontePessoal(fonte);
  const [ativos, inativos, users, modeloInformado, modelos] = await Promise.all([
    listarClientes(client),
    listarClientes(client, "", false),
    listarFuncionarios(client),
    obterModeloTarefa(client, MODELO_NORMAL_ID),
    listarModelosTarefa(client),
  ]);
  const parModelos = localizarParModelos(modeloInformado, modelos);
  if (!parModelos) {
    throw new Error(`Nao foi encontrado um unico par normal/VIA WHATSAPP para o modelo "${modeloInformado.name}".`);
  }
  const { normal: modeloNormal, whatsapp: modeloWhatsapp } = parModelos;
  const clientes = [...ativos, ...inativos];
  const empresas: PreviaPessoal["empresas"] = [];
  const vinculos: VinculoPlanejado[] = [];
  const instancias: InstanciaPlanejada[] = [];

  for (const row of validas) {
    const customer = resolverClientePessoal(row, clientes);
    if (!customer) {
      pendencias.push({ codigo: row.codigo, empresa: row.empresa, responsavel: row.responsavel, categoria: "empresa_nao_resolvida", mensagem: "Codigo e razao social nao resolveram uma unica empresa no Gestta." });
      continue;
    }
    const owner = resolverUsuario(users, row.responsavel);
    if (!owner) {
      pendencias.push({ codigo: row.codigo, empresa: customer.name, responsavel: row.responsavel, categoria: "responsavel_nao_resolvido", mensagem: "Responsavel nao encontrado de forma unica entre os usuarios ativos." });
      continue;
    }
    const cnpj = digitos(customer.cnpj);
    empresas.push({ codigo: row.codigo, empresa: customer.name, cnpj, customerId: customer._id, responsavel: owner.name, responsavelId: owner._id });
    let allLinks: CompanyTaskItem[];
    let pessoalLinks: CompanyTaskItem[];
    let generated: TarefaGeradaGestta[];
    try {
      [allLinks, pessoalLinks, generated] = await Promise.all([
        getGroupCustomerItems(client, customer._id),
        getGroupCustomerItems(client, customer._id, SETOR),
        listarTarefasGeradasAbertas(client, customer._id),
      ]);
    } catch (error) {
      if (isGesttaAuthFatalError(error)) throw error;
      pendencias.push({ codigo: row.codigo, empresa: customer.name, categoria: "consulta_falhou", mensagem: error instanceof Error ? error.message : String(error) });
      continue;
    }
    const byLink = new Map<string, { item: CompanyTaskItem; escopos: Set<string> }>();
    const include = (items: CompanyTaskItem[], scope: string) => {
      for (const item of items) {
        const current = byLink.get(item._id) ?? { item, escopos: new Set<string>() };
        current.escopos.add(scope);
        byLink.set(item._id, current);
      }
    };
    include(pessoalLinks, "pessoal");
    include(allLinks.filter((item) => taskId(item.company_task) === modeloNormal._id), "modelo_normal");
    include(allLinks.filter((item) => taskId(item.company_task) === modeloWhatsapp._id), "modelo_whatsapp");
    for (const { item, escopos } of byLink.values()) {
      const previousId = userId(item.company_user);
      vinculos.push({
        codigo: row.codigo, empresa: customer.name, cnpj, customerId: customer._id, groupCustomerId: item._id,
        tarefaId: taskId(item.company_task), tarefa: taskName(item.company_task) || "(tarefa sem nome)", setor: departmentName(item), escopos: [...escopos].sort(),
        responsavelAtualId: previousId, responsavelAtual: userName(item.company_user), responsavelPlanejadoId: owner._id, responsavelPlanejado: owner.name,
        status: previousId === owner._id ? "sem_alteracao" : "alteracao_planejada",
      });
    }
    for (const task of filtrarInstanciasAgostoOpen(generated, modeloNormal._id, modeloWhatsapp._id, modeloNormal.name, modeloWhatsapp.name)) {
      const previousId = userId(generatedOwner(task));
      const modelType = identificarModeloInstancia(task, modeloNormal._id, modeloWhatsapp._id, modeloNormal.name, modeloWhatsapp.name)!;
      const modelId = modelType === "normal" ? modeloNormal._id : modeloWhatsapp._id;
      instancias.push({
        codigo: row.codigo, empresa: customer.name, cnpj, customerId: customer._id, customerTaskId: task._id, modeloId: modelId,
        modelo: modelType, tarefa: task.name || taskName(task.company_task) || "(tarefa sem nome)",
        competencia: String(task.competence_date), statusAtual: task.status ?? "", responsavelAtualId: previousId, responsavelAtual: userName(generatedOwner(task)),
        responsavelPlanejadoId: owner._id, responsavelPlanejado: owner.name,
        status: previousId === owner._id ? "sem_alteracao" : previousId ? "alteracao_planejada" : "pendencia_sem_rollback",
      });
    }
  }
  const previa: PreviaPessoal = {
    tipo: TIPO,
    execucao: {
      inicio, fim: new Date().toISOString(), planilhaFonte: fullSourcePath, modeloNormalId: modeloNormal._id, modeloNormal: modeloNormal.name,
      modeloWhatsappId: modeloWhatsapp._id, modeloWhatsapp: modeloWhatsapp.name, competencia: "08/2026", totalFonte: fonte.length,
      empresasAptas: empresas.length, alteracoesVinculo: vinculos.filter((item) => item.status === "alteracao_planejada").length,
      alteracoesInstancia: instancias.filter((item) => item.status === "alteracao_planejada").length, pendencias: pendencias.length,
    },
    empresas, vinculos, instancias, pendencias,
  };
  return previa;
}

function checkpointPath(previousPath: string): string {
  const hash = crypto.createHash("sha256").update(path.resolve(previousPath)).digest("hex").slice(0, 12);
  return path.join(getReportsDir(), `checkpoint_reatribuicao_pessoal_${hash}.json`);
}

function saveCheckpoint(previousPath: string, resultados: ResultadoAplicacao[]): void {
  fs.mkdirSync(getReportsDir(), { recursive: true });
  fs.writeFileSync(checkpointPath(previousPath), JSON.stringify({ resultados }, null, 2), "utf8");
}

function loadCheckpoint(previousPath: string): ResultadoAplicacao[] {
  const filePath = checkpointPath(previousPath);
  if (!fs.existsSync(filePath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as { resultados?: ResultadoAplicacao[] };
    return Array.isArray(parsed.resultados) ? parsed.resultados : [];
  } catch {
    return [];
  }
}

function loadPrevia(filePath: string): PreviaPessoal {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as PreviaPessoal;
  if (parsed.tipo !== TIPO || !Array.isArray(parsed.vinculos) || !Array.isArray(parsed.instancias)) {
    throw new Error("Arquivo nao e uma previa valida de reatribuicao Pessoal.");
  }
  return parsed;
}

function sameOwner(current: string | undefined, expected: string | undefined): boolean {
  return (current ?? "") === (expected ?? "");
}

export async function aplicarPreviaPessoal(previousPath: string, client: AxiosInstance): Promise<ExecucaoPessoal> {
  const previous = loadPrevia(previousPath);
  const inicio = new Date().toISOString();
  const results: ResultadoAplicacao[] = loadCheckpoint(previousPath);
  const processed = new Set(results.filter((item) => item.aplicado).map((item) => `${item.tipo}:${item.id}`));
  for (const item of previous.vinculos.filter((entry) => entry.status === "alteracao_planejada")) {
    if (processed.has(`vinculo:${item.groupCustomerId}`)) continue;
    try {
      const links = await getGroupCustomerItems(client, item.customerId);
      const current = links.find((link) => link._id === item.groupCustomerId);
      if (!current || !sameOwner(userId(current.company_user), item.responsavelAtualId)) {
        results.push({ tipo: "vinculo", id: item.groupCustomerId, customerId: item.customerId, codigo: item.codigo, tarefa: item.tarefa, aplicado: false, mensagem: "Vinculo ausente ou responsavel atual diverge da previa.", responsavelAnteriorId: item.responsavelAtualId, responsavelAplicadoId: item.responsavelPlanejadoId });
      } else {
        await patchResponsavel(client, { ids: [item.groupCustomerId], company_user: item.responsavelPlanejadoId });
        results.push({ tipo: "vinculo", id: item.groupCustomerId, customerId: item.customerId, codigo: item.codigo, tarefa: item.tarefa, aplicado: true, mensagem: "Responsavel do vinculo atualizado.", responsavelAnteriorId: item.responsavelAtualId, responsavelAplicadoId: item.responsavelPlanejadoId });
      }
    } catch (error) {
      if (isGesttaAuthFatalError(error)) throw error;
      results.push({ tipo: "vinculo", id: item.groupCustomerId, customerId: item.customerId, codigo: item.codigo, tarefa: item.tarefa, aplicado: false, mensagem: error instanceof Error ? error.message : String(error), responsavelAnteriorId: item.responsavelAtualId, responsavelAplicadoId: item.responsavelPlanejadoId });
    }
    saveCheckpoint(previousPath, results);
  }
  for (const item of previous.instancias.filter((entry) => entry.status === "alteracao_planejada")) {
    if (processed.has(`instancia:${item.customerTaskId}`)) continue;
    try {
      const current = await obterTarefaGerada(client, item.customerTaskId);
      const expectedName = item.modelo === "normal" ? previous.execucao.modeloNormal : previous.execucao.modeloWhatsapp;
      const currentModel = identificarModeloInstancia(current, previous.execucao.modeloNormalId, previous.execucao.modeloWhatsappId, previous.execucao.modeloNormal, previous.execucao.modeloWhatsapp);
      if (current.status !== "OPEN" || !isCompetenciaAgosto(current) || currentModel !== item.modelo || taskId(current.company_task) !== item.modeloId || normalizarTexto(current.name || taskName(current.company_task)) !== normalizarTexto(expectedName) || !sameOwner(userId(generatedOwner(current)), item.responsavelAtualId)) {
        results.push({ tipo: "instancia", id: item.customerTaskId, customerId: item.customerId, codigo: item.codigo, tarefa: item.tarefa, aplicado: false, mensagem: "Instancia nao esta mais OPEN/agosto/modelo esperado ou o responsavel divergiu.", responsavelAnteriorId: item.responsavelAtualId, responsavelAplicadoId: item.responsavelPlanejadoId });
      } else {
        await transferirTarefaGerada(client, item.customerTaskId, item.responsavelPlanejadoId);
        const after = await obterTarefaGerada(client, item.customerTaskId);
        if (!sameOwner(userId(generatedOwner(after)), item.responsavelPlanejadoId)) throw new Error("Transferencia nao persistiu o responsavel esperado.");
        results.push({ tipo: "instancia", id: item.customerTaskId, customerId: item.customerId, codigo: item.codigo, tarefa: item.tarefa, aplicado: true, mensagem: "Responsavel da instancia OPEN atualizado.", responsavelAnteriorId: item.responsavelAtualId, responsavelAplicadoId: item.responsavelPlanejadoId });
      }
    } catch (error) {
      if (isGesttaAuthFatalError(error)) throw error;
      results.push({ tipo: "instancia", id: item.customerTaskId, customerId: item.customerId, codigo: item.codigo, tarefa: item.tarefa, aplicado: false, mensagem: error instanceof Error ? error.message : String(error), responsavelAnteriorId: item.responsavelAtualId, responsavelAplicadoId: item.responsavelPlanejadoId });
    }
    saveCheckpoint(previousPath, results);
  }
  const execution: ExecucaoPessoal = {
    tipo: "execucao-reatribuicao-pessoal-v1",
    execucao: { inicio, fim: new Date().toISOString(), previaOrigem: path.resolve(previousPath), total: results.length, sucesso: results.filter((item) => item.aplicado).length, falha: results.filter((item) => !item.aplicado).length },
    previa: previous.execucao, resultados: results,
  };
  fs.rmSync(checkpointPath(previousPath), { force: true });
  return execution;
}

export async function reverterExecucaoPessoal(executionPath: string, client: AxiosInstance): Promise<ExecucaoPessoal> {
  const execution = JSON.parse(fs.readFileSync(executionPath, "utf8")) as ExecucaoPessoal;
  if (execution.tipo !== "execucao-reatribuicao-pessoal-v1") throw new Error("Arquivo nao e uma execucao Pessoal valida.");
  const results: ResultadoAplicacao[] = [];
  for (const item of execution.resultados.filter((entry) => entry.aplicado)) {
    try {
      if (item.tipo === "instancia") {
        if (!item.responsavelAnteriorId) throw new Error("Instancia sem responsavel anterior nao pode ser revertida com seguranca.");
        const current = await obterTarefaGerada(client, item.id);
        if (!sameOwner(userId(generatedOwner(current)), item.responsavelAplicadoId)) throw new Error("Responsavel atual diverge da execucao; rollback bloqueado.");
        await transferirTarefaGerada(client, item.id, item.responsavelAnteriorId);
      } else {
        const links = await getGroupCustomerItems(client, item.customerId);
        const current = links.find((link) => link._id === item.id);
        if (!current || !sameOwner(userId(current.company_user), item.responsavelAplicadoId)) {
          throw new Error("Responsavel atual diverge da execucao; rollback bloqueado.");
        }
        if (item.responsavelAnteriorId) {
          await patchResponsavel(client, { ids: [item.id], company_user: item.responsavelAnteriorId });
        } else {
          await removerResponsavel(client, [item.id]);
        }
      }
      results.push({ ...item, aplicado: true, mensagem: "Rollback aplicado." });
    } catch (error) {
      results.push({ ...item, aplicado: false, mensagem: error instanceof Error ? error.message : String(error) });
    }
  }
  return {
    tipo: "execucao-reatribuicao-pessoal-v1",
    execucao: { inicio: new Date().toISOString(), fim: new Date().toISOString(), previaOrigem: path.resolve(executionPath), total: results.length, sucesso: results.filter((item) => item.aplicado).length, falha: results.filter((item) => !item.aplicado).length },
    previa: execution.previa,
    resultados: results,
  };
}

function getArg(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

/** CLI isolada para nao alterar o comportamento da automacao generica existente. */
export async function runPessoalCli(argv = process.argv.slice(2)): Promise<boolean> {
  const source = getArg(argv, "--pessoal-preflight");
  const apply = getArg(argv, "--pessoal-apply");
  const rollback = getArg(argv, "--pessoal-rollback");
  if (!source && !apply && !rollback) return false;
  if ((apply || rollback) && !argv.includes("--confirmar")) throw new Error("Use --confirmar para aplicar ou reverter a reatribuicao Pessoal.");
  loadRuntimeEnv();
  const auth = await resolveGesttaRuntimeAuth();
  const client = createGesttaClient(auth);
  await preflightGesttaAuth(client);
  if (source) {
    const previous = await executarPreviaPessoal(source, client);
    const json = saveJson("previa_reatribuicao_pessoal", previous);
    const xlsx = saveWorkbook(previous, json);
    console.log(`Previa salva: ${json}`);
    console.log(`Planilha de revisao: ${xlsx}`);
  } else if (apply) {
    const execution = await aplicarPreviaPessoal(apply, client);
    console.log(`Execucao salva: ${saveJson("execucao_reatribuicao_pessoal", execution)}`);
  } else if (rollback) {
    const reverted = await reverterExecucaoPessoal(rollback, client);
    console.log(`Rollback salvo: ${saveJson("rollback_reatribuicao_pessoal", reverted)}`);
  }
  return true;
}
