import type { DaeReferencia } from "./types";

export function competenciaAnterior(now: Date = new Date()): DaeReferencia {
  const mesAtual = now.getMonth() + 1;
  const anoAtual = now.getFullYear();

  if (mesAtual === 1) {
    return { ano: anoAtual - 1, mes: 12 };
  }

  return { ano: anoAtual, mes: mesAtual - 1 };
}

export function formatReferencia(ref: DaeReferencia): string {
  const mes = String(ref.mes).padStart(2, "0");
  return `${mes}/${ref.ano}`;
}

export function nomeMesPt(mes: number): string {
  const nomes = [
    "Janeiro",
    "Fevereiro",
    "Marco",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  const idx = mes - 1;
  if (idx < 0 || idx >= nomes.length) {
    throw new Error(`Mes invalido: ${mes}.`);
  }

  return nomes[idx]!;
}
