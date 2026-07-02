const feedbacksBody = document.getElementById("feedbacks-body");

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

async function markReviewed(id) {
  await fetch(`/api/feedback/${id}`, { method: "PATCH" });
  await loadFeedbacks();
}

function renderFeedbacks(feedbacks) {
  if (!feedbacks.length) {
    feedbacksBody.innerHTML =
      '<tr><td colspan="6" class="empty">Nenhuma sugestão recebida</td></tr>';
    return;
  }

  feedbacksBody.innerHTML = feedbacks
    .map(
      (fb) => `
    <tr>
      <td>${escapeHtml(fb.authorName)}${fb.authorEmail ? `<br><small>${escapeHtml(fb.authorEmail)}</small>` : ""}</td>
      <td>${escapeHtml(fb.section)}</td>
      <td>${escapeHtml(fb.comment)}</td>
      <td><span class="badge badge-${fb.status}">${fb.status === "pending" ? "Pendente" : "Revisado"}</span></td>
      <td>${formatDate(fb.createdAt)}</td>
      <td>
        ${
          fb.status === "pending"
            ? `<button onclick="markReviewed('${fb.id}')">Marcar revisado</button>`
            : "—"
        }
      </td>
    </tr>`,
    )
    .join("");
}

async function loadFeedbacks() {
  const res = await fetch("/api/feedback");
  const data = await res.json();
  renderFeedbacks(data.feedbacks);
}

window.markReviewed = markReviewed;
loadFeedbacks();
setInterval(loadFeedbacks, 5000);
