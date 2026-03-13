import fs from "node:fs";
import path from "node:path";
import type { EmpresaBatchItem } from "../types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx");

export type Empresa = EmpresaBatchItem;

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function findColumn(
  columns: string[],
  keywords: string[],
  mode: "exact" | "contains" = "contains",
): string | undefined {
  const normalizedColumns = columns.map((column) => ({
    original: column,
    normalized: normalizeHeader(column),
  }));
  const normalizedKeywords = keywords.map(normalizeHeader);

  for (const keyword of normalizedKeywords) {
    const exactMatch = normalizedColumns.find((column) => column.normalized === keyword);
    if (exactMatch) return exactMatch.original;
  }

  if (mode === "contains") {
    for (const keyword of normalizedKeywords) {
      const partialMatch = normalizedColumns.find((column) => column.normalized.includes(keyword));
      if (partialMatch) return partialMatch.original;
    }
  }

  return undefined;
}

function normalizeCodigo(value: unknown): string {
  if (value == null || value === "") return "";
  const asString = typeof value === "number" ? String(Math.floor(value)) : String(value).trim();
  return /^\d+$/.test(asString) ? String(parseInt(asString, 10)) : asString;
}

function parseArquivos(value: unknown): string[] {
  if (value == null || value === "") return [];
  return String(value)
    .split(/[;\r\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseQtdArquivos(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
}

function readOptionalString(row: Record<string, unknown>, column?: string): string {
  if (!column) return "";
  const value = row[column];
  return value == null || value === "" ? "" : String(value).trim();
}

export function readEmpresas(excelPath: string): Empresa[] {
  const resolved = path.resolve(excelPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Planilha não encontrada: ${resolved}`);
  }

  const workbook = XLSX.readFile(resolved);
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error("Planilha vazia");

  const worksheet = workbook.Sheets[firstSheet];
  const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
  const columns = Object.keys(data[0] ?? {});

  const cnpjColumn = findColumn(columns, ["cnpj", "cpf"]) ?? columns[0];
  const codigoColumn = findColumn(columns, ["codigo", "código", "numero", "id"]);
  const nomeColumn = findColumn(columns, ["empresa", "nome", "razão social", "razao social"]);
  const solicitanteColumn = findColumn(columns, ["solicitante"]);
  const departamentoColumn = findColumn(columns, ["departamento"]);
  const assuntoColumn = findColumn(columns, ["assunto"]);
  const descricaoColumn = findColumn(columns, ["descrição", "descricao"]);
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

  const empresas: Empresa[] = [];
  const seenCodes = new Set<string>();

  for (const row of data) {
    const cnpj = String(row[cnpjColumn] ?? "").trim();
    if (!cnpj || cnpj.toLowerCase() === "nan") continue;

    const codigo = codigoColumn ? normalizeCodigo(row[codigoColumn]) : "";
    if (codigo) {
      if (seenCodes.has(codigo)) {
        throw new Error(`Código duplicado na planilha: ${codigo}`);
      }
      seenCodes.add(codigo);
    }

    const empresa: Empresa = {
      cnpj,
      codigo,
      nome: readOptionalString(row, nomeColumn),
      solicitante: readOptionalString(row, solicitanteColumn),
      departamento: readOptionalString(row, departamentoColumn),
      assunto: readOptionalString(row, assuntoColumn),
      descricao: readOptionalString(row, descricaoColumn),
      qtdArquivos: qtdArquivosColumn ? parseQtdArquivos(row[qtdArquivosColumn]) : undefined,
      arquivos: arquivosColumn ? parseArquivos(row[arquivosColumn]) : [],
      onvioClientId: readOptionalString(row, onvioClientIdColumn) || undefined,
      onvioRequesterId: readOptionalString(row, onvioRequesterIdColumn) || undefined,
      onvioDepartmentId: readOptionalString(row, onvioDepartmentIdColumn) || undefined,
    };

    empresas.push(empresa);
  }

  return empresas;
}
