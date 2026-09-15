const api = window.gesttaApp;

const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const saveCredentialsInput = document.getElementById("saveCredentialsInput");
const loginButton = document.getElementById("loginButton");
const clearAuthButton = document.getElementById("clearAuthButton");
const authStatusText = document.getElementById("authStatusText");
const authBadge = document.getElementById("authBadge");
const authStepMarker = document.getElementById("authStepMarker");

const startWithoutCheckpointInput = document.getElementById("startWithoutCheckpointInput");
const reprocessFailuresInput = document.getElementById("reprocessFailuresInput");
const sheetInput = document.getElementById("sheetInput");
const selectSheetButton = document.getElementById("selectSheetButton");
const inspectSheetButton = document.getElementById("inspectSheetButton");
const downloadTemplateButton = document.getElementById("downloadTemplateButton");
const rollbackButton = document.getElementById("rollbackButton");
const openReportsButton = document.getElementById("openReportsButton");
const runButton = document.getElementById("runButton");
const clearLogButton = document.getElementById("clearLogButton");

const logOutput = document.getElementById("logOutput");
const statusBadge = document.getElementById("statusBadge");
const resultSummary = document.getElementById("resultSummary");
const runHint = document.getElementById("runHint");
const sheetPreview = document.getElementById("sheetPreview");
const sheetSummary = document.getElementById("sheetSummary");
const sheetColumns = document.getElementById("sheetColumns");
const sheetPreviewTable = document.getElementById("sheetPreviewTable");
const sheetStepMarker = document.getElementById("sheetStepMarker");
const runStepMarker = document.getElementById("runStepMarker");

let authenticated = false;
let selectedSheetOk = false;
let running = false;

function setBadge(element, text, state) {
  element.textContent = text;
  element.className = `status ${state}`;
}

function setStatus(text, state) {
  setBadge(statusBadge, text, state);
}

