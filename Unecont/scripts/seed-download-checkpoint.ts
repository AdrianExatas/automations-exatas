import fs from "node:fs";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx");
import { loadEmpresasFromExcel } from "../src/input";
import { normalizeCnpj } from "../src/domain/empresa-normalization";

const dir = "runtime/downloads/Unecont_2026-09-02_09-24-55";
const planilha = "assets/planilha/planilha-operacional-agosto-atualizada-corrigida.xlsx";
const empresas = loadEmpresasFromExcel(planilha);
const byCodigo = new Map(empresas.map((empresa) => [empresa.codigo, normalizeCnpj(empresa.cnpj)]));

const files = fs.readdirSync(dir).filter((name) => name.toLowerCase().endsWith(".xlsx"));
const processed: string[] = [];
for (const file of files) {
  const match = file.match(/^(\d+)\s*-/);
  if (!match) continue;
  const cnpj = byCodigo.get(String(parseInt(match[1], 10)));
  // Also try raw codigo match used by EmpresaBatchItem
  const cnpj2 = byCodigo.get(match[1]) ?? cnpj;
  const value = cnpj2 || cnpj;
  if (!value) continue;
  // Checkpoint compares against empresa.cnpj as loaded from excel.
  const empresa = empresas.find((item) => normalizeCnpj(item.cnpj) === value);
  if (empresa && !processed.includes(empresa.cnpj)) processed.push(empresa.cnpj);
}

fs.mkdirSync("runtime/checkpoints", { recursive: true });
fs.writeFileSync(
  "runtime/checkpoints/download-batch.json",
  JSON.stringify({ processed, no_notas: [], not_found: [], failed: [] }, null, 2),
);

console.log(
  JSON.stringify(
    {
      files: files.length,
      processed: processed.length,
      sampleEmpresaCnpj: empresas[0]?.cnpj,
      sampleProcessed: processed.slice(0, 5),
      codigoKeys: [...byCodigo.keys()].slice(0, 5),
    },
    null,
    2,
  ),
);
