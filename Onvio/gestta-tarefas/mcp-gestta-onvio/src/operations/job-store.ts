import { randomUUID } from "node:crypto";
import type { JobRecord } from "../types.js";

export class JobStore {
  private readonly jobs = new Map<string, JobRecord>();

  create(operationId: string): JobRecord {
    const now = new Date().toISOString();
    const job: JobRecord = {
      jobId: randomUUID(),
      operationId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      progress: 0,
    };
    this.jobs.set(job.jobId, job);
    return { ...job };
  }

  get(jobId: string): JobRecord {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job não encontrado: ${jobId}`);
    return { ...job };
  }

  update(jobId: string, patch: Partial<Omit<JobRecord, "jobId" | "operationId" | "createdAt">>): JobRecord {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job não encontrado: ${jobId}`);
    Object.assign(job, patch, { updatedAt: new Date().toISOString() });
    return { ...job };
  }
}
