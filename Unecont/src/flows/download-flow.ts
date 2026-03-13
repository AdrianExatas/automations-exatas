import path from "node:path";
import type { Download, Page } from "playwright";
import type { Config } from "../config";
import { DownloadError, EmpresaNotFoundError, NoNotasError } from "../exceptions";
import { EmpresaSelectionPage } from "../pages/empresa-selection-page";
import { ServicosTomadosPage } from "../pages/servicos-tomados-page";
import { ensureWorkbookReady } from "../workbook-ready";

export class DownloadFlow {
  private static readonly NO_NOTAS_ALERT_TIMEOUT_MS = 10_000;
  private static readonly WORKBOOK_READY_TIMEOUT_MS = 5_000;
  private static readonly WORKBOOK_READY_POLL_INTERVAL_MS = 250;

  private readonly empresaPage: EmpresaSelectionPage;
  private readonly servicosPage: ServicosTomadosPage;

  constructor(
    private readonly page: Page,
    private readonly config: Config,
  ) {
    this.empresaPage = new EmpresaSelectionPage(page);
    this.servicosPage = new ServicosTomadosPage(page);
  }

  async selectEmpresa(cnpj: string): Promise<void> {
    await this.empresaPage.clickSelecionarEmpresa();
    await this.empresaPage.searchCnpj(cnpj);

    try {
      await this.empresaPage.selectEmpresaByCnpj(cnpj);
    } catch (error) {
      const errMsg = String(error).toLowerCase();
      if (
        errMsg.includes("não encontrado") ||
        errMsg.includes("nao encontrado") ||
        errMsg.includes("not found")
      ) {
        throw new EmpresaNotFoundError("Empresa nao cadastrada no UNECONT", cnpj);
      }
      throw error;
    }
  }

  async navigateToServicosTomados(): Promise<void> {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await this.page.goto(this.config.servicosTomadosUrl, {
          waitUntil: "domcontentloaded",
          timeout: this.config.defaultTimeout * 1000,
        });
        break;
      } catch (error) {
        const msg = (error as Error).message;
        if (msg.includes("ERR_ABORTED") && attempt < 2) continue;
        throw error;
      }
    }

    await this.empresaPage.closeNovidadeModal();
    await this.page.locator("#btDownloadExcel").waitFor({ state: "visible", timeout: 15_000 });
  }

  async downloadReport(cnpj: string, downloadsDir: string, codigo?: string): Promise<string> {
    await this.servicosPage.selectUltimoMes();

    const closed = await this.checkAndCloseNoNotasAlert();
    if (closed) {
      throw new NoNotasError("Nao foram encontradas Nota Fiscais para o periodo informado.", cnpj);
    }

    const downloadPromise = this.page.waitForEvent("download", {
      timeout: this.config.longTimeout * 1000,
    });
    const noNotasAlertPromise = this.waitForAndCloseNoNotasAlert();

    this.servicosPage.clickDownloadExcel();

    let download: Download;
    try {
      const result = await Promise.race([
        downloadPromise.then((d) => ({ type: "download" as const, d })),
        noNotasAlertPromise.then((closedAlert) =>
          closedAlert
            ? ({ type: "no-notas" as const } as const)
            : ({ type: "alert-timeout" as const } as const),
        ),
      ]);

      if (result.type === "no-notas") {
        throw new NoNotasError(
          "Nao foram encontradas Nota Fiscais para o periodo informado.",
          cnpj,
        );
      }

      if (result.type === "alert-timeout") {
        download = await downloadPromise;
      } else {
        download = result.d;
      }
    } catch (error) {
      if (error instanceof NoNotasError) throw error;

      const closedAlert = await this.checkAndCloseNoNotasAlert();
      if (closedAlert) {
        throw new NoNotasError(
          "Nao foram encontradas Nota Fiscais para o periodo informado.",
          cnpj,
        );
      }

      throw new DownloadError(`Download timeout apos ${this.config.longTimeout}s`, downloadsDir, "timeout");
    }

    let baseName = download.suggestedFilename() || `${cnpj}.xlsx`;
    if (!baseName.toLowerCase().endsWith(".xlsx")) baseName += ".xlsx";

    const finalName =
      codigo && !baseName.startsWith(`${codigo} - `) ? `${codigo} - ${baseName}` : baseName;
    const finalPath = path.join(downloadsDir, finalName);

    await download.saveAs(finalPath);

    const failure = await download.failure();
    if (failure) {
      throw new DownloadError(`Download falhou: ${failure}`, finalPath, "download_failure");
    }

    const readiness = await ensureWorkbookReady(finalPath, {
      timeoutMs: DownloadFlow.WORKBOOK_READY_TIMEOUT_MS,
      pollIntervalMs: DownloadFlow.WORKBOOK_READY_POLL_INTERVAL_MS,
    });
    if (!readiness.stable) {
      throw new DownloadError(
        `Download gerou planilha instavel apos ${readiness.attempts} verificacoes`,
        finalPath,
        "workbook_not_ready",
      );
    }

    return finalPath;
  }

  private async waitForAndCloseNoNotasAlert(): Promise<boolean> {
    const alertLocator = this.page
      .locator("div.sweet-alert.visible")
      .filter({ hasText: /não foram encontradas|nao foram encontradas|ops!/i });

    try {
      await alertLocator
        .first()
        .waitFor({ state: "visible", timeout: DownloadFlow.NO_NOTAS_ALERT_TIMEOUT_MS });
      await alertLocator.first().locator("button.confirm").click();
      return true;
    } catch {
      return false;
    }
  }

  private async checkAndCloseNoNotasAlert(): Promise<boolean> {
    return this.page.evaluate(() => {
      const alert = document.querySelector(
        "div.sweet-alert.showSweetAlert.visible, div.sweet-alert.visible",
      );
      if (!alert) return false;

      const text = (alert.textContent ?? "").toLowerCase();
      if (
        !text.includes("não foram encontradas") &&
        !text.includes("nao foram encontradas") &&
        !text.includes("ops!")
      ) {
        return false;
      }

      const button = alert.querySelector("button.confirm");
      if (!button) return false;

      (button as HTMLElement).click();
      return true;
    });
  }
}
