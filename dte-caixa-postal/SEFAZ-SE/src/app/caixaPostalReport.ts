import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import ExcelJS from 'exceljs';

import type { DetailedMessageRow, EmpresaReportRow, FailureRow, MessagePeriodBucket } from './types';

interface WriteReportInput {
  outputDir: string;
  rows: EmpresaReportRow[];
  failures: FailureRow[];
  messages: DetailedMessageRow[];
}

const EMPRESAS_COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: 'identificacao', key: 'identificacao', width: 22 },
  { header: 'razao_social', key: 'razao_social', width: 42 },
  { header: 'msg_nao_lidas_lista', key: 'msg_nao_lidas_lista', width: 18 },
  { header: 'ultima_geral_origem', key: 'ultima_geral_origem', width: 18 },
  { header: 'ultima_geral_numero', key: 'ultima_geral_numero', width: 18 },
  { header: 'ultima_geral_orgao', key: 'ultima_geral_orgao', width: 14 },
  { header: 'ultima_geral_unidade', key: 'ultima_geral_unidade', width: 16 },
  { header: 'ultima_geral_assunto', key: 'ultima_geral_assunto', width: 36 },
  { header: 'ultima_geral_data_publicacao', key: 'ultima_geral_data_publicacao', width: 22 },
  { header: 'ultima_geral_data_ciencia', key: 'ultima_geral_data_ciencia', width: 22 },
  {
    header: 'ultima_geral_responsavel_ciencia',
    key: 'ultima_geral_responsavel_ciencia',
    width: 28,
  },
  { header: 'ultima_geral_link', key: 'ultima_geral_link', width: 60 },
  { header: 'ultima_nao_lida_numero', key: 'ultima_nao_lida_numero', width: 22 },
  { header: 'ultima_nao_lida_orgao', key: 'ultima_nao_lida_orgao', width: 18 },
  { header: 'ultima_nao_lida_unidade', key: 'ultima_nao_lida_unidade', width: 18 },
  { header: 'ultima_nao_lida_assunto', key: 'ultima_nao_lida_assunto', width: 36 },
  {
    header: 'ultima_nao_lida_data_publicacao',
    key: 'ultima_nao_lida_data_publicacao',
    width: 22,
  },
  { header: 'ultima_nao_lida_data_ciencia', key: 'ultima_nao_lida_data_ciencia', width: 22 },
  {
    header: 'ultima_nao_lida_responsavel_ciencia',
    key: 'ultima_nao_lida_responsavel_ciencia',
    width: 28,
  },
  { header: 'ultima_nao_lida_link', key: 'ultima_nao_lida_link', width: 60 },
  { header: 'status', key: 'status', width: 18 },
  { header: 'erro', key: 'erro', width: 40 },
];

const FALHAS_COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: 'identificacao', key: 'identificacao', width: 22 },
  { header: 'razao_social', key: 'razao_social', width: 42 },
  { header: 'erro', key: 'erro', width: 60 },
];

const MENSAGENS_COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: 'identificacao', key: 'identificacao', width: 22 },
  { header: 'razao_social', key: 'razao_social', width: 42 },
  { header: 'origem', key: 'origem', width: 14 },
  { header: 'periodo', key: 'periodo', width: 16 },
  { header: 'chave_deduplicacao', key: 'chave_deduplicacao', width: 64 },
  { header: 'numero', key: 'numero', width: 22 },
  { header: 'orgao', key: 'orgao', width: 18 },
  { header: 'unidade', key: 'unidade', width: 18 },
  { header: 'assunto', key: 'assunto', width: 36 },
  { header: 'data_publicacao', key: 'data_publicacao', width: 22 },
  { header: 'data_ciencia', key: 'data_ciencia', width: 22 },
  { header: 'responsavel_ciencia', key: 'responsavel_ciencia', width: 28 },
  { header: 'link', key: 'link', width: 60 },
];

export async function writeCaixaPostalReport({
  outputDir,
  rows,
  failures,
  messages,
}: WriteReportInput): Promise<string> {
  await mkdir(outputDir, { recursive: true });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Codex';
  workbook.created = new Date();
  workbook.modified = new Date();

  const empresasSheet = workbook.addWorksheet('Empresas');
  empresasSheet.columns = EMPRESAS_COLUMNS;
  rows.forEach((row) => empresasSheet.addRow(row));
  formatSheet(empresasSheet);

  const falhasSheet = workbook.addWorksheet('Falhas');
  falhasSheet.columns = FALHAS_COLUMNS;
  failures.forEach((row) => falhasSheet.addRow(row));
  formatSheet(falhasSheet);

  addMessagesSheet(workbook, 'Mensagens_Mes_Atual', messages, 'mes_atual');
  addMessagesSheet(workbook, 'Mensagens_Mes_Anterior', messages, 'mes_anterior');
  addMessagesSheet(workbook, 'Mensagens_Demais', messages, 'demais');

  const fileName = `caixa-postal-${formatTimestamp(new Date())}.xlsx`;
  const outputPath = path.resolve(outputDir, fileName);

  await workbook.xlsx.writeFile(outputPath);
  return outputPath;
}

function addMessagesSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  messages: DetailedMessageRow[],
  bucket: MessagePeriodBucket,
): void {
  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.columns = MENSAGENS_COLUMNS;
  messages.filter((message) => message.periodo === bucket).forEach((message) => worksheet.addRow(message));
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
