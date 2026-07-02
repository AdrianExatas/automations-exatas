import { Elysia } from "elysia";
import { listJobs, getJobById } from "../../db/repository";

export const jobsRoutes = new Elysia({ prefix: "/api" })
  .get("/jobs", () => {
    const jobs = listJobs();
    return {
      jobs: jobs.map((job) => ({
        id: job.id,
        filename: job.filename,
        status: job.status,
        attempt: job.attempt,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
        hasDownload: job.status === "completed" && !!job.outputPath,
      })),
    };
  })
  .get("/jobs/:id", ({ params, set }) => {
    const job = getJobById(params.id);
    if (!job) {
      set.status = 404;
      return { error: "Job não encontrado" };
    }

    return {
      id: job.id,
      filename: job.filename,
      status: job.status,
      attempt: job.attempt,
      errorMessage: job.errorMessage,
      validationFeedback: job.validationFeedback
        ? JSON.parse(job.validationFeedback)
        : null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
      hasDownload: job.status === "completed" && !!job.outputPath,
    };
  });
