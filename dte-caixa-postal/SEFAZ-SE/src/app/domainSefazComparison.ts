import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import ExcelJS from 'exceljs';

export interface DomainCompanyRow {
  cnpj: string;
  razaoSocialDominio: string;
  inscricaoEstadual: string;
  municipio: string;
  statusDominio: string;
  isSergipe: boolean;
}

export interface SefazCompanyRow {
  cnpj: string;
  razaoSocialSefaz: string;
  statusSefaz: string;
}

export interface DivergenceRow {
  cnpj: string;
  razao_social_dominio: string;
  razao_social_sefaz: string;
  inscricao_estadual: string;
  municipio: string;
  status_dominio: string;
  status_sefaz: string;
  tipo_divergencia: string;
}

export interface ComparisonSummary {
  dominioTotal: number;
  sefazTotal: number;
  correspondencias: number;
  soDominioSE: number;
  soSefaz: number;
  dominioNaoSE: number;
}

export interface ComparisonResult {
  correspondencias: DivergenceRow[];
  soDominioSE: DivergenceRow[];
  soSefaz: DivergenceRow[];
  dominioNaoSE: DivergenceRow[];
  resumo: ComparisonSummary;
}

export interface BuildComparisonInput {
  domainWorkbookPath: string;
  sefazWorkbookPath: string;
}

export interface WriteComparisonInput extends BuildComparisonInput {
  outputDir: string;
}

const DIVERGENCE_COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: 'cnpj', key: 'cnpj', width: 18 },
  { header: 'razao_social_dominio', key: 'razao_social_dominio', width: 42 },
  { header: 'razao_social_sefaz', key: 'razao_social_sefaz', width: 42 },
  { header: 'inscricao_estadual', key: 'inscricao_estadual', width: 18 },
  { header: 'municipio', key: 'municipio', width: 18 },
  { header: 'status_dominio', key: 'status_dominio', width: 16 },
  { header: 'status_sefaz', key: 'status_sefaz', width: 16 },
  { header: 'tipo_divergencia', key: 'tipo_divergencia', width: 22 },
];

const SUMMARY_COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: 'indicador', key: 'indicador', width: 24 },
  { header: 'valor', key: 'valor', width: 14 },
];

export async function buildDomainSefazComparison({
  domainWorkbookPath,
  sefazWorkbookPath,
}: BuildComparisonInput): Promise<ComparisonResult> {
  const [domainRows, sefazRows] = await Promise.all([
    readDomainCompanies(domainWorkbookPath),
    readSefazCompanies(sefazWorkbookPath),
  ]);

  const domainByCnpj = new Map(domainRows.map((row) => [row.cnpj, row]));
  const sefazByCnpj = new Map(sefazRows.map((row) => [row.cnpj, row]));

  const correspondencias = domainRows
    .filter((row) => sefazByCnpj.has(row.cnpj))
    .map((row) => buildDivergenceRow(row, sefazByCnpj.get(row.cnpj)!, 'correspondencia'))
    .sort(sortByCnpj);

  const soDominioSE = domainRows
    .filter((row) => row.isSergipe && !sefazByCnpj.has(row.cnpj))
    .map((row) => buildDivergenceRow(row, undefined, 'so_dominio_se'))
    .sort(sortByCnpj);

  const soSefaz = sefazRows
    .filter((row) => !domainByCnpj.has(row.cnpj))
    .map((row) => buildDivergenceRow(undefined, row, 'so_sefaz'))
    .sort(sortByCnpj);

  const dominioNaoSE = domainRows
    .filter((row) => !row.isSergipe)
    .map((row) =>
      buildDivergenceRow(row, sefazByCnpj.get(row.cnpj), 'dominio_nao_se')
    )
    .sort(sortByCnpj);

  return {
    correspondencias,
    soDominioSE,
    soSefaz,
    dominioNaoSE,
    resumo: {
      dominioTotal: domainRows.length,
      sefazTotal: sefazRows.length,
      correspondencias: correspondencias.length,
      soDominioSE: soDominioSE.length,
      soSefaz: soSefaz.length,
      dominioNaoSE: dominioNaoSE.length,
    },
  };
}

export async function writeDomainSefazComparisonReport({
  domainWorkbookPath,
  sefazWorkbookPath,
  outputDir,
}: WriteComparisonInput): Promise<string> {
  const comparison = await buildDomainSefazComparison({
    domainWorkbookPath,
    sefazWorkbookPath,
  });

  await mkdir(outputDir, { recursive: true });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Codex';
  workbook.created = new Date();
  workbook.modified = new Date();

  addDivergenceSheet(workbook, 'Correspondencias', comparison.correspondencias);
  addDivergenceSheet(workbook, 'So_Dominio_SE', comparison.soDominioSE);
  addDivergenceSheet(workbook, 'So_SEFAZ', comparison.soSefaz);
  addDivergenceSheet(workbook, 'Dominio_Nao_SE', comparison.dominioNaoSE);
  addSummarySheet(workbook, comparison.resumo);

  const fileName = `divergencia-dominio-sefaz-${formatTimestamp(new Date())}.xlsx`;
  const outputPath = path.resolve(outputDir, fileName);

  await workbook.xlsx.writeFile(outputPath);
  return outputPath;
}

