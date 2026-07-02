const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDate(value: string): Date {
  const match = ISO_DATE_RE.exec(value.trim());
  if (!match) {
    throw new Error(`Data invalida: ${value}. Use AAAA-MM-DD.`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Data invalida: ${value}.`);
  }
  return date;
}

export function formatBrDate(value: Date): string {
  return [
    String(value.getUTCDate()).padStart(2, "0"),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCFullYear()),
  ].join("/");
}

export function formatCurrentMonth(value: Date): string {
  return [
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCFullYear()),
  ].join("/");
}

export function yearMonthFromBrDate(value: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) {
    return "sem-data";
  }
  return `${match[3]}-${match[2]}`;
}
