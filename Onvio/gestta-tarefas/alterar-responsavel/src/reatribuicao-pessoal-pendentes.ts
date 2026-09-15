/**
 * Transferencia controlada de instancias pendentes do departamento Pessoal.
 *
 * Este fluxo nao altera group_customer, modelos ou recorrencias. A aplicacao
 * aceita somente uma previa persistida e revalida cada instancia antes do PUT.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import type { AxiosInstance } from "axios";
import { createGesttaClient, isGesttaAuthFatalError } from "./api/client";
import {
  listarClientes,
  listarDepartamentos,
  listarFuncionarios,
  listarModelosTarefa,
  listarTarefasGeradasPorStatus,
  obterTarefaGerada,
  transferirTarefaGerada,
  type ModeloTarefaGestta,
  type TarefaGeradaGestta,
} from "./api/endpoints";
import { resolveGesttaRuntimeAuth } from "./auth/runtime-auth";
import { loadRuntimeEnv, preflightGesttaAuth } from "./automation";
import type { ClienteGestta, UsuarioGestta } from "./types";

/**
 * Enum efetivamente aceito por /core/customer/task/search. Tarefas exibidas
 * como atrasadas continuam com status OPEN; REVIEW nao existe neste contrato.
 */
export const STATUS_PENDENTES_PESSOAL = ["OPEN", "IMPEDIMENT"] as const;
const STATUS_CONHECIDOS = [...STATUS_PENDENTES_PESSOAL, "DONE", "DISCONSIDERED", "IGNORED"] as const;
const TIPO_PREVIA = "reatribuicao-pessoal-pendentes-v1";
const TIPO_EXECUCAO = "execucao-reatribuicao-pessoal-pendentes-v1";
const TIPO_ROLLBACK = "rollback-reatribuicao-pessoal-pendentes-v1";
const REPORTS_ENV = "GESTTA_RELATORIOS_DIR";

export interface FontePessoalPendente {
  linha: number;
  codigo: string;
  empresa: string;
}

export interface PendenciaPessoalPendente {
  codigo?: string;
  empresa?: string;
  categoria: string;
  mensagem: string;
}

export interface EmpresaPessoalPendente {
  codigo: string;
  empresaFonte: string;
  empresaGestta: string;
  cnpj: string;
  customerId: string;
  ativa?: boolean;
  status: "com_tarefas_elegiveis" | "sem_tarefas_elegiveis";
  tarefasElegiveis: number;
}

export interface TarefaPessoalPendente {
  codigo: string;
  empresa: string;
  customerId: string;
  customerTaskId: string;
  tarefa: string;
  modeloId?: string;
  modelo?: string;
  setor: string;
  statusAtual: string;
  competencia?: string;
  responsavelOrigemId: string;
  responsavelOrigem: string;
  responsavelDestinoId: string;
  responsavelDestino: string;
}

export interface ExclusaoPessoalPendente {
  codigo: string;
  empresa: string;
  customerId: string;
  customerTaskId: string;
  tarefa: string;
  status: string;
  responsavelAtual?: string;
  setor?: string;
  motivo: "outro_setor" | "setor_nao_comprovado" | "outro_responsavel";
  mensagem: string;
}

export interface PreviaPessoalPendentes {
  tipo: typeof TIPO_PREVIA;
  execucao: {
    inicio: string;
    fim: string;
    planilhaFonte: string;
    responsavelOrigem: string;
    responsavelOrigemId?: string;
    responsavelDestino: string;
    responsavelDestinoId?: string;
    statuses: string[];
    totalFonte: number;
    empresasResolvidas: number;
    tarefasElegiveis: number;
    exclusoes: number;
    pendencias: number;
    bloqueado: boolean;
  };
  empresas: EmpresaPessoalPendente[];
  tarefas: TarefaPessoalPendente[];
  exclusoes: ExclusaoPessoalPendente[];
  pendencias: PendenciaPessoalPendente[];
}

export type ResultadoAplicacaoStatus =
  | "aplicado"
  | "ja_destino"
  | "aplicado_nao_confirmado"
  | "bloqueado"
  | "falha";

export interface ResultadoAplicacaoPessoalPendente extends TarefaPessoalPendente {
  resultado: ResultadoAplicacaoStatus;
  alteradoNestaExecucao: boolean;
  mensagem: string;
}

export interface VerificacaoPessoalPendentes {
  ok: boolean;
  restantesComOrigem: Array<{
    codigo: string;
    empresa: string;
    customerId: string;
    customerTaskId: string;
    tarefa: string;
    status: string;
  }>;
  transferenciasNaoConfirmadas: Array<{
    customerTaskId: string;
    codigo: string;
    tarefa: string;
    responsavelAtualId?: string;
  }>;
  erros: Array<{ codigo?: string; customerTaskId?: string; mensagem: string }>;
}

export interface ExecucaoPessoalPendentes {
  tipo: typeof TIPO_EXECUCAO;
  execucao: {
    inicio: string;
    fim: string;
    previaOrigem: string;
    total: number;
    aplicadas: number;
    jaEstavamNoDestino: number;
    falhas: number;
  };
  previa: PreviaPessoalPendentes["execucao"];
  resultados: ResultadoAplicacaoPessoalPendente[];
  verificacao: VerificacaoPessoalPendentes;
}

