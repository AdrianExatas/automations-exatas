const flash = document.getElementById("flash");
const pick = document.getElementById("pick");
const params = new URLSearchParams(location.search);
let currentId = params.get("id");

function showFlash(msg, ok = true) {
  flash.textContent = msg;
  flash.className = `flash show ${ok ? "ok" : "err"}`;
}

async function loadList() {
  const res = await fetch("/api/submissions");
  const items = await res.json();
  pick.innerHTML = items
    .map(
      (s) =>
        `<option value="${s.id}" ${s.id === currentId ? "selected" : ""}>${s.atividade} — ${s.status}</option>`,
    )
    .join("");
  if (!currentId && items[0]) currentId = items[0].id;
  if (currentId) pick.value = currentId;
}

async function loadDetail() {
  if (!currentId) return;
  const res = await fetch(`/api/submissions/${currentId}`);
  const s = await res.json();
  if (!res.ok) {
    showFlash(s.error || "Erro", false);
    return;
  }
  document.getElementById("meta").innerHTML =
    `<span class="badge ${s.status}">${s.status}</span> · ${s.setor} · ${s.sistema} · ${s.responsavel}`;
  document.getElementById("transcription").textContent =
    s.transcription || "(aguardando transcrição)";
  document.getElementById("inspector").textContent = s.validationFeedback
    ? JSON.stringify(s.validationFeedback, null, 2)
    : "(sem feedback ainda)";
  document.getElementById("audit").textContent = (s.audit || [])
    .map((a) => `${a.createdAt} | ${a.actor} | ${a.action} | ${a.details || ""}`)
    .join("\n");

  const video = document.getElementById("video");
  video.src = `/api/files/${currentId}/video`;

  const filesRes = await fetch(`/api/files/${currentId}/list`);
  const filesData = await filesRes.json();
  const ul = document.getElementById("files");
  ul.innerHTML = "";
  const printsBox = document.getElementById("prints");
  printsBox.innerHTML = "";
  if (filesRes.ok) {
    let hasPlaceholder = false;
    for (const f of filesData.files) {
      if (f.isDir) continue;
      const isOffice = /\.(docx|xlsx)$/i.test(f.name);
      const placeholder = Boolean(f.placeholder) || (isOffice && f.size < 1024);
      if (placeholder) hasPlaceholder = true;
      const li = document.createElement("li");
      const warn = placeholder
        ? ` <span class="badge erro" title="Arquivo texto, não abre no Word/Excel">placeholder — ative SKIP_OFFICE=0</span>`
        : "";
      li.innerHTML = `<a href="/api/files/${currentId}/download/${encodeURIComponent(f.name)}" target="_blank">${f.name}</a> <span class="muted">(${f.size} bytes)</span>${warn}`;
      ul.appendChild(li);
      if (/\.jpe?g$/i.test(f.name) || f.name.startsWith("Print-")) {
        const img = document.createElement("img");
        img.src = `/api/files/${currentId}/download/${encodeURIComponent(f.name)}`;
        img.alt = f.name;
        img.style.width = "100%";
        img.style.borderRadius = "8px";
        printsBox.appendChild(img);
      }
    }
    if (hasPlaceholder) {
      showFlash(
        "Há documentos placeholder (SKIP_OFFICE). Eles não abrem no Word/Excel — regenere com SKIP_OFFICE=0.",
        false,
      );
    }
  }
}

pick?.addEventListener("change", () => {
  currentId = pick.value;
  history.replaceState({}, "", `/validacao?id=${currentId}`);
  loadDetail();
});

document.getElementById("btnRefresh")?.addEventListener("click", () => {
  loadList().then(loadDetail);
});

document.getElementById("btnApprove")?.addEventListener("click", async () => {
  const approvedBy = document.getElementById("actor").value.trim();
  if (!approvedBy) return showFlash("Informe seu nome", false);
  const res = await fetch(`/api/submissions/${currentId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approvedBy }),
  });
  const data = await res.json();
  if (!res.ok) return showFlash(data.error || "Falha", false);
  showFlash("Publicado como vigente.");
  await loadList();
  await loadDetail();
});

document.getElementById("btnAdjust")?.addEventListener("click", async () => {
  const requestedBy = document.getElementById("actor").value.trim();
  const comment = document.getElementById("comment").value.trim();
  if (!requestedBy) return showFlash("Informe seu nome", false);
  if (comment.length < 3) return showFlash("Descreva o ajuste", false);
  const res = await fetch(`/api/submissions/${currentId}/request-adjustment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestedBy, comment }),
  });
  const data = await res.json();
  if (!res.ok) return showFlash(data.error || "Falha", false);
  showFlash("Ajuste enfileirado. A IA irá gerar nova versão.");
  await loadList();
  await loadDetail();
});

loadList().then(loadDetail);
setInterval(() => {
  if (document.visibilityState === "visible") loadDetail();
}, 8000);
