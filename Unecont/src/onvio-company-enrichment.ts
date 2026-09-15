import path from "node:path";
import ExcelJS from "exceljs";
import { findColumn, normalizeCodigo, normalizeCnpj } from "./domain/empresa-normalization";
import type { OnvioCompaniesProvider, OnvioCompanyLookupResult, OnvioCompanyStatus } from "./types";
import { rebuildResponsavelUserOptions } from "./rebuild-responsavel-user-options";

export interface EnrichPlanilhaWithOnvioCompaniesOptions {
  planilhaPath: string;
  outputDir: string;
  provider: OnvioCompaniesProvider;
  logger?: Pick<Console, "info" | "warn" | "error">;
}

export interface EnrichPlanilhaWithOnvioCompaniesResult {
  reportPath: string;
  total: number;
  kept: number;
  removed: number;
  /** @deprecated Use `kept`. */
  resolved: number;
  /** @deprecated Use `removed`. */
  unresolved: number;
}

interface RowLookup {
  rowNumber: number;
  codigo: string;
  cnpj: string;
  nome: string;
  result: OnvioCompanyLookupResult;
}

function ensureColumn(worksheet: ExcelJS.Worksheet, headers: string[], header: string): number {
  const existing = findColumn(headers, [header]);
  if (existing) return headers.indexOf(existing) + 1;
  const column = headers.length + 1;
  headers.push(header);
  worksheet.getRow(1).getCell(column).value = header;
  return column;
}

async function inBatches<T>(items: T[], concurrency: number, handler: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      await handler(item);
    }
  });
  await Promise.all(workers);
}

export function isEligibleOnvioCompany(result: OnvioCompanyLookupResult): boolean {
  if (result.status === "ATIVO" && result.clientId) return true;
  if (result.status === "LOCALIZADO_SEM_STATUS" && result.clientId) return true;
  return false;
}

function writeReport(outputDir: string, rows: RowLookup[]): Promise<string> {
  const reportPath = path.join(outputDir, "relatorio-onvio-clientes.xlsx");
  const workbook = new ExcelJS.Workbook();
  const kept = rows.filter((row) => isEligibleOnvioCompany(row.result)).length;
  const inactive = rows.filter((row) => row.result.status === "INATIVO").length;
  const missing = rows.filter((row) => row.result.status === "NAO_LOCALIZADO").length;
  const summary = workbook.addWorksheet("Resumo");
  summary.addRows([
    ["CAMPO", "VALOR"],
    ["TOTAL", rows.length],
    ["MANTIDAS_NA_PLANILHA", kept],
    ["INATIVAS_ONVIO", inactive],
    ["NAO_LOCALIZADAS", missing],
    ["REMOVIDAS_DA_PLANILHA", rows.length - kept],
  ]);
  summary.getRow(1).font = { bold: true };
  const details = workbook.addWorksheet("Empresas");
  details.addRow([
    "CODIGO",
    "CNPJ",
    "EMPRESA",
    "ONVIO_CLIENT_ID",
    "ONVIO_STATUS",
    "FONTE",
    "MENSAGEM",
    "NA_PLANILHA",
  ]);
  details.getRow(1).font = { bold: true };
  for (const row of rows) {
    details.addRow([
      row.codigo,
      row.cnpj,
      row.nome,
      row.result.clientId ?? "",
      row.result.status,
      row.result.fonte ?? "",
      row.result.mensagem ?? "",
      isEligibleOnvioCompany(row.result) ? "SIM" : "NAO",
    ]);
  }
  return workbook.xlsx.writeFile(reportPath).then(() => reportPath);
}

function companyKey(codigo: string, cnpj: string): string {
  return `${normalizeCodigo(codigo)}|${normalizeCnpj(cnpj)}`;
}

