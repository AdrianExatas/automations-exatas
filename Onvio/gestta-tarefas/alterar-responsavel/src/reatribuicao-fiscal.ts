/**
 * Levantamento e aplicacao controlada da redistribuicao de tarefas fiscais.
 *
 * O levantamento nunca altera o Gestta. Ele salva um snapshot por tarefa que
 * deve ser revisado antes de ser usado pelo comando de aplicacao.
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
  patchResponsavel,
  type CompanyTaskItem,
} from "./api/endpoints";
import { resolveGesttaRuntimeAuth } from "./auth/runtime-auth";
import { normalizarCnpj } from "./cnpj";
import { loadRuntimeEnv, preflightGesttaAuth } from "./automation";
import type { ClienteGestta, UsuarioGestta } from "./types";

const TIPO_LEVANTAMENTO = "reatribuicao-fiscal-v1";
const RESPONSAVEL_EXCECAO = "Joao Flavio";
const RELATORIOS_DIR_ENV = "GESTTA_RELATORIOS_DIR";

export type StatusTarefaFiscal =
  | "alteracao_planejada"
  | "excecao_joao_flavio"
  | "pendencia_joao_flavio"
  | "sem_alteracao"
  | "pendencia";

export interface EmpresaFiscalFonte {
  numero: string;
  empresaFonte: string;
  cnpjFonte: string;
  responsavelPlanejado: string;
}

interface EmpresaBd {
  codigo: string;
  cnpj: string;
  nome: string;
}

export interface SnapshotTarefaFiscal {
  numero: string;
  empresa: string;
  cnpj: string;
  customerId: string;
  groupCustomerId: string;
  setor: string;
  tarefa: string;
  responsavelAtualId?: string;
  responsavelAtual?: string;
  responsavelPlanejado: string;
  responsavelPlanejadoId?: string;
  status: StatusTarefaFiscal;
  mensagem: string;
}

export interface PendenciaFiscal {
  numero: string;
  empresa: string;
  cnpj?: string;
  responsavelPlanejado: string;
  mensagem: string;
}

export interface LevantamentoFiscal {
  tipo: typeof TIPO_LEVANTAMENTO;
  execucao: {
    inicio: string;
    fim: string;
    planilha: string;
    totalEmpresas: number;
    tarefas: number;
    alteracoesPlanejadas: number;
    excecoesJoaoFlavio: number;
    pendencias: number;
  };
  tarefas: SnapshotTarefaFiscal[];
  pendencias: PendenciaFiscal[];
}

export interface ResultadoAplicacaoFiscal extends SnapshotTarefaFiscal {
  aplicado: boolean;
  mensagemAplicacao: string;
}

export interface AplicacaoFiscal {
  tipo: "aplicacao-reatribuicao-fiscal-v1";
  execucao: {
    inicio: string;
    fim: string;
    levantamentoOrigem: string;
    total: number;
    sucesso: number;
    falha: number;
  };
  resultados: ResultadoAplicacaoFiscal[];
}

function normalizarTexto(valor: unknown): string {
  return String(valor ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

function texto(valor: unknown): string {
  return String(valor ?? "").trim();
}

function getTaskName(item: CompanyTaskItem): string {
  const task = item.company_task;
  return task && typeof task === "object" ? texto(task.name) : "";
}

function getDepartmentName(item: CompanyTaskItem): string {
  const task = item.company_task;
  return task && typeof task === "object" ? texto(task.company_department?.name) : "";
}

function getCompanyUserId(companyUser: CompanyTaskItem["company_user"]): string | undefined {
  if (typeof companyUser === "string") return companyUser;
  return companyUser && typeof companyUser === "object" ? companyUser._id : undefined;
}

function getCompanyUserName(companyUser: CompanyTaskItem["company_user"]): string | undefined {
  return companyUser && typeof companyUser === "object" ? companyUser.name : undefined;
}

function isTarefaExcecaoJoaoFlavio(tarefa: string): boolean {
  const nome = normalizarTexto(tarefa);
  return nome.includes("parcelamento") || nome.includes("emissao de nota");
}

function getRelatoriosDir(): string {
  const configuredDir = process.env[RELATORIOS_DIR_ENV]?.trim();
  return configuredDir ? path.resolve(configuredDir) : path.join(process.cwd(), "relatorios");
}

function timestampArquivo(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;
}

function getHeader(row: Record<string, unknown>, names: string[]): unknown {
  for (const [key, value] of Object.entries(row)) {
    if (names.includes(normalizarTexto(key))) return value;
  }
  return "";
}

function uniqueMap<T>(items: T[], key: (item: T) => string): Map<string, T | null> {
  const result = new Map<string, T | null>();
  for (const item of items) {
    const id = key(item);
    if (!id) continue;
    result.set(id, result.has(id) ? null : item);
  }
  return result;
}

/** Lê as abas BD e Planilha1 do arquivo de responsabilidades. */
export function lerFonteFiscal(planilhaPath: string): { empresas: EmpresaFiscalFonte[]; bd: EmpresaBd[] } {
  const workbook = XLSX.readFile(planilhaPath, { type: "file" });
  const planilha = workbook.Sheets.Planilha1;
  const abaBd = workbook.Sheets.BD;
  if (!planilha || !abaBd) {
    throw new Error('A planilha deve conter as abas "Planilha1" e "BD".');
  }

  const fonte = XLSX.utils.sheet_to_json<Record<string, unknown>>(planilha, { defval: "", raw: false });
  const bdRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(abaBd, { defval: "", raw: false });
  const empresas: EmpresaFiscalFonte[] = fonte.map((row, index) => {
    const numero = texto(getHeader(row, ["numero"]));
    const empresaFonte = texto(getHeader(row, ["nome empresa"]));
    const responsavelPlanejado = texto(getHeader(row, ["responsavel"]));
    const cnpjFonte = normalizarCnpj(getHeader(row, ["cnpj"]));
    if (!numero || !empresaFonte || !responsavelPlanejado) {
      throw new Error(`Planilha1, linha ${index + 2}: NUMERO, NOME EMPRESA e RESPONSAVEL sao obrigatorios.`);
    }
    return { numero, empresaFonte, cnpjFonte, responsavelPlanejado };
  });
  const bd = bdRows.map((row) => ({
    codigo: texto(getHeader(row, ["codigo"])),
    cnpj: normalizarCnpj(getHeader(row, ["cnpj"])),
    nome: texto(getHeader(row, ["nome"])),
  }));
  return { empresas, bd };
}

