import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getStoragePaths } from "../config";
import { listMasterIndex } from "../db/repository";

export function exportMasterIndexFiles(): { jsonPath: string; csvPath: string } {
  const { publishRoot } = getStoragePaths();
  mkdirSync(publishRoot, { recursive: true });
  const rows = listMasterIndex();
  const jsonPath = join(publishRoot, "Indice-Mestre.json");
  const csvPath = join(publishRoot, "Indice-Mestre.csv");

  writeFileSync(jsonPath, JSON.stringify(rows, null, 2), "utf-8");

  const header = [
    "Código",
    "Documento",
    "Tipo",
    "Setor",
    "Versão",
    "Status",
    "Responsável",
    "Revisão",
  ];
  const lines = [
    header.join(";"),
    ...rows.map((r) =>
      [
        r.code,
        r.title,
        r.docType,
        r.setor,
        r.version,
        r.status,
        r.responsible,
        r.reviewDate ?? "",
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(";"),
    ),
  ];
  writeFileSync(csvPath, lines.join("\n"), "utf-8");
  return { jsonPath, csvPath };
}
