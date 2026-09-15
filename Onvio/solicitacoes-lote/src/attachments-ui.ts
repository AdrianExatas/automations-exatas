import type { ServiceRequestRow } from "@exatas/onvio-solicitacoes-servico";
import type { UiAttachment } from "./types";

export function mergeUiAttachments(
  rows: ServiceRequestRow[],
  rowAttachments: Record<number, UiAttachment[] | undefined>,
  commonAttachments: UiAttachment[],
): { rows: ServiceRequestRow[]; extraAttachmentPaths: string[] } {
  return {
    rows: rows.map((row, index) => ({
      ...row,
      arquivos: uniquePaths((rowAttachments[index] ?? []).map((item) => item.filePath)),
    })),
    extraAttachmentPaths: uniquePaths(commonAttachments.map((item) => item.filePath)),
  };
}

function uniquePaths(paths: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of paths) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}
