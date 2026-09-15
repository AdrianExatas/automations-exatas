function createPreviewApi() {
  const contractsMissing = new URLSearchParams(window.location.search).get("contracts") === "missing";
  const integration = contractsMissing
    ? { available: false, mode: "unavailable", reason: "Capacidades obrigatorias indisponiveis.", capabilities: { companyLookup: true, taskLookup: true, taskCompletion: false, portalPublication: false, dueDateUpdate: false } }
    : { available: true, mode: "demo", contractVersion: "preview", capabilities: { companyLookup: true, taskLookup: true, taskCompletion: true, portalPublication: true, dueDateUpdate: true } };
  const previewPaths = ["C:\\Guias\\1001-FGTS-07-2026.pdf", "C:\\Guias\\2040-GNRE-07-2026.pdf", "C:\\Guias\\arquivo-sem-tarefa.pdf"];
  const previewRows = previewPaths.map((filePath, index) => ({
    id: `preview-${index + 1}`,
    filePath,
    fileName: filePath.split("\\").pop(),
    size: 182000 + index * 33000,
    sha256: String(index + 1).repeat(64),
    pageCount: 1,
    textLength: 680,
    extractedDueDate: index === 0 ? "2026-08-21" : index === 1 ? "2026-08-25" : "",
    dueDateCandidates: index < 2 ? [index === 0 ? "2026-08-21" : "2026-08-25"] : [],
    competence: "2026-07",
    competenceSources: ["Competência"],
    extractedCnpj: index === 0 ? undefined : "12.345.678/0001-95",
    extractedIdentifierType: index === 0 ? "cnpj_root" : "cnpj",
    extractedIdentifierValue: index === 0 ? "12345678" : "12.345.678/0001-95",
    cnpjCandidates: ["12.345.678/0001-95"],
    documentKind: index === 0 ? "fgts_digital" : undefined,
    company: { id: `preview-company-${index + 1}`, name: index === 0 ? "Empresa Exemplo FGTS Ltda" : index === 1 ? "Horizonte Servicos Ltda" : "Empresa Identificada Ltda", cnpj: "12.345.678/0001-95" },
    task: index === 2 ? undefined : {
      id: `preview-task-${index + 1}`,
      name: index === 0 ? "FGTS DIGITAL" : "Publicar GNRE",
      competence: "2026-07",
      status: "open",
      company: { id: `preview-company-${index + 1}`, name: index === 0 ? "Almeida Comercio Ltda" : "Horizonte Servicos Ltda", cnpj: "12.345.678/0001-90" },
    },
    status: index === 2 ? "pending_review" : "ready",
    messages: index === 0
      ? [{ code: "company_resolved_by_cnpj_root", severity: "info", message: "Raiz do CNPJ identificada e confirmada pela razao social no cadastro oficial." }]
      : index === 1
        ? [{ code: "past_due_date", severity: "warning", message: "Confira o vencimento antes de confirmar." }]
        : [{ code: "task_resolution_failed", severity: "error", message: "Nenhuma tarefa unica em aberto foi encontrada." }],
    duplicate: false,
  }));
  return {
    getInitialState: async () => ({
      auth: { authenticated: true, demo: true },
      credentials: { email: "colaborador@exatas.com.br", password: "", canSavePassword: true, hasSavedPassword: false },
      integration,
      reportsDir: "Documentos\\Publicar Documentos Express\\relatorios",
    }),
    captureAuth: async () => ({ ok: true, auth: { authenticated: true, demo: true }, integration }),
    clearAuth: async () => ({ ok: true, auth: { authenticated: false }, credentials: {}, integration: { available: false, mode: "unavailable", capabilities: { companyLookup: false, taskLookup: false, taskCompletion: false, portalPublication: false, dueDateUpdate: false } } }),
    selectFiles: async () => previewPaths,
    pathsForFiles: () => previewPaths,
    validateBatch: async () => ({ ok: true, inspections: previewRows }),
    applySelection: async ({ id, companyId, taskId }) => {
      const inspection = previewRows.find((row) => row.id === id);
      if (!inspection) return { ok: false, error: "Documento nao encontrado." };
      if (companyId) inspection.company = inspection.companyCandidates?.find((item) => item.id === companyId) || inspection.company;
      if (taskId) inspection.task = inspection.taskCandidates?.find((item) => item.id === taskId) || inspection.task;
      return { ok: true, inspection };
    },
    executeBatch: async (confirmations) => ({
      ok: true,
      report: {
        totals: { selected: confirmations.length, completed: confirmations.length, pendingReview: 0, failed: 0, canceled: 0 },
        items: confirmations.map((item, index) => ({
          id: item.id,
          fileName: previewRows.find((row) => row.id === item.id)?.fileName || `Documento ${index + 1}`,
          status: "completed",
          message: "Documento publicado e vencimento aplicado.",
        })),
      },
    }),
    cancelBatch: async () => ({ ok: true }),
    openReports: async () => ({ ok: true }),
    onItemStatus: () => () => {},
  };
}

const previewMode = new URLSearchParams(window.location.search).get("preview") === "1";
const api = window.expressDocumentsApp || (previewMode ? createPreviewApi() : null);
if (!api) throw new Error("Ponte segura do aplicativo nao disponivel.");
if (!window.bulkDateUtils) throw new Error("Utilitarios de vencimento em lote nao disponiveis.");
const bulkDate = window.bulkDateUtils;
if (!window.batchSelectionUtils) throw new Error("Utilitarios de selecao em lote nao disponiveis.");
const batchSelection = window.batchSelectionUtils;

