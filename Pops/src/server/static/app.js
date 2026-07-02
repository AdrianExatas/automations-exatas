const STATUS_LABELS = {
  queued: "Fila",
  processing: "Processando",
  validating: "Validando",
  completed: "Concluído",
  error: "Erro",
};

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const jobsBody = document.getElementById("jobs-body");
const uploadMessage = document.getElementById("upload-message");

dropzone.addEventListener("click", () => fileInput.click());

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  if (e.dataTransfer?.files?.length) {
    uploadFiles(e.dataTransfer.files);
  }
});

fileInput.addEventListener("change", () => {
  if (fileInput.files?.length) {
    uploadFiles(fileInput.files);
    fileInput.value = "";
  }
});

async function uploadFiles(fileList) {
  const formData = new FormData();
  for (const file of fileList) {
    formData.append("files", file);
  }

  uploadMessage.className = "message hidden";

  try {
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Erro no upload");
    }

    uploadMessage.textContent = `${data.jobs.length} arquivo(s) enfileirado(s)`;
    uploadMessage.className = "message success";
    await loadJobs();
  } catch (err) {
    uploadMessage.textContent = err.message;
    uploadMessage.className = "message error";
  }
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

function renderJobs(jobs) {
  if (!jobs.length) {
    jobsBody.innerHTML =
      '<tr><td colspan="5" class="empty">Nenhum job ainda</td></tr>';
    return;
  }

  jobsBody.innerHTML = jobs
    .map(
      (job) => `
    <tr>
      <td>${escapeHtml(job.filename)}</td>
      <td><span class="badge badge-${job.status}">${STATUS_LABELS[job.status] || job.status}</span></td>
      <td>${job.attempt}</td>
      <td>${formatDate(job.updatedAt)}</td>
      <td class="actions">
        ${
          job.hasDownload
            ? `<a class="btn" href="/api/download/${job.id}">Download</a>`
            : job.errorMessage
              ? `<span title="${escapeHtml(job.errorMessage)}">⚠</span>`
              : "—"
        }
      </td>
    </tr>`,
    )
    .join("");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function loadJobs() {
  const res = await fetch("/api/jobs");
  const data = await res.json();
  renderJobs(data.jobs);
}

loadJobs();
setInterval(loadJobs, 3000);
