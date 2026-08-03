import { getNextDocumentNumber, getMasterByCode } from "../db/repository";
import { docPrefix, sectorCode, type DocType } from "../types/status";

export { sectorCode, docPrefix };

export function formatDocCode(
  type: DocType,
  setor: string,
  number: number,
): string {
  const code = sectorCode(setor);
  const n = String(number).padStart(3, "0");
  return `${docPrefix(type)}.${code}.${n}`;
}

export function allocateCodes(
  setor: string,
  types: DocType[],
  updateOfCode?: string | null,
): {
  sectorCode: string;
  numero: string;
  codes: Partial<Record<DocType, string>>;
  numbers: Partial<Record<DocType, number>>;
} {
  const sc = sectorCode(setor);
  const codes: Partial<Record<DocType, string>> = {};
  const numbers: Partial<Record<DocType, number>> = {};

  if (updateOfCode) {
    const existing = getMasterByCode(updateOfCode);
    if (existing) {
      const type = existing.docType as DocType;
      codes[type] = existing.code;
      numbers[type] = existing.number;
    }
  }

  let sharedNumber: number | null = null;
  for (const type of types) {
    if (codes[type]) continue;
    const n = getNextDocumentNumber(sc, type);
    if (sharedNumber === null) sharedNumber = n;
    // Prefer aligned numbers across types when free; else use next for each
    let candidate = sharedNumber;
    const tryCode = formatDocCode(type, setor, candidate);
    if (getMasterByCode(tryCode) && !codes[type]) {
      candidate = n;
    }
    codes[type] = formatDocCode(type, setor, candidate);
    numbers[type] = candidate;
  }

  const primary =
    numbers.it ?? numbers.pop ?? numbers.form ?? numbers.mp ?? 1;

  return {
    sectorCode: sc,
    numero: String(primary).padStart(3, "0"),
    codes,
    numbers,
  };
}

export function fileNameFor(code: string, title: string, ext: string): string {
  const safeTitle = title.replace(/[<>:"/\\|?*]/g, "").trim();
  return `${code} - ${safeTitle}.${ext}`;
}
