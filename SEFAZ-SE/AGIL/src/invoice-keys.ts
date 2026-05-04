import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import XLSX from 'xlsx';

const DANFE_KEY_PATTERN = /(?<!\d)\d{44}(?!\d)/g;
const WORKBOOK_EXTENSIONS = new Set(['.xls', '.xlsx']);
const TEXT_EXTENSIONS = new Set(['.csv', '.txt']);

function unique(values: Iterable<string>) {
  return [...new Set(values)];
}

export function extractDanfeKeysFromText(text: string) {
  return unique(text.match(DANFE_KEY_PATTERN) ?? []);
}

export function extractDanfeKeysFromWorkbook(filePath: string) {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const keys: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: '',
    });

    for (const row of rows) {
      for (const cell of row) {
        keys.push(...extractDanfeKeysFromText(String(cell ?? '')));
      }
    }
  }

  return unique(keys);
}

export function extractDanfeKeysFromFile(filePath: string) {
  const extension = extname(filePath).toLowerCase();

  if (WORKBOOK_EXTENSIONS.has(extension)) {
    return extractDanfeKeysFromWorkbook(filePath);
  }

  if (TEXT_EXTENSIONS.has(extension)) {
    return extractDanfeKeysFromText(readFileSync(filePath, 'utf8'));
  }

  throw new Error(`Formato de arquivo nao suportado: ${extension || 'sem extensao'}`);
}
