import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import {
  findColumn,
  normalizeCnpj,
  normalizeCodigo,
  normalizeComparableText,
} from "./domain/empresa-normalization";
import { resolveRuntimePath } from "./project-paths";
import type {
  CompareEmpresasPlanilhasOptions,
  CompareEmpresasPlanilhasResult,
  ClientUser,
  ClientUserLookupResult,
  ClientUserLookupReportRow,
  ClientUserLookupStatus,
  EmpresaChangedRow,
  EmpresaCodigoConflict,
  EmpresaComparisonRow,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx");

interface AtualizadaRow {
  rawCnpj: string;
  cnpj: string;
  codigo: string;
  nome: string;
  ativo: string;
  dataExclusao: string;
}

interface OperacionalRow {
  rawCnpj: string;
  cnpj: string;
  codigo: string;
  nome: string;
  solicitante: string;
  departamento: string;
  assunto: string;
  descricao: string;
  qtdArquivos: string;
  arquivos: string;
  onvioClientId: string;
  onvioRequesterId: string;
  onvioDepartmentId: string;
}

interface OperationalDefaults {
  departamento: string;
  assunto: string;
  descricao: string;
}

const FINAL_HEADERS = [
  "CODIGO",
  "CNPJ EMPRESA",
  "EMPRESA",
  "RESPONSÁVEL",
  "Departamento",
  "Assunto",
  "Descrição",
  "QTD_ARQUIVOS",
  "ARQUIVOS",
  "ONVIO_CLIENT_ID",
  "ONVIO_STATUS",
  "ONVIO_CLIENT_SOURCE",
  "ONVIO_REQUESTER_ID",
  "ONVIO_DEPARTMENT_ID",
  "USUARIOS_CLIENTE",
  "QTD_USUARIOS_CLIENTE",
  "STATUS_USUARIOS_CLIENTE",
];

const RESPONSAVEL_COLUMN = "RESPONSÁVEL";
const ONVIO_REQUESTER_ID_COLUMN = "ONVIO_REQUESTER_ID";
const USUARIOS_CLIENTE_COLUMN = "USUARIOS_CLIENTE";
const QTD_USUARIOS_CLIENTE_COLUMN = "QTD_USUARIOS_CLIENTE";
const STATUS_USUARIOS_CLIENTE_COLUMN = "STATUS_USUARIOS_CLIENTE";
const USER_OPTIONS_SHEET_NAME = "Opcoes Usuarios";
const USER_OPTIONS_HEADERS = ["CODIGO", "CNPJ", "EMPRESA", "USUARIO"];

function assertFileExists(filePath: string, label: string): string {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`${label} nao encontrada: ${resolved}`);
  }
  return resolved;
}

function readWorkbookRows(filePath: string): Record<string, unknown>[] {
  const workbook = XLSX.readFile(filePath);
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error(`Planilha vazia: ${filePath}`);
  return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {
    defval: "",
    raw: false,
  }) as Record<string, unknown>[];
}

function readString(row: Record<string, unknown>, column?: string): string {
  if (!column) return "";
  const value = row[column];
  return value == null ? "" : String(value).trim();
}

function readAtualizadaRows(filePath: string): AtualizadaRow[] {
  const rows = readWorkbookRows(filePath);
  const columns = Object.keys(rows[0] ?? {});
  const cnpjColumn = findColumn(columns, ["cnpj empresa", "cnpj", "cpf"]) ?? columns[0];
  const codigoColumn = findColumn(columns, ["codigo", "código"]);
  const nomeColumn = findColumn(columns, ["razao social", "razão social", "empresa", "nome"]);
  const ativoColumn = findColumn(columns, ["ativo"]);
  const dataExclusaoColumn = findColumn(columns, ["data exclusao", "data exclusão"]);

  if (!cnpjColumn || !codigoColumn || !nomeColumn) {
    throw new Error("Planilha atualizada precisa conter CNPJ, Codigo e Razao Social/Empresa.");
  }

  return rows
    .map((row) => ({
      rawCnpj: readString(row, cnpjColumn),
      cnpj: normalizeCnpj(row[cnpjColumn]),
      codigo: normalizeCodigo(row[codigoColumn]),
      nome: readString(row, nomeColumn),
      ativo: readString(row, ativoColumn),
      dataExclusao: readString(row, dataExclusaoColumn),
    }))
    .filter((row) => row.cnpj);
}