function resolverCnpjEstatito(empresa: EmpresaFiscalFonte, bdPorCodigo: Map<string, EmpresaBd | null>): string {
  if (empresa.cnpjFonte) return empresa.cnpjFonte;
  return bdPorCodigo.get(empresa.numero)?.cnpj ?? "";
}

function resolverClienteAoVivo(
  empresa: EmpresaFiscalFonte,
  cnpj: string,
  clientesPorCnpj: Map<string, ClienteGestta | null>,
  clientesPorCodigo: Map<string, ClienteGestta | null>,
  clientesPorNome: Map<string, ClienteGestta | null>
): ClienteGestta | null {
  if (cnpj) return clientesPorCnpj.get(cnpj) ?? null;
  const porCodigo = clientesPorCodigo.get(empresa.numero);
  if (porCodigo !== undefined) return porCodigo;
  return clientesPorNome.get(normalizarTexto(empresa.empresaFonte)) ?? null;
}

function salvarLevantamento(levantamento: LevantamentoFiscal): { json: string; xlsx: string } {
  const dir = getRelatoriosDir();
  fs.mkdirSync(dir, { recursive: true });
  const json = path.join(dir, `backup_reatribuicao_fiscal_${timestampArquivo()}.json`);
  fs.writeFileSync(json, JSON.stringify(levantamento, null, 2), "utf8");
  const xlsx = json.replace(/\.json$/i, ".xlsx");
  const workbook = XLSX.utils.book_new();
  const resumo = levantamento.execucao;
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["Campo", "Valor"],
    ["Inicio", resumo.inicio], ["Fim", resumo.fim], ["Planilha", resumo.planilha],
    ["Empresas", resumo.totalEmpresas], ["Tarefas", resumo.tarefas],
    ["Alteracoes planejadas", resumo.alteracoesPlanejadas],
    ["Excecoes Joao Flavio", resumo.excecoesJoaoFlavio], ["Pendencias", resumo.pendencias],
  ]), "Resumo");
  const headers = ["Numero", "Empresa", "CNPJ", "Setor", "Tarefa", "Responsavel atual", "Responsavel planejado", "Group customer ID", "Status", "Mensagem"];
  const addTasks = (name: string, rows: SnapshotTarefaFiscal[]) => XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    headers,
    ...rows.map((item) => [item.numero, item.empresa, item.cnpj, item.setor, item.tarefa, item.responsavelAtual ?? "", item.responsavelPlanejado, item.groupCustomerId, item.status, item.mensagem]),
  ]), name);
  addTasks("Alteracoes planejadas", levantamento.tarefas.filter((item) => item.status === "alteracao_planejada"));
  addTasks("Excecoes Joao Flavio", levantamento.tarefas.filter((item) => item.status === "excecao_joao_flavio" || item.status === "pendencia_joao_flavio"));
  addTasks("Sem alteracao", levantamento.tarefas.filter((item) => item.status === "sem_alteracao"));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["Numero", "Empresa", "CNPJ", "Responsavel planejado", "Mensagem"],
    ...levantamento.pendencias.map((item) => [item.numero, item.empresa, item.cnpj ?? "", item.responsavelPlanejado, item.mensagem]),
    ...levantamento.tarefas.filter((item) => item.status === "pendencia").map((item) => [item.numero, item.empresa, item.cnpj, item.responsavelPlanejado, item.mensagem]),
  ]), "Pendencias");
  XLSX.writeFile(workbook, xlsx);
  return { json, xlsx };
}

