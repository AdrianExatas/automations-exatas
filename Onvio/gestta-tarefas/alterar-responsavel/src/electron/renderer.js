const api = window.gesttaApp;

const form = document.getElementById("automationForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const saveCredentialsInput = document.getElementById("saveCredentialsInput");
const startWithoutCheckpointInput = document.getElementById("startWithoutCheckpointInput");
const sheetInput = document.getElementById("sheetInput");
const selectSheetButton = document.getElementById("selectSheetButton");
const inspectSheetButton = document.getElementById("inspectSheetButton");
const downloadTemplateButton = document.getElementById("downloadTemplateButton");
const rollbackButton = document.getElementById("rollbackButton");
const openReportsButton = document.getElementById("openReportsButton");
const runButton = document.getElementById("runButton");
const logOutput = document.getElementById("logOutput");
const statusBadge = document.getElementById("statusBadge");
const sheetPreview = document.getElementById("sheetPreview");
const sheetSummary = document.getElementById("sheetSummary");
const sheetColumns = document.getElementById("sheetColumns");
const sheetPreviewTable = document.getElementById("sheetPreviewTable");

function setStatus(text, state) {
  statusBadge.textContent = text;
  statusBadge.className = `status ${state}`;
}

function appendLog(message) {
  logOutput.textContent += message;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function setRunning(running) {
  runButton.disabled = running;
  selectSheetButton.disabled = running;
  inspectSheetButton.disabled = running;
  downloadTemplateButton.disabled = running;
  rollbackButton.disabled = running;
  openReportsButton.disabled = running;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderSheetStructure(structure) {
  sheetPreview.hidden = false;
  sheetSummary.textContent = `${structure.activeSheetName || "Sem aba"} - ${structure.totalRows} linha(s) de dados - ${structure.sheetNames.length} aba(s)`;
  sheetColumns.innerHTML = structure.headers.length
    ? structure.headers.map((header) => `<span>${escapeHtml(header)}</span>`).join("")
    : "<span>Nenhuma coluna encontrada</span>";

  if (!structure.headers.length) {
    sheetPreviewTable.innerHTML = "";
    return;
  }

  const head = structure.headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join("");
  const body = structure.previewRows
    .map((row) => {
      const cells = structure.headers
        .map((header) => `<td>${escapeHtml(row[header] || "")}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  sheetPreviewTable.innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>`;
}

async function inspectSelectedSheet() {
  if (!sheetInput.value) return;
  const result = await api.inspectSheet({ filePath: sheetInput.value });
  if (!result.ok) {
    sheetPreview.hidden = false;
    sheetSummary.textContent = result.error || "Nao foi possivel ler a planilha.";
    sheetColumns.innerHTML = "";
    sheetPreviewTable.innerHTML = "";
    return;
  }
  renderSheetStructure(result.structure);
}

api.loadCredentials().then((credentials) => {
  emailInput.value = credentials.email || "";
  passwordInput.value = credentials.password || "";
  saveCredentialsInput.checked = Boolean(credentials.hasSavedPassword);
  saveCredentialsInput.disabled = !credentials.canSavePassword;
});

selectSheetButton.addEventListener("click", async () => {
  const result = await api.selectSheet();
  if (!result.canceled && result.filePath) {
    sheetInput.value = result.filePath;
    await inspectSelectedSheet();
  }
});

inspectSheetButton.addEventListener("click", inspectSelectedSheet);

downloadTemplateButton.addEventListener("click", async () => {
  const result = await api.downloadTemplate();
  if (!result.canceled && result.filePath) {
    appendLog(`Planilha padrao criada: ${result.filePath}\n`);
  }
});

rollbackButton.addEventListener("click", async () => {
  logOutput.textContent = "";
  setStatus("Executando", "running");
  setRunning(true);

  const result = await api.runRollback({
    email: emailInput.value,
    password: passwordInput.value,
    saveCredentials: saveCredentialsInput.checked,
  });

  if (!result.ok) {
    if (!result.canceled) appendLog(`${result.error || "Reversao cancelada."}\n`);
    setStatus(result.canceled ? "Pronto" : "Erro", result.canceled ? "idle" : "error");
    setRunning(false);
  }
});

openReportsButton.addEventListener("click", async () => {
  const result = await api.openReports();
  if (!result.ok) appendLog(`Erro ao abrir relatorios: ${result.error}\n`);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  logOutput.textContent = "";
  setStatus("Executando", "running");
  setRunning(true);

  const result = await api.runAutomation({
    email: emailInput.value,
    password: passwordInput.value,
    saveCredentials: saveCredentialsInput.checked,
    startWithoutCheckpoint: startWithoutCheckpointInput.checked,
    planilhaPath: sheetInput.value,
  });

  if (!result.ok) {
    appendLog(`${result.error}\n`);
    setStatus("Erro", "error");
    setRunning(false);
  }
});

api.onAutomationLog((message) => appendLog(message));
api.onAutomationDone((result) => {
  setStatus(result.ok ? "Concluido" : "Erro", result.ok ? "success" : "error");
  setRunning(false);
});
