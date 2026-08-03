import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, join } from "node:path";
import { getConfig, getStoragePaths } from "../config";
import {
  addAudit,
  addDocumentVersion,
  getSubmissionById,
  listDocumentsBySubmission,
  upsertDocument,
  upsertMasterIndex,
  updateSubmission,
  getMasterByCode,
  markMasterObsolete,
} from "../db/repository";
import { exportMasterIndexFiles } from "./master-index-file";
import { runPowerShellFile } from "./powershell";
import type { DocType } from "../types/status";
import { sectorCode } from "../types/status";

function sectorFolder(setor: string): string {
  return setor.toUpperCase();
}

function ensureSectorTree(setor: string) {
  const { publishRoot } = getStoragePaths();
  const base = join(publishRoot, sectorFolder(setor));
  for (const sub of [
    "Documentos Vigentes",
    "Em Validacao",
    "Registros e Evidencias",
    "Documentos Obsoletos",
  ]) {
    mkdirSync(join(base, sub), { recursive: true });
  }
  return base;
}

async function convertToPdf(editablePath: string, pdfPath: string): Promise<void> {
  const { SKIP_OFFICE } = getConfig();
  if (SKIP_OFFICE) {
    writeFileSync(pdfPath, `PDF placeholder for ${basename(editablePath)}\n`, "utf-8");
    return;
  }

  // Caminhos curtos evitam limite de 255 chars do Word COM em alguns hosts
  const { work } = getStoragePaths();
  const staging = join(work, `pdf-${Date.now().toString(36)}`);
  mkdirSync(staging, { recursive: true });
  const ext = extname(editablePath).toLowerCase();
  const shortSrc = join(staging, `src${ext}`);
  const shortPdf = join(staging, "out.pdf");
  copyFileSync(editablePath, shortSrc);

  const script = `
$ErrorActionPreference = 'Stop'
$src = ${JSON.stringify(shortSrc)}
$dst = ${JSON.stringify(shortPdf)}
$ext = [System.IO.Path]::GetExtension($src).ToLowerInvariant()
if ($ext -eq '.docx') {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  try {
    $doc = $word.Documents.Open($src, $false, $true)
    $doc.ExportAsFixedFormat($dst, 17)
    $doc.Close($false)
  } finally { $word.Quit() | Out-Null }
} elseif ($ext -eq '.xlsx') {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  try {
    $wb = $excel.Workbooks.Open($src)
    $wb.ExportAsFixedFormat(0, $dst)
    $wb.Close($false)
  } finally { $excel.Quit() | Out-Null }
} else { throw "Extensao nao suportada: $ext" }
if (-not (Test-Path -LiteralPath $dst)) { throw "PDF nao gerado" }
`;
  const tmp = join(staging, "to-pdf.ps1");
  writeFileSync(tmp, script, "utf-8");
  const result = await runPowerShellFile(tmp, [], { timeoutMs: 120_000 });
  if (result.exitCode !== 0 || !existsSync(shortPdf)) {
    throw new Error(`Falha ao gerar PDF: ${result.stderr || result.stdout}`);
  }
  mkdirSync(join(pdfPath, ".."), { recursive: true });
  copyFileSync(shortPdf, pdfPath);
}

function reviewDatePlusMonths(months = 12): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function parseNumberFromCode(code: string): number {
  const m = code.match(/\.(\d+)$/);
  return m ? Number(m[1]) : 1;
}

export async function moveToValidationFolder(submissionId: string): Promise<void> {
  const sub = getSubmissionById(submissionId);
  if (!sub?.outputDir) return;
  const base = ensureSectorTree(sub.setor);
  const dest = join(base, "Em Validacao", submissionId);
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(sub.outputDir)) {
    const src = join(sub.outputDir, name);
    copyFileSync(src, join(dest, name));
  }
}

