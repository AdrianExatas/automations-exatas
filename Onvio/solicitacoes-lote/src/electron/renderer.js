const api = window.solicitacoesApp;

const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const saveCredentialsInput = document.getElementById("saveCredentialsInput");
const loginButton = document.getElementById("loginButton");
const clearAuthButton = document.getElementById("clearAuthButton");
const authStatusText = document.getElementById("authStatusText");
const authBadge = document.getElementById("authBadge");
const authStepMarker = document.getElementById("authStepMarker");
const sheetInput = document.getElementById("sheetInput");
const selectSheetButton = document.getElementById("selectSheetButton");
const inspectSheetButton = document.getElementById("inspectSheetButton");
const downloadTemplateButton = document.getElementById("downloadTemplateButton");
const defaultDepartmentSelect = document.getElementById("defaultDepartmentSelect");
const departmentHint = document.getElementById("departmentHint");
const replicateInput = document.getElementById("replicateInput");
const attachCommonButton = document.getElementById("attachCommonButton");
const commonFiles = document.getElementById("commonFiles");
const sheetPreview = document.getElementById("sheetPreview");
const sheetSummary = document.getElementById("sheetSummary");
const sheetPreviewTable = document.getElementById("sheetPreviewTable");
const sheetStepMarker = document.getElementById("sheetStepMarker");
const dryRunInput = document.getElementById("dryRunInput");
const startWithoutCheckpointInput = document.getElementById("startWithoutCheckpointInput");
const reprocessFailuresInput = document.getElementById("reprocessFailuresInput");
const openReportsButton = document.getElementById("openReportsButton");
const runButton = document.getElementById("runButton");
const cancelBatchButton = document.getElementById("cancelBatchButton");
const rollbackButton = document.getElementById("rollbackButton");
const clearLogButton = document.getElementById("clearLogButton");
const logOutput = document.getElementById("logOutput");
const statusBadge = document.getElementById("statusBadge");
const resultSummary = document.getElementById("resultSummary");
const runHint = document.getElementById("runHint");
const runStepMarker = document.getElementById("runStepMarker");

let authenticated = false;
let selectedSheetOk = false;
let running = false;
let previewRows = [];
const rowAttachments = {};
let commonAttachments = [];
let departmentsLoaded = false;

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
  rollbackButton.disabled = !authenticated || running;
  cancelBatchButton.hidden = !running;
  cancelBatchButton.disabled = !running;
  runHint.textContent = running
    ? "Envio em andamento. Voce pode cancelar; o item atual termina e o restante para."
    : ready
      ? "Pronto para enviar. Use Reverter execucao para apagar um backup anterior."
      : authenticated
        ? "Selecione e revise uma planilha, ou reverter um backup."
        : "Faca login e selecione uma planilha.";
  setStepDone(authStepMarker, authenticated);
  setStepDone(sheetStepMarker, selectedSheetOk);
  setStepDone(runStepMarker, ready || running);
}