function readOperacionalRows(filePath: string): OperacionalRow[] {
  const rows = readWorkbookRows(filePath);
  const columns = Object.keys(rows[0] ?? {});
  const cnpjColumn = findColumn(columns, ["cnpj empresa", "cnpj", "cpf"]) ?? columns[0];
  const codigoColumn = findColumn(columns, ["codigo", "código"]);
  const nomeColumn = findColumn(columns, ["empresa", "nome", "razao social", "razão social"]);
  const solicitanteColumn = findColumn(columns, ["solicitante", "responsavel", "responsável"]);
  const departamentoColumn = findColumn(columns, ["departamento"]);
  const assuntoColumn = findColumn(columns, ["assunto"]);
  const descricaoColumn = findColumn(columns, ["descricao", "descrição"]);
  const qtdArquivosColumn = findColumn(columns, [
    "qtd_arquivos",
    "qtd arquivos",
    "quantidade de arquivos",
  ]);
  const arquivosColumn = findColumn(
    columns,
    ["arquivos", "arquivo", "nome do arquivo", "nomes dos arquivos"],
    "exact",
  );
  const onvioClientIdColumn = findColumn(columns, ["onvio_client_id", "client id", "clientid"]);
  const onvioRequesterIdColumn = findColumn(columns, [
    "onvio_requester_id",
    "requester id",
    "requesterid",
  ]);
  const onvioDepartmentIdColumn = findColumn(columns, [
    "onvio_department_id",
    "department id",
    "departmentid",
  ]);

  if (!cnpjColumn || !codigoColumn || !nomeColumn) {
    throw new Error("Planilha operacional precisa conter CNPJ, Codigo e Empresa.");
  }

  return rows
    .map((row) => ({
      rawCnpj: readString(row, cnpjColumn),
      cnpj: normalizeCnpj(row[cnpjColumn]),
      codigo: normalizeCodigo(row[codigoColumn]),
      nome: readString(row, nomeColumn),
      solicitante: readString(row, solicitanteColumn),
      departamento: readString(row, departamentoColumn),
      assunto: readString(row, assuntoColumn),
      descricao: readString(row, descricaoColumn),
      qtdArquivos: readString(row, qtdArquivosColumn),
      arquivos: readString(row, arquivosColumn),
      onvioClientId: readString(row, onvioClientIdColumn),
      onvioRequesterId: readString(row, onvioRequesterIdColumn),
      onvioDepartmentId: readString(row, onvioDepartmentIdColumn),
    }))
    .filter((row) => row.cnpj);
}

function isAtualizadaRowActive(row: AtualizadaRow): boolean {
  const ativo = normalizeComparableText(row.ativo);
  return (ativo === "" || ativo === "SIM") && row.dataExclusao.trim() === "";
}

function toComparisonRow(row: Pick<AtualizadaRow | OperacionalRow, "cnpj" | "codigo" | "nome">): EmpresaComparisonRow {
  return {
    cnpj: row.cnpj,
    codigo: row.codigo,
    nome: row.nome,
  };
}

function buildMapByCnpj<T extends { cnpj: string }>(rows: T[], label: string): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    if (map.has(row.cnpj)) {
      throw new Error(`CNPJ duplicado na planilha ${label}: ${row.cnpj}`);
    }
    map.set(row.cnpj, row);
  }
  return map;
}

function buildMapByCodigo<T extends { codigo: string }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    if (!row.codigo) continue;
    if (!map.has(row.codigo)) map.set(row.codigo, row);
  }
  return map;
}

function findDefaults(operacionais: OperacionalRow[]): OperationalDefaults {
  return {
    departamento: operacionais.find((row) => row.departamento)?.departamento ?? "",
    assunto: operacionais.find((row) => row.assunto)?.assunto ?? "",
    descricao: operacionais.find((row) => row.descricao)?.descricao ?? "",
  };
}

