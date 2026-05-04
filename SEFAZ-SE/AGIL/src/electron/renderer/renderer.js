const DANFE_KEY_PATTERN = /(?<!\d)\d{44}(?!\d)/g;
const STATUS_LABELS = {
  pending: 'Pendente',
  processing: 'Processando',
  success: 'Sucesso',
  error: 'Erro',
};

const state = {
  executionLog: [],
  running: false,
  keys: [],
};

const elements = {
  addManualButton: document.querySelector('#addManualButton'),
  certificateNotice: document.querySelector('#certificateNotice'),
  clearButton: document.querySelector('#clearButton'),
  credentialsFields: document.querySelector('#credentialsFields'),
  dryRunInput: document.querySelector('#dryRunInput'),
  exportPdfsZipButton: document.querySelector('#exportPdfsZipButton'),
  exportReportButton: document.querySelector('#exportReportButton'),
  importButton: document.querySelector('#importButton'),
  keysTableBody: document.querySelector('#keysTableBody'),
  manualKeysInput: document.querySelector('#manualKeysInput'),
  passwordInput: document.querySelector('#passwordInput'),
  startButton: document.querySelector('#startButton'),
  statusText: document.querySelector('#statusText'),
  summaryError: document.querySelector('#summaryError'),
  summaryPending: document.querySelector('#summaryPending'),
  summarySuccess: document.querySelector('#summarySuccess'),
  summaryTotal: document.querySelector('#summaryTotal'),
  usernameInput: document.querySelector('#usernameInput'),
};

function extractKeys(text) {
  return [...new Set(text.match(DANFE_KEY_PATTERN) ?? [])];
}

function normalizeKeysText(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\D/g, ''))
    .filter(Boolean)
    .join('\n');
}

function applyNormalizedPaste(textarea, pastedText) {
  const cleaned = normalizeKeysText(pastedText);

  if (!cleaned) {
    return false;
  }

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const { value } = textarea;
  textarea.value = `${value.slice(0, start)}${cleaned}${value.slice(end)}`;
  const cursor = start + cleaned.length;
  textarea.setSelectionRange(cursor, cursor);
  return true;
}

function setStatus(message) {
  elements.statusText.textContent = message;
}

function nowIso() {
  return new Date().toISOString();
}

function addExecutionEvent(event) {
  state.executionLog.push({
    timestamp: nowIso(),
    ...event,
  });
}

function getAuthMode() {
  return document.querySelector('input[name="authMode"]:checked').value;
}

function setRunning(running) {
  state.running = running;
  elements.startButton.disabled = running;
  elements.addManualButton.disabled = running;
  elements.importButton.disabled = running;
  elements.exportReportButton.disabled = running || !hasReportData();
  elements.exportPdfsZipButton.disabled = running || !hasPdfPathsForZip();
  elements.clearButton.disabled = running;
}

function hasReportData() {
  return state.keys.length > 0 || state.executionLog.length > 0;
}

function hasPdfPathsForZip() {
  return state.keys.some((item) => Boolean(item.pdfPath?.trim()));
}

function addKeys(keys) {
  let added = 0;
  const existing = new Set(state.keys.map((item) => item.key));

  for (const key of keys) {
    if (existing.has(key)) {
      continue;
    }

    state.keys.push({
      key,
      message: '',
      pdfPath: '',
      status: 'pending',
      updatedAt: '',
    });
    existing.add(key);
    added += 1;
  }

  render();
  return added;
}

function updateKeyStatus(progress, { recordEvent = true } = {}) {
  const item = state.keys.find((entry) => entry.key === progress.danfe);

  if (!item) {
    return;
  }

  const timestamp = nowIso();

  item.status = progress.status;
  item.message = progress.message ?? '';
  item.pdfPath = progress.pdfPath ?? item.pdfPath ?? '';
  item.updatedAt = timestamp;

  if (recordEvent) {
    addExecutionEvent({
      danfe: progress.danfe,
      message: item.message,
      pdfPath: item.pdfPath,
      status: progress.status,
      type: 'progresso',
    });
  }

  render();
}

function renderSummary() {
  const summary = state.keys.reduce(
    (accumulator, item) => {
      accumulator[item.status] += 1;
      return accumulator;
    },
    { pending: 0, processing: 0, success: 0, error: 0 },
  );

  elements.summaryTotal.textContent = String(state.keys.length);
  elements.summaryPending.textContent = String(summary.pending + summary.processing);
  elements.summarySuccess.textContent = String(summary.success);
  elements.summaryError.textContent = String(summary.error);
}

function createStatusPill(status) {
  const pill = document.createElement('span');
  pill.className = `status-pill status-${status}`;
  pill.textContent = STATUS_LABELS[status] ?? status;
  return pill;
}

function renderTable() {
  elements.keysTableBody.replaceChildren();

  if (state.keys.length === 0) {
    const row = document.createElement('tr');
    row.className = 'empty-row';
    const cell = document.createElement('td');
    cell.colSpan = 3;
    cell.textContent = 'Nenhuma chave carregada.';
    row.append(cell);
    elements.keysTableBody.append(row);
    return;
  }

  for (const item of state.keys) {
    const row = document.createElement('tr');

    const keyCell = document.createElement('td');
    keyCell.textContent = item.key;

    const statusCell = document.createElement('td');
    statusCell.append(createStatusPill(item.status));

    const messageCell = document.createElement('td');
    messageCell.textContent = item.message;

    row.append(keyCell, statusCell, messageCell);
    elements.keysTableBody.append(row);
  }
}

function render() {
  renderSummary();
  renderTable();
  elements.exportReportButton.disabled = state.running || !hasReportData();
  elements.exportPdfsZipButton.disabled = state.running || !hasPdfPathsForZip();
}

