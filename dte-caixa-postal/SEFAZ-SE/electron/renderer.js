const elements = {
  runButton: document.getElementById('runButton'),
  openOutputButton: document.getElementById('openOutputButton'),
  statusChip: document.getElementById('statusChip'),
  progressLabel: document.getElementById('progressLabel'),
  progressCounter: document.getElementById('progressCounter'),
  progressBar: document.getElementById('progressBar'),
  resultPath: document.getElementById('resultPath'),
  configPath: document.getElementById('configPath'),
  outputPath: document.getElementById('outputPath'),
  certificatePath: document.getElementById('certificatePath'),
  certificateUser: document.getElementById('certificateUser'),
  executionStrategy: document.getElementById('executionStrategy'),
  logStream: document.getElementById('logStream'),
};

let currentOutputPath = '';

function renderState(state) {
  elements.runButton.disabled = state.isRunning;
  elements.openOutputButton.disabled = !state.outputDir;
  elements.configPath.textContent = state.configPath;
  elements.outputPath.textContent = state.outputDir;
  elements.certificatePath.textContent = state.certificatePath;
  elements.certificateUser.textContent = state.certificateUser;
  elements.executionStrategy.textContent = state.executionStrategy;

  if (state.isRunning) {
    setStatus('Execucao em andamento', 'running');
  } else if (elements.statusChip.dataset.state !== 'done' && elements.statusChip.dataset.state !== 'error') {
    setStatus('Pronto para executar', 'idle');
  }
}

function setStatus(message, state) {
  elements.statusChip.textContent = message;
  elements.statusChip.dataset.state = state;
}

function setProgress(current, total, label) {
  const safeTotal = total > 0 ? total : 0;
  const percent = safeTotal > 0 ? Math.round((current / safeTotal) * 100) : 0;

  elements.progressLabel.textContent = label;
  elements.progressCounter.textContent = `${current}/${safeTotal}`;
  elements.progressBar.max = 100;
  elements.progressBar.value = percent;
}

function appendLog(entry) {
  const item = document.createElement('article');
  item.className = 'log-entry';
  item.dataset.level = entry.level;

  const meta = document.createElement('div');
  meta.className = 'log-entry__meta';

  const level = document.createElement('span');
  level.textContent = entry.level === 'error' ? 'Erro' : 'Info';

  const timestamp = document.createElement('span');
  timestamp.textContent = new Date(entry.timestamp).toLocaleString('pt-BR');

  const message = document.createElement('p');
  message.className = 'log-entry__message';
  message.textContent = entry.message;

  meta.append(level, timestamp);
  item.append(meta, message);
  elements.logStream.prepend(item);
}

async function boot() {
  const initialState = await window.caixaPostalApp.getState();
  currentOutputPath = initialState.outputDir;
  renderState(initialState);

  window.caixaPostalApp.onStateChanged((state) => {
    currentOutputPath = state.outputDir;
    renderState(state);
  });

  window.caixaPostalApp.onRunLog((entry) => {
    if (entry.level === 'error') {
      setStatus('Execucao com erro', 'error');
    }

    appendLog(entry);
  });

  window.caixaPostalApp.onRunProgress((progress) => {
    setProgress(
      progress.current,
      progress.total,
      `${progress.companyId} - ${progress.companyName}`,
    );
  });

  elements.runButton.addEventListener('click', async () => {
    setStatus('Preparando execucao', 'running');
    setProgress(0, 0, 'Iniciando automacao');
    elements.resultPath.textContent = 'Aguardando geracao do relatorio';

    const response = await window.caixaPostalApp.startRun();
    if (!response.ok) {
      setStatus('Execucao com erro', 'error');
      return;
    }

    elements.resultPath.textContent = response.result.outputPath;
    setStatus('Execucao concluida', 'done');
  });

  elements.openOutputButton.addEventListener('click', async () => {
    if (!currentOutputPath) {
      return;
    }

    await window.caixaPostalApp.openPath(currentOutputPath);
  });
}

void boot();