function compareCodigoNumerically(a: string, b: string): number {
  const aNumber = Number(a);
  const bNumber = Number(b);
  if (Number.isFinite(aNumber) && Number.isFinite(bNumber) && aNumber !== bNumber) {
    return aNumber - bNumber;
  }
  return a.localeCompare(b, "pt-BR", { numeric: true });
}

function buildFinalRows(options: {
  atualizadasAtivas: AtualizadaRow[];
  operacionalByCnpj: Map<string, OperacionalRow>;
  defaults: OperationalDefaults;
}): Record<string, string>[] {
  return options.atualizadasAtivas
    .map((atualizada) => {
      const operacional = options.operacionalByCnpj.get(atualizada.cnpj);
      return {
        CODIGO: atualizada.codigo,
        "CNPJ EMPRESA": atualizada.cnpj,
        EMPRESA: atualizada.nome,
        [RESPONSAVEL_COLUMN]: operacional?.solicitante ?? "",
        Departamento: operacional?.departamento || options.defaults.departamento,
        Assunto: operacional?.assunto || options.defaults.assunto,
        Descrição: operacional?.descricao || options.defaults.descricao,
        QTD_ARQUIVOS: operacional?.qtdArquivos ?? "",
        ARQUIVOS: operacional?.arquivos ?? "",
        ONVIO_CLIENT_ID: operacional?.onvioClientId ?? "",
        ONVIO_STATUS: "",
        ONVIO_CLIENT_SOURCE: "",
        ONVIO_REQUESTER_ID: operacional?.onvioRequesterId ?? "",
        ONVIO_DEPARTMENT_ID: operacional?.onvioDepartmentId ?? "",
        [USUARIOS_CLIENTE_COLUMN]: "",
        [QTD_USUARIOS_CLIENTE_COLUMN]: "",
        [STATUS_USUARIOS_CLIENTE_COLUMN]: "",
      };
    })
    .sort((a, b) => compareCodigoNumerically(a.CODIGO, b.CODIGO));
}

function formatClientUser(user: ClientUser): string {
  const nome = user.nome.trim();
  const email = user.email?.trim();
  return nome || email || user.id?.trim() || "";
}

function normalizeClientUserLookup(
  result: ClientUser[] | ClientUserLookupResult,
): ClientUser[] {
  return Array.isArray(result) ? result : result.users;
}

function uniqueClientUserLabels(users: ClientUser[]): string[] {
  return Array.from(
    new Set(users.map(formatClientUser).map((value) => value.trim()).filter(Boolean)),
  );
}

function normalizeClientUserLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toUpperCase();
}

function findUserByNormalizedLabel(users: ClientUser[], label: string): ClientUser | undefined {
  const wanted = normalizeClientUserLabel(label);
  if (!wanted) return undefined;

  const matches = users.filter((user) => normalizeClientUserLabel(formatClientUser(user)) === wanted);
  if (matches.length === 1) return matches[0];

  const withId = matches.filter((user) => user.id?.trim());
  if (withId.length === 1) return withId[0];

  return undefined;
}

function resolveUserIdByLabel(users: ClientUser[], label: string): string {
  return findUserByNormalizedLabel(users, label)?.id?.trim() ?? "";
}

function buildClientUserLookupTargets(options: {
  finalRows: Record<string, string>[];
  novasCnpjs: Set<string>;
}): Record<string, string>[] {
  return options.finalRows.filter((row) => {
    const isNew = options.novasCnpjs.has(row["CNPJ EMPRESA"]);
    const hasResponsavel = Boolean(row[RESPONSAVEL_COLUMN]?.trim());
    const missingResponsavel = !hasResponsavel;
    const missingRequesterId =
      hasResponsavel && !row[ONVIO_REQUESTER_ID_COLUMN]?.trim();
    return isNew || hasResponsavel || missingResponsavel || missingRequesterId;
  });
}

