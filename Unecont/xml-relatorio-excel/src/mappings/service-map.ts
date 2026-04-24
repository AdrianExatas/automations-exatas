import * as XLSX from "xlsx";
import type { ServiceMapLookupEntry } from "../types";
import { normalizeServiceCode, normalizeWhitespace } from "../utils";

export function loadServiceMap(serviceMapPath: string): Map<string, ServiceMapLookupEntry> {
  const workbook = XLSX.readFile(serviceMapPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: "",
  }) as string[][];

  const raw = new Map<
    string,
    { descriptions: Set<string>; cnaes: Set<string>; cnaeDescriptions: Set<string> }
  >();

  rows.slice(1).forEach((row) => {
    const cnae = normalizeWhitespace(row[0]);
    const cnaeDescription = normalizeWhitespace(row[1]);
    const item = normalizeServiceCode(row[2]);
    const serviceDescription = normalizeWhitespace(row[3]);
    if (!item) return;

    const entry = raw.get(item) ?? {
      descriptions: new Set<string>(),
      cnaes: new Set<string>(),
      cnaeDescriptions: new Set<string>(),
    };

    if (serviceDescription) entry.descriptions.add(serviceDescription);
    if (cnae) entry.cnaes.add(cnae);
    if (cnaeDescription) entry.cnaeDescriptions.add(cnaeDescription);
    raw.set(item, entry);
  });

  const lookup = new Map<string, ServiceMapLookupEntry>();
  raw.forEach((entry, item) => {
    const descriptions = [...entry.descriptions];
    const cnaes = [...entry.cnaes];
    const cnaeDescriptions = [...entry.cnaeDescriptions];

    lookup.set(item, {
      serviceDescription: descriptions.length === 1 ? descriptions[0] : undefined,
      serviceDescriptionAmbiguous: descriptions.length > 1,
      cnae: cnaes.length === 1 ? cnaes[0] : undefined,
      cnaeDescription:
        cnaes.length === 1 && cnaeDescriptions.length === 1 ? cnaeDescriptions[0] : undefined,
      cnaeAmbiguous: cnaes.length > 1,
    });
  });

  return lookup;
}