export function normalizeDigits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

export function isSergipeStateRegistration(value: unknown): boolean {
  const digits = normalizeDigits(value);
  return digits.length === 9 && digits.startsWith('27');
}

async function readDomainCompanies(workbookPath: string): Promise<DomainCompanyRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('A planilha de dominio nao possui abas.');
  }

  const rows: DomainCompanyRow[] = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const cnpj = normalizeDigits(row.getCell(6).text || row.getCell(6).value);
    const razaoSocialDominio = normalizeText(row.getCell(4).text || row.getCell(4).value);

    if (!cnpj || !razaoSocialDominio) {
      continue;
    }

    const inscricaoEstadual = normalizeText(row.getCell(8).text || row.getCell(8).value);

    rows.push({
      cnpj,
      razaoSocialDominio,
      inscricaoEstadual,
      municipio: normalizeText(row.getCell(10).text || row.getCell(10).value),
      statusDominio: normalizeText(row.getCell(11).text || row.getCell(11).value),
      isSergipe: isSergipeStateRegistration(inscricaoEstadual),
    });
  }

  return deduplicateByCnpj(rows);
}

async function readSefazCompanies(workbookPath: string): Promise<SefazCompanyRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);

  const worksheet = workbook.getWorksheet('Empresas');
  if (!worksheet) {
    throw new Error('O relatorio da SEFAZ nao possui a aba Empresas.');
  }

  const rows: SefazCompanyRow[] = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const cnpj = normalizeDigits(row.getCell(1).text || row.getCell(1).value);
    const razaoSocialSefaz = normalizeText(row.getCell(2).text || row.getCell(2).value);

    if (!cnpj || !razaoSocialSefaz) {
      continue;
    }

    rows.push({
      cnpj,
      razaoSocialSefaz,
      statusSefaz: normalizeText(row.getCell(21).text || row.getCell(21).value),
    });
  }

  return deduplicateByCnpj(rows);
}

function deduplicateByCnpj<T extends { cnpj: string }>(rows: T[]): T[] {
  const uniqueRows = new Map<string, T>();

  for (const row of rows) {
    if (!uniqueRows.has(row.cnpj)) {
      uniqueRows.set(row.cnpj, row);
    }
  }

  return [...uniqueRows.values()];
}

function buildDivergenceRow(
  domainRow: DomainCompanyRow | undefined,
  sefazRow: SefazCompanyRow | undefined,
  tipoDivergencia: string,
): DivergenceRow {
  return {
    cnpj: domainRow?.cnpj ?? sefazRow?.cnpj ?? '',
    razao_social_dominio: domainRow?.razaoSocialDominio ?? '',
    razao_social_sefaz: sefazRow?.razaoSocialSefaz ?? '',
    inscricao_estadual: domainRow?.inscricaoEstadual ?? '',
    municipio: domainRow?.municipio ?? '',
    status_dominio: domainRow?.statusDominio ?? '',
    status_sefaz: sefazRow?.statusSefaz ?? '',
    tipo_divergencia: tipoDivergencia,
  };
}

function addDivergenceSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  rows: DivergenceRow[],
): void {
  const worksheet = workbook.addWorksheet(name);
  worksheet.columns = DIVERGENCE_COLUMNS;
  rows.forEach((row) => worksheet.addRow(row));
  formatSheet(worksheet);
}

function addSummarySheet(workbook: ExcelJS.Workbook, summary: ComparisonSummary): void {
  const worksheet = workbook.addWorksheet('Resumo');
  worksheet.columns = SUMMARY_COLUMNS;

  worksheet.addRows([
    { indicador: 'dominio_total', valor: summary.dominioTotal },
    { indicador: 'sefaz_total', valor: summary.sefazTotal },
    { indicador: 'correspondencias', valor: summary.correspondencias },
    { indicador: 'so_dominio_se', valor: summary.soDominioSE },
    { indicador: 'so_sefaz', valor: summary.soSefaz },
    { indicador: 'dominio_nao_se', valor: summary.dominioNaoSE },
  ]);

  formatSheet(worksheet);
}

function formatSheet(sheet: ExcelJS.Worksheet): void {
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const lastColumn = `${columnNumberToName(sheet.columnCount || 1)}1`;
  sheet.autoFilter = { from: 'A1', to: lastColumn };

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9EAF7' },
    };
  });
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function formatTimestamp(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  const seconds = String(value.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

function columnNumberToName(value: number): string {
  let column = '';
  let current = value;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    current = Math.floor((current - 1) / 26);
  }

  return column || 'A';
}

function sortByCnpj(left: DivergenceRow, right: DivergenceRow): number {
  return left.cnpj.localeCompare(right.cnpj);
}