async function enrichFinalRowsWithClientUsers(options: {
  finalRows: Record<string, string>[];
  novasCnpjs: Set<string>;
  provider?: CompareEmpresasPlanilhasOptions["clientUsersProvider"];
  logger?: CompareEmpresasPlanilhasOptions["logger"];
}): Promise<ClientUserLookupReportRow[]> {
  if (!options.provider) return [];

  const reportRows: ClientUserLookupReportRow[] = [];
  const targets = buildClientUserLookupTargets({
    finalRows: options.finalRows,
    novasCnpjs: options.novasCnpjs,
  });

  for (const row of targets) {
    const codigo = row.CODIGO;
    const cnpj = row["CNPJ EMPRESA"];
    const nome = row.EMPRESA;
    let usuariosCliente = "";
    let qtdUsuariosCliente = 0;
    let statusUsuariosCliente: ClientUserLookupStatus = "nenhum_usuario";
    let mensagem: string | undefined;

    try {
      options.logger?.info?.(`[Usuarios Cliente] Consultando ${codigo} - ${nome}`);
      const users = normalizeClientUserLookup(await options.provider.lookupUsers({ codigo, cnpj, nome }));
      const labels = uniqueClientUserLabels(users);
      usuariosCliente = labels.join("; ");
      qtdUsuariosCliente = labels.length;
      const currentResponsavel = row[RESPONSAVEL_COLUMN]?.trim() ?? "";
      const matchedCurrentUser = findUserByNormalizedLabel(users, currentResponsavel);

      if (labels.length === 1) {
        const singleUserId = resolveUserIdByLabel(users, labels[0]);
        if (!currentResponsavel || matchedCurrentUser) {
          statusUsuariosCliente = "preenchido_unico";
          row[RESPONSAVEL_COLUMN] = labels[0];
        } else {
          statusUsuariosCliente = "responsavel_corrigido_unico";
          row[RESPONSAVEL_COLUMN] = labels[0];
        }
        row[ONVIO_REQUESTER_ID_COLUMN] = singleUserId;
      } else if (labels.length > 1) {
        if (!currentResponsavel) {
          statusUsuariosCliente = "multipla_escolha";
          row[ONVIO_REQUESTER_ID_COLUMN] = "";
        } else if (matchedCurrentUser) {
          statusUsuariosCliente = "multipla_escolha";
          row[ONVIO_REQUESTER_ID_COLUMN] = matchedCurrentUser.id?.trim() ?? "";
        } else {
          statusUsuariosCliente = "responsavel_invalido_multipla_escolha";
          row[RESPONSAVEL_COLUMN] = "";
          row[ONVIO_REQUESTER_ID_COLUMN] = "";
        }
      } else {
        row[ONVIO_REQUESTER_ID_COLUMN] = "";
      }
    } catch (error) {
      statusUsuariosCliente = "erro_consulta";
      mensagem = error instanceof Error ? error.message : String(error);
      options.logger?.warn?.(
        `[Usuarios Cliente] Falha ao consultar ${codigo} - ${nome}: ${mensagem}`,
      );
    }

    row[USUARIOS_CLIENTE_COLUMN] = usuariosCliente;
    row[QTD_USUARIOS_CLIENTE_COLUMN] = String(qtdUsuariosCliente);
    row[STATUS_USUARIOS_CLIENTE_COLUMN] = statusUsuariosCliente;

    reportRows.push({
      codigo,
      cnpj,
      nome,
      usuariosCliente,
      qtdUsuariosCliente,
      statusUsuariosCliente,
      mensagem,
    });
  }

  return reportRows;
}

function buildTimestampForPath(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + "_" + [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join("-");
}

function resolveOutputDir(outputDir?: string): string {
  if (outputDir) return path.resolve(outputDir);
  return resolveRuntimePath("comparisons", buildTimestampForPath());
}

function collectHeaders(rows: object[]): string[] {
  const headers: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const header of Object.keys(row)) {
      if (seen.has(header)) continue;
      seen.add(header);
      headers.push(header);
    }
  }
  return headers;
}

function appendRowsSheet(
  workbook: ExcelJS.Workbook,
  rows: object[],
  name: string,
  headers = collectHeaders(rows),
): ExcelJS.Worksheet {
  const worksheet = workbook.addWorksheet(name);
  if (headers.length === 0) return worksheet;

  worksheet.addRow(headers);
  for (const row of rows) {
    const record = row as Record<string, unknown>;
    worksheet.addRow(headers.map((header) => record[header] ?? ""));
  }
  return worksheet;
}

