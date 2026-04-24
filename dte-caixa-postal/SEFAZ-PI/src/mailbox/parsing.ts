import type { MailboxNotification } from "./types.js";

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeComparableText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function parsePortalDate(value: string): Date | null {
  const normalized = normalizeWhitespace(value);
  if (!normalized || normalized === "-") {
    return null;
  }

  const match = normalized.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const hours = Number(match[4] ?? 0);
  const minutes = Number(match[5] ?? 0);
  const seconds = Number(match[6] ?? 0);
  const date = new Date(year, month - 1, day, hours, minutes, seconds, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function isInCurrentOrPreviousMonth(value: string, referenceDate = new Date()): boolean {
  const parsed = parsePortalDate(value);
  if (!parsed) {
    return false;
  }

  const currentKey = referenceDate.getFullYear() * 12 + referenceDate.getMonth();
  const previousKey = currentKey - 1;
  const parsedKey = parsed.getFullYear() * 12 + parsed.getMonth();

  return parsedKey === currentKey || parsedKey === previousKey;
}

export function mapRowCellsToNotification(cells: string[]): MailboxNotification | null {
  if (cells.length < 10) {
    return null;
  }

  return {
    status: cells[0] ?? "",
    scienceSituation: cells[1] ?? "",
    type: cells[2] ?? "",
    recipientRegistration: cells[3] ?? "",
    sender: cells[4] ?? "",
    issuedAtText: cells[5] ?? "",
    subject: cells[6] ?? "",
    readAtText: cells[7] ?? "",
    scienceAtText: cells[8] ?? "",
    viewableUntilText: cells[9] ?? "",
  };
}

export function buildNotificationSignature(notification: MailboxNotification): string {
  return [
    notification.status,
    notification.scienceSituation,
    notification.type,
    notification.recipientRegistration,
    notification.sender,
    notification.issuedAtText,
    notification.subject,
    notification.readAtText,
    notification.scienceAtText,
    notification.viewableUntilText,
  ].join("|");
}