const state = {
  authenticated: false,
  integrationAvailable: false,
  integration: null,
  selectedPaths: [],
  selectedFilePathKeys: new Set(),
  inspections: [],
  confirmations: new Map(),
  selectedInspectionIds: new Set(),
  lastBulkDateSnapshot: null,
  pendingBulkPreview: null,
  pendingBatchConfirmation: null,
  running: false,
  report: null,
};

const titles = { login: "Acesso", documents: "Documentos", validation: "Validacao", review: "Revisao", result: "Resultado" };
const correctableCodes = new Set(["due_date_missing", "due_date_ambiguous", "past_due_date", "company_ambiguous", "task_ambiguous"]);
const byId = (id) => document.getElementById(id);
const pageTitle = byId("pageTitle");
const statusText = byId("statusText");
const authBadge = byId("authBadge");
const integrationBadge = byId("integrationBadge");
const integrationModal = byId("integrationModal");
const email = byId("email");
const password = byId("password");
const savePassword = byId("savePassword");
const selectedFiles = byId("selectedFiles");
const selectionSummary = byId("selectionSummary");
const validateButton = byId("validateButton");
const validationRows = byId("validationRows");
const validationSummary = byId("validationSummary");
const fileSelectionActions = byId("fileSelectionActions");
const selectAllFiles = byId("selectAllFiles");
const selectedFilesCount = byId("selectedFilesCount");
const removeSelectedFiles = byId("removeSelectedFiles");
const selectAllRows = byId("selectAllRows");
const validationSelectionCount = byId("validationSelectionCount");
const confirmSelectedRows = byId("confirmSelectedRows");
const removeSelectedRows = byId("removeSelectedRows");
const bulkSelectionCount = byId("bulkSelectionCount");
const bulkDueDate = byId("bulkDueDate");
const applyBulkDate = byId("applyBulkDate");
const undoBulkDate = byId("undoBulkDate");
const bulkDateModal = byId("bulkDateModal");
const bulkModalSummary = byId("bulkModalSummary");
const bulkModalChanges = byId("bulkModalChanges");
const pastDateAcknowledgement = byId("pastDateAcknowledgement");
const confirmPastBulkDate = byId("confirmPastBulkDate");
const confirmBulkDate = byId("confirmBulkDate");
const batchConfirmModal = byId("batchConfirmModal");
const batchConfirmSummary = byId("batchConfirmSummary");
const batchConfirmChanges = byId("batchConfirmChanges");
const batchConfirmPastAcknowledgement = byId("batchConfirmPastAcknowledgement");
const confirmPastBatch = byId("confirmPastBatch");
const cancelBatchConfirm = byId("cancelBatchConfirm");
const confirmBatchSelection = byId("confirmBatchSelection");
const reviewButton = byId("reviewButton");
const reviewMetrics = byId("reviewMetrics");
const reviewList = byId("reviewList");
const finalConfirmation = byId("finalConfirmation");
const executeButton = byId("executeButton");
const resultSummary = byId("resultSummary");
const resultRows = byId("resultRows");
const progressBar = byId("progressBar").firstElementChild;
const cancelButton = byId("cancelButton");
const newBatch = byId("newBatch");
const resultReports = byId("resultReports");

function setStatus(text, isError = false) {
  statusText.textContent = text;
  statusText.style.color = isError ? "var(--danger)" : "";
}

function enableStep(step, enabled = true) {
  const button = document.querySelector(`.step-link[data-step="${step}"]`);
  if (button) button.disabled = !enabled;
}

function showStep(step) {
  document.querySelectorAll(".step-link").forEach((button) => button.classList.toggle("active", button.dataset.step === step));
  document.querySelectorAll(".step-view").forEach((view) => view.classList.toggle("active", view.dataset.view === step));
  pageTitle.textContent = titles[step];
}

function renderAuth(auth) {
  state.authenticated = Boolean(auth?.authenticated);
  authBadge.textContent = auth?.demo ? "Login demonstracao" : state.authenticated ? "Login pronto" : "Login pendente";
  authBadge.className = `badge ${state.authenticated ? "" : "muted"}`;
  enableStep("documents", state.authenticated);
}

function renderIntegration(integration) {
  state.integration = integration || null;
  state.integrationAvailable = Boolean(integration?.available);
  const capabilities = integration?.capabilities || {};
  const verified = Object.values(capabilities).filter(Boolean).length;
  const total = Object.keys(capabilities).length;
  integrationBadge.textContent = integration?.mode === "demo" ? "Modo demonstracao" : integration?.available ? "Integracao pronta" : total ? `${verified}/${total} contratos prontos` : "Contrato pendente";
  integrationBadge.className = `badge ${integration?.mode === "demo" ? "warning" : integration?.available ? "" : "error"}`;
  integrationBadge.title = integration?.reason || "";
}

