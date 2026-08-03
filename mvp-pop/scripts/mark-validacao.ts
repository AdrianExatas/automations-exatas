import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resetConfigForTests } from "../src/config";
import {
  addAudit,
  updateSubmission,
  upsertDocument,
  upsertMasterIndex,
} from "../src/db/repository";
import { getDb } from "../src/db/client";

resetConfigForTests();
getDb();

const id = process.argv[2];
if (!id) throw new Error("Uso: bun run scripts/mark-validacao.ts <submissionId>");

const out = join(process.cwd(), "storage", "outputs", id);
const contentPath = join(process.cwd(), "storage", "work", id, "content-v2.json");
const content = readFileSync(contentPath, "utf-8");

updateSubmission(id, {
  status: "em_validacao",
  errorMessage: null,
  outputDir: out,
  contentV2Json: content,
  transcriptionStatus: "concluida",
});

addAudit({
  id: crypto.randomUUID(),
  submissionId: id,
  action: "documentacao_pronta",
  actor: "sistema",
  details: "Word COM validado (POP+IT reais)",
});

const title = "Como atualizar o periodo de gozo das ferias do colaborador";
const docs = [
  { code: "IN.DP.005", type: "it" as const, n: 5 },
  { code: "PR.DP.004", type: "pop" as const, n: 4 },
];

for (const d of docs) {
  const editable = join(out, `${d.code} - ${title}.docx`);
  upsertDocument({
    id: crypto.randomUUID(),
    submissionId: id,
    docType: d.type,
    code: d.code,
    title,
    setor: "Departamento Pessoal",
    version: "0.1",
    status: "em_validacao",
    responsible: "Auxiliar Junior",
    editablePath: editable,
  });
  upsertMasterIndex({
    code: d.code,
    title,
    docType: d.type,
    setor: "Departamento Pessoal",
    sectorCode: "DP",
    number: d.n,
    version: "0.1",
    status: "em_validacao",
    responsible: "Auxiliar Junior",
    submissionId: id,
  });
}

console.log("OK em_validacao", id);
console.log("output", out);
