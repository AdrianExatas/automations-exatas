import { randomUUID } from "node:crypto";
import { Elysia, t } from "elysia";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { createJob } from "../../db/repository";
import { enqueuePopJob } from "../../workers/queue";
import { parseTranscriptionFile } from "../../utils/transcription";
import { generateFeedbackToken } from "../../feedback/token";
import { getStoragePaths } from "../../config";

export const uploadRoutes = new Elysia({ prefix: "/api" }).post(
  "/upload",
  async ({ body, set }) => {
    const files = body.files;
    if (!files || files.length === 0) {
      set.status = 400;
      return { error: "Nenhum arquivo enviado" };
    }

    const { uploads } = getStoragePaths();
    mkdirSync(uploads, { recursive: true });

    const created: { id: string; filename: string; status: string }[] = [];

    for (const file of files) {
      const filename = file.name ?? "transcription.txt";
      const lower = filename.toLowerCase();

      if (!lower.endsWith(".txt") && !lower.endsWith(".json")) {
        set.status = 400;
        return { error: `Formato não suportado: ${filename}. Use .txt ou .json` };
      }

      const content = await file.text();
      const transcription = parseTranscriptionFile(filename, content);
      const id = randomUUID();
      const feedbackToken = generateFeedbackToken();

      await Bun.write(join(uploads, `${id}-${filename}`), content);

      createJob({ id, filename, transcription, feedbackToken });
      await enqueuePopJob(id);

      created.push({ id, filename, status: "queued" });
    }

    return { jobs: created };
  },
  {
    body: t.Object({
      files: t.Files(),
    }),
  },
);