async function removeIneligibleRows(
  worksheet: ExcelJS.Worksheet,
  rows: RowLookup[],
  codigoIndex: number,
  cnpjIndex: number,
  clientIdIndex: number,
  statusIndex: number,
  sourceIndex: number,
): Promise<number> {
  const ineligibleKeys = new Set(
    rows.filter((row) => !isEligibleOnvioCompany(row.result)).map((row) => companyKey(row.codigo, row.cnpj)),
  );

  for (const row of rows) {
    if (!isEligibleOnvioCompany(row.result)) continue;
    const target = worksheet.getRow(row.rowNumber);
    target.getCell(clientIdIndex).value = row.result.clientId!;
    target.getCell(statusIndex).value = row.result.status;
    target.getCell(sourceIndex).value = row.result.fonte ?? "";
  }

  for (let rowNumber = worksheet.rowCount; rowNumber >= 2; rowNumber -= 1) {
    const row = worksheet.getRow(rowNumber);
    const codigo = normalizeCodigo(row.getCell(codigoIndex).value);
    const cnpj = row.getCell(cnpjIndex).text.trim();
    if (!codigo || !cnpj) continue;
    if (!ineligibleKeys.has(companyKey(codigo, cnpj))) continue;
    worksheet.spliceRows(rowNumber, 1);
  }

  return ineligibleKeys.size;
}

export async function enrichPlanilhaWithOnvioCompanies(
  options: EnrichPlanilhaWithOnvioCompaniesOptions,
): Promise<EnrichPlanilhaWithOnvioCompaniesResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(options.planilhaPath);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error(`Planilha sem aba: ${options.planilhaPath}`);
  const firstRowValues = worksheet.getRow(1).values;
  const headers = (Array.isArray(firstRowValues) ? firstRowValues.slice(1) : [])
    .map((value) => String(value ?? ""));
  const codigoColumn = findColumn(headers, ["codigo", "código"]);
  const cnpjColumn = findColumn(headers, ["cnpj empresa", "cnpj", "cpf"]);
  const nomeColumn = findColumn(headers, ["empresa", "nome", "razao social", "razão social"]);
  if (!codigoColumn || !cnpjColumn || !nomeColumn) {
    throw new Error("Planilha operacional precisa conter CODIGO, CNPJ EMPRESA e EMPRESA.");
  }
  const codigoIndex = headers.indexOf(codigoColumn) + 1;
  const cnpjIndex = headers.indexOf(cnpjColumn) + 1;
  const nomeIndex = headers.indexOf(nomeColumn) + 1;
  const clientIdIndex = ensureColumn(worksheet, headers, "ONVIO_CLIENT_ID");
  const statusIndex = ensureColumn(worksheet, headers, "ONVIO_STATUS");
  const sourceIndex = ensureColumn(worksheet, headers, "ONVIO_CLIENT_SOURCE");
  const rows: RowLookup[] = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const codigo = normalizeCodigo(row.getCell(codigoIndex).value);
    const cnpj = row.getCell(cnpjIndex).text.trim();
    const nome = row.getCell(nomeIndex).text.trim();
    if (!codigo || !cnpj) continue;
    rows.push({
      rowNumber,
      codigo,
      cnpj,
      nome,
      result: { codigo, status: "NAO_LOCALIZADO" satisfies OnvioCompanyStatus, mensagem: "Consulta nao executada." },
    });
  }

  await inBatches(rows, 3, async (row) => {
    options.logger?.info?.(`[Onvio Empresas] Consultando ${row.codigo} - ${row.nome}`);
    try {
      row.result = await options.provider.lookupCompany({
        codigo: row.codigo,
        cnpj: row.cnpj,
        nome: row.nome,
      });
    } catch (error) {
      row.result = {
        codigo: row.codigo,
        status: "NAO_LOCALIZADO",
        mensagem: error instanceof Error ? error.message : String(error),
      };
    }
  });

  const reportPath = await writeReport(options.outputDir, rows);
  const kept = rows.filter((row) => isEligibleOnvioCompany(row.result)).length;
  const removed = await removeIneligibleRows(
    worksheet,
    rows,
    codigoIndex,
    cnpjIndex,
    clientIdIndex,
    statusIndex,
    sourceIndex,
  );

  await workbook.xlsx.writeFile(options.planilhaPath);
  const rebuild = await rebuildResponsavelUserOptions(options.planilhaPath);
  options.logger?.info?.(
    `Cruzamento Onvio: ${kept} mantidas, ${removed} removidas da planilha. Relatorio: ${reportPath}`,
  );
  options.logger?.info?.(
    `Dropdowns reconstruidos: ${rebuild.dropdownsApplied} aplicados, ${rebuild.dropdownsCleared} limpos, ${rebuild.invalidResponsaveisCleared} responsaveis invalidos removidos.`,
  );

  return {
    reportPath,
    total: rows.length,
    kept,
    removed,
    resolved: kept,
    unresolved: removed,
  };
}