function splitClientUserLabels(row: Record<string, string>): string[] {
  return row[USUARIOS_CLIENTE_COLUMN]
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildUserOptionRows(finalRows: Record<string, string>[]): {
  rows: Record<string, string>[];
  rangesByFinalRow: Map<number, { startRow: number; endRow: number }>;
} {
  const rows: Record<string, string>[] = [];
  const rangesByFinalRow = new Map<number, { startRow: number; endRow: number }>();

  finalRows.forEach((row, rowIndex) => {
    const labels = splitClientUserLabels(row);
    if (labels.length === 0) return;

    const startRow = rows.length + 2;
    for (const label of labels) {
      rows.push({
        CODIGO: row.CODIGO,
        CNPJ: row["CNPJ EMPRESA"],
        EMPRESA: row.EMPRESA,
        USUARIO: label,
      });
    }
    rangesByFinalRow.set(rowIndex, {
      startRow,
      endRow: rows.length + 1,
    });
  });

  return { rows, rangesByFinalRow };
}

function appendHiddenUserOptionsSheet(
  workbook: ExcelJS.Workbook,
  userOptionRows: Record<string, string>[],
): ExcelJS.Worksheet {
  const worksheet = appendRowsSheet(
    workbook,
    userOptionRows,
    USER_OPTIONS_SHEET_NAME,
    USER_OPTIONS_HEADERS,
  );
  worksheet.state = "hidden";
  return worksheet;
}

function applyResponsavelDropdowns(
  worksheet: ExcelJS.Worksheet,
  rangesByFinalRow: Map<number, { startRow: number; endRow: number }>,
): void {
  const responsavelColumn = FINAL_HEADERS.indexOf(RESPONSAVEL_COLUMN) + 1;
  for (const [finalRowIndex, range] of rangesByFinalRow) {
    const excelRow = finalRowIndex + 2;
    worksheet.getRow(excelRow).getCell(responsavelColumn).dataValidation = {
      type: "list",
      allowBlank: true,
      showErrorMessage: true,
      errorTitle: "Usuario invalido",
      error: "Selecione um usuario da lista.",
      formulae: [`'${USER_OPTIONS_SHEET_NAME}'!$D$${range.startRow}:$D$${range.endRow}`],
    };
  }
}

function appendFinalSheetWithDropdowns(
  workbook: ExcelJS.Workbook,
  finalRows: Record<string, string>[],
  name: string,
  rangesByFinalRow: Map<number, { startRow: number; endRow: number }>,
): ExcelJS.Worksheet {
  const worksheet = appendRowsSheet(workbook, finalRows, name, FINAL_HEADERS);
  applyResponsavelDropdowns(worksheet, rangesByFinalRow);
  return worksheet;
}

async function writeOutputFiles(options: {
  outputDir: string;
  result: Omit<CompareEmpresasPlanilhasResult, "reportPath" | "finalPlanilhaPath" | "outputDir">;
  finalRows: Record<string, string>[];
}): Promise<{ reportPath: string; finalPlanilhaPath: string }> {
  fs.mkdirSync(options.outputDir, { recursive: true });

  const reportPath = path.join(options.outputDir, "relatorio-comparacao.xlsx");
  const finalPlanilhaPath = path.join(options.outputDir, "planilha-operacional-atualizada.xlsx");
  const userOptions = buildUserOptionRows(options.finalRows);

  const reportWorkbook = new ExcelJS.Workbook();
  appendRowsSheet(
    reportWorkbook,
    [
      { CAMPO: "ATUALIZADAS_ATIVAS", VALOR: options.result.summary.atualizadas },
      { CAMPO: "EXCLUIDAS_POR_COMPETENCIA", VALOR: options.result.summary.excluidasPorCompetencia },
      { CAMPO: "OPERACIONAIS", VALOR: options.result.summary.operacionais },
      { CAMPO: "PLANILHA_FINAL", VALOR: options.result.summary.final },
      { CAMPO: "NOVAS", VALOR: options.result.summary.novas },
      { CAMPO: "REMOVIDAS", VALOR: options.result.summary.removidas },
      { CAMPO: "ALTERADAS", VALOR: options.result.summary.alteradas },
      { CAMPO: "CONFLITOS_CODIGO", VALOR: options.result.summary.conflitosCodigo },
      { CAMPO: "USUARIOS_CONSULTADOS", VALOR: options.result.summary.usuariosConsultados },
      { CAMPO: "USUARIOS_PREENCHIDOS", VALOR: options.result.summary.usuariosPreenchidos },
      { CAMPO: "USUARIOS_MULTIPLA_ESCOLHA", VALOR: options.result.summary.usuariosMultiplaEscolha },
      { CAMPO: "USUARIOS_NAO_ENCONTRADOS", VALOR: options.result.summary.usuariosNaoEncontrados },
      { CAMPO: "USUARIOS_COM_ERRO", VALOR: options.result.summary.usuariosComErro },
    ],
    "Resumo",
  );
  appendRowsSheet(reportWorkbook, options.result.novas, "Novas");
  appendRowsSheet(reportWorkbook, options.result.excluidasPorCompetencia, "Excluidas Competencia");
  appendRowsSheet(reportWorkbook, options.result.removidas, "Removidas");
  appendRowsSheet(reportWorkbook, options.result.alteradas, "Alteradas");
  appendRowsSheet(reportWorkbook, options.result.conflitosCodigo, "Conflitos Codigo");
  appendRowsSheet(reportWorkbook, options.result.usuariosCliente, "Usuarios Cliente");
  appendFinalSheetWithDropdowns(
    reportWorkbook,
    options.finalRows,
    "Planilha Final",
    userOptions.rangesByFinalRow,
  );
  appendHiddenUserOptionsSheet(reportWorkbook, userOptions.rows);
  await reportWorkbook.xlsx.writeFile(reportPath);

  const finalWorkbook = new ExcelJS.Workbook();
  appendFinalSheetWithDropdowns(
    finalWorkbook,
    options.finalRows,
    "Planilha1",
    userOptions.rangesByFinalRow,
  );
  appendHiddenUserOptionsSheet(finalWorkbook, userOptions.rows);
  await finalWorkbook.xlsx.writeFile(finalPlanilhaPath);

  return { reportPath, finalPlanilhaPath };
}

export async function compareEmpresasPlanilhas(
  options: CompareEmpresasPlanilhasOptions,
): Promise<CompareEmpresasPlanilhasResult> {
  const atualizadaPath = assertFileExists(options.atualizadaPath, "Planilha atualizada");
  const operacionalPath = assertFileExists(options.operacionalPath, "Planilha operacional");

  const atualizadas = readAtualizadaRows(atualizadaPath);
  const atualizadasAtivas = atualizadas.filter(isAtualizadaRowActive);
  const operacionais = readOperacionalRows(operacionalPath);
  const excludedCodes = options.excludedCodes
    ? new Set(options.excludedCodes.map(normalizeCodigo).filter(Boolean))
    : undefined;
  const atualizadasElegiveis = excludedCodes
    ? atualizadasAtivas.filter((row) => !excludedCodes.has(row.codigo))
    : atualizadasAtivas;
  const excluidasPorCompetencia = excludedCodes
    ? atualizadasAtivas
        .filter((row) => excludedCodes.has(row.codigo))
        .map(toComparisonRow)
        .sort((a, b) => compareCodigoNumerically(a.codigo, b.codigo))
    : [];

  const atualizadaByCnpj = buildMapByCnpj(atualizadasAtivas, "atualizada");
  const operacionalByCnpj = buildMapByCnpj(operacionais, "operacional");
  const atualizadaByCodigo = buildMapByCodigo(atualizadasAtivas);
  const operacionalByCodigo = buildMapByCodigo(operacionais);

  const novas = atualizadasAtivas
    .filter((row) => !operacionalByCnpj.has(row.cnpj))
    .map(toComparisonRow)
    .sort((a, b) => compareCodigoNumerically(a.codigo, b.codigo));

  const removidas = operacionais
    .filter((row) => !atualizadaByCnpj.has(row.cnpj))
    .map(toComparisonRow)
    .sort((a, b) => compareCodigoNumerically(a.codigo, b.codigo));

  const alteradas: EmpresaChangedRow[] = [];
  for (const operacional of operacionais) {
    const atualizada = atualizadaByCnpj.get(operacional.cnpj);
    if (!atualizada) continue;
    const codigoChanged = operacional.codigo !== atualizada.codigo;
    const cnpjFormatChanged = operacional.rawCnpj !== atualizada.rawCnpj;
    const nomeChanged = normalizeComparableText(operacional.nome) !== normalizeComparableText(atualizada.nome);
    if (codigoChanged || cnpjFormatChanged || nomeChanged) {
      alteradas.push({
        cnpj: operacional.cnpj,
        oldCnpj: operacional.rawCnpj,
        newCnpj: atualizada.rawCnpj,
        oldCodigo: operacional.codigo,
        newCodigo: atualizada.codigo,
        oldNome: operacional.nome,
        newNome: atualizada.nome,
      });
    }
  }
  alteradas.sort((a, b) => compareCodigoNumerically(a.newCodigo, b.newCodigo));

  const conflitosCodigo: EmpresaCodigoConflict[] = [];
  for (const [codigo, operacional] of operacionalByCodigo) {
    const atualizada = atualizadaByCodigo.get(codigo);
    if (!atualizada || atualizada.cnpj === operacional.cnpj) continue;
    conflitosCodigo.push({
      codigo,
      operacionalCnpj: operacional.cnpj,
      operacionalNome: operacional.nome,
      atualizadaCnpj: atualizada.cnpj,
      atualizadaNome: atualizada.nome,
    });
  }
  conflitosCodigo.sort((a, b) => compareCodigoNumerically(a.codigo, b.codigo));

  const finalRows = buildFinalRows({
    atualizadasAtivas: atualizadasElegiveis,
    operacionalByCnpj,
    defaults: findDefaults(operacionais),
  });
  const usuariosCliente = await enrichFinalRowsWithClientUsers({
    finalRows,
    novasCnpjs: new Set(novas.map((row) => row.cnpj)),
    provider: options.clientUsersProvider,
    logger: options.logger,
  });
  const usuariosStatusCounts = {
    preenchido: usuariosCliente.filter((row) =>
      ["preenchido_unico", "responsavel_corrigido_unico"].includes(row.statusUsuariosCliente),
    ).length,
    multiplaEscolha: usuariosCliente.filter((row) =>
      ["multipla_escolha", "responsavel_invalido_multipla_escolha"].includes(
        row.statusUsuariosCliente,
      ),
    ).length,
    naoEncontrados: usuariosCliente.filter((row) => row.statusUsuariosCliente === "nenhum_usuario").length,
    comErro: usuariosCliente.filter((row) => row.statusUsuariosCliente === "erro_consulta").length,
  };

  const outputDir = resolveOutputDir(options.outputDir);
  const resultWithoutPaths = {
    summary: {
      atualizadas: atualizadasAtivas.length,
      excluidasPorCompetencia: excluidasPorCompetencia.length,
      operacionais: operacionais.length,
      final: finalRows.length,
      novas: novas.length,
      removidas: removidas.length,
      alteradas: alteradas.length,
      conflitosCodigo: conflitosCodigo.length,
      usuariosConsultados: usuariosCliente.length,
      usuariosPreenchidos: usuariosStatusCounts.preenchido,
      usuariosMultiplaEscolha: usuariosStatusCounts.multiplaEscolha,
      usuariosNaoEncontrados: usuariosStatusCounts.naoEncontrados,
      usuariosComErro: usuariosStatusCounts.comErro,
    },
    novas,
    excluidasPorCompetencia,
    removidas,
    alteradas,
    conflitosCodigo,
    usuariosCliente,
  };
  const { reportPath, finalPlanilhaPath } = await writeOutputFiles({
    outputDir,
    result: resultWithoutPaths,
    finalRows,
  });

  return {
    outputDir,
    reportPath,
    finalPlanilhaPath,
    ...resultWithoutPaths,
  };
}
