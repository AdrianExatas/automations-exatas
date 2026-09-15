const api = window.onboardingApp;

const email = document.getElementById("email");
const password = document.getElementById("password");
const saveCredentials = document.getElementById("saveCredentials");
const cnpj = document.getElementById("cnpj");
const companyInfo = document.getElementById("companyInfo");
const companyInfoValue = document.getElementById("companyInfoValue");
const uf = document.getElementById("uf");
const regimeFiscal = document.getElementById("regimeFiscal");
const incluirAnuais = document.getElementById("incluirAnuais");
const planoPremium = document.getElementById("planoPremium");
const supervisor = document.getElementById("supervisor");
const adicionarAnaliseParcelamentos = document.getElementById("adicionarAnaliseParcelamentos");
const timeoutMs = document.getElementById("timeoutMs");
const readRetries = document.getElementById("readRetries");
const readRetryDelayMs = document.getElementById("readRetryDelayMs");
const previewButton = document.getElementById("previewButton");
const dryRunButton = document.getElementById("dryRunButton");
const runButton = document.getElementById("runButton");
const cancelButton = document.getElementById("cancelButton");
const loginButton = document.getElementById("loginButton");
const openReports = document.getElementById("openReports");
const clearCredentials = document.getElementById("clearCredentials");
const clearLogs = document.getElementById("clearLogs");
const matrixInfo = document.getElementById("matrixInfo");
const matrixSource = document.getElementById("matrixSource");
const matrixBadge = document.getElementById("matrixBadge");
const authBadge = document.getElementById("authBadge");
const authInfo = document.getElementById("authInfo");
const selectMatrix = document.getElementById("selectMatrix");
const resetMatrix = document.getElementById("resetMatrix");
const status = document.getElementById("status");
const previewCount = document.getElementById("previewCount");
const warnings = document.getElementById("warnings");
const previewRows = document.getElementById("previewRows");
const logs = document.getElementById("logs");
const reportsPath = document.getElementById("reportsPath");
const confirmModal = document.getElementById("confirmModal");
const confirmApply = document.getElementById("confirmApply");
const confirmCancel = document.getElementById("confirmCancel");
const confirmCompanyName = document.getElementById("confirmCompanyName");
const confirmCompanyCnpj = document.getElementById("confirmCompanyCnpj");
const confirmTaskCount = document.getElementById("confirmTaskCount");
const dpConfig = document.getElementById("dpConfig");
const dpArea = document.querySelector('input[name="area"][value="dp"]');
const dpFolhaGroup = document.getElementById("dpFolhaGroup");

const state = {
  matrixReady: false,
  automationBusy: false,
  authenticated: false,
  confirmationOpen: false,
  company: null,
  companyLookupVersion: 0,
};

function getInput() {
  const areas = [...document.querySelectorAll('input[name="area"]:checked')].map((item) => item.value);
  const dpProfile = document.querySelector('input[name="dpProfile"]:checked')?.value;
  const grupoFolha = document.querySelector('input[name="dpGroup"]:checked')?.value;
  const dpAdditional = [...document.querySelectorAll('input[name="dpAdditional"]:checked')].map(
    (item) => item.value,
  );
  return {
    cnpj: cnpj.value,
    areas,
    regimeFiscal: regimeFiscal.value,
    dp: areas.includes("dp") && dpProfile
      ? {
          perfil: dpProfile,
          adicionais: dpAdditional,
          grupoFolha: dpProfile === "normal" ? grupoFolha : undefined,
        }
      : undefined,
    incluirAnuais: true,
    planoPremium: planoPremium.checked,
    supervisor: supervisor.checked,
    adicionarAnaliseParcelamentos: adicionarAnaliseParcelamentos.checked,
    uf: document.body.classList.contains("advanced") ? uf.value || undefined : undefined,
  };
}

function syncDpConfig() {
  const enabled = Boolean(dpArea?.checked);
  if (dpConfig) {
    dpConfig.disabled = !enabled;
    dpConfig.classList.toggle("disabled", !enabled);
  }

  const perfil = document.querySelector('input[name="dpProfile"]:checked')?.value;
  const grupoFolhaHabilitado = enabled && perfil === "normal";
  if (dpFolhaGroup) {
    dpFolhaGroup.disabled = !grupoFolhaHabilitado;
    dpFolhaGroup.classList.toggle("disabled", !grupoFolhaHabilitado);
  }
}

