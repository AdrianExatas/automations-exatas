export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateBr(date: Date): string {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatDateIso(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseIsoDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return undefined;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function parseDateInput(value: string): Date {
  const compact = /^(\d{2})(\d{2})(\d{4})$/.exec(value);
  const slashed = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const match = compact ?? slashed;
  if (!match) {
    throw new Error(`Data invalida: ${value}. Use DD/MM/YYYY ou DDMMYYYY.`);
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Data invalida: ${value}`);
  }
  return date;
}

export function yesterday(): Date {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function diffDays(left: Date, right: Date): number {
  const dayMs = 24 * 60 * 60 * 1000;
  const a = new Date(left.getFullYear(), left.getMonth(), left.getDate()).getTime();
  const b = new Date(right.getFullYear(), right.getMonth(), right.getDate()).getTime();
  return Math.round((a - b) / dayMs);
}
