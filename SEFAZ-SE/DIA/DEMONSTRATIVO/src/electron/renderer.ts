import type { RunProgress } from "../runner";
import type { ReportFormat } from "../types";
import type { XmlDownloadProgress } from "../xml-downloads";
import type { SefazDiaApi } from "./ipc-types";
import { createRendererState, resetRendererState, type RunningMode } from "./renderer-state";

declare global {
  interface Window {
    sefazDia: SefazDiaApi;
  }
}

const form = byId<HTMLFormElement>("run-form");
const userInput = byId<HTMLInputElement>("user");
const passwordInput = byId<HTMLInputElement>("password");
const rememberInput = byId<HTMLInputElement>("remember");
const competenciaInput = byId<HTMLInputElement>("competencia");
const pdfInput = byId<HTMLInputElement>("format-pdf");
const xlsInput = byId<HTMLInputElement>("format-xls");
const checkpointInput = byId<HTMLInputElement>("checkpoint-enabled");
const outDirInput = byId<HTMLInputElement>("out-dir");
const selectOutDirButton = byId<HTMLButtonElement>("select-out-dir");
const forgetButton = byId<HTMLButtonElement>("forget");
const startButton = byId<HTMLButtonElement>("start");
const downloadXmlButton = byId<HTMLButtonElement>("download-xml");
const cancelButton = byId<HTMLButtonElement>("cancel");
const progressBar = byId<HTMLProgressElement>("progress");
const progressText = byId<HTMLDivElement>("progress-text");
const statusText = byId<HTMLDivElement>("status-text");
const logOutput = byId<HTMLPreElement>("logs");
const successCount = byId<HTMLSpanElement>("success-count");
const errorCount = byId<HTMLSpanElement>("error-count");
const totalCount = byId<HTMLSpanElement>("total-count");
const openFolderButton = byId<HTMLButtonElement>("open-folder");
const openReportButton = byId<HTMLButtonElement>("open-report");
const openXmlReportButton = byId<HTMLButtonElement>("open-xml-report");

const state = createRendererState();

if (!window.sefazDia) {
  disableUnavailableInterface();
  throw new Error("A ponte segura da aplicacao nao carregou. Reinstale usando o instalador mais recente.");
}

window.sefazDia.onLog((message) => appendLog(message));
window.sefazDia.onProgress((progress) => updateProgress(progress));
window.sefazDia.onXmlLog((message) => appendLog(message));
window.sefazDia.onXmlProgress((progress) => updateXmlProgress(progress));

void initialize().catch((error) => {
  setStatus(`Falha ao iniciar a interface: ${messageOf(error)}`);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void startRun();
});

selectOutDirButton.addEventListener("click", async () => {
  try {
    const selected = await window.sefazDia.selectOutDir();
    if (selected) {
      outDirInput.value = selected;
      setStatus("Pasta de saida selecionada.");
    }
  } catch (error) {
    setStatus(`Nao foi possivel selecionar a pasta: ${messageOf(error)}`);
  }
});

forgetButton.addEventListener("click", async () => {
  await window.sefazDia.clearCredentials();
  userInput.value = "";
  passwordInput.value = "";
  rememberInput.checked = false;
  setStatus("Credenciais esquecidas.");
});

cancelButton.addEventListener("click", async () => {
  if (state.runningMode === "xml") {
    await window.sefazDia.cancelXmlDownload();
  } else {
    await window.sefazDia.cancelRun();
  }
  setStatus("Cancelamento solicitado. A execucao vai parar ao fim da etapa atual.");
});

downloadXmlButton.addEventListener("click", () => {
  void startXmlDownload();
});

openFolderButton.addEventListener("click", async () => {
  const targetPath = state.lastResult?.outDir || state.activeOutDir;
  if (targetPath) {
    await window.sefazDia.openPath(targetPath);
  }
});

openReportButton.addEventListener("click", async () => {
  const targetPath = state.lastResult?.excelPath || state.activeExcelPath;
  if (!targetPath || state.activeProcessedCount === 0) {
    setStatus("O relatorio sera criado apos o primeiro item processado.");
    return;
  }

  if (targetPath) {
    await window.sefazDia.openPath(targetPath);
  }
});

openXmlReportButton.addEventListener("click", async () => {
  const targetPath = state.lastXmlResult?.excelPath || state.activeXmlExcelPath;
  if (!targetPath) {
    setStatus("O relatorio XML sera criado apos o primeiro XML processado.");
    return;
  }
  await window.sefazDia.openPath(targetPath);
});

async function initialize(): Promise<void> {
  const [defaults, credentials] = await Promise.all([window.sefazDia.getDefaults(), window.sefazDia.getCredentials()]);
  competenciaInput.value = defaults.competencia;
  outDirInput.value = defaults.outDir;
  userInput.value = credentials.user;
  passwordInput.value = credentials.password;
  rememberInput.checked = credentials.remembered;
  setStatus("Pronto para executar.");
}