function formatarCategoriaDp(categoria) {
  const labels = {
    normal: "Normal",
    sem_movimento: "Sem movimento",
    particularidade: "Particularidade",
    normal_domestica: "Normal doméstica",
    normal_mei: "Normal MEI",
    exatas: "Exatas",
  };
  return labels[categoria] || "—";
}

function getRunOptions() {
  return {
    timeoutMs: Number(timeoutMs.value || 60000),
    readRetries: Number(readRetries.value || 5),
    readRetryDelayMs: Number(readRetryDelayMs.value || 2000),
  };
}

function setStatus(message, isError = false) {
  status.textContent = message || "";
  status.style.color = isError ? "#b42318" : "#62707d";
}

function setBusy(busy) {
  state.automationBusy = busy;
  syncActionButtons();
}

function syncActionButtons() {
  previewButton.disabled = state.automationBusy || !state.matrixReady;
  dryRunButton.disabled = state.automationBusy || !state.matrixReady || !state.authenticated;
  runButton.disabled = state.automationBusy || !state.matrixReady || !state.authenticated;
  cancelButton.disabled = !state.automationBusy;
  loginButton.disabled = state.automationBusy;
  selectMatrix.disabled = state.automationBusy;
  resetMatrix.disabled = state.automationBusy || !resetMatrix.dataset.custom;
  cnpj.disabled = state.automationBusy || state.confirmationOpen;
}

