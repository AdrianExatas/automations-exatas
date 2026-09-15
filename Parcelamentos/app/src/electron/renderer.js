const api = window.parcelamentosApi;

const form = document.getElementById("automationForm");
const sheetInput = document.getElementById("sheetInput");
const downloadDirInput = document.getElementById("downloadDirInput");
const headedInput = document.getElementById("headedInput");
const sheetStatus = document.getElementById("sheetStatus");
const columnsHint = document.getElementById("columnsHint");
const statusBadge = document.getElementById("statusBadge");
const statusText = document.getElementById("statusText");
const progressLabel = document.getElementById("progressLabel");
const progressPercent = document.getElementById("progressPercent");
const progressFill = document.getElementById("progressFill");
const summaryBox = document.getElementById("summaryBox");
const logOutput = document.getElementById("logOutput");
const edgeWarning = document.getElementById("edgeWarning");

const selectSheetButton = document.getElementById("selectSheetButton");
const selectFolderButton = document.getElementById("selectFolderButton");
const createTemplateButton = document.getElementById("createTemplateButton");
const inspectSheetButton = document.getElementById("inspectSheetButton");
const cancelButton = document.getElementById("cancelButton");
const runButton = document.getElementById("runButton");
const openDownloadsButton = document.getElementById("openDownloadsButton");
const openReportButton = document.getElementById("openReportButton");
const tabButtons = [...document.querySelectorAll(".tab")];

let running = false;
let currentUf = "AL";
const sheetByUf = { AL: "", PI: "", SE: "" };

function setStatus(label, state, detail) {
  statusBadge.textContent = label;
  statusBadge.className = `badge ${state}`;
  statusText.textContent = detail || label;
}

function setProgress(current, total, label) {
  const safeTotal = Math.max(total || 1, 1);
  const percent = Math.max(0, Math.min(100, Math.round((current / safeTotal) * 100)));
  progressFill.style.width = `${percent}%`;
  progressPercent.textContent = `${percent}%`;
  progressLabel.textContent = label || "Processando...";
}

function setRunning(value) {
  running = value;
  runButton.disabled = value;
  cancelButton.disabled = !value;
  selectSheetButton.disabled = value;
  selectFolderButton.disabled = value;
  createTemplateButton.disabled = value;
  inspectSheetButton.disabled = value;
  tabButtons.forEach((button) => {
    button.disabled = value;
  });
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

async function refreshColumnsHint() {
  columnsHint.textContent = await api.columnsHint(currentUf);
}

function updateUfUi() {
  sheetInput.value = sheetByUf[currentUf] || "";
  sheetStatus.hidden = true;
  void refreshColumnsHint();
}

async function inspectSelectedData() {
  const filePath = sheetInput.value.trim();
  if (!filePath) {
    showSheetStatus("Selecione a planilha preenchida.", true);
    return false;
  }

  const result = await api.inspectSheet(filePath, currentUf);
  if (!result.ok) {
    showSheetStatus(result.error || "Nao foi possivel validar a planilha.", true);
    return false;
  }

  const preview = (result.preview || [])
    .map((row) => `Linha ${row.rowNumber}: ${row.summary}`)
    .join("\n");
  showSheetStatus(`Planilha ok. ${result.rowCount} linha(s).${preview ? `\n\n${preview}` : ""}`);
  return true;
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (running) {
      return;
    }

    currentUf = button.dataset.uf;
    tabButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", active ? "true" : "false");
    });
    updateUfUi();
  });
});

selectSheetButton.addEventListener("click", async () => {
  const result = await api.selectSheet();
  if (result.canceled || !result.filePath) {
    return;
  }

  sheetByUf[currentUf] = result.filePath;
  sheetInput.value = result.filePath;
  await inspectSelectedData();
});

selectFolderButton.addEventListener("click", async () => {
  const result = await api.selectFolder();
  if (result.canceled || !result.folderPath) {
    return;
  }

  downloadDirInput.value = result.folderPath;
});

inspectSheetButton.addEventListener("click", () => {
  void inspectSelectedData();
});

