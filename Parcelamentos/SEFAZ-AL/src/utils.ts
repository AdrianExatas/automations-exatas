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

export function buildPdfFileName(consolidacao: string, numeroParcelaEmitida: number, totalParcelas: number): string {
  return sanitizePathSegment(`PARCELA N°${numeroParcelaEmitida} DE ${totalParcelas} - ${consolidacao}.pdf`);
}

export function buildOutputPath(
  outputRoot: string,
  empresa: string,
  consolidacao: string,
  numeroParcelaEmitida: number,
  totalParcelas: number,
): string {
  return path.join(
    outputRoot,
    buildCompanyDirectoryName(empresa),
    buildParcelamentoDirectoryName(consolidacao),
    buildPdfFileName(consolidacao, numeroParcelaEmitida, totalParcelas),
  );
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

export function timestampForFile(date = new Date()): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}