function appendLog(message) {
  logOutput.textContent += message;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function setStepDone(element, done) {
  element.classList.toggle("done", done);
}

function updateRunAvailability() {
  const ready = authenticated && selectedSheetOk && !running;
  runButton.disabled = !ready;
  runHint.textContent = ready
    ? "Pronto para executar."
    : authenticated
      ? "Selecione e revise uma planilha."
      : "Faca login e selecione uma planilha.";
  setStepDone(authStepMarker, authenticated);
  setStepDone(sheetStepMarker, selectedSheetOk);
  setStepDone(runStepMarker, ready || running);
}

function setRunning(nextRunning) {
  running = nextRunning;
  loginButton.disabled = nextRunning;
  clearAuthButton.disabled = nextRunning;
  selectSheetButton.disabled = nextRunning;
  inspectSheetButton.disabled = nextRunning;
  downloadTemplateButton.disabled = nextRunning;
  rollbackButton.disabled = nextRunning;
  openReportsButton.disabled = nextRunning;
  startWithoutCheckpointInput.disabled = nextRunning;
  reprocessFailuresInput.disabled = nextRunning;
  updateRunAvailability();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("pt-BR");
}

function renderAuthStatus(status) {
  authenticated = Boolean(status.authenticated);
  if (authenticated) {
    const capturedAt = formatDate(status.capturedAt);
    authStatusText.textContent = capturedAt ? `Login salvo em ${capturedAt}.` : "Login salvo.";
    setBadge(authBadge, "Conectado", "success");
  } else {
    authStatusText.textContent = "Aguardando login.";
    setBadge(authBadge, "Pendente", "idle");
  }
  updateRunAvailability();
}

async function refreshAuthStatus() {
  renderAuthStatus(await api.getAuthStatus());
}

function renderSheetStructure(structure) {
  selectedSheetOk = true;
  sheetPreview.hidden = false;
  sheetSummary.textContent = `${structure.activeSheetName || "Sem aba"} - ${structure.totalRows} linha(s) de dados - ${structure.sheetNames.length} aba(s)`;
  sheetColumns.innerHTML = structure.headers.length
    ? structure.headers.map((header) => `<span>${escapeHtml(header)}</span>`).join("")
    : "<span>Nenhuma coluna encontrada</span>";

  if (!structure.headers.length) {
    sheetPreviewTable.innerHTML = "";
    selectedSheetOk = false;
    updateRunAvailability();
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
  updateRunAvailability();
}

async function inspectSelectedSheet() {
  if (!sheetInput.value) return;
  const result = await api.inspectSheet({ filePath: sheetInput.value });
  if (!result.ok) {
    selectedSheetOk = false;
    sheetPreview.hidden = false;
    sheetSummary.textContent = result.error || "Nao foi possivel ler a planilha.";
    sheetColumns.innerHTML = "";
    sheetPreviewTable.innerHTML = "";
    updateRunAvailability();
    return;
  }
  renderSheetStructure(result.structure);
}

async function restoreSelectedSheet() {
  const saved = await api.loadSelectedSheet();
  if (!saved.filePath) return;

  sheetInput.value = saved.filePath;
  if (saved.exists) {
    await inspectSelectedSheet();
    appendLog(`Planilha restaurada: ${saved.filePath}\n`);
    return;
  }

  selectedSheetOk = false;
  sheetPreview.hidden = false;
  sheetSummary.textContent = "A ultima planilha selecionada nao foi encontrada. Selecione outro arquivo.";
  sheetColumns.innerHTML = "";
  sheetPreviewTable.innerHTML = "";
  updateRunAvailability();
}

function updateResultSummary(ok) {
  const text = logOutput.textContent;
  const successMatch = text.match(/Sucesso:\s*(\d+)/i);
  const failureMatch = text.match(/Falha:\s*(\d+)/i);
  const reportMatch = text.match(/Relatorio (?:de reversao )?salvo:\s*(.+)/i);

  if (successMatch || failureMatch) {
    const success = successMatch?.[1] ?? "0";
    const failure = failureMatch?.[1] ?? "0";
    resultSummary.textContent = `Finalizado: ${success} sucesso(s), ${failure} falha(s).`;
    return;
  }

  if (reportMatch) {
    resultSummary.textContent = `Relatorio salvo: ${reportMatch[1].trim()}`;
    return;
  }

  resultSummary.textContent = ok ? "Finalizado." : "Finalizado com erro.";
}

api.loadCredentials().then((credentials) => {
  emailInput.value = credentials.email || "";
  passwordInput.value = credentials.password || "";
  saveCredentialsInput.checked = Boolean(credentials.hasSavedPassword);
  saveCredentialsInput.disabled = !credentials.canSavePassword;
});

refreshAuthStatus();
restoreSelectedSheet().catch((error) => {
  appendLog(`Nao foi possivel restaurar a planilha: ${error instanceof Error ? error.message : String(error)}\n`);
});

loginButton.addEventListener("click", async () => {
  setBadge(authBadge, "Abrindo", "running");
  authStatusText.textContent = "Conclua o login na janela aberta.";
  loginButton.disabled = true;

  const result = await api.captureAuth({
    email: emailInput.value,
    password: passwordInput.value,
    savePassword: saveCredentialsInput.checked,
  });

  loginButton.disabled = false;
  if (!result.ok) {
    if (!result.canceled) {
      authStatusText.textContent = result.error || "Login nao concluido.";
      setBadge(authBadge, "Erro", "error");
    } else {
      authStatusText.textContent = "Login cancelado.";
      setBadge(authBadge, "Pendente", "idle");
    }
  }
  await refreshAuthStatus();
});

clearAuthButton.addEventListener("click", async () => {
  await api.clearAuth();
  await refreshAuthStatus();
  appendLog("Login salvo removido.\n");
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
    sheetInput.value = result.filePath;
    await inspectSelectedSheet();
    appendLog(
      result.existing
        ? `Planilha existente selecionada: ${result.filePath}\n`
        : `Planilha modelo criada: ${result.filePath}\n`
    );
  }
});

rollbackButton.addEventListener("click", async () => {
  logOutput.textContent = "";
  resultSummary.textContent = "Reversao em andamento.";
  setStatus("Executando", "running");
  setRunning(true);

  const result = await api.runRollback();
  if (!result.ok) {
    if (!result.canceled) appendLog(`${result.error || "Reversao cancelada."}\n`);
    setStatus(result.canceled ? "Pronto" : "Erro", result.canceled ? "idle" : "error");
    resultSummary.textContent = result.canceled ? "Reversao cancelada." : "Nao foi possivel iniciar a reversao.";
    setRunning(false);
  }
});

openReportsButton.addEventListener("click", async () => {
  const result = await api.openReports();
  if (!result.ok) appendLog(`Erro ao abrir relatorios: ${result.error}\n`);
});

clearLogButton.addEventListener("click", () => {
  logOutput.textContent = "";
  resultSummary.textContent = "Logs limpos.";
});

runButton.addEventListener("click", async () => {
  logOutput.textContent = "";
  resultSummary.textContent = "Execucao em andamento.";
  setStatus("Executando", "running");
  setRunning(true);

  const result = await api.runAutomation({
    startWithoutCheckpoint: startWithoutCheckpointInput.checked,
    reprocessFailures: reprocessFailuresInput.checked,
    planilhaPath: sheetInput.value,
  });

  if (!result.ok) {
    appendLog(`${result.error}\n`);
    setStatus("Erro", "error");
    resultSummary.textContent = "Nao foi possivel iniciar a execucao.";
    setRunning(false);
  }
});

api.onAuthLog((message) => {
  authStatusText.textContent = message;
  appendLog(`${message}\n`);
});

api.onAutomationLog((message) => appendLog(message));
api.onAutomationDone((result) => {
  setStatus(result.ok ? "Concluido" : "Erro", result.ok ? "success" : "error");
  updateResultSummary(result.ok);
  setRunning(false);
  refreshAuthStatus();
});