function openIntegrationDiagnostic() {
  const labels = {
    companyLookup: "Consulta de empresa Gestta/Onvio",
    taskLookup: "Consulta de tarefa no Express",
    taskCompletion: "Anexo e conclusao da tarefa",
    portalPublication: "Publicacao no Portal do Cliente",
    dueDateUpdate: "Vencimento no calendario",
  };
  byId("integrationReason").textContent = state.integration?.reason || "Todos os contratos necessarios foram verificados.";
  const list = byId("integrationCapabilities");
  list.textContent = "";
  Object.entries(labels).forEach(([key, label]) => {
    const row = document.createElement("div");
    row.className = "capability-row";
    const name = document.createElement("span");
    name.textContent = label;
    const status = document.createElement("span");
    const ready = Boolean(state.integration?.capabilities?.[key]);
    status.className = `capability-status ${ready ? "ready" : "pending"}`;
    status.textContent = ready ? "Verificado" : "Pendente";
    row.append(name, status);
    list.appendChild(row);
  });
  integrationModal.classList.remove("hidden");
  byId("closeIntegrationModal").focus();
}

function fileName(filePath) {
  return filePath.split(/[\\/]/).pop() || filePath;
}

function pathKey(filePath) {
  return String(filePath || "").toLowerCase();
}

function pruneSelectedFilePaths() {
  const present = new Set(state.selectedPaths.map(pathKey));
  for (const key of state.selectedFilePathKeys) if (!present.has(key)) state.selectedFilePathKeys.delete(key);
}

function addPaths(paths) {
  const unique = new Map(state.selectedPaths.map((item) => [item.toLowerCase(), item]));
  for (const item of paths || []) if (item) unique.set(item.toLowerCase(), item);
  state.selectedPaths = [...unique.values()];
  pruneSelectedFilePaths();
  renderSelectedFiles();
}

function updateFileSelectionActions() {
  const total = state.selectedPaths.length;
  const selected = state.selectedFilePathKeys.size;
  fileSelectionActions.classList.toggle("hidden", total === 0);
  selectedFilesCount.textContent = `${selected} selecionado(s)`;
  selectAllFiles.disabled = total === 0;
  selectAllFiles.checked = total > 0 && selected === total;
  selectAllFiles.indeterminate = selected > 0 && selected < total;
  removeSelectedFiles.disabled = selected === 0;
}

function renderSelectedFiles() {
  selectedFiles.textContent = "";
  selectionSummary.textContent = state.selectedPaths.length ? `${state.selectedPaths.length} documento(s) no lote.` : "Nenhum documento selecionado.";
  state.selectedPaths.forEach((filePath) => {
    const line = document.createElement("div");
    line.className = "file-line";
    const selection = document.createElement("input");
    selection.type = "checkbox";
    selection.checked = state.selectedFilePathKeys.has(pathKey(filePath));
    selection.setAttribute("aria-label", `Selecionar ${fileName(filePath)}`);
    selection.addEventListener("change", () => {
      if (selection.checked) state.selectedFilePathKeys.add(pathKey(filePath));
      else state.selectedFilePathKeys.delete(pathKey(filePath));
      updateFileSelectionActions();
    });
    const name = document.createElement("span");
    name.textContent = fileName(filePath);
    name.title = filePath;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-file";
    remove.textContent = "X";
    remove.title = `Remover ${fileName(filePath)}`;
    remove.setAttribute("aria-label", remove.title);
    remove.addEventListener("click", () => {
      state.selectedPaths = state.selectedPaths.filter((item) => item !== filePath);
      state.selectedFilePathKeys.delete(pathKey(filePath));
      renderSelectedFiles();
    });
    line.append(selection, name, remove);
    selectedFiles.appendChild(line);
  });
  validateButton.disabled = state.selectedPaths.length === 0;
  updateFileSelectionActions();
}

function confirmationFor(row) {
  if (!state.confirmations.has(row.id)) {
    state.confirmations.set(row.id, {
      id: row.id,
      sha256: row.sha256,
      companyId: row.company?.id || "",
      taskId: row.task?.id || "",
      confirmedDueDate: row.extractedDueDate || "",
      dueDateConfirmed: false,
      companyConfirmed: false,
      taskConfirmed: false,
    });
  }
  const confirmation = state.confirmations.get(row.id);
  if (row.company && confirmation.companyId !== row.company.id) {
    confirmation.companyId = row.company.id;
    confirmation.companyConfirmed = false;
    confirmation.taskId = row.task?.id || "";
    confirmation.taskConfirmed = false;
  } else if (!row.company) {
    confirmation.companyId = "";
    confirmation.companyConfirmed = false;
  }
  if (row.task && confirmation.taskId !== row.task.id) {
    confirmation.taskId = row.task.id;
    confirmation.taskConfirmed = false;
  } else if (!row.task) {
    confirmation.taskId = "";
    confirmation.taskConfirmed = false;
  }
  return confirmation;
}

function hasHardError(row) {
  return row.messages.some((item) => item.severity === "error" && !correctableCodes.has(item.code));
}

function isBulkEligible(row) {
  return bulkDate.isEligible(row, [...correctableCodes]);
}

function eligibleRows() {
  return state.inspections.filter(isBulkEligible);
}

function selectedBulkRows() {
  return state.inspections.filter((row) => state.selectedInspectionIds.has(row.id) && isBulkEligible(row));
}

function selectedRows() {
  return state.inspections.filter((row) => state.selectedInspectionIds.has(row.id));
}

function selectedConfirmableRows() {
  return selectedRows().filter((row) => batchSelection.isConfirmEligible(row, confirmationFor(row)));
}

