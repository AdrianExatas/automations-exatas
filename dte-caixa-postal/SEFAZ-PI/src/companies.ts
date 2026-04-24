import path from "node:path";
import ExcelJS from "exceljs";

export const DEFAULT_COMPANIES_WORKBOOK_PATH = path.join(
  process.cwd(),
  "empresas",
  "relacao-empresas.xlsx",
);

const REQUIRED_HEADERS = ["CODIGO", "EMPRESA", "CNPJ", "INSCRICAO ESTADUAL"] as const;

export type Company = {
  code: string;
  name: string;
  cnpj: string;
  stateRegistration: string;
  stateRegistrationDisplay: string;
};

export function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function normalizeDigits(value: unknown): string {
  return String(value ?? "").replace(/\D+/g, "");
}

export function formatStateRegistrationForPortal(value: string): string {
  const digits = normalizeDigits(value);

  if (digits.length === 9) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}-${digits.slice(8)}`;
  }

  return digits;
}

function getSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  const worksheet = workbook.getWorksheet("Planilha1");
  if (!worksheet) {
    throw new Error('A planilha "Planilha1" nao foi encontrada em empresas/relacao-empresas.xlsx.');
  }

  return worksheet;
}

function buildHeaderIndex(worksheet: ExcelJS.Worksheet): Map<string, number> {
  const headerRow = worksheet.getRow(1);
  const headerIndex = new Map<string, number>();

  headerRow.eachCell((cell, columnNumber) => {
    headerIndex.set(normalizeHeader(cell.value), columnNumber);
  });

  for (const header of REQUIRED_HEADERS) {
    if (!headerIndex.has(header)) {
      throw new Error(`Coluna obrigatoria ausente na planilha de empresas: ${header}.`);
    }
  }

  return headerIndex;
}

export async function readCompaniesWorkbook(
  workbookPath = DEFAULT_COMPANIES_WORKBOOK_PATH,
): Promise<Company[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);

  const worksheet = getSheet(workbook);
  const headerIndex = buildHeaderIndex(worksheet);
  const companies: Company[] = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const rawCode = row.getCell(headerIndex.get("CODIGO") ?? 0).value;
    const rawName = row.getCell(headerIndex.get("EMPRESA") ?? 0).value;
    const rawCnpj = row.getCell(headerIndex.get("CNPJ") ?? 0).value;
    const rawStateRegistration = row.getCell(headerIndex.get("INSCRICAO ESTADUAL") ?? 0).value;

    const code = String(rawCode ?? "").trim();
    const name = String(rawName ?? "").trim();
    const cnpj = String(rawCnpj ?? "").trim();
    const stateRegistration = normalizeDigits(rawStateRegistration);

    if (!code && !name && !cnpj && !stateRegistration) {
      continue;
    }

    if (!code || !name || !cnpj || !stateRegistration) {
      throw new Error(`Linha ${rowNumber} da planilha de empresas esta incompleta.`);
    }

    companies.push({
      code,
      name,
      cnpj,
      stateRegistration,
      stateRegistrationDisplay: formatStateRegistrationForPortal(stateRegistration),
    });
  }

  if (companies.length === 0) {
    throw new Error("Nenhuma empresa valida foi encontrada na planilha de empresas.");
  }

  return companies;
}
