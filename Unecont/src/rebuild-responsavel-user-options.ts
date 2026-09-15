import ExcelJS from "exceljs";
import {
  normalizeCodigo,
  normalizeCnpj,
  normalizeComparableText,
  normalizeHeader,
} from "./domain/empresa-normalization";

const USER_OPTIONS_SHEET_NAME = "Opcoes Usuarios";
const USER_OPTIONS_HEADERS = ["CODIGO", "CNPJ", "EMPRESA", "USUARIO"] as const;

export interface RebuildResponsavelUserOptionsResult {
  companies: number;
  optionRows: number;
  dropdownsApplied: number;
  dropdownsCleared: number;
  invalidResponsaveisCleared: number;
}

function getCellText(value: ExcelJS.CellValue | undefined): string {
  if (value == null) return "";
  if (typeof value === "object" && "text" in value) return String(value.text ?? "").trim();
  return String(value).trim();
}

function getColumnByNormalizedHeader(worksheet: ExcelJS.Worksheet, header: string): number {
  let column = 0;
  worksheet.getRow(1).eachCell((cell, columnNumber) => {
    if (normalizeHeader(String(cell.value ?? "")) === header) {
      column = columnNumber;
    }
  });
  return column;
}

function splitUserLabels(value: string): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const part of value.split(";")) {
    const label = part.trim();
    if (!label) continue;
    const key = normalizeComparableText(label);
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels;
}

function clearDataValidation(worksheet: ExcelJS.Worksheet, cell: ExcelJS.Cell): boolean {
  const address = cell.address;
  const model = (
    worksheet as ExcelJS.Worksheet & {
      dataValidations?: { model?: Record<string, unknown> };
    }
  ).dataValidations?.model;
  let cleared = false;
  if (model && address in model) {
    delete model[address];
    cleared = true;
  }
  if (cell.dataValidation) {
    delete (cell as { dataValidation?: ExcelJS.DataValidation }).dataValidation;
    cleared = true;
  }
  return cleared;
}

function labelAllowed(responsavel: string, labels: string[]): boolean {
  if (!responsavel) return true;
  const target = normalizeComparableText(responsavel);
  return labels.some((label) => normalizeComparableText(label) === target);
}

/**
 * Reconstroi a aba Opcoes Usuarios e os dropdowns de RESPONSÁVEL a partir de
 * USUARIOS_CLIENTE (preferencial) ou da aba Opcoes existente por CODIGO/CNPJ.
 * Remove validacoes cruzadas e limpa RESPONSÁVEL que nao pertence a empresa.
 */
export async function rebuildResponsavelUserOptions(
  workbookPath: string,
): Promise<RebuildResponsavelUserOptionsResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const worksheet = workbook.getWorksheet("Planilha1") ?? workbook.worksheets[0];
  if (!worksheet) throw new Error(`Planilha vazia: ${workbookPath}`);

  const codigoColumn = getColumnByNormalizedHeader(worksheet, "codigo");
  const cnpjColumn =
    getColumnByNormalizedHeader(worksheet, "cnpjempresa") ||
    getColumnByNormalizedHeader(worksheet, "cnpj");
  const empresaColumn = getColumnByNormalizedHeader(worksheet, "empresa");
  const responsavelColumn = getColumnByNormalizedHeader(worksheet, "responsavel");
  const usuariosColumn = getColumnByNormalizedHeader(worksheet, "usuarioscliente");
  if (!codigoColumn || !cnpjColumn || !empresaColumn || !responsavelColumn) {
    throw new Error(
      "Planilha operacional precisa conter CODIGO, CNPJ EMPRESA, EMPRESA e RESPONSÁVEL.",
    );
  }

  const existingOptions = workbook.getWorksheet(USER_OPTIONS_SHEET_NAME);
  const labelsByCompany = new Map<string, string[]>();
  if (existingOptions) {
    const optionCodigoColumn = getColumnByNormalizedHeader(existingOptions, "codigo");
    const optionCnpjColumn = getColumnByNormalizedHeader(existingOptions, "cnpj");
    const optionUsuarioColumn = getColumnByNormalizedHeader(existingOptions, "usuario");
    if (optionCodigoColumn && optionCnpjColumn && optionUsuarioColumn) {
      for (let rowNumber = 2; rowNumber <= existingOptions.rowCount; rowNumber++) {
        const row = existingOptions.getRow(rowNumber);
        const usuario = getCellText(row.getCell(optionUsuarioColumn).value);
        if (!usuario) continue;
        const key = `${normalizeCodigo(getCellText(row.getCell(optionCodigoColumn).value))}|${normalizeCnpj(getCellText(row.getCell(optionCnpjColumn).value))}`;
        if (key === "|") continue;
        const current = labelsByCompany.get(key) ?? [];
        if (!current.some((label) => normalizeComparableText(label) === normalizeComparableText(usuario))) {
          current.push(usuario);
          labelsByCompany.set(key, current);
        }
      }
    }
    workbook.removeWorksheet(existingOptions.id);
  }

  const optionsSheet = workbook.addWorksheet(USER_OPTIONS_SHEET_NAME);
  optionsSheet.addRow([...USER_OPTIONS_HEADERS]);
  optionsSheet.state = "hidden";

  let optionRows = 0;
  let companies = 0;
  let dropdownsApplied = 0;
  let dropdownsCleared = 0;
  let invalidResponsaveisCleared = 0;
  const rangesByRow = new Map<number, { startRow: number; endRow: number }>();

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const codigo = normalizeCodigo(getCellText(row.getCell(codigoColumn).value));
    const cnpjRaw = getCellText(row.getCell(cnpjColumn).value);
    const cnpj = normalizeCnpj(cnpjRaw);
    const empresa = getCellText(row.getCell(empresaColumn).value);
    if (!codigo && !cnpj) continue;
    companies++;

    const key = `${codigo}|${cnpj}`;
    const fromColumn = usuariosColumn
      ? splitUserLabels(getCellText(row.getCell(usuariosColumn).value))
      : [];
    const labels = fromColumn.length > 0 ? fromColumn : (labelsByCompany.get(key) ?? []);
    const responsavelCell = row.getCell(responsavelColumn);
    clearDataValidation(worksheet, responsavelCell);

    if (!labelAllowed(getCellText(responsavelCell.value), labels)) {
      responsavelCell.value = "";
      invalidResponsaveisCleared++;
    }

    if (labels.length === 0) {
      dropdownsCleared++;
      continue;
    }

    const startRow = optionRows + 2;
    for (const label of labels) {
      optionsSheet.addRow([codigo, cnpj || cnpjRaw, empresa, label]);
      optionRows++;
    }
    rangesByRow.set(rowNumber, { startRow, endRow: optionRows + 1 });
  }

  for (const [rowNumber, range] of rangesByRow) {
    const cell = worksheet.getRow(rowNumber).getCell(responsavelColumn);
    cell.dataValidation = {
      type: "list",
      allowBlank: true,
      showErrorMessage: true,
      errorTitle: "Usuario invalido",
      error: "Selecione um usuario da lista.",
      formulae: [`'${USER_OPTIONS_SHEET_NAME}'!$D$${range.startRow}:$D$${range.endRow}`],
    };
    dropdownsApplied++;
  }

  await workbook.xlsx.writeFile(workbookPath);
  return {
    companies,
    optionRows,
    dropdownsApplied,
    dropdownsCleared,
    invalidResponsaveisCleared,
  };
}
