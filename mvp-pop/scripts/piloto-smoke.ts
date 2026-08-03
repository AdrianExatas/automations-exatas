/**
 * Smoke do piloto Atendimento sem Redis/LLM reais:
 * valida fixture content-v2 + numeração + pastas de publicação.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resetConfigForTests, getStoragePaths } from "../src/config";
import { resetDbForTests, getDb } from "../src/db/client";
import {
  createSubmission,
  upsertMasterIndex,
  updateSubmission,
} from "../src/db/repository";
import { allocateCodes, fileNameFor } from "../src/services/numbering";
import { exportMasterIndexFiles } from "../src/services/master-index-file";
import { contentV2Schema } from "../src/types/content-v2";

const root = join(import.meta.dir, "..", "storage", "piloto-smoke");
process.env.STORAGE_PATH = root;
process.env.DATABASE_PATH = join(root, "piloto.db");
process.env.PUBLISH_ROOT = join(root, "GESTAO DE PROCESSOS");
process.env.SKIP_OFFICE = "1";
process.env.LLM_PROVIDER = "ollama";
resetConfigForTests();
resetDbForTests();

mkdirSync(root, { recursive: true });
getDb();

const paths = getStoragePaths();
mkdirSync(paths.entrada, { recursive: true });
mkdirSync(paths.outputs, { recursive: true });

const fixture = JSON.parse(
  readFileSync(join(import.meta.dir, "..", "tests", "fixtures", "content-v2-minimal.json"), "utf-8"),
);

const id = crypto.randomUUID();
const videoPath = join(paths.uploads, id, "piloto.mp4");
mkdirSync(join(paths.uploads, id), { recursive: true });
writeFileSync(videoPath, "fake-video");

createSubmission({
  id,
  setor: "Atendimento",
  atividade: "Registrar solicitação no Bitrix",
  responsavel: "Analista de Atendimento",
  sistema: "Bitrix",
  frequencia: "Diária",
  prazo: "Imediato",
  observacoes: "Piloto MVP",
  videoPath,
  videoOriginalName: "piloto.mp4",
  documentosSolicitados: JSON.stringify(["it", "form"]),
});

const alloc = allocateCodes("Atendimento", ["it", "form"]);
fixture.documentos_solicitados = ["it", "form"];
fixture.documento.titulo = "REGISTRAR SOLICITAÇÃO NO BITRIX";
fixture.documento.setor = "Atendimento";
fixture.documento.sigla_setor = alloc.sectorCode;
fixture.documento.numero = alloc.numero;
fixture.documento.codigo_it = alloc.codes.it;
fixture.documento.codigo_form = alloc.codes.form;
fixture.documento.codigo_pop = undefined;
fixture.documento.codigo_mp = undefined;
fixture.saida.arquivo_it = fileNameFor(alloc.codes.it!, "Registrar solicitação no Bitrix", "docx");
fixture.saida.arquivo_form = fileNameFor(alloc.codes.form!, "Registrar solicitação no Bitrix", "xlsx");
delete fixture.saida.arquivo_pop;
delete fixture.saida.arquivo_mp;

const content = contentV2Schema.parse(fixture);
const out = join(paths.outputs, id);
mkdirSync(out, { recursive: true });
writeFileSync(join(out, content.saida.arquivo_it!), "IT placeholder\n");
writeFileSync(join(out, content.saida.arquivo_form!), "FORM placeholder\n");
writeFileSync(join(out, "content-v2.json"), JSON.stringify(content, null, 2));

for (const type of ["it", "form"] as const) {
  const code = alloc.codes[type]!;
  upsertMasterIndex({
    code,
    title: "Registrar solicitação no Bitrix",
    docType: type,
    setor: "Atendimento",
    sectorCode: alloc.sectorCode,
    number: alloc.numbers[type]!,
    version: "1.0",
    status: "vigente",
    responsible: "Líder do Atendimento",
    reviewDate: "2027-07-21",
    submissionId: id,
  });
}

updateSubmission(id, {
  status: "vigente",
  contentV2Json: JSON.stringify(content),
  outputDir: out,
  approvedBy: "Líder do Atendimento",
  approvedAt: new Date().toISOString(),
  publishedAt: new Date().toISOString(),
});

const exported = exportMasterIndexFiles();
const entrada = join(paths.entrada, "Atendimento", "Registrar solicitação no Bitrix", id);
mkdirSync(entrada, { recursive: true });
writeFileSync(join(entrada, "piloto.mp4"), "fake-video");

console.log("Piloto smoke OK");
console.log("  codes:", alloc.codes);
console.log("  output:", out);
console.log("  index:", exported.jsonPath);
console.log("  content valid:", existsSync(join(out, "content-v2.json")));
