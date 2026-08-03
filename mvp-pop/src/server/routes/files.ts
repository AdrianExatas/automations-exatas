import { Elysia } from "elysia";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { getSubmissionById } from "../../db/repository";

function isPlaceholderOffice(fullPath: string, size: number): boolean {
  if (!/\.(docx|xlsx)$/i.test(fullPath)) return false;
  if (size < 1024) return true;
  try {
    const head = readFileSync(fullPath, "utf-8").slice(0, 80);
    return head.includes("SKIP_OFFICE placeholder");
  } catch {
    return false;
  }
}

export const filesRoutes = new Elysia({ prefix: "/api/files" })
  .get("/:submissionId/list", ({ params, set }) => {
    const sub = getSubmissionById(params.submissionId);
    if (!sub?.outputDir || !existsSync(sub.outputDir)) {
      set.status = 404;
      return { error: "Saída não encontrada" };
    }
    const files = readdirSync(sub.outputDir).map((name) => {
      const full = join(sub.outputDir!, name);
      const st = statSync(full);
      return {
        name,
        size: st.size,
        isDir: st.isDirectory(),
        placeholder: !st.isDirectory() && isPlaceholderOffice(full, st.size),
      };
    });
    return { files, outputDir: sub.outputDir, videoPath: sub.videoPath };
  })
  .get("/:submissionId/download/:name", ({ params, set }) => {
    const sub = getSubmissionById(params.submissionId);
    if (!sub?.outputDir) {
      set.status = 404;
      return { error: "Não encontrado" };
    }
    const safe = basename(params.name);
    const full = join(sub.outputDir, safe);
    if (!existsSync(full)) {
      // try prints subfolder
      const alt = join(sub.outputDir, "prints", safe);
      if (!existsSync(alt)) {
        set.status = 404;
        return { error: "Arquivo não encontrado" };
      }
      return Bun.file(alt);
    }
    return Bun.file(full);
  })
  .get("/:submissionId/video", ({ params, set }) => {
    const sub = getSubmissionById(params.submissionId);
    if (!sub?.videoPath || !existsSync(sub.videoPath)) {
      set.status = 404;
      return { error: "Vídeo não encontrado" };
    }
    return Bun.file(sub.videoPath);
  });