export async function publishSubmission(input: {
  submissionId: string;
  approvedBy: string;
  bumpMajor?: boolean;
}): Promise<void> {
  const sub = getSubmissionById(input.submissionId);
  if (!sub) throw new Error("Solicitação não encontrada");
  if (!sub.outputDir || !existsSync(sub.outputDir)) {
    throw new Error("Pasta de saída não encontrada");
  }

  const base = ensureSectorTree(sub.setor);
  const vigentes = join(base, "Documentos Vigentes");
  const evidencias = join(base, "Registros e Evidencias", input.submissionId);
  const obsoletos = join(base, "Documentos Obsoletos");
  mkdirSync(evidencias, { recursive: true });

  const files = readdirSync(sub.outputDir).filter((f) =>
    [".docx", ".xlsx"].includes(extname(f).toLowerCase()),
  );

  const docs = listDocumentsBySubmission(input.submissionId);
  const review = reviewDatePlusMonths(12);
  const sc = sectorCode(sub.setor);

  for (const file of files) {
    const src = join(sub.outputDir, file);
    const editableDest = join(evidencias, file);
    copyFileSync(src, editableDest);

    const codeMatch = file.match(/^(PR|IN|FORM|MP)\.[A-Z0-9]+\.\d+/i);
    const code = codeMatch?.[0]?.toUpperCase().replace("FORM.", "FORM.") ?? file;
    const normalizedCode = file.startsWith("FORM.")
      ? file.match(/^FORM\.[A-Z0-9]+\.\d+/i)?.[0] ?? code
      : codeMatch?.[0] ?? file.split(" - ")[0];

    const docType: DocType = normalizedCode.startsWith("PR.")
      ? "pop"
      : normalizedCode.startsWith("IN.")
        ? "it"
        : normalizedCode.startsWith("FORM.")
          ? "form"
          : "mp";

    const existingMaster = getMasterByCode(normalizedCode);
    let version = "1.0";
    if (existingMaster && existingMaster.status === "vigente") {
      const [maj, min] = existingMaster.version.split(".").map(Number);
      version = input.bumpMajor
        ? `${(maj || 1) + 1}.0`
        : `${maj || 1}.${(min || 0) + 1}`;
      // move previous PDF if exists
      const prevPdf = join(vigentes, `${normalizedCode}.pdf`);
      // also try matching by prefix
      for (const name of readdirSync(vigentes)) {
        if (name.startsWith(normalizedCode)) {
          renameSync(join(vigentes, name), join(obsoletos, name));
        }
      }
      markMasterObsolete(normalizedCode);
      void prevPdf;
    }

    const pdfName = file.replace(/\.(docx|xlsx)$/i, ".pdf");
    const pdfDest = join(vigentes, pdfName);
    await convertToPdf(editableDest, pdfDest);

    const title =
      docs.find((d) => d.code === normalizedCode)?.title ??
      sub.atividade;

    const doc = upsertDocument({
      id: crypto.randomUUID(),
      submissionId: input.submissionId,
      docType,
      code: normalizedCode,
      title,
      setor: sub.setor,
      version,
      status: "vigente",
      editablePath: editableDest,
      pdfPath: pdfDest,
      reviewDate: review,
      responsible: sub.responsavel,
    });

    addDocumentVersion({
      id: crypto.randomUUID(),
      documentId: doc.id,
      version,
      status: "vigente",
      editablePath: editableDest,
      pdfPath: pdfDest,
      contentSnapshotJson: sub.contentV2Json ?? undefined,
      changeSummary: sub.adjustmentComment ?? "Publicação inicial",
      createdBy: input.approvedBy,
    });

    upsertMasterIndex({
      code: normalizedCode,
      title,
      docType,
      setor: sub.setor,
      sectorCode: sc,
      number: parseNumberFromCode(normalizedCode),
      version,
      status: "vigente",
      responsible: sub.responsavel,
      reviewDate: review,
      documentId: doc.id,
      submissionId: input.submissionId,
    });
  }

  // cleanup Em Validação copy
  const validationDir = join(base, "Em Validacao", input.submissionId);
  if (existsSync(validationDir)) {
    for (const name of readdirSync(validationDir)) {
      try {
        renameSync(join(validationDir, name), join(evidencias, `validacao-${name}`));
      } catch {
        /* ignore */
      }
    }
  }

  const now = new Date().toISOString();
  updateSubmission(input.submissionId, {
    status: "vigente",
    approvedBy: input.approvedBy,
    approvedAt: now,
    publishedAt: now,
  });

  addAudit({
    id: crypto.randomUUID(),
    submissionId: input.submissionId,
    action: "publicado",
    actor: input.approvedBy,
    details: `Documentos publicados em ${vigentes}`,
  });

  exportMasterIndexFiles();

  const webhook = getConfig().NOTIFY_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "documentos_vigentes",
          submissionId: input.submissionId,
          atividade: sub.atividade,
          setor: sub.setor,
          approvedBy: input.approvedBy,
        }),
      });
    } catch {
      /* não bloqueia publicação */
    }
  }
}