function updateSelectionActions() {
  const validIds = new Set(state.inspections.map((row) => row.id));
  for (const id of state.selectedInspectionIds) if (!validIds.has(id)) state.selectedInspectionIds.delete(id);
  const selected = selectedRows();
  const selectedBulk = selectedBulkRows();
  const selectedConfirmable = selectedConfirmableRows();
  validationSelectionCount.textContent = `${selected.length} selecionado(s)`;
  bulkSelectionCount.textContent = `${selectedBulk.length} elegivel(eis) para vencimento`;
  confirmSelectedRows.disabled = selectedConfirmable.length === 0;
  removeSelectedRows.disabled = selected.length === 0;
  applyBulkDate.disabled = selectedBulk.length === 0 || !bulkDate.isValidIsoDate(bulkDueDate.value);
  undoBulkDate.disabled = !state.lastBulkDateSnapshot;
  selectAllRows.disabled = state.inspections.length === 0;
  selectAllRows.checked = state.inspections.length > 0 && selected.length === state.inspections.length;
  selectAllRows.indeterminate = selected.length > 0 && selected.length < state.inspections.length;
}

function clearBulkDateState() {
  state.selectedInspectionIds.clear();
  state.lastBulkDateSnapshot = null;
  state.pendingBulkPreview = null;
  bulkDueDate.value = "";
  closeBulkDateModal();
  closeBatchConfirmationModal();
  updateSelectionActions();
}

function closeBulkDateModal() {
  bulkDateModal.classList.add("hidden");
  state.pendingBulkPreview = null;
  confirmPastBulkDate.checked = false;
}

function closeBatchConfirmationModal() {
  batchConfirmModal.classList.add("hidden");
  state.pendingBatchConfirmation = null;
  confirmPastBatch.checked = false;
}

function openBulkDateModal() {
  try {
    const preview = bulkDate.buildPreview(state.inspections, state.confirmations, state.selectedInspectionIds, bulkDueDate.value);
    state.pendingBulkPreview = preview;
    bulkModalSummary.textContent = `${preview.count} documento(s) receberao o vencimento ${formatDate(preview.newDate)}.`;
    bulkModalChanges.textContent = "";

    const previous = document.createElement("div");
    const previousLabel = document.createElement("strong");
    previousLabel.textContent = "Datas atuais";
    const previousValue = document.createElement("span");
    previousValue.textContent = preview.previousDates
      .map((item) => `${item.date ? formatDate(item.date) : "Sem data"} (${item.count})`)
      .join(", ");
    previous.append(previousLabel, previousValue);
    bulkModalChanges.appendChild(previous);

    if (preview.overwrittenCount) {
      const warning = document.createElement("div");
      warning.className = "bulk-modal-warning";
      warning.textContent = `${preview.overwrittenCount} vencimento(s) existente(s) serao substituido(s).`;
      bulkModalChanges.appendChild(warning);
    }

    pastDateAcknowledgement.classList.toggle("hidden", !preview.isPast);
    confirmPastBulkDate.checked = false;
    confirmBulkDate.disabled = preview.isPast;
    bulkDateModal.classList.remove("hidden");
    byId("cancelBulkDate").focus();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), true);
  }
}

function addBatchDetail(label, value, className = "") {
  const detail = document.createElement("div");
  if (className) detail.className = className;
  const strong = document.createElement("strong");
  strong.textContent = label;
  const span = document.createElement("span");
  span.textContent = value;
  detail.append(strong, span);
  batchConfirmChanges.appendChild(detail);
}

function openBatchConfirmationModal() {
  const preview = batchSelection.buildConfirmationPreview(state.inspections, state.confirmations, state.selectedInspectionIds, bulkDate.todayIso());
  if (!preview.count) return setStatus("Nenhum documento selecionado esta elegivel para confirmacao coletiva.", true);
  state.pendingBatchConfirmation = preview;
  batchConfirmSummary.textContent = `${preview.count} documento(s) terao empresa, tarefa e vencimento confirmados.`;
  batchConfirmChanges.textContent = "";
  const companies = [...new Set(preview.rows.map((row) => row.company?.name).filter(Boolean))];
  const tasks = [...new Set(preview.rows.map((row) => row.task?.name).filter(Boolean))];
  const dueDates = [...new Set(preview.rows.map((row) => formatDate(confirmationFor(row).confirmedDueDate)))];
  addBatchDetail("Empresas", companies.join(", "));
  addBatchDetail("Tarefas", tasks.join(", "));
  addBatchDetail("Vencimentos", dueDates.join(", "));
  if (preview.skippedCount) addBatchDetail("Fora da confirmacao", `${preview.skippedCount} linha(s) bloqueada(s), duplicada(s) ou sem tarefa.`, "bulk-modal-warning");
  batchConfirmPastAcknowledgement.classList.toggle("hidden", preview.pastCount === 0);
  confirmPastBatch.checked = false;
  confirmBatchSelection.disabled = preview.pastCount > 0;
  batchConfirmModal.classList.remove("hidden");
  cancelBatchConfirm.focus();
}

function isReady(row) {
  const confirmation = confirmationFor(row);
  return !hasHardError(row) && Boolean(row.company) && row.task?.status === "open" && /^\d{4}-\d{2}-\d{2}$/.test(confirmation.confirmedDueDate) && confirmation.companyConfirmed && confirmation.taskConfirmed && confirmation.dueDateConfirmed;
}

