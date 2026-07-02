import { eq, desc } from "drizzle-orm";
import { getDb } from "../db/client";
import { jobs, feedbacks, type Job, type Feedback } from "../db/schema";
import type { JobStatus, PopDocument, ValidationResult } from "../types/pop";
import { popDocumentSchema, validationResultSchema } from "../types/pop";

function nowIso(): string {
  return new Date().toISOString();
}

export function createJob(input: {
  id: string;
  filename: string;
  transcription: string;
  feedbackToken: string;
}): Job {
  const db = getDb();
  const timestamp = nowIso();

  db.insert(jobs)
    .values({
      id: input.id,
      filename: input.filename,
      transcription: input.transcription,
      feedbackToken: input.feedbackToken,
      status: "queued",
      attempt: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return getJobById(input.id)!;
}

export function getJobById(id: string): Job | undefined {
  const db = getDb();
  return db.select().from(jobs).where(eq(jobs.id, id)).get();
}

export function listJobs(): Job[] {
  const db = getDb();
  return db.select().from(jobs).orderBy(desc(jobs.createdAt)).all();
}

export function updateJobStatus(
  id: string,
  status: JobStatus,
  extra?: Partial<{
    attempt: number;
    popContent: string;
    validationFeedback: string;
    errorMessage: string;
    outputPath: string;
    completedAt: string;
  }>,
): Job | undefined {
  const db = getDb();
  const existing = getJobById(id);
  if (!existing) return undefined;

  db.update(jobs)
    .values({
      status,
      updatedAt: nowIso(),
      ...extra,
    })
    .where(eq(jobs.id, id))
    .run();

  return getJobById(id);
}

export function getPopContent(job: Job): PopDocument | null {
  if (!job.popContent) return null;
  return popDocumentSchema.parse(JSON.parse(job.popContent));
}

export function setPopContent(id: string, pop: PopDocument): void {
  updateJobStatus(id, "validating", {
    popContent: JSON.stringify(pop),
  });
}

export function getValidationFeedback(job: Job): ValidationResult | null {
  if (!job.validationFeedback) return null;
  return validationResultSchema.parse(JSON.parse(job.validationFeedback));
}

export function createFeedback(input: {
  id: string;
  jobId: string;
  authorName: string;
  authorEmail?: string;
  section: string;
  comment: string;
}): Feedback {
  const db = getDb();
  const timestamp = nowIso();

  db.insert(feedbacks)
    .values({
      id: input.id,
      jobId: input.jobId,
      authorName: input.authorName,
      authorEmail: input.authorEmail ?? null,
      section: input.section,
      comment: input.comment,
      status: "pending",
      createdAt: timestamp,
    })
    .run();

  return getFeedbackById(input.id)!;
}

export function getFeedbackById(id: string): Feedback | undefined {
  const db = getDb();
  return db.select().from(feedbacks).where(eq(feedbacks.id, id)).get();
}

export function listFeedbacks(): Feedback[] {
  const db = getDb();
  return db.select().from(feedbacks).orderBy(desc(feedbacks.createdAt)).all();
}

export function getJobByFeedbackToken(token: string): Job | undefined {
  const db = getDb();
  return db.select().from(jobs).where(eq(jobs.feedbackToken, token)).get();
}

export function markFeedbackReviewed(id: string): Feedback | undefined {
  const db = getDb();
  db.update(feedbacks)
    .values({ status: "reviewed" })
    .where(eq(feedbacks.id, id))
    .run();

  return getFeedbackById(id);
}
