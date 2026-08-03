async function load() {
  const res = await fetch("/api/index");
  const rows = await res.json();
  document.getElementById("rows").innerHTML = rows
    .map(
      (r) => `<tr>
        <td>${r.code}</td>
        <td>${r.title}</td>
        <td>${r.setor}</td>
        <td>${r.version}</td>
        <td><span class="badge ${r.status}">${r.status}</span></td>
        <td>${r.responsible}</td>
        <td>${r.reviewDate || ""}</td>
      </tr>`,
    )
    .join("") || `<tr><td colspan="7" class="muted">Índice vazio</td></tr>`;
}

document.getElementById("exportBtn")?.addEventListener("click", async () => {
  const res = await fetch("/api/index/export", { method: "POST" });
  const data = await res.json();
  alert(`Exportado:\n${data.jsonPath}\n${data.csvPath}`);
});

load();
