import { mkdirSync } from "node:fs";
import { generatePop } from "../agents/writer";
import { validatePop } from "../agents/inspector";
import {
  getJobById,
  updateJobStatus,
  setPopContent,
} from "../db/repository";
import {
  exportPopToDocx,
  getOutputPath,
  getFeedbackUrlForJob,
} from "../export/docx";
import { getConfig, getStoragePaths } from "../config";
import {
  shouldRetryValidation,
  formatValidationFeedback,
} from "../utils/transcription";
import { getValidationFeedback } from "../db/repository";
import type { ValidationResult } from "../types/pop";

export async function processPopJob(jobId: string): Promise<void> {
  const job = getJobById(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} não encontrado`);
  }

  const { MAX_RETRIES, BASE_URL } = getConfig();
  const { outputs } = getStoragePaths();
  mkdirSync(outputs, { recursive: true });

  let attempt = job.attempt;
  let previousFeedback: ValidationResult | null = getValidationFeedback(job);

  while (attempt <= MAX_RETRIES) {
    attempt += 1;
    updateJobStatus(jobId, "processing", { attempt });

    const popDraft = await generatePop(job.transcription, previousFeedback);
    setPopContent(jobId, popDraft);

    updateJobStatus(jobId, "validating");
    const validation = await validatePop(job.transcription, popDraft);

    updateJobStatus(jobId, "validating", {
      validationFeedback: JSON.stringify(validation),
    });

    if (validation.approved) {
      const outputPath = getOutputPath(jobId, outputs);
      const feedbackUrl = getFeedbackUrlForJob(BASE_URL, job.feedbackToken);

      await exportPopToDocx(popDraft, outputPath, feedbackUrl);

      updateJobStatus(jobId, "completed", {
        outputPath,
        completedAt: new Date().toISOString(),
        popContent: JSON.stringify(popDraft),
      });
      return;
    }

    if (!shouldRetryValidation(validation.approved, attempt, MAX_RETRIES)) {
      updateJobStatus(jobId, "error", {
        errorMessage: formatValidationFeedback(validation),
        validationFeedback: JSON.stringify(validation),
      });
      return;
    }

    previousFeedback = validation;
  }
}