export interface ResultadoRollbackPessoalPendente extends ResultadoAplicacaoPessoalPendente {
  rollbackAplicado: boolean;
  mensagemRollback: string;
}

export interface RollbackPessoalPendentes {
  tipo: typeof TIPO_ROLLBACK;
  execucao: {
    inicio: string;
    fim: string;
    execucaoOrigem: string;
    total: number;
    sucesso: number;
    falha: number;
  };
  resultados: ResultadoRollbackPessoalPendente[];
}

interface CatalogoTarefas {
  modelosPorId: Map<string, ModeloTarefaGestta>;
  modelosPorNome: Map<string, ModeloTarefaGestta | null>;
  departamentosPorId: Map<string, string>;
}

function decodificarEspacosHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&#x20;|&#32;|&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizarTextoPessoalPendente(value: unknown): string {
  return decodificarEspacosHtml(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function texto(value: unknown): string {
  return decodificarEspacosHtml(value);
}

function digitos(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function valorCabecalho(row: unknown[], headers: unknown[], aliases: string[]): string {
  const wanted = new Set(aliases.map(normalizarTextoPessoalPendente));
  const index = headers.findIndex((header) => wanted.has(normalizarTextoPessoalPendente(header)));
  return index >= 0 ? texto(row[index]) : "";
}

export function lerFontePessoalPendentes(filePath: string): FontePessoalPendente[] {
  const workbook = XLSX.readFile(filePath, { type: "file" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("A planilha nao possui aba de dados.");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  const headers = rows[0] ?? [];
  const fonte: FontePessoalPendente[] = [];
  for (let index = 1; index < rows.length; index++) {
    const row = rows[index] ?? [];
    const codigo = valorCabecalho(row, headers, ["COD.", "COD", "CODIGO", "CÓDIGO"]);
    const empresa = valorCabecalho(row, headers, ["RAZAO SOCIAL", "RAZÃO SOCIAL", "EMPRESA"]);
    if (!codigo && !empresa) continue;
    if (!codigo || !empresa) throw new Error(`Linha ${index + 1}: COD. e RAZAO SOCIAL sao obrigatorios.`);
    fonte.push({ linha: index + 1, codigo, empresa });
  }
  if (fonte.length === 0) throw new Error("A planilha nao possui empresas para processar.");
  return fonte;
}

function idUsuario(value: unknown): string | undefined {
  if (typeof value === "string") return value || undefined;
  if (value && typeof value === "object" && "_id" in value) {
    const id = String((value as { _id?: unknown })._id ?? "").trim();
    return id || undefined;
  }
  return undefined;
}

function nomeUsuario(value: unknown, usersById?: Map<string, UsuarioGestta>): string | undefined {
  if (value && typeof value === "object" && "name" in value) {
    const name = texto((value as { name?: unknown }).name);
    if (name) return name;
  }
  const id = idUsuario(value);
  return id ? usersById?.get(id)?.name : undefined;
}

function donoTarefa(task: TarefaGeradaGestta): unknown {
  return task.company_user ?? task.owner;
}

function idClienteTarefa(task: TarefaGeradaGestta): string | undefined {
  const raw = task.customer;
  if (typeof raw === "string") return raw || undefined;
  if (raw && typeof raw === "object") return texto(raw._id) || undefined;
  return undefined;
}

function idModeloTarefa(task: TarefaGeradaGestta): string | undefined {
  const raw = task.company_task;
  if (typeof raw === "string") return raw || undefined;
  if (raw && typeof raw === "object") return texto(raw._id) || undefined;
  return undefined;
}

function nomeModeloTarefa(task: TarefaGeradaGestta): string {
  const raw = task.company_task;
  if (raw && typeof raw === "object") return texto(raw.name);
  return texto(task.name);
}

function nomeDepartamentoModelo(model: ModeloTarefaGestta, catalogo: CatalogoTarefas): string {
  const department = model.company_department;
  if (department && typeof department === "object") return texto(department.name);
  return typeof department === "string" ? texto(catalogo.departamentosPorId.get(department)) : "";
}

function departamentoDireto(task: TarefaGeradaGestta, catalogo: CatalogoTarefas): string {
  const record = task as Record<string, unknown>;
  const companyTask = record.company_task;
  if (companyTask && typeof companyTask === "object") {
    const department = (companyTask as Record<string, unknown>).company_department;
    if (department && typeof department === "object") {
      const name = texto((department as Record<string, unknown>).name);
      if (name) return name;
      const id = texto((department as Record<string, unknown>)._id);
      if (id) return texto(catalogo.departamentosPorId.get(id));
    }
    if (typeof department === "string") return texto(catalogo.departamentosPorId.get(department));
  }
  const department = record.company_department;
  if (department && typeof department === "object") {
    const name = texto((department as Record<string, unknown>).name);
    if (name) return name;
    const id = texto((department as Record<string, unknown>)._id);
    if (id) return texto(catalogo.departamentosPorId.get(id));
  }
  if (typeof department === "string") return texto(catalogo.departamentosPorId.get(department));
  return "";
}

function identificarModelo(task: TarefaGeradaGestta, catalogo: CatalogoTarefas): ModeloTarefaGestta | undefined {
  const id = idModeloTarefa(task);
  if (id) return catalogo.modelosPorId.get(id);
  const byName = catalogo.modelosPorNome.get(normalizarTextoPessoalPendente(nomeModeloTarefa(task)));
  return byName ?? undefined;
}

export function setorDaTarefaPendente(
  task: TarefaGeradaGestta,
  catalogo: CatalogoTarefas
): { setor: string; modeloId?: string; modelo?: string } {
  const direct = departamentoDireto(task, catalogo);
  const model = identificarModelo(task, catalogo);
  return {
    setor: direct || (model ? nomeDepartamentoModelo(model, catalogo) : ""),
    modeloId: model?._id ?? idModeloTarefa(task),
    modelo: model?.name ?? nomeModeloTarefa(task),
  };
}

export function isSetorPessoal(value: unknown): boolean {
  const normalized = normalizarTextoPessoalPendente(value);
  return normalized === "pessoal" || normalized === "dp" || normalized === "departamento pessoal";
}

function isStatusPendente(value: unknown): boolean {
  return STATUS_PENDENTES_PESSOAL.includes(String(value ?? "").toUpperCase() as typeof STATUS_PENDENTES_PESSOAL[number]);
}

function indiceUnico<T>(items: T[], key: (item: T) => string): Map<string, T | null> {
  const result = new Map<string, T | null>();
  for (const item of items) {
    const normalized = key(item);
    if (!normalized) continue;
    result.set(normalized, result.has(normalized) ? null : item);
  }
  return result;
}

function resolverUsuarioExato(users: UsuarioGestta[], name: string): UsuarioGestta | null {
  const normalized = normalizarTextoPessoalPendente(name);
  const matches = users.filter((user) => normalizarTextoPessoalPendente(user.name) === normalized);
  return matches.length === 1 ? matches[0] : null;
}

function deduplicarUsuarios(users: UsuarioGestta[]): UsuarioGestta[] {
  return [...new Map(users.map((user) => [user._id, user])).values()];
}

async function carregarCatalogo(client: AxiosInstance): Promise<CatalogoTarefas> {
  const [recorrentes, ordensServico, departamentos] = await Promise.all([
    listarModelosTarefa(client, "RECURRENT"),
    listarModelosTarefa(client, "SERVICE_ORDER"),
    listarDepartamentos(client),
  ]);
  const modelos = [...new Map([...recorrentes, ...ordensServico].map((model) => [model._id, model])).values()];
  return {
    modelosPorId: new Map(modelos.map((model) => [model._id, model])),
    modelosPorNome: indiceUnico(modelos, (model) => normalizarTextoPessoalPendente(model.name)),
    departamentosPorId: new Map(departamentos.map((department) => [department._id, department.name])),
  };
}

function erroMensagem(error: unknown): string {
  const record = error as { response?: { status?: number; data?: unknown }; message?: string };
  const status = record.response?.status;
  const body = record.response?.data == null ? "" : ` ${JSON.stringify(record.response.data).slice(0, 300)}`;
  return `${status ? `HTTP ${status}: ` : ""}${record.message ?? String(error)}${body}`;
}

export async function executarPreviaPessoalPendentes(
  sourcePath: string,
  responsavelOrigem: string,
  responsavelDestino: string,
  client: AxiosInstance
): Promise<PreviaPessoalPendentes> {
  const inicio = new Date().toISOString();
  const fullSourcePath = path.resolve(sourcePath);
  const fonte = lerFontePessoalPendentes(fullSourcePath);
  const pendencias: PendenciaPessoalPendente[] = [];
  const codigosVistos = new Map<string, FontePessoalPendente>();
  const fonteUnica: FontePessoalPendente[] = [];
  for (const row of fonte) {
    const key = normalizarTextoPessoalPendente(row.codigo);
    const previous = codigosVistos.get(key);
    if (previous) {
      pendencias.push({ codigo: row.codigo, empresa: row.empresa, categoria: "codigo_duplicado", mensagem: `Codigo repetido nas linhas ${previous.linha} e ${row.linha}.` });
      continue;
    }
    codigosVistos.set(key, row);
    fonteUnica.push(row);
  }

  const [ativos, inativos, usuariosAtivos, usuariosInativos, catalogo] = await Promise.all([
    listarClientes(client),
    listarClientes(client, "", false),
    listarFuncionarios(client, true),
    listarFuncionarios(client, false),
    carregarCatalogo(client),
  ]);
  const clientes = [...ativos, ...inativos];
  const clientesPorCodigo = indiceUnico(clientes, (customer) => normalizarTextoPessoalPendente(customer.code));
  const usuariosTodos = deduplicarUsuarios([...usuariosAtivos, ...usuariosInativos]);
  const origem = resolverUsuarioExato(usuariosTodos, responsavelOrigem);
  const destino = resolverUsuarioExato(deduplicarUsuarios(usuariosAtivos), responsavelDestino);
  if (!origem) pendencias.push({ categoria: "origem_nao_resolvida", mensagem: `Usuario de origem "${responsavelOrigem}" nao foi encontrado de forma unica entre ativos e inativos.` });
  if (!destino) pendencias.push({ categoria: "destino_nao_resolvido", mensagem: `Usuario de destino ativo "${responsavelDestino}" nao foi encontrado de forma unica.` });

  const empresas: EmpresaPessoalPendente[] = [];
  for (const row of fonteUnica) {
    const customer = clientesPorCodigo.get(normalizarTextoPessoalPendente(row.codigo));
    if (!customer) {
      pendencias.push({ codigo: row.codigo, empresa: row.empresa, categoria: "empresa_nao_resolvida", mensagem: "Codigo nao resolveu uma unica empresa ativa ou inativa no Gestta." });
      continue;
    }
    if (normalizarTextoPessoalPendente(customer.name) !== normalizarTextoPessoalPendente(row.empresa)) {
      pendencias.push({ codigo: row.codigo, empresa: row.empresa, categoria: "razao_social_divergente", mensagem: `Codigo pertence a "${customer.name}" no Gestta.` });
      continue;
    }
    empresas.push({
      codigo: row.codigo,
      empresaFonte: row.empresa,
      empresaGestta: customer.name,
      cnpj: digitos(customer.cnpj),
      customerId: customer._id,
      ativa: customer.active,
      status: "sem_tarefas_elegiveis",
      tarefasElegiveis: 0,
    });
  }

  const tarefas: TarefaPessoalPendente[] = [];
  const exclusoes: ExclusaoPessoalPendente[] = [];
  const usersById = new Map(usuariosTodos.map((user) => [user._id, user]));
  if (origem && destino) {
    for (const empresa of empresas) {
      try {
        const generated = await listarTarefasGeradasPorStatus(client, empresa.customerId, STATUS_PENDENTES_PESSOAL);
        for (const task of generated) {
          const owner = donoTarefa(task);
          const ownerId = idUsuario(owner);
          const ownerName = nomeUsuario(owner, usersById);
          const classification = setorDaTarefaPendente(task, catalogo);
          const base = {
            codigo: empresa.codigo,
            empresa: empresa.empresaGestta,
            customerId: empresa.customerId,
            customerTaskId: task._id,
            tarefa: texto(task.name) || classification.modelo || "(tarefa sem nome)",
            status: String(task.status ?? ""),
            responsavelAtual: ownerName,
            setor: classification.setor || undefined,
          };
          if (!classification.setor) {
            exclusoes.push({ ...base, motivo: "setor_nao_comprovado", mensagem: "Departamento da instancia/modelo nao foi comprovado." });
            continue;
          }
          if (!isSetorPessoal(classification.setor)) {
            exclusoes.push({ ...base, motivo: "outro_setor", mensagem: `Setor "${classification.setor}" nao pertence ao Pessoal.` });
            continue;
          }
          if (ownerId !== origem._id) {
            exclusoes.push({ ...base, motivo: "outro_responsavel", mensagem: `Responsavel atual nao e ${origem.name}.` });
            continue;
          }
          tarefas.push({
            codigo: empresa.codigo,
            empresa: empresa.empresaGestta,
            customerId: empresa.customerId,
            customerTaskId: task._id,
            tarefa: base.tarefa,
            modeloId: classification.modeloId,
            modelo: classification.modelo,
            setor: classification.setor,
            statusAtual: base.status,
            competencia: task.competence_date ? String(task.competence_date) : undefined,
            responsavelOrigemId: origem._id,
            responsavelOrigem: origem.name,
            responsavelDestinoId: destino._id,
            responsavelDestino: destino.name,
          });
        }
        empresa.tarefasElegiveis = tarefas.filter((task) => task.customerId === empresa.customerId).length;
        empresa.status = empresa.tarefasElegiveis > 0 ? "com_tarefas_elegiveis" : "sem_tarefas_elegiveis";
      } catch (error) {
        if (isGesttaAuthFatalError(error)) throw error;
        pendencias.push({ codigo: empresa.codigo, empresa: empresa.empresaGestta, categoria: "consulta_tarefas_falhou", mensagem: erroMensagem(error) });
      }
    }
  }

  const bloqueado = pendencias.length > 0 || empresas.length !== fonte.length;
  return {
    tipo: TIPO_PREVIA,
    execucao: {
      inicio,
      fim: new Date().toISOString(),
      planilhaFonte: fullSourcePath,
      responsavelOrigem: origem?.name ?? responsavelOrigem,
      responsavelOrigemId: origem?._id,
      responsavelDestino: destino?.name ?? responsavelDestino,
      responsavelDestinoId: destino?._id,
      statuses: [...STATUS_PENDENTES_PESSOAL],
      totalFonte: fonte.length,
      empresasResolvidas: empresas.length,
      tarefasElegiveis: tarefas.length,
      exclusoes: exclusoes.length,
      pendencias: pendencias.length,
      bloqueado,
    },
    empresas,
    tarefas,
    exclusoes,
    pendencias,
  };
}

function reportsDir(): string {
  const configured = process.env[REPORTS_ENV]?.trim();
  return configured ? path.resolve(configured) : path.join(process.cwd(), "relatorios");
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function saveJson(prefix: string, value: unknown): string {
  const output = path.join(reportsDir(), `${prefix}_${stamp()}.json`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(value, null, 2), "utf8");
  return output;
}

function addSheet(workbook: XLSX.WorkBook, name: string, rows: Record<string, unknown>[], emptyHeaders: string[]): void {
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [Object.fromEntries(emptyHeaders.map((header) => [header, ""]))]),
    name
  );
}

export function salvarPreviaPessoalPendentes(previa: PreviaPessoalPendentes): { json: string; xlsx: string } {
  const json = saveJson("previa_reatribuicao_pessoal_pendentes", previa);
  const workbook = XLSX.utils.book_new();
  addSheet(workbook, "Resumo", Object.entries(previa.execucao).map(([Campo, Valor]) => ({ Campo, Valor: Array.isArray(Valor) ? Valor.join(" | ") : Valor })), ["Campo", "Valor"]);
  addSheet(workbook, "Empresas", previa.empresas.map((item) => ({ Codigo: item.codigo, Empresa: item.empresaGestta, CNPJ: item.cnpj, Ativa: item.ativa == null ? "" : item.ativa ? "Sim" : "Nao", Status: item.status, "Tarefas elegiveis": item.tarefasElegiveis, "Customer ID": item.customerId })), ["Codigo", "Empresa", "Status"]);
  addSheet(workbook, "Transferencias", previa.tarefas.map((item) => ({ Codigo: item.codigo, Empresa: item.empresa, Tarefa: item.tarefa, Setor: item.setor, Status: item.statusAtual, Competencia: item.competencia ?? "", Origem: item.responsavelOrigem, Destino: item.responsavelDestino, "ID instancia": item.customerTaskId, "ID modelo": item.modeloId ?? "" })), ["Codigo", "Empresa", "Tarefa"]);
  addSheet(workbook, "Exclusoes", previa.exclusoes.map((item) => ({ Codigo: item.codigo, Empresa: item.empresa, Tarefa: item.tarefa, Setor: item.setor ?? "", Status: item.status, Responsavel: item.responsavelAtual ?? "", Motivo: item.motivo, Mensagem: item.mensagem, "ID instancia": item.customerTaskId })), ["Codigo", "Empresa", "Motivo"]);
  addSheet(workbook, "Pendencias", previa.pendencias.map((item) => ({ Codigo: item.codigo ?? "", Empresa: item.empresa ?? "", Categoria: item.categoria, Mensagem: item.mensagem })), ["Codigo", "Empresa", "Categoria", "Mensagem"]);
  const xlsx = json.replace(/\.json$/i, ".xlsx");
  XLSX.writeFile(workbook, xlsx);
  return { json, xlsx };
}

function checkpointPath(previousPath: string): string {
  const hash = crypto.createHash("sha256").update(path.resolve(previousPath)).digest("hex").slice(0, 12);
  return path.join(reportsDir(), `checkpoint_reatribuicao_pessoal_pendentes_${hash}.json`);
}

function loadCheckpoint(previousPath: string): ResultadoAplicacaoPessoalPendente[] {
  const file = checkpointPath(previousPath);
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { resultados?: ResultadoAplicacaoPessoalPendente[] };
    return Array.isArray(parsed.resultados) ? parsed.resultados : [];
  } catch {
    return [];
  }
}

function saveCheckpoint(previousPath: string, resultados: ResultadoAplicacaoPessoalPendente[]): void {
  fs.mkdirSync(reportsDir(), { recursive: true });
  fs.writeFileSync(checkpointPath(previousPath), JSON.stringify({ resultados }, null, 2), "utf8");
}

function carregarPrevia(filePath: string): PreviaPessoalPendentes {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as PreviaPessoalPendentes;
  if (parsed.tipo !== TIPO_PREVIA || !Array.isArray(parsed.empresas) || !Array.isArray(parsed.tarefas)) {
    throw new Error("Arquivo nao e uma previa valida de tarefas pendentes do Pessoal.");
  }
  if (parsed.execucao.bloqueado || parsed.execucao.empresasResolvidas !== parsed.execucao.totalFonte || parsed.pendencias.length > 0) {
    throw new Error("A previa possui pendencias ou empresas nao resolvidas; aplicacao bloqueada.");
  }
  if (!parsed.execucao.responsavelOrigemId || !parsed.execucao.responsavelDestinoId) {
    throw new Error("A previa nao possui IDs validos dos responsaveis.");
  }
  return parsed;
}

async function confirmarClienteDaTarefa(
  client: AxiosInstance,
  task: TarefaGeradaGestta,
  expectedCustomerId: string
): Promise<boolean> {
  const customerId = idClienteTarefa(task);
  if (customerId) return customerId === expectedCustomerId;
  const scoped = await listarTarefasGeradasPorStatus(client, expectedCustomerId, STATUS_CONHECIDOS);
  return scoped.some((candidate) => candidate._id === task._id);
}

function upsertResultado(resultados: ResultadoAplicacaoPessoalPendente[], resultado: ResultadoAplicacaoPessoalPendente): void {
  const index = resultados.findIndex((item) => item.customerTaskId === resultado.customerTaskId);
  if (index >= 0) resultados[index] = resultado;
  else resultados.push(resultado);
}

async function verificarExecucao(
  client: AxiosInstance,
  previa: PreviaPessoalPendentes,
  resultados: ResultadoAplicacaoPessoalPendente[],
  catalogo: CatalogoTarefas
): Promise<VerificacaoPessoalPendentes> {
  const restantesComOrigem: VerificacaoPessoalPendentes["restantesComOrigem"] = [];
  const transferenciasNaoConfirmadas: VerificacaoPessoalPendentes["transferenciasNaoConfirmadas"] = [];
  const erros: VerificacaoPessoalPendentes["erros"] = [];
  for (const empresa of previa.empresas) {
    try {
      const pending = await listarTarefasGeradasPorStatus(client, empresa.customerId, STATUS_PENDENTES_PESSOAL);
      for (const task of pending) {
        const classification = setorDaTarefaPendente(task, catalogo);
        if (isSetorPessoal(classification.setor) && idUsuario(donoTarefa(task)) === previa.execucao.responsavelOrigemId) {
          restantesComOrigem.push({ codigo: empresa.codigo, empresa: empresa.empresaGestta, customerId: empresa.customerId, customerTaskId: task._id, tarefa: texto(task.name) || classification.modelo || "(tarefa sem nome)", status: String(task.status ?? "") });
        }
      }
    } catch (error) {
      erros.push({ codigo: empresa.codigo, mensagem: `Falha na verificacao da empresa: ${erroMensagem(error)}` });
    }
  }
  for (const item of resultados.filter((result) => result.resultado === "aplicado" || result.resultado === "ja_destino" || result.resultado === "aplicado_nao_confirmado")) {
    try {
      const current = await obterTarefaGerada(client, item.customerTaskId);
      const currentOwner = idUsuario(donoTarefa(current));
      if (currentOwner !== item.responsavelDestinoId) {
        transferenciasNaoConfirmadas.push({ customerTaskId: item.customerTaskId, codigo: item.codigo, tarefa: item.tarefa, responsavelAtualId: currentOwner });
      }
    } catch (error) {
      erros.push({ customerTaskId: item.customerTaskId, codigo: item.codigo, mensagem: `Falha ao confirmar transferencia: ${erroMensagem(error)}` });
    }
  }
  return {
    ok: restantesComOrigem.length === 0 && transferenciasNaoConfirmadas.length === 0 && erros.length === 0,
    restantesComOrigem,
    transferenciasNaoConfirmadas,
    erros,
  };
}

export async function aplicarPreviaPessoalPendentes(previousPath: string, client: AxiosInstance): Promise<ExecucaoPessoalPendentes> {
  const origemPath = path.resolve(previousPath);
  const previa = carregarPrevia(origemPath);
  const inicio = new Date().toISOString();
  const [catalogo, usuariosAtivos] = await Promise.all([carregarCatalogo(client), listarFuncionarios(client, true)]);
  const destinoAtual = usuariosAtivos.find((user) => user._id === previa.execucao.responsavelDestinoId && normalizarTextoPessoalPendente(user.name) === normalizarTextoPessoalPendente(previa.execucao.responsavelDestino));
  if (!destinoAtual) throw new Error("O usuario de destino da previa nao esta mais ativo ou divergiu.");

  const resultados = loadCheckpoint(origemPath);
  const processados = new Set(resultados.filter((item) => ["aplicado", "ja_destino", "aplicado_nao_confirmado"].includes(item.resultado)).map((item) => item.customerTaskId));
  for (const item of previa.tarefas) {
    if (processados.has(item.customerTaskId)) continue;
    let transferiu = false;
    let resultado: ResultadoAplicacaoPessoalPendente;
    try {
      const current = await obterTarefaGerada(client, item.customerTaskId);
      if (!(await confirmarClienteDaTarefa(client, current, item.customerId))) {
        resultado = { ...item, resultado: "bloqueado", alteradoNestaExecucao: false, mensagem: "Cliente atual da instancia diverge da previa ou nao foi comprovado." };
      } else {
        const currentOwner = idUsuario(donoTarefa(current));
        const classification = setorDaTarefaPendente(current, catalogo);
        if (currentOwner === item.responsavelDestinoId) {
          resultado = { ...item, resultado: "ja_destino", alteradoNestaExecucao: false, mensagem: "Instancia ja estava atribuida ao destino." };
        } else if (currentOwner !== item.responsavelOrigemId) {
          resultado = { ...item, resultado: "bloqueado", alteradoNestaExecucao: false, mensagem: "Responsavel atual diverge da origem registrada na previa." };
        } else if (!isStatusPendente(current.status)) {
          resultado = { ...item, resultado: "bloqueado", alteradoNestaExecucao: false, mensagem: `Status atual "${current.status ?? ""}" nao e pendente.` };
        } else if (!isSetorPessoal(classification.setor)) {
          resultado = { ...item, resultado: "bloqueado", alteradoNestaExecucao: false, mensagem: classification.setor ? `Setor atual "${classification.setor}" nao pertence ao Pessoal.` : "Setor atual nao foi comprovado." };
        } else {
          await transferirTarefaGerada(client, item.customerTaskId, item.responsavelDestinoId);
          transferiu = true;
          const after = await obterTarefaGerada(client, item.customerTaskId);
          if (idUsuario(donoTarefa(after)) !== item.responsavelDestinoId) {
            throw new Error("A transferencia foi enviada, mas o responsavel de destino nao foi confirmado.");
          }
          resultado = { ...item, resultado: "aplicado", alteradoNestaExecucao: true, mensagem: "Responsavel da instancia transferido e confirmado." };
        }
      }
    } catch (error) {
      if (isGesttaAuthFatalError(error)) throw error;
      resultado = { ...item, resultado: transferiu ? "aplicado_nao_confirmado" : "falha", alteradoNestaExecucao: transferiu, mensagem: erroMensagem(error) };
    }
    upsertResultado(resultados, resultado);
    saveCheckpoint(origemPath, resultados);
  }

  const verificacao = await verificarExecucao(client, previa, resultados, catalogo);
  const falhas = resultados.filter((item) => !["aplicado", "ja_destino"].includes(item.resultado)).length;
  const execution: ExecucaoPessoalPendentes = {
    tipo: TIPO_EXECUCAO,
    execucao: {
      inicio,
      fim: new Date().toISOString(),
      previaOrigem: origemPath,
      total: resultados.length,
      aplicadas: resultados.filter((item) => item.resultado === "aplicado").length,
      jaEstavamNoDestino: resultados.filter((item) => item.resultado === "ja_destino").length,
      falhas,
    },
    previa: previa.execucao,
    resultados,
    verificacao,
  };
  if (falhas === 0 && verificacao.ok) fs.rmSync(checkpointPath(origemPath), { force: true });
  return execution;
}

function salvarExecucaoPessoalPendentes(execution: ExecucaoPessoalPendentes): { json: string; xlsx: string } {
  const json = saveJson("execucao_reatribuicao_pessoal_pendentes", execution);
  const workbook = XLSX.utils.book_new();
  addSheet(workbook, "Resumo", [...Object.entries(execution.execucao).map(([Campo, Valor]) => ({ Campo, Valor })), { Campo: "Verificacao OK", Valor: execution.verificacao.ok ? "Sim" : "Nao" }], ["Campo", "Valor"]);
  addSheet(workbook, "Resultados", execution.resultados.map((item) => ({ Codigo: item.codigo, Empresa: item.empresa, Tarefa: item.tarefa, Status: item.statusAtual, Origem: item.responsavelOrigem, Destino: item.responsavelDestino, Resultado: item.resultado, Alterado: item.alteradoNestaExecucao ? "Sim" : "Nao", Mensagem: item.mensagem, "ID instancia": item.customerTaskId })), ["Codigo", "Empresa", "Resultado"]);
  addSheet(workbook, "Restantes Kamilly", execution.verificacao.restantesComOrigem.map((item) => ({ Codigo: item.codigo, Empresa: item.empresa, Tarefa: item.tarefa, Status: item.status, "ID instancia": item.customerTaskId })), ["Codigo", "Empresa", "Tarefa"]);
  addSheet(workbook, "Nao confirmadas", execution.verificacao.transferenciasNaoConfirmadas.map((item) => ({ Codigo: item.codigo, Tarefa: item.tarefa, "Responsavel atual ID": item.responsavelAtualId ?? "", "ID instancia": item.customerTaskId })), ["Codigo", "Tarefa"]);
  addSheet(workbook, "Erros verificacao", execution.verificacao.erros.map((item) => ({ Codigo: item.codigo ?? "", "ID instancia": item.customerTaskId ?? "", Mensagem: item.mensagem })), ["Codigo", "Mensagem"]);
  const xlsx = json.replace(/\.json$/i, ".xlsx");
  XLSX.writeFile(workbook, xlsx);
  return { json, xlsx };
}

function carregarExecucao(filePath: string): ExecucaoPessoalPendentes {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as ExecucaoPessoalPendentes;
  if (parsed.tipo !== TIPO_EXECUCAO || !Array.isArray(parsed.resultados)) throw new Error("Arquivo nao e uma execucao valida de tarefas pendentes do Pessoal.");
  return parsed;
}

export async function reverterExecucaoPessoalPendentes(executionPath: string, client: AxiosInstance): Promise<RollbackPessoalPendentes> {
  const fullPath = path.resolve(executionPath);
  const execution = carregarExecucao(fullPath);
  const inicio = new Date().toISOString();
  const resultados: ResultadoRollbackPessoalPendente[] = [];
  for (const item of execution.resultados.filter((result) => result.alteradoNestaExecucao)) {
    try {
      const current = await obterTarefaGerada(client, item.customerTaskId);
      if (idUsuario(donoTarefa(current)) !== item.responsavelDestinoId) throw new Error("Responsavel atual diverge do destino aplicado; rollback bloqueado.");
      await transferirTarefaGerada(client, item.customerTaskId, item.responsavelOrigemId);
      const after = await obterTarefaGerada(client, item.customerTaskId);
      if (idUsuario(donoTarefa(after)) !== item.responsavelOrigemId) throw new Error("Rollback enviado, mas a origem nao foi confirmada.");
      resultados.push({ ...item, rollbackAplicado: true, mensagemRollback: "Responsavel original restaurado e confirmado." });
    } catch (error) {
      if (isGesttaAuthFatalError(error)) throw error;
      resultados.push({ ...item, rollbackAplicado: false, mensagemRollback: erroMensagem(error) });
    }
  }
  return {
    tipo: TIPO_ROLLBACK,
    execucao: { inicio, fim: new Date().toISOString(), execucaoOrigem: fullPath, total: resultados.length, sucesso: resultados.filter((item) => item.rollbackAplicado).length, falha: resultados.filter((item) => !item.rollbackAplicado).length },
    resultados,
  };
}

function salvarRollbackPessoalPendentes(rollback: RollbackPessoalPendentes): { json: string; xlsx: string } {
  const json = saveJson("rollback_reatribuicao_pessoal_pendentes", rollback);
  const workbook = XLSX.utils.book_new();
  addSheet(workbook, "Resumo", Object.entries(rollback.execucao).map(([Campo, Valor]) => ({ Campo, Valor })), ["Campo", "Valor"]);
  addSheet(workbook, "Resultados", rollback.resultados.map((item) => ({ Codigo: item.codigo, Empresa: item.empresa, Tarefa: item.tarefa, Origem: item.responsavelOrigem, Destino: item.responsavelDestino, Aplicado: item.rollbackAplicado ? "Sim" : "Nao", Mensagem: item.mensagemRollback, "ID instancia": item.customerTaskId })), ["Codigo", "Empresa", "Aplicado"]);
  const xlsx = json.replace(/\.json$/i, ".xlsx");
  XLSX.writeFile(workbook, xlsx);
  return { json, xlsx };
}

function argValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

export async function runPessoalPendentesCli(argv = process.argv.slice(2)): Promise<boolean> {
  const preflight = argValue(argv, "--pessoal-pendentes-preflight");
  const apply = argValue(argv, "--pessoal-pendentes-apply");
  const rollback = argValue(argv, "--pessoal-pendentes-rollback");
  const modes = [preflight, apply, rollback].filter(Boolean);
  if (modes.length === 0) return false;
  if (modes.length > 1) throw new Error("Use apenas um comando de tarefas pendentes do Pessoal por execucao.");
  if ((apply || rollback) && !argv.includes("--confirmar")) throw new Error("Use --confirmar para aplicar ou reverter tarefas pendentes do Pessoal.");
  loadRuntimeEnv();
  const auth = await resolveGesttaRuntimeAuth();
  const client = createGesttaClient(auth);
  await preflightGesttaAuth(client);
  if (preflight) {
    const origem = argValue(argv, "--origem");
    const destino = argValue(argv, "--destino");
    if (!origem || !destino) throw new Error("Informe --origem e --destino no preflight.");
    const preview = await executarPreviaPessoalPendentes(preflight, origem, destino, client);
    const saved = salvarPreviaPessoalPendentes(preview);
    console.log(`Previa salva: ${saved.json}`);
    console.log(`Planilha de revisao: ${saved.xlsx}`);
    console.log(`Empresas: ${preview.execucao.empresasResolvidas}/${preview.execucao.totalFonte}. Transferencias: ${preview.execucao.tarefasElegiveis}. Pendencias: ${preview.execucao.pendencias}. Bloqueado: ${preview.execucao.bloqueado ? "sim" : "nao"}.`);
    return true;
  }
  if (apply) {
    const execution = await aplicarPreviaPessoalPendentes(apply, client);
    const saved = salvarExecucaoPessoalPendentes(execution);
    console.log(`Execucao salva: ${saved.json}`);
    console.log(`Planilha de execucao: ${saved.xlsx}`);
    console.log(`Aplicadas: ${execution.execucao.aplicadas}. Ja no destino: ${execution.execucao.jaEstavamNoDestino}. Falhas: ${execution.execucao.falhas}. Verificacao: ${execution.verificacao.ok ? "OK" : "FALHOU"}.`);
    return true;
  }
  const reverted = await reverterExecucaoPessoalPendentes(rollback!, client);
  const saved = salvarRollbackPessoalPendentes(reverted);
  console.log(`Rollback salvo: ${saved.json}`);
  console.log(`Planilha de rollback: ${saved.xlsx}`);
  console.log(`Rollback sucesso: ${reverted.execucao.sucesso}. Falha: ${reverted.execucao.falha}.`);
  return true;
}