function normalizarCnpj(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatarCnpj(value) {
  const digits = normalizarCnpj(value);
  if (digits.length !== 14) return digits;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function renderCompanyInfo(message, kind = "muted") {
  companyInfoValue.textContent = message;
  companyInfo.className = `company-info ${kind}`;
}

function clearCompanyInfo(message = "Informe o CNPJ para consultar a empresa.") {
  state.company = null;
  state.companyLookupVersion += 1;
  renderCompanyInfo(message);
}

async function lookupCompany() {
  const requestedCnpj = normalizarCnpj(cnpj.value);
  if (requestedCnpj.length !== 14) {
    state.company = null;
    renderCompanyInfo("Informe um CNPJ com 14 digitos para consultar a empresa.", "error");
    return null;
  }
  if (!state.authenticated) {
    state.company = null;
    renderCompanyInfo("Faca login para consultar a empresa no Gestta.", "error");
    return null;
  }

  const version = ++state.companyLookupVersion;
  state.company = null;
  renderCompanyInfo("Consultando empresa no Gestta...");

  let result;
  try {
    result = await api.lookupCompany(cnpj.value);
  } catch (error) {
    if (version !== state.companyLookupVersion || requestedCnpj !== normalizarCnpj(cnpj.value)) return null;
    const message = error instanceof Error ? error.message : String(error);
    renderCompanyInfo(message || "Nao foi possivel consultar a empresa no Gestta.", "error");
    setStatus(message || "Falha ao consultar empresa.", true);
    return null;
  }
  if (version !== state.companyLookupVersion || requestedCnpj !== normalizarCnpj(cnpj.value)) return null;

  if (!result.ok) {
    renderCompanyInfo(result.error || "Nao foi possivel consultar a empresa no Gestta.", "error");
    setStatus(result.error || "Falha ao consultar empresa.", true);
    return null;
  }

  state.company = result.company;
  renderCompanyInfo(`${result.company.name} — ${formatarCnpj(result.company.cnpj)}`, "resolved");
  return result.company;
}

function showStep(step) {
  document.querySelectorAll(".step-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.step === step);
  });
  document.querySelectorAll(".step-section").forEach((section) => {
    section.classList.toggle("active", section.dataset.section === step);
  });
}

function setMode(mode) {
  document.body.classList.toggle("advanced", mode === "advanced");
}

function renderMatrixInfo(info) {
  state.matrixReady = Boolean(info?.exists);
  resetMatrix.dataset.custom = info?.isCustom ? "true" : "";
  matrixSource.textContent = info?.isCustom ? "Customizada" : "Padrao";

  if (!info) {
    matrixInfo.textContent = "Nenhuma planilha disponivel.";
    matrixInfo.classList.add("error");
    matrixBadge.textContent = "Planilha ausente";
    matrixBadge.className = "badge error";
    syncActionButtons();
    return;
  }

  matrixInfo.textContent = info.exists
    ? `${info.fileName} (${info.isCustom ? "customizada" : "padrao"})`
    : `Planilha nao encontrada: ${info.fileName}`;
  matrixInfo.classList.toggle("error", !info.exists);
  matrixBadge.textContent = info.exists ? "Planilha pronta" : "Planilha ausente";
  matrixBadge.className = info.exists ? "badge" : "badge error";
  syncActionButtons();
}

function renderAuth(auth) {
  state.authenticated = Boolean(auth?.authenticated);
  authBadge.textContent = state.authenticated ? "Login pronto" : "Login pendente";
  authBadge.className = state.authenticated ? "badge" : "badge muted";
  authInfo.textContent = state.authenticated
    ? `Salvo em ${new Date(auth.capturedAt || Date.now()).toLocaleString("pt-BR")}`
    : "Nao autenticado";
  syncActionButtons();
}

function renderPreview(preview) {
  previewCount.textContent = `${preview.tarefas.length} tarefa(s)`;
  warnings.innerHTML = "";
  previewRows.innerHTML = "";

  for (const aviso of preview.avisos) {
    const div = document.createElement("div");
    div.className = "warning";
    div.textContent = aviso;
    warnings.appendChild(div);
  }

  for (const tarefa of preview.tarefas) {
    const tr = document.createElement("tr");
    for (const value of [tarefa.aba, formatarCategoriaDp(tarefa.categoriaDp), tarefa.tarefa, tarefa.responsavel]) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    previewRows.appendChild(tr);
  }
}

async function loadInitialState() {
  const initial = await api.getInitialState();
  email.value = initial.credentials.email || "";
  password.value = initial.credentials.password || "";
  saveCredentials.disabled = !initial.credentials.canSavePassword;
  saveCredentials.checked = Boolean(initial.credentials.hasSavedPassword);
  reportsPath.textContent = initial.reportsDir || "";
  timeoutMs.value = String(initial.defaults?.timeoutMs ?? 60000);
  readRetries.value = String(initial.defaults?.readRetries ?? 5);
  readRetryDelayMs.value = String(initial.defaults?.readRetryDelayMs ?? 2000);
  renderMatrixInfo(initial.matrix);
  renderAuth(initial.auth);
  setStatus("Pronto.");
}

async function calculatePreview() {
  const input = getInput();
  if (input.areas.includes("dp") && !input.dp) {
    setStatus("Selecione o perfil do DP antes de calcular a previa.", true);
    showStep("company");
    return null;
  }
  setStatus("Calculando previa...");
  const result = await api.calculatePreview({ input });
  if (!result.ok) {
    setStatus(result.error, true);
    return null;
  }
  renderPreview(result.preview);
  setStatus("Previa calculada.");
  showStep("execute");
  return result.preview;
}

function askApplyConfirmation(company, preview) {
  confirmCompanyName.textContent = company.name;
  confirmCompanyCnpj.textContent = `CNPJ: ${formatarCnpj(company.cnpj)}`;
  confirmTaskCount.textContent = `${preview.tarefas.length} tarefa(s) da previa serao aplicadas.`;
  return new Promise((resolve) => {
    const cleanup = () => {
      state.confirmationOpen = false;
      syncActionButtons();
      confirmModal.classList.add("hidden");
      confirmApply.removeEventListener("click", onApply);
      confirmCancel.removeEventListener("click", onCancel);
    };
    const onApply = () => {
      cleanup();
      resolve(true);
    };
    const onCancel = () => {
      cleanup();
      resolve(false);
    };
    confirmApply.addEventListener("click", onApply);
    confirmCancel.addEventListener("click", onCancel);
    state.confirmationOpen = true;
    syncActionButtons();
    confirmModal.classList.remove("hidden");
    confirmCancel.focus();
  });
}

async function runAutomation(mode) {
  const company = await lookupCompany();
  if (!company) return;

  const preview = await calculatePreview();
  if (!preview) return;

  if (mode === "apply") {
    const confirmed = await askApplyConfirmation(company, preview);
    if (!confirmed) {
      setStatus("Aplicacao cancelada.");
      return;
    }
    if (normalizarCnpj(cnpj.value) !== company.cnpj) {
      setStatus("O CNPJ foi alterado. Consulte a empresa novamente antes de aplicar.", true);
      return;
    }
  }

  logs.textContent = "";
  setBusy(true);
  setStatus(mode === "dry-run" ? "Simulando sem alterar..." : "Executando parametrizacao...");
  const result = await api.runAutomation({
    mode,
    input: getInput(),
    options: getRunOptions(),
  });

  if (!result.ok) {
    setStatus(result.error || "Falha ao iniciar.", true);
    setBusy(false);
  }
}

document.querySelectorAll(".step-link").forEach((button) => {
  button.addEventListener("click", () => showStep(button.dataset.step));
});

document.querySelectorAll('input[name="uiMode"]').forEach((input) => {
  input.addEventListener("change", () => setMode(input.value));
});

document.querySelectorAll('input[name="area"]').forEach((input) => {
  input.addEventListener("change", syncDpConfig);
});

document.querySelectorAll('input[name="dpProfile"]').forEach((input) => {
  input.addEventListener("change", syncDpConfig);
});

cnpj.addEventListener("input", () => {
  clearCompanyInfo();
});

cnpj.addEventListener("blur", () => {
  if (normalizarCnpj(cnpj.value).length === 0) return;
  void lookupCompany();
});

previewButton.addEventListener("click", () => {
  calculatePreview();
});

dryRunButton.addEventListener("click", () => {
  runAutomation("dry-run");
});

runButton.addEventListener("click", () => {
  runAutomation("apply");
});

cancelButton.addEventListener("click", async () => {
  const result = await api.cancelAutomation();
  if (result.ok && result.running) setStatus("Cancelamento solicitado.");
});

loginButton.addEventListener("click", async () => {
  setStatus("Abrindo login...");
  const result = await api.captureAuth({
    email: email.value,
    password: password.value,
    saveCredentials: saveCredentials.checked,
  });
  if (!result.ok) {
    setStatus(result.canceled ? "Login cancelado." : result.error || "Falha no login.", !result.canceled);
    return;
  }

  const initial = await api.getInitialState();
  renderAuth(initial.auth);
  setStatus("Login concluido.");
  showStep("company");
});

openReports.addEventListener("click", () => {
  api.openReports();
});

clearCredentials.addEventListener("click", async () => {
  if (!window.confirm("Limpar credenciais e acesso salvo neste computador?")) return;
  const result = await api.clearCredentials();
  email.value = result.credentials.email || "";
  password.value = result.credentials.password || "";
  saveCredentials.checked = false;
  renderAuth(result.auth);
  setStatus("Credenciais removidas.");
});

clearLogs.addEventListener("click", () => {
  logs.textContent = "";
});

selectMatrix.addEventListener("click", async () => {
  setStatus("Selecionando planilha...");
  const result = await api.selectMatrix();
  renderMatrixInfo(result.info);
  setStatus(result.ok ? "Planilha atualizada." : result.error || "Falha ao selecionar planilha.", !result.ok);
  if (result.ok) showStep("login");
});

resetMatrix.addEventListener("click", async () => {
  const result = await api.resetMatrix();
  renderMatrixInfo(result.info);
  setStatus("Planilha padrao restaurada.");
});

api.onAutomationLog((message) => {
  logs.textContent += message;
  logs.scrollTop = logs.scrollHeight;
});

api.onAutomationStatus((message) => {
  setStatus(message);
});

api.onAuthStatus((message) => {
  setStatus(message);
});

api.onAutomationDone((result) => {
  setBusy(false);
  if (result.reportPaths?.xlsxPath) {
    setStatus(result.ok ? "Execucao finalizada." : "Execucao finalizada com falhas.", !result.ok);
  } else {
    setStatus(result.error || (result.ok ? "Execucao finalizada." : "Execucao finalizada com falha."), !result.ok);
  }
});

loadInitialState().catch((error) => {
  setStatus(error instanceof Error ? error.message : String(error), true);
});

syncDpConfig();
