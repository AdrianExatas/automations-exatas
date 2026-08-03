import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import { getConfig, getStoragePaths } from "../config";
import { pickPrints } from "../agents/print-picker";
import type { ContentV2 } from "../types/content-v2";
import { geradorScript, runPowerShellFile } from "./powershell";

export async function extractAndInsertPrints(input: {
  submissionId: string;
  videoPath: string;
  transcription: string;
  content: ContentV2;
  outputDir: string;
}): Promise<{ printsDir: string; printPlanJson: string; manifestPath?: string }> {
  const { work } = getStoragePaths();
  const printsDir = join(work, input.submissionId, "prints");
  mkdirSync(printsDir, { recursive: true });

  // candidate timestamps: every ~15s from inspect metadata if present
  const candidates: number[] = [];
  for (let t = 5; t <= 600; t += 15) candidates.push(t);

  let plan;
  try {
    plan = await pickPrints({
      transcription: input.transcription,
      content: input.content,
      candidateTimestamps: candidates,
    });
  } catch {
    plan = {
      prints: (input.content.it?.secoes ?? []).slice(0, 8).map((s, i) => ({
        etapa_id: String((s as { etapa_id?: string }).etapa_id ?? `E${String(i + 1).padStart(2, "0")}`),
        timestamp_seconds: 5 + i * 20,
        rotulo: String((s as { titulo?: string }).titulo ?? `Etapa ${i + 1}`),
        needs_pii_review: true,
      })),
    };
  }

  const planPath = join(printsDir, "print-plan.json");
  writeFileSync(planPath, JSON.stringify(plan, null, 2), "utf-8");

  const skipHeavy =
    getConfig().SKIP_OFFICE && getConfig().LLM_PROVIDER === "mock";
  const manifestPath = join(printsDir, "prints-manifest.json");

  if (skipHeavy) {
    writeFileSync(
      manifestPath,
      JSON.stringify(
        plan.prints.map((p, i) => ({
          ...p,
          path: join(printsDir, `Print-${String(i + 1).padStart(2, "0")}-${p.etapa_id}.jpg`),
        })),
        null,
        2,
      ),
      "utf-8",
    );
    return {
      printsDir,
      printPlanJson: JSON.stringify(plan),
      manifestPath,
    };
  }

  const extractResult = await runPowerShellFile(
    geradorScript("extract_scene_frames.ps1"),
    [
      "-VideoPath",
      input.videoPath,
      "-OutputDir",
      printsDir,
      "-TimestampsJson",
      planPath,
    ],
    { timeoutMs: 15 * 60_000 },
  );

  if (extractResult.exitCode !== 0 && !existsSync(manifestPath)) {
    console.warn("[prints] extração falhou:", extractResult.stderr || extractResult.stdout);
    return {
      printsDir,
      printPlanJson: JSON.stringify(plan),
    };
  }

  if (getConfig().SKIP_OFFICE) {
    return {
      printsDir,
      printPlanJson: JSON.stringify(plan),
      manifestPath: existsSync(manifestPath) ? manifestPath : undefined,
    };
  }

  const docxFiles = existsSync(input.outputDir)
    ? readdirSync(input.outputDir).filter((f) => f.toLowerCase().endsWith(".docx") && f.startsWith("IN."))
    : [];

  for (const docx of docxFiles) {
    const result = await runPowerShellFile(
      geradorScript("insert_prints.ps1"),
      ["-DocxPath", join(input.outputDir, docx), "-ManifestJson", manifestPath],
      { timeoutMs: 120_000 },
    );
    if (result.exitCode !== 0) {
      console.warn("[prints] inserção falhou em", docx, result.stderr || result.stdout);
    }
  }

  // copy prints into output for validation UI
  try {
    const outPrints = join(input.outputDir, "prints");
    mkdirSync(outPrints, { recursive: true });
    for (const name of readdirSync(printsDir)) {
      if (name.endsWith(".jpg") || name.endsWith(".json")) {
        writeFileSync(
          join(outPrints, name),
          readFileSync(join(printsDir, name)),
        );
      }
    }
  } catch {
    /* ignore */
  }

  return {
    printsDir,
    printPlanJson: JSON.stringify(plan),
    manifestPath,
  };
}