/** Cria o inventário/backup. Esta funcao nao chama PATCH. */
export async function executarLevantamentoFiscal(planilhaPath: string, client: AxiosInstance): Promise<LevantamentoFiscal> {
  const inicio = new Date().toISOString();
  const resolvedPath = path.resolve(process.cwd(), planilhaPath);
  const { empresas, bd } = lerFonteFiscal(resolvedPath);
  const bdPorCodigo = uniqueMap(bd, (item) => item.codigo);
  const clientes = [...await listarClientes(client), ...await listarClientes(client, "", false)];
  const clientesPorCnpj = uniqueMap(clientes, (item) => normalizarCnpj(item.cnpj));
  const clientesPorCodigo = uniqueMap(clientes, (item) => texto(item.code));
  const clientesPorNome = uniqueMap(clientes, (item) => normalizarTexto(item.name));
  const funcionariosPorNome = uniqueMap(await listarFuncionarios(client), (item) => normalizarTexto(item.name));
  const tarefas: SnapshotTarefaFiscal[] = [];
  const pendencias: PendenciaFiscal[] = [];

  for (const empresa of empresas) {
    const cnpj = resolverCnpjEstatito(empresa, bdPorCodigo);
    const cliente = resolverClienteAoVivo(empresa, cnpj, clientesPorCnpj, clientesPorCodigo, clientesPorNome);
    if (!cliente) {
      pendencias.push({ numero: empresa.numero, empresa: empresa.empresaFonte, cnpj: cnpj || undefined, responsavelPlanejado: empresa.responsavelPlanejado, mensagem: "Empresa nao resolvida de forma unica no Gestta; nenhum PATCH sera permitido." });
      continue;
    }
    const destino = funcionariosPorNome.get(normalizarTexto(empresa.responsavelPlanejado));
    let itens: CompanyTaskItem[];
    try {
      itens = await getGroupCustomerItems(client, cliente._id, "Fiscal");
    } catch (error) {
      if (isGesttaAuthFatalError(error)) throw error;
      pendencias.push({ numero: empresa.numero, empresa: cliente.name || empresa.empresaFonte, cnpj: normalizarCnpj(cliente.cnpj), responsavelPlanejado: empresa.responsavelPlanejado, mensagem: `Falha ao consultar tarefas fiscais: ${error instanceof Error ? error.message : String(error)}` });
      continue;
    }
    if (itens.length === 0) {
      pendencias.push({ numero: empresa.numero, empresa: cliente.name || empresa.empresaFonte, cnpj: normalizarCnpj(cliente.cnpj), responsavelPlanejado: empresa.responsavelPlanejado, mensagem: "Nenhuma tarefa nos setores Fiscal/Fiscal - Simples Nacional." });
      continue;
    }
    for (const item of itens) {
      const tarefa = getTaskName(item) || "(tarefa sem nome)";
      const atual = getCompanyUserName(item.company_user);
      const atualId = getCompanyUserId(item.company_user);
      const base = {
        numero: empresa.numero, empresa: cliente.name || empresa.empresaFonte, cnpj: normalizarCnpj(cliente.cnpj) || cnpj,
        customerId: cliente._id, groupCustomerId: item._id, setor: getDepartmentName(item), tarefa,
        responsavelAtualId: atualId, responsavelAtual: atual, responsavelPlanejado: empresa.responsavelPlanejado,
      };
      const comJoao = normalizarTexto(atual) === normalizarTexto(RESPONSAVEL_EXCECAO);
      if (comJoao) {
        tarefas.push({ ...base, responsavelPlanejado: RESPONSAVEL_EXCECAO, status: "excecao_joao_flavio", mensagem: "Responsavel atual e Joao Flavio; tarefa imutavel, nenhum PATCH." });
      } else if (isTarefaExcecaoJoaoFlavio(tarefa)) {
        tarefas.push({ ...base, responsavelPlanejado: RESPONSAVEL_EXCECAO, status: "pendencia_joao_flavio", mensagem: "Tarefa de parcelamento/emissao de nota deveria estar com Joao Flavio; sinalizada sem PATCH." });
      } else if (!destino) {
        tarefas.push({ ...base, status: "pendencia", mensagem: `Responsavel de destino nao encontrado/ativo: ${empresa.responsavelPlanejado}.` });
      } else if (atualId === destino._id) {
        tarefas.push({ ...base, responsavelPlanejadoId: destino._id, status: "sem_alteracao", mensagem: "Responsavel ja corresponde ao planejado." });
      } else {
        tarefas.push({ ...base, responsavelPlanejadoId: destino._id, status: "alteracao_planejada", mensagem: "Aguardando aprovacao; nenhum PATCH executado." });
      }
    }
  }
  const levantamento: LevantamentoFiscal = {
    tipo: TIPO_LEVANTAMENTO,
    execucao: {
      inicio, fim: new Date().toISOString(), planilha: resolvedPath, totalEmpresas: empresas.length, tarefas: tarefas.length,
      alteracoesPlanejadas: tarefas.filter((item) => item.status === "alteracao_planejada").length,
      excecoesJoaoFlavio: tarefas.filter((item) => item.status === "excecao_joao_flavio" || item.status === "pendencia_joao_flavio").length,
      pendencias: pendencias.length + tarefas.filter((item) => item.status === "pendencia" || item.status === "pendencia_joao_flavio").length,
    }, tarefas, pendencias,
  };
  salvarLevantamento(levantamento);
  return levantamento;
}

