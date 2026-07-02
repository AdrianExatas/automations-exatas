import { randomUUID } from "node:crypto";
import { Elysia, t } from "elysia";
import {
  listFeedbacks,
  createFeedback,
  markFeedbackReviewed,
  getJobByFeedbackToken,
} from "../../db/repository";

export const feedbackRoutes = new Elysia()
  .get("/api/feedback", () => {
    const items = listFeedbacks();
    return { feedbacks: items };
  })
  .patch(
    "/api/feedback/:id",
    ({ params, set }) => {
      const updated = markFeedbackReviewed(params.id);
      if (!updated) {
        set.status = 404;
        return { error: "Feedback não encontrado" };
      }
      return { feedback: updated };
    },
  )
  .get("/api/feedback/token/:token", ({ params, set }) => {
    const job = getJobByFeedbackToken(params.token);
    if (!job) {
      set.status = 404;
      return { error: "POP não encontrado para este link" };
    }
    return {
      job: {
        id: job.id,
        filename: job.filename,
        title: job.popContent
          ? JSON.parse(job.popContent).header?.title
          : job.filename,
      },
    };
  })
  .post(
    "/api/feedback/token/:token",
    ({ params, body, set }) => {
      const job = getJobByFeedbackToken(params.token);
      if (!job) {
        set.status = 404;
        return { error: "POP não encontrado para este link" };
      }

      const id = randomUUID();
      const feedback = createFeedback({
        id,
        jobId: job.id,
        authorName: body.authorName,
        authorEmail: body.authorEmail,
        section: body.section,
        comment: body.comment,
      });

      return { feedback };
    },
    {
      body: t.Object({
        authorName: t.String({ minLength: 1 }),
        authorEmail: t.Optional(t.String()),
        section: t.String({ minLength: 1 }),
        comment: t.String({ minLength: 1 }),
      }),
    },
  )
  .get("/feedback/:token", ({ params, set }) => {
    const job = getJobByFeedbackToken(params.token);
    if (!job) {
      set.status = 404;
      set.headers["Content-Type"] = "text/html; charset=utf-8";
      return "<h1>Link inválido ou expirado</h1>";
    }

    const title = job.popContent
      ? JSON.parse(job.popContent).header?.title ?? job.filename
      : job.filename;

    set.headers["Content-Type"] = "text/html; charset=utf-8";
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sugestão — ${title}</title>
  <link rel="stylesheet" href="/static/styles.css">
</head>
<body>
  <main class="container">
    <h1>Enviar sugestão</h1>
    <p class="subtitle">POP: <strong>${title}</strong></p>
    <form id="feedback-form" class="card">
      <label>Nome<input type="text" name="authorName" required></label>
      <label>E-mail (opcional)<input type="email" name="authorEmail"></label>
      <label>Seção do POP<input type="text" name="section" placeholder="Ex: Passo a Passo, Objetivo" required></label>
      <label>Comentário<textarea name="comment" rows="5" required></textarea></label>
      <button type="submit">Enviar sugestão</button>
    </form>
    <p id="feedback-message" class="message hidden"></p>
  </main>
  <script>
    const form = document.getElementById('feedback-form');
    const msg = document.getElementById('feedback-message');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const body = Object.fromEntries(fd.entries());
      const res = await fetch('/api/feedback/token/${params.token}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        msg.textContent = 'Sugestão enviada com sucesso. Obrigado!';
        msg.className = 'message success';
        form.reset();
      } else {
        const err = await res.json();
        msg.textContent = err.error || 'Erro ao enviar sugestão';
        msg.className = 'message error';
      }
    });
  </script>
</body>
</html>`;
  });