function updateReviewAvailability() {
  const ready = state.inspections.filter(isReady).length;
  reviewButton.disabled = ready === 0;
  validationSummary.textContent = `${ready} pronto(s) para envio; ${state.inspections.length - ready} pendente(s).`;
  updateSelectionActions();
}

function cell(content) {
  const td = document.createElement("td");
  if (content instanceof Node) td.appendChild(content); else td.textContent = content || "-";
  return td;
}

function stacked(primary, secondary) {
  const wrap = document.createElement("div");
  const strong = document.createElement("strong");
  strong.textContent = primary || "Nao identificado";
  const sub = document.createElement("span");
  sub.className = "subtle";
  sub.textContent = secondary || "";
  wrap.append(strong, sub);
  return wrap;
}

function companyOptionLabel(company) {
  const document = company.cnpj || company.cpf || "";
  const code = company.code ? `Codigo ${company.code}` : "";
  return [company.name, document, code].filter(Boolean).join(" | ");
}

function extractedIdentifierLabel(row) {
  if (row.extractedIdentifierType === "cnpj_root") return `Raiz extraida ${row.extractedIdentifierValue}`;
  if (row.extractedIdentifierType === "cpf") return `CPF extraido ${row.extractedIdentifierValue}`;
  return row.extractedIdentifierValue || row.extractedCnpj || "";
}

function officialCompanyLabel(row) {
  if (!row.company) return extractedIdentifierLabel(row);
  const document = row.company.cnpj || row.company.cpf || "";
  const code = row.company.code ? `Codigo ${row.company.code}` : "";
  const extracted = row.extractedIdentifierType === "cnpj_root" || row.extractedIdentifierType === "cpf"
    ? extractedIdentifierLabel(row)
    : "";
  return [document, code, extracted].filter(Boolean).join(" | ");
}

async function applyRowSelection(row, selection) {
  setStatus("Aplicando a selecao de empresa ou tarefa...");
  const result = await api.applySelection({ id: row.id, ...selection });
  if (!result.ok) return setStatus(result.error || "Nao foi possivel aplicar a selecao.", true);
  const index = state.inspections.findIndex((item) => item.id === row.id);
  if (index >= 0) state.inspections[index] = result.inspection;
  confirmationFor(result.inspection);
  renderValidationRows();
  setStatus(selection.companyId ? "Empresa selecionada. Confira a tarefa e confirme o envio." : "Tarefa selecionada. Confirme o envio.");
}

function renderCompanyCell(row) {
  const candidates = row.companyCandidates || [];
  if (candidates.length > 1) {
    const wrap = document.createElement("div");
    const select = document.createElement("select");
    select.className = "row-select";
    select.setAttribute("aria-label", `Empresa de ${row.fileName}`);
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Selecione a empresa (matriz ou filial)";
    select.appendChild(placeholder);
    candidates.forEach((company) => {
      const option = document.createElement("option");
      option.value = company.id;
      option.textContent = companyOptionLabel(company);
      if (row.company?.id === company.id) option.selected = true;
      select.appendChild(option);
    });
    select.addEventListener("change", () => {
      if (!select.value) return;
      void applyRowSelection(row, { companyId: select.value });
    });
    const sub = document.createElement("span");
    sub.className = "subtle";
    sub.textContent = extractedIdentifierLabel(row);
    wrap.append(select, sub);
    return wrap;
  }
  return stacked(row.company?.name, officialCompanyLabel(row));
}

function renderTaskCell(row) {
  const candidates = row.taskCandidates || [];
  if (candidates.length > 1) {
    const wrap = document.createElement("div");
    const select = document.createElement("select");
    select.className = "row-select";
    select.setAttribute("aria-label", `Tarefa de ${row.fileName}`);
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Selecione a tarefa";
    select.appendChild(placeholder);
    candidates.forEach((task) => {
      const option = document.createElement("option");
      option.value = task.id;
      option.textContent = task.name;
      if (row.task?.id === task.id) option.selected = true;
      select.appendChild(option);
    });
    select.addEventListener("change", () => {
      if (!select.value) return;
      void applyRowSelection(row, { taskId: select.value });
    });
    const sub = document.createElement("span");
    sub.className = "subtle";
    sub.textContent = row.task?.status === "completed" ? "Tarefa ja concluida" : row.task ? "Tarefa em aberto" : "Tarefa pendente";
    wrap.append(select, sub);
    return wrap;
  }
  const status = row.task?.status === "completed" ? "Tarefa ja concluida" : row.task ? "Tarefa em aberto" : "Tarefa pendente";
  return stacked(row.task?.name, status);
}

function renderMessages(row) {
  const wrap = document.createElement("div");
  if (!row.messages.length) {
    const ok = document.createElement("span");
    ok.className = "message success";
    ok.textContent = "Validacoes automaticas concluidas.";
    wrap.appendChild(ok);
  } else {
    row.messages.forEach((item) => {
      const message = document.createElement("span");
      message.className = `message ${item.severity}`;
      message.textContent = item.message;
      wrap.appendChild(message);
    });
  }
  return wrap;
}

