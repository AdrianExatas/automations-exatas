async function load() {
  const res = await fetch("/api/panel");
  const data = await res.json();
  document.getElementById("stats").innerHTML = `
    <div class="stat"><strong>${data.masterTotal}</strong><span class="muted">no índice</span></div>
    <div class="stat"><strong>${data.vigentes}</strong><span class="muted">vigentes</span></div>
    <div class="stat"><strong>${data.recent?.length ?? 0}</strong><span class="muted">recentes</span></div>
  `;
  document.getElementById("byStatus").innerHTML = (data.byStatus || [])
    .map((r) => `<tr><td><span class="badge ${r.status}">${r.status}</span></td><td>${r.count}</td></tr>`)
    .join("");
  document.getElementById("bySetor").innerHTML = (data.bySetor || [])
    .map((r) => `<tr><td>${r.setor}</td><td>${r.count}</td></tr>`)
    .join("");
  document.getElementById("rev").innerHTML = (data.proximosRevisao || [])
    .map((r) => `<tr><td>${r.code}</td><td>${r.title}</td><td>${r.reviewDate || ""}</td></tr>`)
    .join("") || `<tr><td colspan="3" class="muted">Nenhum</td></tr>`;
  document.getElementById("recent").innerHTML = (data.recent || [])
    .map(
      (s) => `<tr>
        <td>${s.atividade}</td>
        <td>${s.setor}</td>
        <td><span class="badge ${s.status}">${s.status}</span></td>
        <td>${new Date(s.updatedAt).toLocaleString("pt-BR")}</td>
        <td><a href="/validacao?id=${s.id}">abrir</a></td>
      </tr>`,
    )
    .join("");
}
load();
setInterval(load, 10000);
