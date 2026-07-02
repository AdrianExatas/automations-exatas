const api = window.parcelamentosApi;

const form = document.getElementById("automationForm");
const sheetInput = document.getElementById("sheetInput");
const selectSheetButton = document.getElementById("selectSheetButton");
const inspectSheetButton = document.getElementById("inspectSheetButton");
const createTemplateButton = document.getElementById("createTemplateButton");
const openReportsButton = document.getElementById("openReportsButton");
const headedInput = document.getElementById("headedInput");
const runButton = document.getElementById("runButton");
const sheetStatus = document.getElementById("sheetStatus");
const statusBadge = document.getElementById("statusBadge");
const logOutput = document.getElementById("logOutput");

let running = false;

function setStatus(label, state) {
  statusBadge.textContent = label;
  statusBadge.className = `badge ${state}`;
}

function setRunning(value) {
  running = value;
  runButton.disabled = value;
  selectSheetButton.disabled = value;
  inspectSheetButton.disabled = value;
  createTemplateButton.disabled = value;
}

function appendLog(message) {
  logOutput.textContent += message;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function showSheetStatus(message, isError = false) {
  sheetStatus.hidden = false;
  sheetStatus.textContent = message;
  sheetStatus.classList.toggle("error", isError);
}

async function inspectSelectedSheet() {
  const filePath = sheetInput.value.trim();
  if (!filePath) {
    showSheetStatus("Selecione uma planilha antes de validar.", true);
    return false;
  }

  const result = await api.inspectSheet(filePath);
  if (!result.ok) {
    showSheetStatus(result.error || "Nao foi possivel validar a planilha.", true);
    return false;
  }

  const preview = result.preview
    .map((row) => `Linha ${row.rowNumber}: ${row.codigo} ${row.empresa}`.trim())
    .join("\n");
  showSheetStatus(`Planilha valida. Linhas para processar: ${result.rowCount}.${preview ? `\n\n${preview}` : ""}`);
  return true;
}

selectSheetButton.addEventListener("click", async () => {
  const result = await api.selectSheet();
  if (result.canceled || !result.filePath) {
    return;
  }

  sheetInput.value = result.filePath;
  await inspectSelectedSheet();
});

inspectSheetButton.addEventListener("click", () => {
  void inspectSelectedSheet();
});

createTemplateButton.addEventListener("click", async () => {
  const result = await api.createTemplate();
  if (result.canceled) {
    return;
  }

  if (result.error) {
    appendLog(`Falha ao gerar modelo: ${result.error}\n`);
    setStatus("Erro", "error");
    return;
  }

  appendLog(`Modelo salvo em: ${result.filePath}\n`);
  setStatus("Modelo gerado", "success");
});

openReportsButton.addEventListener("click", async () => {
  const result = await api.openReports();
  if (!result.ok) {
    appendLog(`Falha ao abrir relatorios: ${result.error}\n`);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (running) {
    return;
  }

  const isValid = await inspectSelectedSheet();
  if (!isValid) {
    setStatus("Erro", "error");
    return;
  }

  logOutput.textContent = "";
  setRunning(true);
  setStatus("Executando", "running");

  const result = await api.runAutomation({
    inputPath: sheetInput.value.trim(),
    headed: headedInput.checked,
  });

  setRunning(false);
  if (result.ok) {
    setStatus("Concluido", "success");
    return;
  }

  setStatus("Erro", "error");
  if (result.error) {
    appendLog(`${result.error}\n`);
  }
});

api.onLog((message) => {
  appendLog(message);
});

api.onDone((result) => {
  if (!result || running) {
    return;
  }

  setStatus(result.ok ? "Concluido" : "Erro", result.ok ? "success" : "error");
});
