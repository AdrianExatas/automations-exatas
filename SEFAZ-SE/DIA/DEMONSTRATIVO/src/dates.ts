import type { Competencia } from "./types";

const SAO_PAULO_TZ = "America/Sao_Paulo";

export function previousMonthCompetencia(reference = new Date()): Competencia {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(reference);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  if (!year || !month) {
    throw new Error("Nao foi possivel calcular a competencia pelo fuso America/Sao_Paulo.");
  }

  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  return buildCompetencia(previous.year, previous.month);
}

export function parseCompetencia(value: string): Competencia {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new Error(`Competencia invalida: ${value}. Use YYYY-MM.`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error(`Mes invalido na competencia: ${value}.`);
  }

  return buildCompetencia(year, month);
}

function buildCompetencia(year: number, month: number): Competencia {
  const monthSelectValue = String(month).padStart(2, "0");
  return {
    year,
    month,
    value: `${year}-${monthSelectValue}`,
    monthSelectValue,
  };
}
