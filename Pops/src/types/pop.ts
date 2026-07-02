import { z } from "zod";

export const jobStatusSchema = z.enum([
  "queued",
  "processing",
  "validating",
  "completed",
  "error",
]);

export type JobStatus = z.infer<typeof jobStatusSchema>;

export const popHeaderSchema = z.object({
  title: z.string().min(1),
  version: z.string().min(1),
  responsible: z.string().min(1),
  reviewDate: z.string().min(1),
});

export const popStepSchema = z.object({
  order: z.number().int().positive(),
  action: z.string().min(1),
  detail: z.string().min(1),
});

export const popDocumentSchema = z.object({
  header: popHeaderSchema,
  objective: z.string().min(1),
  prerequisites: z.array(z.string().min(1)).min(1),
  steps: z.array(popStepSchema).min(1),
  qualityControl: z.array(z.string().min(1)).min(1),
});

export type PopDocument = z.infer<typeof popDocumentSchema>;

export const validationResultSchema = z.object({
  approved: z.boolean(),
  issues: z.array(z.string()),
  missingSteps: z.array(z.string()),
  hallucinations: z.array(z.string()),
});

export type ValidationResult = z.infer<typeof validationResultSchema>;

export const feedbackStatusSchema = z.enum(["pending", "reviewed"]);

export type FeedbackStatus = z.infer<typeof feedbackStatusSchema>;
