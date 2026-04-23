import type { RunProgress, RunResult } from "../runner";
import type { ReportFormat } from "../types";

type SefazDiaApi = {
  getDefaults(): Promise<{ competencia: string; outDir: string }>;
  getCredentials(): Promise<{ user: string; password: string; remembered: boolean }>;
  clearCredentials(): Promise<void>;
  selectOutDir(): Promise<string | undefined>;
  startRun(request: {
    user: string;
    password: string;
    rememberCredentials: boolean;
    competencia: string;
    formats: ReportFormat[];
    outDir: string;
  }): Promise<RunResult>;
  cancelRun(): Promise<void>;
  openPath(targetPath: string): Promise<void>;
  onLog(callback: (message: string) => void): () => void;
  onProgress(callback: (progress: RunProgress) => void): () => void;
};

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
const outDirInput = byId<HTMLInputElement>("out-dir");
const selectOutDirButton = byId<HTMLButtonElement>("select-out-dir");
const forgetButton = byId<HTMLButtonElement>("forget");
const startButton = byId<HTMLButtonElement>("start");
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

let lastResult: RunResult | undefined;
let activeOutDir = "";
let activeExcelPath = "";
let activeProcessedCount = 0;

if (!window.sefazDia) {
  disableUnavailableInterface();
  throw new Error("A ponte segura da aplicacao nao carregou. Reinstale usando o instalador mais recente.");
}

window.sefazDia.onLog((message) => appendLog(message));
window.sefazDia.onProgress((progress) => updateProgress(progress));

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
  await window.sefazDia.cancelRun();
  setStatus("Cancelamento solicitado. A execucao vai parar ao fim da etapa atual.");
});

openFolderButton.addEventListener("click", async () => {
  const targetPath = lastResult?.outDir || activeOutDir;
  if (targetPath) {
    await window.sefazDia.openPath(targetPath);
  }
});

openReportButton.addEventListener("click", async () => {
  const targetPath = lastResult?.excelPath || activeExcelPath;
  if (!targetPath || activeProcessedCount === 0) {
    setStatus("O relatorio sera criado apos o primeiro item processado.");
    return;
  }

  if (targetPath) {
    await window.sefazDia.openPath(targetPath);
  }
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
  activeOutDir = outDirInput.value.trim();
  setRunning(true);
  refreshOutputButtons();
  setStatus("Iniciando...");

  try {
    lastResult = await window.sefazDia.startRun({
      user: userInput.value,
      password: passwordInput.value,
      rememberCredentials: rememberInput.checked,
      competencia: competenciaInput.value,
      formats,
      outDir: outDirInput.value,
    });
    successCount.textContent = String(lastResult.successCount);
    errorCount.textContent = String(lastResult.errorCount);
    totalCount.textContent = String(lastResult.entries.length);
    openFolderButton.disabled = false;
    openReportButton.disabled = false;
    setStatus("Execucao concluida.");
  } catch (error) {
    setStatus(messageOf(error));
  } finally {
    setRunning(false);
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
  activeOutDir = progress.outDir;
  activeExcelPath = progress.excelPath;
  activeProcessedCount = progress.processedCount;
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
  lastResult = undefined;
  activeOutDir = "";
  activeExcelPath = "";
  activeProcessedCount = 0;
  logOutput.textContent = "";
  progressBar.value = 0;
  progressText.textContent = "0 de 0";
  successCount.textContent = "0";
  errorCount.textContent = "0";
  totalCount.textContent = "0";
  openFolderButton.disabled = true;
  openReportButton.disabled = true;
}

function setRunning(running: boolean): void {
  startButton.disabled = running;
  cancelButton.disabled = !running;
  form.classList.toggle("is-running", running);
}

function setStatus(message: string): void {
  statusText.textContent = message;
}

function refreshOutputButtons(): void {
  openFolderButton.disabled = !activeOutDir && !lastResult?.outDir;
  openReportButton.disabled = activeProcessedCount === 0 && !lastResult?.excelPath;
}

function disableUnavailableInterface(): void {
  setStatus("Falha ao carregar a interface segura. Reinstale usando o instalador mais recente.");
  startButton.disabled = true;
  cancelButton.disabled = true;
  selectOutDirButton.disabled = true;
  forgetButton.disabled = true;
  openFolderButton.disabled = true;
  openReportButton.disabled = true;
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