async function startRun(): Promise<void> {
  const formats = selectedFormats();
  resetRunState();
  state.activeOutDir = outDirInput.value.trim();
  setRunning("dia");
  refreshOutputButtons();
  setStatus("Iniciando...");

  try {
    state.lastResult = await window.sefazDia.startRun({
      user: userInput.value,
      password: passwordInput.value,
      rememberCredentials: rememberInput.checked,
      competencia: competenciaInput.value,
      formats,
      outDir: outDirInput.value,
      checkpointEnabled: checkpointInput.checked,
    });
    successCount.textContent = String(state.lastResult.successCount);
    errorCount.textContent = String(state.lastResult.errorCount);
    totalCount.textContent = String(state.lastResult.entries.length);
    openFolderButton.disabled = false;
    openReportButton.disabled = false;
    setStatus("Execucao concluida.");
  } catch (error) {
    setStatus(messageOf(error));
  } finally {
    setRunning(undefined);
  }
}

async function startXmlDownload(): Promise<void> {
  resetRunState();
  state.activeOutDir = outDirInput.value.trim();
  setRunning("xml");
  refreshOutputButtons();
  setStatus("Iniciando download dos XMLs...");

  try {
    state.lastXmlResult = await window.sefazDia.startXmlDownload({
      competencia: competenciaInput.value,
      outDir: outDirInput.value,
      checkpointEnabled: checkpointInput.checked,
    });
    successCount.textContent = String(state.lastXmlResult.successCount);
    errorCount.textContent = String(state.lastXmlResult.errorCount);
    totalCount.textContent = String(state.lastXmlResult.entries.length);
    state.activeXmlExcelPath = state.lastXmlResult.excelPath;
    openFolderButton.disabled = false;
    openXmlReportButton.disabled = false;
    setStatus("Download dos XMLs concluido.");
  } catch (error) {
    setStatus(messageOf(error));
  } finally {
    setRunning(undefined);
  }
}

function selectedFormats(): ReportFormat[] {
  const formats: ReportFormat[] = [];
  if (pdfInput.checked) {
    formats.push("pdf");
  }
  if (xlsInput.checked) {
    formats.push("xls");
  }
  return formats;
}

function updateProgress(progress: RunProgress): void {
  state.activeOutDir = progress.outDir;
  state.activeExcelPath = progress.excelPath;
  state.activeProcessedCount = progress.processedCount;
  progressBar.max = progress.total || 1;
  progressBar.value = progress.total ? progress.current : 0;
  progressText.textContent = progress.total ? `${progress.current} de ${progress.total}` : progress.phase;
  successCount.textContent = String(progress.successCount);
  errorCount.textContent = String(progress.errorCount);
  totalCount.textContent = String(progress.processedCount);
  refreshOutputButtons();
  setStatus(progress.message);
}

function updateXmlProgress(progress: XmlDownloadProgress): void {
  state.activeOutDir = progress.outDir;
  state.activeXmlExcelPath = progress.excelPath;
  state.activeProcessedCount = progress.processedCount;
  progressBar.max = progress.total || 1;
  progressBar.value = progress.total ? progress.current : 0;
  progressText.textContent = progress.total ? `${progress.current} de ${progress.total}` : progress.phase;
  successCount.textContent = String(progress.successCount);
  errorCount.textContent = String(progress.errorCount);
  totalCount.textContent = String(progress.processedCount);
  refreshOutputButtons();
  setStatus(progress.message);
}

function appendLog(message: string): void {
  const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  logOutput.textContent += `[${time}] ${message}\n`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function resetRunState(): void {
  resetRendererState(state);
  logOutput.textContent = "";
  progressBar.value = 0;
  progressText.textContent = "0 de 0";
  successCount.textContent = "0";
  errorCount.textContent = "0";
  totalCount.textContent = "0";
  openFolderButton.disabled = true;
  openReportButton.disabled = true;
  openXmlReportButton.disabled = true;
}

function setRunning(mode: RunningMode | undefined): void {
  state.runningMode = mode;
  const running = mode !== undefined;
  startButton.disabled = running;
  downloadXmlButton.disabled = running;
  cancelButton.disabled = !running;
  form.classList.toggle("is-running", running);
}

function setStatus(message: string): void {
  statusText.textContent = message;
}

function refreshOutputButtons(): void {
  openFolderButton.disabled = !state.activeOutDir && !state.lastResult?.outDir;
  openReportButton.disabled = !state.activeExcelPath && !state.lastResult?.excelPath;
  openXmlReportButton.disabled = !state.activeXmlExcelPath && !state.lastXmlResult?.excelPath;
}

function disableUnavailableInterface(): void {
  setStatus("Falha ao carregar a interface segura. Reinstale usando o instalador mais recente.");
  startButton.disabled = true;
  downloadXmlButton.disabled = true;
  cancelButton.disabled = true;
  selectOutDirButton.disabled = true;
  forgetButton.disabled = true;
  openFolderButton.disabled = true;
  openReportButton.disabled = true;
  openXmlReportButton.disabled = true;
  appendLog("window.sefazDia nao esta disponivel; preload nao carregou.");
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Elemento #${id} nao encontrado.`);
  }
  return element as T;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
