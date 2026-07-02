import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  status: text("status").notNull().default("queued"),
  attempt: integer("attempt").notNull().default(0),
  transcription: text("transcription").notNull(),
  popContent: text("pop_content"),
  validationFeedback: text("validation_feedback"),
  errorMessage: text("error_message"),
  outputPath: text("output_path"),
  feedbackToken: text("feedback_token").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  completedAt: text("completed_at"),
});

export const feedbacks = sqliteTable("feedbacks", {
  id: text("id").primaryKey(),
  jobId: text("job_id")
    .notNull()
    .references(() => jobs.id),
  authorName: text("author_name").notNull(),
  authorEmail: text("author_email"),
  section: text("section").notNull(),
  comment: text("comment").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Feedback = typeof feedbacks.$inferSelect;
export type NewFeedback = typeof feedbacks.$inferInsert;
