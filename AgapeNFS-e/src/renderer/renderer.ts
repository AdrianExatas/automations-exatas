const login = getInput("login");
const password = getInput("password");
const startDate = getInput("startDate");
const endDate = getInput("endDate");
const outputDir = getInput("outputDir");
const saveCredentials = getInput("saveCredentials") as HTMLInputElement;
const selectFolder = getButton("selectFolder");
const runDownload = getButton("runDownload");
const statusText = getElement("status");
const logs = getElement("logs");

let running = false;
let secureStorageAvailable = true;

window.agape.onDownloadLog((message) => appendLog(message));
window.agape.onDownloadDone((result) => {
  if ("error" in result) {
    return;
  }
  appendLog(
    `Concluido: ${result.baixados} baixado(s), ${result.pulados} pulado(s), ${result.erros} erro(s), ${result.totalNotas} nota(s) encontrada(s).`,
  );
  appendLog(`Destino: ${result.destino}`);
});

loadInitialState();

selectFolder.addEventListener("click", async () => {
  appendLog("Abrindo seletor de pasta...");
  setStatus("Selecionando pasta...");
  selectFolder.disabled = true;

  try {
    const selected = await window.agape.selectFolder(outputDir.value.trim());
    if (selected) {
      outputDir.value = selected;
      appendLog(`Pasta selecionada: ${selected}`);
      setStatus("Pronto");
    } else {
      appendLog("Selecao de pasta cancelada.");
      setStatus("Pronto");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendLog(`ERRO ao abrir seletor de pasta: ${message}`);
    setStatus("Erro");
  } finally {
    selectFolder.disabled = running;
  }
});

runDownload.addEventListener("click", async () => {
  if (running) {
    return;
  }

  const validation = validate();
  if (validation) {
    setStatus(validation);
    appendLog(`ERRO: ${validation}`);
    return;
  }

  running = true;
  setBusy(true);
  setStatus("Executando...");
  appendLog("Iniciando download...");

  try {
    await window.agape.runDownload({
      login: login.value.trim(),
      password: password.value,
      startDate: startDate.value,
      endDate: endDate.value,
      outputDir: outputDir.value.trim(),
      saveCredentials: saveCredentials.checked,
    });
    setStatus("Concluido");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendLog(`ERRO: ${message}`);
    setStatus("Erro");
  } finally {
    running = false;
    setBusy(false);
  }
});

async function loadInitialState() {
  const credentials = await window.agape.loadCredentials();
  if (credentials.saved) {
    login.value = credentials.login;
    password.value = credentials.password;
    saveCredentials.checked = true;
  }
  if (!credentials.available) {
    secureStorageAvailable = false;
    saveCredentials.checked = false;
    saveCredentials.disabled = true;
  }

  const today = new Date();
  const iso = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())).toISOString().slice(0, 10);
  startDate.value = iso;
  endDate.value = iso;
}

function validate(): string {
  if (!login.value.trim() || !password.value || !startDate.value || !endDate.value) {
    return "Informe login, senha, data inicial e data final.";
  }
  if (startDate.value > endDate.value) {
    return "Data inicial nao pode ser maior que a data final.";
  }
  if (startDate.value.slice(0, 4) !== endDate.value.slice(0, 4)) {
    return "Informe um periodo dentro do mesmo exercicio/ano.";
  }
  return "";
}

function appendLog(message: string) {
  logs.textContent += `${message}\n`;
  logs.scrollTop = logs.scrollHeight;
}

function setBusy(value: boolean) {
  runDownload.disabled = value;
  selectFolder.disabled = value;
  login.disabled = value;
  password.disabled = value;
  startDate.disabled = value;
  endDate.disabled = value;
  outputDir.disabled = value;
  saveCredentials.disabled = value || !secureStorageAvailable;
}

function setStatus(value: string) {
  statusText.textContent = value;
}

function getInput(id: string): HTMLInputElement {
  return getElement(id) as HTMLInputElement;
}

function getButton(id: string): HTMLButtonElement {
  return getElement(id) as HTMLButtonElement;
}

function getElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Elemento nao encontrado: ${id}`);
  }
  return element;
}
