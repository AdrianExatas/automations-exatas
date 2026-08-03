import path from "node:path";

const INVALID_FILE_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

export function isBlank(value: unknown): boolean {
  return String(value ?? "").trim() === "";
}

export function sanitizePathSegment(value: string): string {
  return value.replace(INVALID_FILE_CHARS, " ").replace(/\s+/g, " ").trim();
}

export function buildCompanyDirectoryName(empresa: string): string {
  return sanitizePathSegment(empresa) || "SEM EMPRESA";
}

export function buildParcelamentoDirectoryName(consolidacao: string): string {
  return sanitizePathSegment(`PARCELAMENTO N° ${consolidacao}`);
}

export function buildVencimentoMonthDirectoryName(vencimento: string | undefined): string {
  const parsed = parseDateParts(vencimento);
  if (!parsed) {
    return "SEM VENCIMENTO";
  }

  return `${parsed.month}-${parsed.year}`;
}

export function buildPdfFileName(consolidacao: string, numeroParcelaEmitida: number, totalParcelas: number): string {
  return sanitizePathSegment(`PARCELA N°${numeroParcelaEmitida} DE ${totalParcelas} - ${consolidacao}.pdf`);
}

export function buildOutputPath(
  outputRoot: string,
  empresa: string,
  consolidacao: string,
  numeroParcelaEmitida: number,
  totalParcelas: number,
  vencimento?: string,
): string {
  return path.join(
    outputRoot,
    buildVencimentoMonthDirectoryName(vencimento),
    buildCompanyDirectoryName(empresa),
    buildParcelamentoDirectoryName(consolidacao),
    buildPdfFileName(consolidacao, numeroParcelaEmitida, totalParcelas),
  );
}

export function buildHttpOutputPath(
  outputRoot: string,
  empresa: string,
  consolidacao: string,
  numeroParcelaEmitida: number,
  totalParcelas: number,
  vencimentoDDMMYYYY: string,
): string {
  return path.join(
    outputRoot,
    buildVencimentoMonthDirectoryName(vencimentoDDMMYYYY),
    buildCompanyDirectoryName(empresa),
    buildParcelamentoDirectoryName(consolidacao),
    buildPdfFileNameHttp(consolidacao, empresa, numeroParcelaEmitida, totalParcelas, vencimentoDDMMYYYY),
  );
}

export function timestampForDirectory(date = new Date()): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

export function buildExecutionOutputDir(outputBaseDir: string, date = new Date()): string {
  return path.join(outputBaseDir, "execucoes", timestampForDirectory(date));
}

export function parseParcelasTotais(value: string): { parcelasJaPagas: number; totalParcelas: number } {
  const match = value.replace(/\s+/g, " ").match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) {
    throw new Error(`Não foi possível interpretar o campo "Parcelas Totais" com valor "${value}".`);
  }

  const parcelasJaPagas = Number.parseInt(match[1]!, 10);
  const totalParcelas = Number.parseInt(match[2]!, 10);

  if (parcelasJaPagas < 0) {
    throw new Error(`Parcelas Totais inválido: a quantidade de parcelas pagas não pode ser negativa. Valor recebido: "${value}".`);
  }

  if (totalParcelas < parcelasJaPagas) {
    throw new Error(
      `Parcelas Totais inválido: o total de parcelas precisa ser maior ou igual às parcelas já pagas. Valor recebido: "${value}".`,
    );
  }

  if (parcelasJaPagas >= totalParcelas) {
    throw new Error(
      `Parcelas Totais inválido: não existe próxima parcela para emissão quando ${parcelasJaPagas}/${totalParcelas} já foi alcançado.`,
    );
  }

  return {
    parcelasJaPagas,
    totalParcelas,
  };
}

/** Converte ISO date string para DD-MM-YYYY. Ex: "2026-04-30T23:59:59-03:00" -> "30-04-2026" */
export function formatVencimento(isoDate: string): string {
  const datePart = isoDate.split("T")[0] ?? isoDate;
  const [year, month, day] = datePart.split("-");
  return `${day}-${month}-${year}`;
}

function parseDateParts(value: string | undefined): { day: string; month: string; year: string } | undefined {
  const normalized = String(value ?? "").trim();
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch?.[1] && isoMatch[2] && isoMatch[3]) {
    return { year: isoMatch[1], month: isoMatch[2], day: isoMatch[3] };
  }

  const brMatch = normalized.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (brMatch?.[1] && brMatch[2] && brMatch[3]) {
    return { day: brMatch[1], month: brMatch[2], year: brMatch[3] };
  }

  return undefined;
}

/** Filename com empresa e vencimento, usado pelo start:http */
export function buildPdfFileNameHttp(
  consolidacao: string,
  empresa: string,
  numeroParcelaEmitida: number,
  totalParcelas: number,
  vencimentoDDMMYYYY: string,
): string {
  return sanitizePathSegment(
    `PARCELA N°${numeroParcelaEmitida} DE ${totalParcelas} - ${consolidacao} - ${empresa} - Vencimento ${vencimentoDDMMYYYY}.pdf`,
  );
}

export function timestampForFile(date = new Date()): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}
