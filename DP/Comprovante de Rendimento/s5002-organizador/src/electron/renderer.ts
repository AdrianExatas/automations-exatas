import { messageOf } from "../errors";
import type { RunProgress, RunResult } from "../types";
import type { S5002Api } from "./ipc-types";

declare global {
  interface Window {
    s5002: S5002Api;
  }
}

const form = byId<HTMLFormElement>("run-form");
const inputDirInput = byId<HTMLInputElement>("input-dir");
const outputDirInput = byId<HTMLInputElement>("output-dir");
const selectInputButton = byId<HTMLButtonElement>("select-input-dir");
const selectOutputButton = byId<HTMLButtonElement>("select-output-dir");
const startButton = byId<HTMLButtonElement>("start");
const cancelButton = byId<HTMLButtonElement>("cancel");
const openOutputButton = byId<HTMLButtonElement>("open-output");
const openReportButton = byId<HTMLButtonElement>("open-report");
const progressBar = byId<HTMLProgressElement>("progress");
const progressText = byId<HTMLDivElement>("progress-text");
const statusText = byId<HTMLDivElement>("status-text");
const logOutput = byId<HTMLPreElement>("logs");
const successCount = byId<HTMLSpanElement>("success-count");
const errorCount = byId<HTMLSpanElement>("error-count");
const ignoredCount = byId<HTMLSpanElement>("ignored-count");
const totalCount = byId<HTMLSpanElement>("total-count");

let running = false;
let lastResult: RunResult | undefined;
let activeOutputDir = "";
let activeExcelPath = "";

if (!window.s5002) {
  disableInterface();
  throw new Error("A ponte segura da aplicacao nao carregou. Reinstale usando o instalador mais recente.");
}

window.s5002.onLog((message) => appendLog(message));
window.s5002.onProgress((progress) => updateProgress(progress));

void initialize().catch((error) => {
  setStatus(`Falha ao iniciar: ${messageOf(error)}`);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void startRun();
});

selectInputButton.addEventListener("click", async () => {
  try {
    const selected = await window.s5002.selectInputDir();
    if (selected) {
      inputDirInput.value = selected;
      setStatus("Pasta de entrada selecionada.");
    }
  } catch (error) {
    setStatus(`Nao foi possivel selecionar a entrada: ${messageOf(error)}`);
  }
});

selectOutputButton.addEventListener("click", async () => {
  try {
    const selected = await window.s5002.selectOutputDir();
    if (selected) {
      outputDirInput.value = selected;
      setStatus("Pasta de saida selecionada.");
    }
  } catch (error) {
    setStatus(`Nao foi possivel selecionar a saida: ${messageOf(error)}`);
  }
});

cancelButton.addEventListener("click", async () => {
  await window.s5002.cancelRun();
  setStatus("Cancelamento solicitado. A execucao vai parar ao fim da etapa atual.");
});

openOutputButton.addEventListener("click", async () => {
  const targetPath = lastResult?.outputDir || activeOutputDir || outputDirInput.value.trim();
  if (targetPath) {
    await window.s5002.openPath(targetPath);
  }
});

openReportButton.addEventListener("click", async () => {
  const targetPath = lastResult?.excelPath || activeExcelPath;
  if (targetPath) {
    await window.s5002.openPath(targetPath);
  }
});

async function initialize(): Promise<void> {
  const defaults = await window.s5002.getDefaults();
  inputDirInput.value = defaults.inputDir;
  outputDirInput.value = defaults.outputDir;
  setStatus("Pronto para organizar XMLs S-5002 e S-2501.");
}

async function startRun(): Promise<void> {
  resetRunState();
  setRunning(true);
  activeOutputDir = outputDirInput.value.trim();
  setStatus("Iniciando...");

  try {
    lastResult = await window.s5002.startRun({
      inputDir: inputDirInput.value,
      outputDir: outputDirInput.value,
    });
    activeExcelPath = lastResult.excelPath;
    successCount.textContent = String(lastResult.successCount);
    errorCount.textContent = String(lastResult.errorCount);
    ignoredCount.textContent = String(lastResult.ignoredCount);
    totalCount.textContent = String(lastResult.eventXmlCount);
    setStatus("Processamento concluido.");
  } catch (error) {
    setStatus(messageOf(error));
  } finally {
    setRunning(false);
    refreshOutputButtons();
  }
}

function updateProgress(progress: RunProgress): void {
  activeOutputDir = progress.outputDir;
  activeExcelPath = progress.excelPath ?? activeExcelPath;
  progressBar.max = progress.total || 1;
  progressBar.value = progress.total ? progress.current : 0;
  progressText.textContent = progress.total ? `${progress.current} de ${progress.total}` : progress.phase;
  successCount.textContent = String(progress.successCount);
  errorCount.textContent = String(progress.errorCount);
  ignoredCount.textContent = String(progress.ignoredCount);
  totalCount.textContent = String(progress.eventXmlCount);
  setStatus(progress.message);
  refreshOutputButtons();
}

function resetRunState(): void {
  lastResult = undefined;
  activeExcelPath = "";
  logOutput.textContent = "";
  progressBar.value = 0;
  successCount.textContent = "0";
  errorCount.textContent = "0";
  ignoredCount.textContent = "0";
  totalCount.textContent = "0";
  refreshOutputButtons();
}

function setRunning(value: boolean): void {
  running = value;
  startButton.disabled = value;
  cancelButton.disabled = !value;
  inputDirInput.disabled = value;
  outputDirInput.disabled = value;
  selectInputButton.disabled = value;
  selectOutputButton.disabled = value;
}

function refreshOutputButtons(): void {
  openOutputButton.disabled = running || !(lastResult?.outputDir || activeOutputDir || outputDirInput.value.trim());
  openReportButton.disabled = running || !(lastResult?.excelPath || activeExcelPath);
}

function setStatus(message: string): void {
  statusText.textContent = message;
}

function appendLog(message: string): void {
  const timestamp = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  logOutput.textContent += `[${timestamp}] ${message}\n`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function disableInterface(): void {
  for (const element of document.querySelectorAll("button, input")) {
    (element as HTMLButtonElement | HTMLInputElement).disabled = true;
  }
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Elemento nao encontrado: ${id}`);
  }
  return element as T;
}