function checkpointPath(levantamentoPath: string): string {
  const id = crypto.createHash("sha256").update(path.resolve(levantamentoPath)).digest("hex").slice(0, 12);
  return path.join(getRelatoriosDir(), `checkpoint_reatribuicao_fiscal_${id}.json`);
}

function loadCheckpoint(levantamentoPath: string): ResultadoAplicacaoFiscal[] {
  const file = checkpointPath(levantamentoPath);
  if (!fs.existsSync(file)) return [];
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8")) as { resultados?: ResultadoAplicacaoFiscal[] };
    return Array.isArray(value.resultados) ? value.resultados : [];
  } catch { return []; }
}

function saveCheckpoint(levantamentoPath: string, resultados: ResultadoAplicacaoFiscal[]): void {
  fs.mkdirSync(getRelatoriosDir(), { recursive: true });
  fs.writeFileSync(checkpointPath(levantamentoPath), JSON.stringify({ resultados }, null, 2), "utf8");
}

function salvarAplicacao(relatorio: AplicacaoFiscal): string {
  const dir = getRelatoriosDir();
  fs.mkdirSync(dir, { recursive: true });
  const json = path.join(dir, `execucao_reatribuicao_fiscal_${timestampArquivo()}.json`);
  fs.writeFileSync(json, JSON.stringify(relatorio, null, 2), "utf8");
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["Campo", "Valor"], ["Inicio", relatorio.execucao.inicio], ["Fim", relatorio.execucao.fim], ["Origem", relatorio.execucao.levantamentoOrigem], ["Total", relatorio.execucao.total], ["Sucesso", relatorio.execucao.sucesso], ["Falha", relatorio.execucao.falha],
  ]), "Resumo");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["Numero", "Empresa", "CNPJ", "Setor", "Tarefa", "Responsavel anterior", "Responsavel aplicado", "Group customer ID", "Aplicado", "Mensagem"],
    ...relatorio.resultados.map((item) => [item.numero, item.empresa, item.cnpj, item.setor, item.tarefa, item.responsavelAtual ?? "", item.responsavelPlanejado, item.groupCustomerId, item.aplicado ? "Sim" : "Nao", item.mensagemAplicacao]),
  ]), "Resultados");
  XLSX.writeFile(workbook, json.replace(/\.json$/i, ".xlsx"));
  return json;
}

