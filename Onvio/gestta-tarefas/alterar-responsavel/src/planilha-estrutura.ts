import * as XLSX from "xlsx";

export interface PlanilhaEstrutura {
  filePath: string;
  sheetNames: string[];
  activeSheetName: string;
  headers: string[];
  totalRows: number;
  previewRows: Record<string, string>[];
}

function stringifyCell(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function lerEstruturaPlanilha(filePath: string, previewLimit = 5): PlanilhaEstrutura {
  const workbook = XLSX.readFile(filePath, { type: "file" });
  const activeSheetName = workbook.SheetNames[0];
  if (!activeSheetName) {
    return {
      filePath,
      sheetNames: [],
      activeSheetName: "",
      headers: [],
      totalRows: 0,
      previewRows: [],
    };
  }

  const sheet = workbook.Sheets[activeSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });

  const headerRow = rows[0] ?? [];
  const headers = headerRow.map((value, index) => {
    const label = stringifyCell(value).trim();
    return label || `Coluna ${index + 1}`;
  });

  const previewRows = rows.slice(1, 1 + previewLimit).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = stringifyCell(row[index]).trim();
    });
    return record;
  });

  return {
    filePath,
    sheetNames: workbook.SheetNames,
    activeSheetName,
    headers,
    totalRows: Math.max(0, rows.length - 1),
    previewRows,
  };
}