function setRunning(nextRunning) {
  running = nextRunning;
  [
    loginButton,
    clearAuthButton,
    selectSheetButton,
    inspectSheetButton,
    downloadTemplateButton,
    openReportsButton,
    rollbackButton,
    dryRunInput,
    startWithoutCheckpointInput,
    reprocessFailuresInput,
    replicateInput,
    attachCommonButton,
    defaultDepartmentSelect,
  ].forEach((element) => {
    if (element === defaultDepartmentSelect) {
      element.disabled = nextRunning || !departmentsLoaded || !authenticated;
      return;
    }
    element.disabled = nextRunning;
  });
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

const LOGIN_DEPARTMENT_HINT =
  "Para selecionar o departamento padrao, faca login no Onvio.";
const RELLOGIN_DEPARTMENT_HINT =
  "Sessao Onvio invalida ou expirada. Use Limpar login e faca login novamente para selecionar o departamento padrao.";

function renderAuthStatus(status) {
  authenticated = Boolean(status.authenticated);
  if (authenticated) {
    const capturedAt = formatDate(status.capturedAt);
    authStatusText.textContent = capturedAt ? `Login salvo em ${capturedAt}.` : "Login salvo.";
    setBadge(authBadge, "Conectado", "success");
  } else {
    authStatusText.textContent = "Aguardando login.";
    setBadge(authBadge, "Pendente", "idle");
    resetDepartmentSelect("Selecione apos o login");
    showDepartmentHint(LOGIN_DEPARTMENT_HINT, "warning");
  }
  updateRunAvailability();
}

function showDepartmentHint(message, tone) {
  departmentHint.hidden = false;
  departmentHint.textContent = message;
  departmentHint.className = `field-hint ${tone}`;
}

function hideDepartmentHint() {
  departmentHint.hidden = true;
  departmentHint.textContent = "";
  departmentHint.className = "field-hint";
}

function resetDepartmentSelect(placeholder) {
  departmentsLoaded = false;
  defaultDepartmentSelect.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>`;
  defaultDepartmentSelect.value = "";
  defaultDepartmentSelect.disabled = true;
}

function isUnauthorizedError(message) {
  const text = String(message || "").toLowerCase();
  return text.includes("401") || text.includes("unauthorized");
}

async function loadDepartments() {
  if (!authenticated) {
    resetDepartmentSelect("Selecione apos o login");
    showDepartmentHint(LOGIN_DEPARTMENT_HINT, "warning");
    return;
  }

  defaultDepartmentSelect.disabled = true;
  defaultDepartmentSelect.innerHTML = `<option value="">Carregando departamentos...</option>`;
  hideDepartmentHint();

  const result = await api.listDepartments();
  if (!result.ok) {
    resetDepartmentSelect("Selecione apos o login");
    if (isUnauthorizedError(result.error)) {
      showDepartmentHint(RELLOGIN_DEPARTMENT_HINT, "warning");
      appendLog(`${RELLOGIN_DEPARTMENT_HINT}\n`);
    } else {
      showDepartmentHint("Nao foi possivel carregar os departamentos. Tente novamente apos o login.", "error");
      appendLog("Nao foi possivel carregar os departamentos.\n");
    }
    return;
  }

  const options = [
    `<option value="">Selecione um departamento</option>`,
    ...result.departments.map(
      (department) =>
        `<option value="${escapeHtml(department.id)}" data-name="${escapeHtml(department.name)}">${escapeHtml(department.name)}</option>`,
    ),
  ];
  defaultDepartmentSelect.innerHTML = options.join("");
  departmentsLoaded = result.departments.length > 0;
  defaultDepartmentSelect.disabled = !departmentsLoaded || running;
  hideDepartmentHint();

  const selectedId = result.selected?.id || "";
  if (selectedId && result.departments.some((department) => department.id === selectedId)) {
    defaultDepartmentSelect.value = selectedId;
  } else {
    defaultDepartmentSelect.value = "";
  }
}

function getSelectedDepartment() {
  const option = defaultDepartmentSelect.selectedOptions[0];
  if (!option || !option.value) return { id: "", name: "" };
  return {
    id: option.value,
    name: option.dataset.name || option.textContent || "",
  };
}

async function refreshAuthStatus() {
  renderAuthStatus(await api.getAuthStatus());
  if (authenticated) {
    await loadDepartments();
  }
}

function fileChip(file, kind, index) {
  return `<span class="file-chip ${kind}">
    ${escapeHtml(file.fileName)}${kind === "common" ? " (todas)" : ""}
    <button type="button" data-action="remove-file" data-kind="${kind}" data-index="${index}" data-path="${escapeHtml(file.filePath)}">x</button>
  </span>`;
}

function renderAttachments() {
  commonFiles.innerHTML = commonAttachments.length
    ? commonAttachments.map((file, index) => fileChip(file, "common", index)).join("")
    : `<span class="muted">Nenhum anexo comum.</span>`;

  const body = previewRows
    .map((row) => {
      const specific = rowAttachments[row.rowIndex] ?? [];
      const chips = [
        ...specific.map((file) => fileChip(file, "row", row.rowIndex)),
        ...commonAttachments.map((file, index) => fileChip(file, "common", index)),
      ].join("") || `<span class="muted">Sem anexos</span>`;
      return `<tr>
        <td>
          <div class="row-title">${escapeHtml(row.codigo || "-")} ${escapeHtml(row.nome || row.cnpj || "")}</div>
          <div class="row-meta">${escapeHtml(row.solicitante || "Sem solicitante")} · ${escapeHtml(row.departamento || "Sem departamento")}</div>
        </td>
        <td>
          <div class="row-title">${escapeHtml(row.assunto || "(assunto padrao)")}</div>
          <div class="row-meta">${escapeHtml(row.descricao || "")}</div>
        </td>
        <td>
          <div class="file-chips">${chips}</div>
          <button type="button" class="ghost-button" data-action="attach-row" data-index="${row.rowIndex}">Anexar</button>
        </td>
      </tr>`;
    })
    .join("");

  sheetPreviewTable.innerHTML = `
    <thead>
      <tr>
        <th>Cliente</th>
        <th>Solicitacao</th>
        <th>Anexos</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  `;
}

function renderPreview(rows) {
  previewRows = rows;
  selectedSheetOk = rows.length > 0;
  sheetPreview.hidden = false;
  sheetSummary.textContent = `${rows.length} solicitacao(oes) carregada(s).`;
  renderAttachments();
  updateRunAvailability();
}

async function inspectSelectedSheet() {
  if (!sheetInput.value) return;
  const result = await api.inspectSheet({ filePath: sheetInput.value });
  if (!result.ok) {
    selectedSheetOk = false;
    previewRows = [];
    sheetPreview.hidden = false;
    sheetSummary.textContent = result.error || "Nao foi possivel ler a planilha.";
    sheetPreviewTable.innerHTML = "";
    updateRunAvailability();
    return;
  }
  Object.keys(rowAttachments).forEach((key) => delete rowAttachments[key]);
  renderPreview(result.rows);
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
  sheetSummary.textContent = "A ultima planilha selecionada nao foi encontrada.";
  updateRunAvailability();
}

async function attachFiles(rowIndex) {
  const result = await api.selectAttachments();
  if (result.canceled || !result.files?.length) return;
  if (replicateInput.checked || rowIndex == null) {
    commonAttachments = uniqueFiles([...commonAttachments, ...result.files]);
    appendLog(`${result.files.length} anexo(s) replicado(s) para todas as solicitacoes.\n`);
  } else {
    rowAttachments[rowIndex] = uniqueFiles([...(rowAttachments[rowIndex] ?? []), ...result.files]);
    appendLog(`${result.files.length} anexo(s) adicionado(s) na linha ${Number(rowIndex) + 1}.\n`);
  }
  renderAttachments();
}

function uniqueFiles(files) {
  const seen = new Set();
  return files.filter((file) => {
    const key = file.filePath.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function removeFile(kind, index, filePath) {
  if (kind === "common") {
    commonAttachments = commonAttachments.filter((file) => file.filePath !== filePath);
  } else {
    rowAttachments[index] = (rowAttachments[index] ?? []).filter((file) => file.filePath !== filePath);
  }
  renderAttachments();
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
    authStatusText.textContent = result.canceled ? "Login cancelado." : result.error || "Login nao concluido.";
    setBadge(authBadge, result.canceled ? "Pendente" : "Erro", result.canceled ? "idle" : "error");
  }
  await refreshAuthStatus();
});

clearAuthButton.addEventListener("click", async () => {
  await api.clearAuth();
  await refreshAuthStatus();
  appendLog("Login salvo removido.\n");
});

defaultDepartmentSelect.addEventListener("change", async () => {
  const selected = getSelectedDepartment();
  await api.saveDepartmentPreference(selected.id ? selected : null);
});

selectSheetButton.addEventListener("click", async () => {
  const result = await api.selectSheet();
  if (!result.canceled && result.filePath) {
    sheetInput.value = result.filePath;
    await inspectSelectedSheet();
  }
});

inspectSheetButton.addEventListener("click", inspectSelectedSheet);
attachCommonButton.addEventListener("click", () => attachFiles(null));

downloadTemplateButton.addEventListener("click", async () => {
  const result = await api.downloadTemplate();
  if (!result.canceled && result.filePath) {
    sheetInput.value = result.filePath;
    await inspectSelectedSheet();
    appendLog(`Planilha modelo criada: ${result.filePath}\n`);
  }
});

sheetPreviewTable.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.action === "attach-row") {
    await attachFiles(Number(button.dataset.index));
  }
  if (button.dataset.action === "remove-file") {
    removeFile(button.dataset.kind, Number(button.dataset.index), button.dataset.path);
  }
});

commonFiles.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.dataset.action !== "remove-file") return;
  removeFile(button.dataset.kind, Number(button.dataset.index), button.dataset.path);
});

openReportsButton.addEventListener("click", async () => {
  const result = await api.openReports();
  if (!result.ok) appendLog(`Erro ao abrir relatorios: ${result.error}\n`);
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
    resultSummary.textContent = result.canceled
      ? "Reversao cancelada."
      : "Nao foi possivel iniciar a reversao.";
    setRunning(false);
  }
});

cancelBatchButton.addEventListener("click", async () => {
  cancelBatchButton.disabled = true;
  appendLog("Cancelamento solicitado...\n");
  const result = await api.cancelBatch();
  if (!result.ok) {
    appendLog(`${result.error || "Nao foi possivel cancelar."}\n`);
    cancelBatchButton.disabled = !running;
  } else {
    resultSummary.textContent = "Cancelando apos o item atual...";
  }
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
  const selectedDepartment = getSelectedDepartment();
  const result = await api.runBatch({
    planilhaPath: sheetInput.value,
    rowAttachments,
    commonAttachments,
    defaultDepartmentName: selectedDepartment.name,
    defaultDepartmentId: selectedDepartment.id,
    dryRun: dryRunInput.checked,
    startWithoutCheckpoint: startWithoutCheckpointInput.checked,
    reprocessFailures: reprocessFailuresInput.checked,
  });
  if (!result.ok) {
    appendLog(`${result.error}\n`);
    setStatus("Erro", "error");
    resultSummary.textContent = "Nao foi possivel iniciar o envio.";
    setRunning(false);
  }
});

api.onAuthLog((message) => {
  authStatusText.textContent = message;
  appendLog(`${message}\n`);
});

api.onBatchLog((message) => appendLog(message));
api.onBatchDone((result) => {
  const canceled = Boolean(result.canceled);
  setStatus(
    canceled ? "Cancelado" : result.ok ? "Concluido" : "Erro",
    canceled ? "idle" : result.ok ? "success" : "error",
  );
  resultSummary.textContent =
    result.summary || result.error || (result.ok ? "Finalizado." : "Finalizado com erro.");
  setRunning(false);
  refreshAuthStatus();
});