function syncAuthMode() {
  const authMode = getAuthMode();
  const certificateMode = authMode === 'certificate';

  elements.credentialsFields.classList.toggle('hidden', certificateMode);
  elements.certificateNotice.classList.toggle('hidden', !certificateMode);
}

function switchTab(tabName) {
  for (const button of document.querySelectorAll('.tab-button')) {
    button.classList.toggle('active', button.dataset.tab === tabName);
  }

  document.querySelector('#loginTab').classList.toggle('active', tabName === 'login');
  document.querySelector('#notesTab').classList.toggle('active', tabName === 'notes');
}

function buildPayload() {
  const authMode = getAuthMode();

  if (authMode === 'credentials') {
    return {
      auth: {
        authMode,
        username: elements.usernameInput.value.trim(),
        password: elements.passwordInput.value,
      },
      danfes: state.keys.map((item) => item.key),
      dryRun: elements.dryRunInput.checked,
    };
  }

  return {
    auth: { authMode },
    danfes: state.keys.map((item) => item.key),
    dryRun: elements.dryRunInput.checked,
  };
}

function buildReportPayload() {
  return {
    generatedAt: nowIso(),
    events: state.executionLog,
    items: state.keys.map((item) => ({
      key: item.key,
      message: item.message,
      pdfPath: item.pdfPath,
      status: item.status,
      updatedAt: item.updatedAt,
    })),
  };
}

for (const button of document.querySelectorAll('.tab-button')) {
  button.addEventListener('click', () => switchTab(button.dataset.tab));
}

for (const input of document.querySelectorAll('input[name="authMode"]')) {
  input.addEventListener('change', syncAuthMode);
}

elements.manualKeysInput.addEventListener('paste', (event) => {
  const pasted = event.clipboardData?.getData('text') ?? '';

  if (!pasted || !/\D/.test(pasted)) {
    return;
  }

  if (applyNormalizedPaste(elements.manualKeysInput, pasted)) {
    event.preventDefault();
  }
});

elements.addManualButton.addEventListener('click', () => {
  const raw = elements.manualKeysInput.value;
  const normalized = normalizeKeysText(raw);

  if (normalized !== raw) {
    elements.manualKeysInput.value = normalized;
  }

  const keys = extractKeys(normalized || raw);
  const added = addKeys(keys);

  if (added > 0) {
    elements.manualKeysInput.value = '';
    addExecutionEvent({
      message: `${added} chave(s) adicionada(s) manualmente.`,
      type: 'adicionar-chaves',
    });
  }

  setStatus(
    added > 0
      ? `${added} chave(s) adicionada(s).`
      : 'Nenhuma chave nova de 44 digitos foi encontrada.',
  );
});

elements.importButton.addEventListener('click', async () => {
  try {
    const result = await window.agilApi.importFiles();

    if (result.filePaths.length === 0) {
      setStatus('Importacao cancelada.');
      return;
    }

    const added = addKeys(result.keys);
    addExecutionEvent({
      message: `${added} chave(s) importada(s) de ${result.filePaths.length} arquivo(s).`,
      type: 'importar-arquivo',
    });
    setStatus(`${added} chave(s) importada(s) de ${result.filePaths.length} arquivo(s).`);
  } catch (error) {
    setStatus(error.message ?? String(error));
  }
});

elements.clearButton.addEventListener('click', () => {
  state.keys = [];
  state.executionLog = [];
  elements.manualKeysInput.value = '';
  render();
  setStatus('Lista limpa.');
});

elements.exportReportButton.addEventListener('click', async () => {
  if (!hasReportData()) {
    setStatus('Nao ha dados para exportar.');
    return;
  }

  try {
    const result = await window.agilApi.exportReport(buildReportPayload());

    setStatus(result.canceled ? 'Exportacao cancelada.' : `Relatorio salvo em ${result.filePath}.`);
  } catch (error) {
    setStatus(error.message ?? String(error));
  }
});

elements.exportPdfsZipButton.addEventListener('click', async () => {
  const paths = [...new Set(state.keys.map((item) => item.pdfPath?.trim()).filter(Boolean))];

  if (paths.length === 0) {
    setStatus('Nenhum PDF disponivel para compactar.');
    return;
  }

  try {
    const result = await window.agilApi.exportPdfsZip({ paths });

    setStatus(result.canceled ? 'Exportacao cancelada.' : `ZIP salvo em ${result.filePath}.`);
  } catch (error) {
    setStatus(error.message ?? String(error));
  }
});

elements.startButton.addEventListener('click', async () => {
  if (state.keys.length === 0) {
    setStatus('Informe ou importe ao menos uma chave de nota fiscal.');
    switchTab('notes');
    return;
  }

  for (const item of state.keys) {
    item.status = 'pending';
    item.message = '';
    item.pdfPath = '';
    item.updatedAt = '';
  }

  setRunning(true);
  render();
  setStatus('Execucao iniciada.');
  addExecutionEvent({
    message: `Execucao iniciada com ${state.keys.length} chave(s).`,
    type: 'inicio-execucao',
  });

  try {
    const results = await window.agilApi.startBatch(buildPayload());

    for (const result of results) {
      updateKeyStatus(result, { recordEvent: false });
    }

    setStatus('Execucao finalizada.');
    addExecutionEvent({
      message: 'Execucao finalizada.',
      type: 'fim-execucao',
    });
  } catch (error) {
    addExecutionEvent({
      message: error.message ?? String(error),
      type: 'erro-execucao',
    });
    setStatus(error.message ?? String(error));
  } finally {
    setRunning(false);
  }
});

window.agilApi.onProgress((progress) => {
  updateKeyStatus(progress);
});

syncAuthMode();
render();