function carregarLevantamento(pathLevantamento: string): LevantamentoFiscal {
  const data = JSON.parse(fs.readFileSync(pathLevantamento, "utf8")) as LevantamentoFiscal;
  if (data.tipo !== TIPO_LEVANTAMENTO || !Array.isArray(data.tarefas) || !Array.isArray(data.pendencias)) {
    throw new Error("Arquivo de levantamento fiscal invalido.");
  }
  return data;
}

/** Aplica somente as tarefas planejadas de um backup aprovado. */
export async function aplicarLevantamentoFiscal(levantamentoPath: string, client: AxiosInstance): Promise<AplicacaoFiscal> {
  const origem = path.resolve(process.cwd(), levantamentoPath);
  const levantamento = carregarLevantamento(origem);
  const inicio = new Date().toISOString();
  const concluidos = loadCheckpoint(origem);
  // Um checkpoint conserva tambem falhas para auditoria. Ao retomar, somente
  // itens efetivamente aplicados sao ignorados; falhas sao reprocessadas.
  const concluidosIds = new Set(concluidos.filter((item) => item.aplicado).map((item) => item.groupCustomerId));
  const resultados = [...concluidos];
  const cacheTarefas = new Map<string, CompanyTaskItem[]>();
  for (const item of levantamento.tarefas.filter((tarefa) => tarefa.status === "alteracao_planejada" && !concluidosIds.has(tarefa.groupCustomerId))) {
    let resultado: ResultadoAplicacaoFiscal;
    try {
      const tarefasCliente = cacheTarefas.get(item.customerId) ?? await getGroupCustomerItems(client, item.customerId, "Fiscal");
      cacheTarefas.set(item.customerId, tarefasCliente);
      const atual = tarefasCliente.find((candidate) => candidate._id === item.groupCustomerId);
      if (!atual) {
        resultado = { ...item, aplicado: false, mensagemAplicacao: "Vinculo fiscal nao existe mais; PATCH bloqueado." };
      } else if (getCompanyUserId(atual.company_user) !== item.responsavelAtualId) {
        resultado = { ...item, aplicado: false, mensagemAplicacao: "Responsavel atual diverge do backup; PATCH bloqueado." };
      } else if (!item.responsavelPlanejadoId) {
        resultado = { ...item, aplicado: false, mensagemAplicacao: "Backup sem ID do responsavel de destino; PATCH bloqueado." };
      } else {
        await patchResponsavel(client, { ids: [item.groupCustomerId], company_user: item.responsavelPlanejadoId });
        resultado = { ...item, aplicado: true, mensagemAplicacao: "Responsavel alterado com sucesso." };
      }
    } catch (error) {
      if (isGesttaAuthFatalError(error)) throw error;
      resultado = { ...item, aplicado: false, mensagemAplicacao: `Erro ao aplicar: ${error instanceof Error ? error.message : String(error)}` };
    }
    const indiceAnterior = resultados.findIndex((existente) => existente.groupCustomerId === resultado.groupCustomerId);
    if (indiceAnterior >= 0) resultados[indiceAnterior] = resultado;
    else resultados.push(resultado);
    saveCheckpoint(origem, resultados);
  }
  const relatorio: AplicacaoFiscal = {
    tipo: "aplicacao-reatribuicao-fiscal-v1",
    execucao: { inicio, fim: new Date().toISOString(), levantamentoOrigem: origem, total: resultados.length, sucesso: resultados.filter((item) => item.aplicado).length, falha: resultados.filter((item) => !item.aplicado).length },
    resultados,
  };
  salvarAplicacao(relatorio);
  if (relatorio.execucao.falha === 0 && fs.existsSync(checkpointPath(origem))) fs.unlinkSync(checkpointPath(origem));
  return relatorio;
}