function renderValidationRows() {
  validationRows.textContent = "";
  state.inspections.forEach((row) => {
    const confirmation = confirmationFor(row);
    const tr = document.createElement("tr");
    const selection = document.createElement("input");
    selection.type = "checkbox";
    selection.checked = state.selectedInspectionIds.has(row.id);
    selection.setAttribute("aria-label", `Selecionar ${row.fileName}`);
    selection.addEventListener("change", () => {
      if (selection.checked) state.selectedInspectionIds.add(row.id);
      else state.selectedInspectionIds.delete(row.id);
      updateSelectionActions();
    });
    const selectionCell = cell(selection);
    selectionCell.className = "selection-column";
    tr.appendChild(selectionCell);
    const size = row.size ? `${(row.size / 1024).toFixed(0)} KB` : "Arquivo invalido";
    tr.appendChild(cell(stacked(row.fileName, `${size}${row.pageCount ? ` | ${row.pageCount} pagina(s)` : ""}`)));
    tr.appendChild(cell(renderCompanyCell(row)));
    tr.appendChild(cell(renderTaskCell(row)));
    tr.appendChild(cell(row.competence || row.task?.competence || "-"));

    const date = document.createElement("input");
    date.type = "date";
    date.className = "row-date";
    date.value = confirmation.confirmedDueDate;
    date.disabled = hasHardError(row);
    date.setAttribute("aria-label", `Vencimento de ${row.fileName}`);
    date.addEventListener("change", () => {
      bulkDate.editDate(confirmation, date.value);
      state.lastBulkDateSnapshot = null;
      renderValidationRows();
      setStatus(`Vencimento de ${row.fileName} alterado; confirme novamente a data.`);
    });
    tr.appendChild(cell(date));

    const checks = document.createElement("div");
    checks.className = "row-checks";
    const companyLabel = document.createElement("label");
    const companyCheck = document.createElement("input");
    companyCheck.type = "checkbox";
    companyCheck.checked = confirmation.companyConfirmed;
    companyCheck.disabled = !row.company;
    companyCheck.addEventListener("change", () => { confirmation.companyConfirmed = companyCheck.checked; updateReviewAvailability(); });
    companyLabel.append(companyCheck, document.createTextNode("Empresa"));
    const taskLabel = document.createElement("label");
    const taskCheck = document.createElement("input");
    taskCheck.type = "checkbox";
    taskCheck.checked = confirmation.taskConfirmed;
    taskCheck.disabled = row.task?.status !== "open";
    taskCheck.addEventListener("change", () => { confirmation.taskConfirmed = taskCheck.checked; updateReviewAvailability(); });
    taskLabel.append(taskCheck, document.createTextNode("Tarefa"));
    const dueLabel = document.createElement("label");
    const dueCheck = document.createElement("input");
    dueCheck.type = "checkbox";
    dueCheck.checked = confirmation.dueDateConfirmed;
    dueCheck.disabled = !confirmation.confirmedDueDate || hasHardError(row);
    dueCheck.addEventListener("change", () => { confirmation.dueDateConfirmed = dueCheck.checked; updateReviewAvailability(); });
    dueLabel.append(dueCheck, document.createTextNode("Vencimento"));
    checks.append(companyLabel, taskLabel, dueLabel);
    tr.appendChild(cell(checks));
    tr.appendChild(cell(renderMessages(row)));
    validationRows.appendChild(tr);
  });
  updateReviewAvailability();
}

function readyRows() {
  return state.inspections.filter(isReady);
}

function renderReview() {
  const rows = readyRows();
  const companyCount = new Set(rows.map((row) => row.company.id)).size;
  const taskCount = new Set(rows.map((row) => row.task.id)).size;
  reviewMetrics.textContent = "";
  [[rows.length, "Documentos"], [companyCount, "Empresas"], [taskCount, "Tarefas"], [state.inspections.length - rows.length, "Pendencias"]].forEach(([value, label]) => {
    const metric = document.createElement("div");
    metric.className = "metric";
    const strong = document.createElement("strong"); strong.textContent = String(value);
    const span = document.createElement("span"); span.textContent = label;
    metric.append(strong, span); reviewMetrics.appendChild(metric);
  });
  reviewList.textContent = "";
  rows.forEach((row) => {
    const confirmation = confirmationFor(row);
    const item = document.createElement("div");
    item.className = "review-row";
    [row.fileName, row.company.name, row.task.name, formatDate(confirmation.confirmedDueDate)].forEach((text) => {
      const span = document.createElement("span"); span.textContent = text; item.appendChild(span);
    });
    reviewList.appendChild(item);
  });
  finalConfirmation.checked = false;
  executeButton.disabled = true;
}

function formatDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return iso || "-";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function renderExecutionStart() {
  resultRows.textContent = "";
  const rows = readyRows();
  rows.forEach((row) => {
    const confirmation = confirmationFor(row);
    const tr = document.createElement("tr");
    tr.dataset.id = row.id;
    [row.fileName, row.company.name, row.task.name, formatDate(confirmation.confirmedDueDate)].forEach((text) => tr.appendChild(cell(text)));
    const status = document.createElement("span"); status.className = "status-text"; status.textContent = "Aguardando";
    const detail = document.createElement("span"); detail.textContent = "Na fila";
    tr.append(cell(status), cell(detail));
    resultRows.appendChild(tr);
  });
  progressBar.style.width = "0%";
  resultSummary.textContent = `${rows.length} documento(s) em processamento.`;
  cancelButton.disabled = false;
  newBatch.disabled = true;
  resultReports.disabled = true;
}

