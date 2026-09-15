import type { AlterarRunProgress, SefazDiaApi } from "./ipc-types";
import type { RunProgress } from "../runner";
import type { ReportFormat } from "../types";
import type { XmlDownloadProgress } from "../xml-downloads";
import { createRendererState, resetRendererState, type AppId, type RunningMode } from "./renderer-state";

declare global {
  interface Window {
    sefazDia: SefazDiaApi;
  }
}

const SUBTITLES: Record<AppId, string> = {
  demonstrativo: "Baixe demonstrativos por empresa em PDF e XLS com relatório de execução.",
  alterar: "Altere ICMS e recolhimento no portal a partir da planilha colorida DIA Atual.",
};

const layoutEl = byId<HTMLElement>("app-layout");
const sidebarPin = byId<HTMLButtonElement>("sidebar-pin");
const heroSubtitle = byId<HTMLParagraphElement>("hero-subtitle");
const panelDemonstrativo = byId<HTMLElement>("panel-demonstrativo");
const panelAlterar = byId<HTMLElement>("panel-alterar");
const actionsDemonstrativo = byId<HTMLElement>("actions-demonstrativo");
const actionsAlterar = byId<HTMLElement>("actions-alterar");

const form = byId<HTMLFormElement>("run-form");
const userInput = byId<HTMLInputElement>("user");
const certPathInput = byId<HTMLInputElement>("cert-path");
const certPasswordInput = byId<HTMLInputElement>("cert-password");
const rememberInput = byId<HTMLInputElement>("remember");
const competenciaInput = byId<HTMLInputElement>("competencia");
const pdfInput = byId<HTMLInputElement>("format-pdf");
const xlsInput = byId<HTMLInputElement>("format-xls");
const checkpointInput = byId<HTMLInputElement>("checkpoint-enabled");
const outDirInput = byId<HTMLInputElement>("out-dir");
const spreadsheetPathInput = byId<HTMLInputElement>("spreadsheet-path");
const headlessInput = byId<HTMLInputElement>("headless");
const alterarOutDirInput = byId<HTMLInputElement>("alterar-out-dir");
const selectOutDirButton = byId<HTMLButtonElement>("select-out-dir");
const selectAlterarOutDirButton = byId<HTMLButtonElement>("select-alterar-out-dir");
const selectCertButton = byId<HTMLButtonElement>("select-cert");
const selectSpreadsheetButton = byId<HTMLButtonElement>("select-spreadsheet");
const forgetButton = byId<HTMLButtonElement>("forget");
const startButton = byId<HTMLButtonElement>("start");
const downloadXmlButton = byId<HTMLButtonElement>("download-xml");
const cancelButton = byId<HTMLButtonElement>("cancel");
const alterarStartButton = byId<HTMLButtonElement>("alterar-start");
const alterarCancelButton = byId<HTMLButtonElement>("alterar-cancel");
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
  throw new Error("A ponte segura da aplicação não carregou. Reinstale usando o instalador mais recente.");
}

window.sefazDia.onLog((message) => appendLog(message));
window.sefazDia.onProgress((progress) => updateProgress(progress));
window.sefazDia.onXmlLog((message) => appendLog(message));
window.sefazDia.onXmlProgress((progress) => updateXmlProgress(progress));
window.sefazDia.onAlterarLog((message) => appendLog(message));
window.sefazDia.onAlterarProgress((progress) => updateAlterarProgress(progress));

void initialize().catch((error) => {
  setStatus(`Falha ao iniciar a interface: ${messageOf(error)}`);
});

document.querySelectorAll<HTMLButtonElement>(".sidebar-item[data-app]").forEach((button) => {
  button.addEventListener("click", () => {
    const appId = button.dataset.app as AppId | undefined;
    if (!appId || state.runningMode) {
      if (state.runningMode) {
        setStatus("Aguarde o fim da execução para trocar de aplicativo.");
      }
      return;
    }
    setActiveApp(appId);
  });
});

sidebarPin.addEventListener("click", () => {
  state.sidebarPinned = !state.sidebarPinned;
  sidebarPin.setAttribute("aria-pressed", String(state.sidebarPinned));
  layoutEl?.classList.toggle("is-sidebar-expanded", state.sidebarPinned);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (state.activeApp === "demonstrativo") {
    void startRun();
  }
});

alterarStartButton.addEventListener("click", () => {
  void startAlterarRun();
});

