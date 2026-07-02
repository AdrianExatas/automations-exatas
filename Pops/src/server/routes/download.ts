import { Elysia, t } from "elysia";
import { existsSync } from "node:fs";
import { getJobById } from "../../db/repository";

export const downloadRoutes = new Elysia({ prefix: "/api" }).get(
  "/download/:id",
  ({ params, set }) => {
    const job = getJobById(params.id);
    if (!job) {
      set.status = 404;
      return { error: "Job não encontrado" };
    }

    if (job.status !== "completed" || !job.outputPath) {
      set.status = 400;
      return { error: "POP ainda não disponível para download" };
    }

    if (!existsSync(job.outputPath)) {
      set.status = 404;
      return { error: "Arquivo de saída não encontrado" };
    }

    const filename = job.filename.replace(/\.(txt|json)$/i, ".docx");
    const file = Bun.file(job.outputPath);

    set.headers["Content-Type"] =
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    set.headers["Content-Disposition"] = `attachment; filename="${filename}"`;

    return file;
  },
);