function updateExecutionRow(payload) {
  const tr = resultRows.querySelector(`tr[data-id="${payload.id}"]`);
  if (!tr) return;
  const status = tr.children[4].firstElementChild;
  const statusLabels = {
    processing: "Processando",
    completed: "Concluido",
    pending_review: "Revisao pendente",
    failed: "Falha",
    canceled: "Cancelado",
  };
  status.textContent = statusLabels[payload.status] || payload.status;
  status.className = `status-text ${payload.status}`;
  tr.children[5].firstElementChild.textContent = payload.message;
}

function renderResult(report) {
  state.report = report;
  report.items.forEach((item) => updateExecutionRow({ id: item.id, status: item.status, message: item.message }));
  const finished = report.totals.completed + report.totals.pendingReview + report.totals.failed + report.totals.canceled;
  progressBar.style.width = `${report.totals.selected ? (finished / report.totals.selected) * 100 : 100}%`;
  resultSummary.textContent = `${report.totals.completed} concluido(s), ${report.totals.pendingReview} pendente(s), ${report.totals.failed} falha(s).`;
  cancelButton.disabled = true;
  newBatch.disabled = false;
  resultReports.disabled = false;
}

async function chooseFiles() {
  addPaths(await api.selectFiles());
  showStep("documents");
}

byId("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Abrindo acesso seguro...");
  byId("loginButton").disabled = true;
  const result = await api.captureAuth({ email: email.value, password: password.value, savePassword: savePassword.checked });
  byId("loginButton").disabled = false;
  if (!result.ok) return setStatus(result.error || "Falha no login.", true);
  renderAuth(result.auth); renderIntegration(result.integration);
  setStatus("Login concluido.");
  showStep("documents");
});

byId("clearAuth").addEventListener("click", async () => {
  const result = await api.clearAuth();
  email.value = result.credentials.email || ""; password.value = ""; savePassword.checked = false;
  renderAuth(result.auth); renderIntegration(result.integration); setStatus("Acesso salvo removido."); showStep("login");
});
integrationBadge.addEventListener("click", openIntegrationDiagnostic);
byId("closeIntegrationModal").addEventListener("click", () => integrationModal.classList.add("hidden"));
integrationModal.addEventListener("click", (event) => { if (event.target === integrationModal) integrationModal.classList.add("hidden"); });
byId("selectFiles").addEventListener("click", chooseFiles);
byId("addMoreFiles").addEventListener("click", chooseFiles);
byId("openReports").addEventListener("click", () => api.openReports());
byId("resultReports").addEventListener("click", () => api.openReports());

const dropZone = byId("dropZone");
["dragenter", "dragover"].forEach((name) => dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.add("dragging"); }));
["dragleave", "drop"].forEach((name) => dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.remove("dragging"); }));
dropZone.addEventListener("drop", (event) => addPaths(api.pathsForFiles([...event.dataTransfer.files])));
dropZone.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") chooseFiles(); });

selectAllFiles.addEventListener("change", () => {
  state.selectedFilePathKeys.clear();
  if (selectAllFiles.checked) state.selectedPaths.forEach((filePath) => state.selectedFilePathKeys.add(pathKey(filePath)));
  renderSelectedFiles();
});
removeSelectedFiles.addEventListener("click", () => {
  const removed = state.selectedFilePathKeys.size;
  state.selectedPaths = batchSelection.removePaths(state.selectedPaths, state.selectedFilePathKeys);
  state.selectedFilePathKeys.clear();
  renderSelectedFiles();
  setStatus(`${removed} arquivo(s) removido(s) somente do lote. Nenhum PDF foi apagado do computador.`);
});

selectAllRows.addEventListener("change", () => {
  if (selectAllRows.checked) state.inspections.forEach((row) => state.selectedInspectionIds.add(row.id));
  else state.selectedInspectionIds.clear();
  renderValidationRows();
});
confirmSelectedRows.addEventListener("click", openBatchConfirmationModal);
removeSelectedRows.addEventListener("click", () => {
  const selectedIds = new Set(state.selectedInspectionIds);
  const removedRows = state.inspections.filter((row) => selectedIds.has(row.id));
  if (!removedRows.length) return;
  state.inspections = batchSelection.removeRows(state.inspections, selectedIds);
  const removedPaths = new Set(removedRows.map((row) => row.filePath));
  state.selectedPaths = batchSelection.removePaths(state.selectedPaths, removedPaths);
  removedRows.forEach((row) => state.confirmations.delete(row.id));
  state.selectedInspectionIds.clear();
  state.lastBulkDateSnapshot = null;
  pruneSelectedFilePaths();
  renderSelectedFiles();
  renderValidationRows();
  setStatus(`${removedRows.length} guia(s) removida(s) somente do lote. Nenhum PDF foi apagado do computador.`);
});
cancelBatchConfirm.addEventListener("click", closeBatchConfirmationModal);
confirmPastBatch.addEventListener("change", () => {
  confirmBatchSelection.disabled = Boolean(state.pendingBatchConfirmation?.pastCount) && !confirmPastBatch.checked;
});
confirmBatchSelection.addEventListener("click", () => {
  const preview = state.pendingBatchConfirmation;
  if (!preview || (preview.pastCount && !confirmPastBatch.checked)) return;
  batchSelection.applyConfirmation(state.confirmations, preview.ids);
  state.selectedInspectionIds.clear();
  closeBatchConfirmationModal();
  renderValidationRows();
  setStatus(`${preview.count} documento(s) confirmado(s) em lote. A revisao final continua obrigatoria.`);
});
bulkDueDate.addEventListener("input", updateSelectionActions);
applyBulkDate.addEventListener("click", openBulkDateModal);
byId("cancelBulkDate").addEventListener("click", closeBulkDateModal);
confirmPastBulkDate.addEventListener("change", () => {
  confirmBulkDate.disabled = Boolean(state.pendingBulkPreview?.isPast) && !confirmPastBulkDate.checked;
});
confirmBulkDate.addEventListener("click", () => {
  const preview = state.pendingBulkPreview;
  if (!preview || (preview.isPast && !confirmPastBulkDate.checked)) return;
  state.lastBulkDateSnapshot = bulkDate.apply(state.confirmations, preview.ids, preview.newDate);
  state.selectedInspectionIds.clear();
  closeBulkDateModal();
  renderValidationRows();
  setStatus(`Vencimento ${formatDate(preview.newDate)} aplicado e confirmado em ${preview.count} documento(s).`);
});
undoBulkDate.addEventListener("click", () => {
  if (!state.lastBulkDateSnapshot) return;
  const restored = state.lastBulkDateSnapshot.values.length;
  bulkDate.undo(state.confirmations, state.lastBulkDateSnapshot);
  state.lastBulkDateSnapshot = null;
  renderValidationRows();
  setStatus(`Ultima alteracao coletiva desfeita em ${restored} documento(s).`);
});
bulkDateModal.addEventListener("click", (event) => { if (event.target === bulkDateModal) closeBulkDateModal(); });
batchConfirmModal.addEventListener("click", (event) => { if (event.target === batchConfirmModal) closeBatchConfirmationModal(); });
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!bulkDateModal.classList.contains("hidden")) closeBulkDateModal();
  if (!batchConfirmModal.classList.contains("hidden")) closeBatchConfirmationModal();
});