createTemplateButton.addEventListener("click", async () => {
  createTemplateButton.disabled = true;
  try {
    const result = await api.createTemplate(currentUf);
    if (result.canceled) {
      return;
    }

    if (result.error) {
      appendLog(`Falha ao gerar modelo: ${result.error}\n`);
      setStatus("Erro", "error", "Falha ao gerar modelo");
      return;
    }

    appendLog(`Modelo ${currentUf} pronto: ${result.filePath}\n`);
    showSheetStatus(`Modelo salvo. A pasta foi aberta no Explorer.\n${result.filePath}`);
    setStatus("Modelo pronto", "success", `Modelo ${currentUf} salvo`);
  } finally {
    createTemplateButton.disabled = running;
  }
});

cancelButton.addEventListener("click", async () => {
  await api.cancelAutomation();
});

openDownloadsButton.addEventListener("click", async () => {
  const result = await api.openDownloads();
  if (!result.ok) {
    appendLog(`Nao foi possivel abrir a pasta: ${result.error}\n`);
  }
});

openReportButton.addEventListener("click", async () => {
  const result = await api.openReport();
  if (!result.ok) {
    appendLog(`Nao foi possivel abrir o relatorio: ${result.error}\n`);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (running) {
    return;
  }

  const isValid = await inspectSelectedData();
  if (!isValid) {
    setStatus("Erro", "error", "Corriga a planilha antes de iniciar");
    return;
  }

  if (!downloadDirInput.value.trim()) {
    showSheetStatus("Escolha a pasta de downloads.", true);
    setStatus("Erro", "error", "Pasta de downloads obrigatoria");
    return;
  }

  const confirmed = window.confirm(
    `Iniciar download?\n\nEstado: ${currentUf}\nPlanilha: ${sheetInput.value}\nPasta: ${downloadDirInput.value}`,
  );
  if (!confirmed) {
    return;
  }

  logOutput.textContent = "";
  summaryBox.hidden = true;
  setRunning(true);
  setStatus("Executando", "running", "Processando parcelamentos...");
  setProgress(0, 1, "Iniciando...");

  const result = await api.runAutomation({
    uf: currentUf,
    inputMode: "sheet",
    sheetPath: sheetInput.value.trim(),
    downloadDir: downloadDirInput.value.trim(),
    headed: headedInput.checked,
  });

  setRunning(false);
  openDownloadsButton.disabled = !(result && result.downloadDir);
  openReportButton.disabled = !(result && result.reportPath);

  if (result && result.reportPath) {
    summaryBox.hidden = false;
    summaryBox.textContent = [
      result.cancelled ? "Execucao cancelada." : "Execucao finalizada.",
      `Sucessos: ${result.successCount ?? 0}`,
      `Ignorados: ${result.ignoredCount ?? 0}`,
      `Falhas: ${result.errorCount ?? 0}`,
    ].join("\n");
  }

  if (result && result.ok) {
    setStatus("Concluido", "success", "Download concluido");
    setProgress(1, 1, "Concluido");
    return;
  }

  if (result && result.cancelled) {
    setStatus("Cancelado", "error", "Execucao cancelada");
    return;
  }

  setStatus("Erro", "error", "Finalizado com falhas");
  if (result && result.error) {
    appendLog(`${result.error}\n`);
  }
});

api.onLog((message) => {
  appendLog(message);
});

api.onProgress((payload) => {
  if (!payload) {
    return;
  }

  setProgress(payload.current || 0, payload.total || 1, payload.label || "Processando...");
  if (payload.label) {
    statusText.textContent = payload.label;
  }
});

api.onDone((result) => {
  if (!result || running) {
    return;
  }

  openDownloadsButton.disabled = false;
  openReportButton.disabled = !result.reportPath;
});

async function boot() {
  const bootstrap = await api.bootstrap();
  downloadDirInput.value = bootstrap.defaultDownloadDir || "";
  edgeWarning.hidden = Boolean(bootstrap.edgeOk);
  updateUfUi();
  setStatus("Pronto", "idle", "Pronto para iniciar");
}

void boot();