selectOutDirButton.addEventListener("click", async () => {
  try {
    const selected = await window.sefazDia.selectOutDir();
    if (selected) {
      outDirInput.value = selected;
      setStatus("Pasta de saída selecionada.");
    }
  } catch (error) {
    setStatus(`Não foi possível selecionar a pasta: ${messageOf(error)}`);
  }
});

selectAlterarOutDirButton.addEventListener("click", async () => {
  try {
    const selected = await window.sefazDia.selectOutDir();
    if (selected) {
      alterarOutDirInput.value = selected;
      setStatus("Pasta de saída selecionada.");
    }
  } catch (error) {
    setStatus(`Não foi possível selecionar a pasta: ${messageOf(error)}`);
  }
});

selectCertButton.addEventListener("click", async () => {
  try {
    const selected = await window.sefazDia.selectCert();
    if (selected) {
      certPathInput.value = selected;
      setStatus("Certificado selecionado.");
    }
  } catch (error) {
    setStatus(`Não foi possível selecionar o certificado: ${messageOf(error)}`);
  }
});

selectSpreadsheetButton.addEventListener("click", async () => {
  try {
    const selected = await window.sefazDia.selectSpreadsheet();
    if (selected) {
      spreadsheetPathInput.value = selected;
      setStatus("Planilha selecionada.");
    }
  } catch (error) {
    setStatus(`Não foi possível selecionar a planilha: ${messageOf(error)}`);
  }
});

forgetButton.addEventListener("click", async () => {
  await window.sefazDia.clearCredentials();
  userInput.value = "";
  certPathInput.value = "";
  certPasswordInput.value = "";
  rememberInput.checked = false;
  setStatus("Vínculo e certificado esquecidos.");
});

cancelButton.addEventListener("click", async () => {
  if (state.runningMode === "xml") {
    await window.sefazDia.cancelXmlDownload();
  } else {
    await window.sefazDia.cancelRun();
  }
  setStatus("Cancelamento solicitado. A execução vai parar ao fim da etapa atual.");
});

alterarCancelButton.addEventListener("click", async () => {
  await window.sefazDia.cancelAlterarRun();
  setStatus("Cancelamento solicitado. A execução vai parar ao fim da etapa atual.");
});

downloadXmlButton.addEventListener("click", () => {
  void startXmlDownload();
});

openFolderButton.addEventListener("click", async () => {
  const targetPath =
    state.activeOutDir ||
    state.lastResult?.outDir ||
    state.lastAlterarResult?.outDir ||
    state.lastXmlResult?.outDir;
  if (targetPath) {
    await window.sefazDia.openPath(targetPath);
  }
});

openReportButton.addEventListener("click", async () => {
  const targetPath =
    state.activeExcelPath || state.lastResult?.excelPath || state.lastAlterarResult?.excelPath;
  if (!targetPath || (state.activeProcessedCount === 0 && !state.lastResult && !state.lastAlterarResult)) {
    setStatus("O relatório será criado após o primeiro item processado.");
    return;
  }
  await window.sefazDia.openPath(targetPath);
});

openXmlReportButton.addEventListener("click", async () => {
  const targetPath = state.lastXmlResult?.excelPath || state.activeXmlExcelPath;
  if (!targetPath) {
    setStatus("O relatório XML será criado após o primeiro XML processado.");
    return;
  }
  await window.sefazDia.openPath(targetPath);
});

async function initialize(): Promise<void> {
  const [defaults, credentials] = await Promise.all([window.sefazDia.getDefaults(), window.sefazDia.getCredentials()]);
  competenciaInput.value = defaults.competencia;
  outDirInput.value = defaults.outDir;
  alterarOutDirInput.value = defaults.alterarOutDir;
  headlessInput.checked = defaults.headless;
  userInput.value = credentials.user;
  certPathInput.value = credentials.certPath;
  certPasswordInput.value = credentials.certPassword;
  rememberInput.checked = credentials.remembered;
  setActiveApp("demonstrativo");
  setStatus("Pronto para executar.");
}