export async function runFiscalCli(argv = process.argv.slice(2)): Promise<boolean> {
  const levantamentoIndex = argv.indexOf("--levantamento-fiscal");
  const aplicarIndex = argv.indexOf("--aplicar-levantamento-fiscal");
  if (levantamentoIndex < 0 && aplicarIndex < 0) return false;
  if (levantamentoIndex >= 0 && aplicarIndex >= 0) throw new Error("Use apenas um comando fiscal por execucao.");
  loadRuntimeEnv();
  const auth = await resolveGesttaRuntimeAuth();
  const client = createGesttaClient(auth);
  await preflightGesttaAuth(client);
  if (levantamentoIndex >= 0) {
    const source = argv[levantamentoIndex + 1];
    if (!source || source.startsWith("-")) throw new Error("Informe a planilha apos --levantamento-fiscal.");
    const levantamento = await executarLevantamentoFiscal(source, client);
    console.log(`Levantamento concluido. Alteracoes planejadas: ${levantamento.execucao.alteracoesPlanejadas}. Pendencias: ${levantamento.execucao.pendencias}.`);
    return true;
  }
  if (!argv.includes("--confirmar")) {
    throw new Error("A aplicacao exige --confirmar apos sua revisao do backup.");
  }
  const backup = argv[aplicarIndex + 1];
  if (!backup || backup.startsWith("-")) throw new Error("Informe o backup JSON apos --aplicar-levantamento-fiscal.");
  const aplicacao = await aplicarLevantamentoFiscal(backup, client);
  console.log(`Aplicacao concluida. Sucesso: ${aplicacao.execucao.sucesso}. Falha: ${aplicacao.execucao.falha}.`);
  return true;
}