validateButton.addEventListener("click", async () => {
  setStatus("Validando PDFs, empresas e tarefas...");
  validateButton.disabled = true;
  enableStep("validation", true); showStep("validation");
  const result = await api.validateBatch(state.selectedPaths);
  if (!result.ok) { validateButton.disabled = false; return setStatus(result.error || "Falha na validacao.", true); }
  state.inspections = result.inspections;
  state.confirmations.clear();
  clearBulkDateState();
  renderValidationRows();
  setStatus("Validacao concluida.");
  validateButton.disabled = false;
});

reviewButton.addEventListener("click", () => { renderReview(); enableStep("review", true); showStep("review"); setStatus("Revise os envios confirmados."); });
byId("backToValidation").addEventListener("click", () => showStep("validation"));
finalConfirmation.addEventListener("change", () => { executeButton.disabled = !finalConfirmation.checked; });
executeButton.addEventListener("click", async () => {
  if (!finalConfirmation.checked || state.running) return;
  if (!state.integrationAvailable) {
    setStatus(state.integration?.reason || "A integracao obrigatoria esta indisponivel.", true);
    openIntegrationDiagnostic();
    return;
  }
  state.running = true; enableStep("result", true); showStep("result"); renderExecutionStart(); setStatus("Executando publicacoes...");
  const confirmations = readyRows().map((row) => confirmationFor(row));
  const result = await api.executeBatch(confirmations);
  state.running = false;
  if (!result.ok) {
    const message = result.error || "Falha na execucao.";
    readyRows().forEach((row) => updateExecutionRow({ id: row.id, status: "failed", message }));
    progressBar.style.width = "100%";
    cancelButton.disabled = true;
    newBatch.disabled = false;
    resultReports.disabled = false;
    setStatus(message, true);
    resultSummary.textContent = message;
    if (result.code === "INTEGRATION_CAPABILITIES_MISSING") {
      renderIntegration(result.integration || state.integration);
      openIntegrationDiagnostic();
    }
    return;
  }
  renderResult(result.report); setStatus("Execucao concluida.");
});
cancelButton.addEventListener("click", async () => { await api.cancelBatch(); cancelButton.disabled = true; setStatus("Cancelamento solicitado; o documento atual sera finalizado."); });
newBatch.addEventListener("click", () => {
  state.selectedPaths = []; state.inspections = []; state.confirmations.clear(); state.report = null;
  state.selectedFilePathKeys.clear();
  clearBulkDateState();
  renderSelectedFiles(); validationRows.textContent = ""; enableStep("validation", false); enableStep("review", false); enableStep("result", false); showStep("documents"); setStatus("Pronto para um novo lote.");
});

document.querySelectorAll(".step-link").forEach((button) => button.addEventListener("click", () => { if (!button.disabled && !state.running) showStep(button.dataset.step); }));
api.onItemStatus(updateExecutionRow);

async function initialize() {
  const initial = await api.getInitialState();
  email.value = initial.credentials.email || "";
  password.value = initial.credentials.password || "";
  savePassword.checked = Boolean(initial.credentials.hasSavedPassword);
  savePassword.disabled = !initial.credentials.canSavePassword;
  byId("reportsDir").textContent = initial.reportsDir || "";
  renderAuth(initial.auth); renderIntegration(initial.integration); renderSelectedFiles();
  setStatus(initial.integration.available ? "Pronto." : initial.integration.reason || "Integracao indisponivel.", !initial.integration.available);
  if (initial.auth.authenticated) showStep("documents");
}

initialize().catch((error) => setStatus(error instanceof Error ? error.message : String(error), true));