function setActiveApp(appId: AppId): void {
  state.activeApp = appId;
  heroSubtitle.textContent = SUBTITLES[appId];

  document.querySelectorAll<HTMLButtonElement>(".sidebar-item[data-app]").forEach((button) => {
    const active = button.dataset.app === appId;
    button.classList.toggle("is-active", active);
    if (active) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  const isDemo = appId === "demonstrativo";
  togglePanel(panelDemonstrativo, isDemo);
  togglePanel(panelAlterar, !isDemo);
  togglePanel(actionsDemonstrativo, isDemo);
  togglePanel(actionsAlterar, !isDemo);

  competenciaInput.required = isDemo;
  outDirInput.required = isDemo;
  spreadsheetPathInput.required = !isDemo;
  alterarOutDirInput.required = !isDemo;

  openXmlReportButton.style.display = isDemo ? "" : "none";
  refreshOutputButtons();
}

function togglePanel(element: HTMLElement, visible: boolean): void {
  element.classList.toggle("is-hidden", !visible);
  if (visible) {
    element.removeAttribute("hidden");
  } else {
    element.setAttribute("hidden", "");
  }
}

async function startRun(): Promise<void> {
  const formats = selectedFormats();
  if (formats.length === 0) {
    setStatus("Selecione ao menos um formato (PDF ou XLS).");
    return;
  }
  resetRunState();
  state.activeOutDir = outDirInput.value.trim();
  setRunning("dia");
  refreshOutputButtons();
  setStatus("Iniciando...");

  try {
    state.lastResult = await window.sefazDia.startRun({
      user: userInput.value,
      certPath: certPathInput.value,
      certPassword: certPasswordInput.value,
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
    setStatus("Execução concluída.");
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
    setStatus("Download dos XMLs concluído.");
  } catch (error) {
    setStatus(messageOf(error));
  } finally {
    setRunning(undefined);
  }
}

async function startAlterarRun(): Promise<void> {
  if (!spreadsheetPathInput.value.trim()) {
    setStatus("Selecione a planilha.");
    return;
  }
  if (!alterarOutDirInput.value.trim()) {
    setStatus("Selecione a pasta de saída.");
    return;
  }

  resetRunState();
  state.activeOutDir = alterarOutDirInput.value.trim();
  setRunning("alterar");
  refreshOutputButtons();
  setStatus("Iniciando alteração de notas...");

  try {
    state.lastAlterarResult = await window.sefazDia.startAlterarRun({
      user: userInput.value,
      certPath: certPathInput.value,
      certPassword: certPasswordInput.value,
      rememberCredentials: rememberInput.checked,
      spreadsheetPath: spreadsheetPathInput.value,
      outDir: alterarOutDirInput.value,
      headless: headlessInput.checked,
    });
    successCount.textContent = String(state.lastAlterarResult.successCount);
    errorCount.textContent = String(state.lastAlterarResult.errorCount);
    totalCount.textContent = String(state.lastAlterarResult.entries.length);
    state.activeExcelPath = state.lastAlterarResult.excelPath;
    openFolderButton.disabled = false;
    openReportButton.disabled = false;
    setStatus("Alteração de notas concluída.");
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

function updateAlterarProgress(progress: AlterarRunProgress): void {
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
  cancelButton.disabled = !running || (mode !== "dia" && mode !== "xml");
  alterarStartButton.disabled = running;
  alterarCancelButton.disabled = !running || mode !== "alterar";
  form.classList.toggle("is-running", running);
  document.querySelectorAll<HTMLButtonElement>(".sidebar-item").forEach((button) => {
    button.disabled = running;
  });
}

function setStatus(message: string): void {
  statusText.textContent = message;
}

function refreshOutputButtons(): void {
  openFolderButton.disabled = !(
    state.activeOutDir ||
    state.lastResult?.outDir ||
    state.lastAlterarResult?.outDir ||
    state.lastXmlResult?.outDir
  );
  openReportButton.disabled = !(
    state.activeExcelPath ||
    state.lastResult?.excelPath ||
    state.lastAlterarResult?.excelPath
  );
  openXmlReportButton.disabled = !(state.activeXmlExcelPath || state.lastXmlResult?.excelPath);
}

function disableUnavailableInterface(): void {
  setStatus("Falha ao carregar a interface segura. Reinstale usando o instalador mais recente.");
  startButton.disabled = true;
  downloadXmlButton.disabled = true;
  cancelButton.disabled = true;
  alterarStartButton.disabled = true;
  alterarCancelButton.disabled = true;
  selectOutDirButton.disabled = true;
  selectAlterarOutDirButton.disabled = true;
  selectCertButton.disabled = true;
  selectSpreadsheetButton.disabled = true;
  forgetButton.disabled = true;
  openFolderButton.disabled = true;
  openReportButton.disabled = true;
  openXmlReportButton.disabled = true;
  appendLog("window.sefazDia não está disponível; preload não carregou.");
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Elemento #${id} não encontrado.`);
  }
  return element as T;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
