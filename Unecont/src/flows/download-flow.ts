import path from "node:path";
import fs from "node:fs";
import type { Download, Page } from "playwright";
import type { Config } from "../config";
import { DownloadError, EmpresaNotFoundError, NoNotasError } from "../exceptions";
import {
  matchEmpresaFileIdentity,
  matchEmpresaUiIdentity,
} from "../empresa-file-identity";
import { EmpresaSelectionPage } from "../pages/empresa-selection-page";
import { ServicosTomadosPage } from "../pages/servicos-tomados-page";
import { ensureWorkbookReady } from "../workbook-ready";

export class DownloadFlow {
  private static readonly NO_NOTAS_ALERT_TIMEOUT_MS = 20_000;
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

  /** Fecha SweetAlert/overlays que bloqueiam o clique na troca de empresa. */
  async dismissBlockingDialogs(): Promise<boolean> {
    const closedNoNotas = await this.checkAndCloseNoNotasAlert();
    await this.page.evaluate(() => {
      for (const overlay of Array.from(document.querySelectorAll(".sweet-overlay"))) {
        (overlay as HTMLElement).style.display = "none";
        overlay.remove();
      }
      for (const alert of Array.from(document.querySelectorAll("div.sweet-alert"))) {
        const el = alert as HTMLElement;
        el.style.display = "none";
        el.classList.remove("visible", "showSweetAlert");
        // Evita falso positivo: texto "Ops!" permanece no DOM apos fechar.
        for (const node of Array.from(el.querySelectorAll("h2, p.lead, p"))) {
          node.textContent = "";
        }
      }
      const loading = document.querySelector("#Loading_modalLoading, .modalLoading");
      if (loading) {
        (loading as HTMLElement).style.display = "none";
        loading.classList.remove("in", "show");
      }
      for (const id of ["modalNovidadeIntegracaoDominio", "novidadeProgramaIndicacaoFase02"]) {
        const modal = document.querySelector(`#${id}`);
        if (modal) modal.remove();
      }
      document.querySelectorAll(".modal-backdrop").forEach((backdrop) => backdrop.remove());
      document.body?.classList.remove("modal-open");
    });
    return closedNoNotas;
  }

  async selectEmpresa(cnpj: string): Promise<void> {
    await this.dismissBlockingDialogs();
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
    await this.dismissBlockingDialogs();
    await this.page.locator("#btDownloadExcel").waitFor({ state: "visible", timeout: 15_000 });
  }

  /** Garante que a empresa aberta no Unecont e a da planilha (CNPJ/codigo). */
  async assertSelectedEmpresa(cnpj: string, codigo?: string): Promise<void> {
    const headerText = await this.servicosPage.getPageIdentityText();
    const match = matchEmpresaUiIdentity(headerText, { cnpj, codigo });
    if (!match.ok) {
      await this.dismissBlockingDialogs();
      throw new DownloadError(match.reason, undefined, "identity_mismatch");
    }
  }

  async downloadReport(
    cnpj: string,
    downloadsDir: string,
    codigo?: string,
    empresaNome?: string,
  ): Promise<string> {
    await this.empresaPage.closeNovidadeModal();
    await this.dismissBlockingDialogs();
    await this.assertSelectedEmpresa(cnpj, codigo);
    await this.servicosPage.selectUltimoMes();
    await this.waitForLoadingGone(this.config.longTimeout * 1000);

    if (await this.checkAndCloseNoNotasAlert()) {
      throw new NoNotasError("Nao foram encontradas Nota Fiscais para o periodo informado.", cnpj);
    }

    // Grade vazia no periodo = sem notas (o SweetAlert as vezes ja fecha com display:none).
    if (await this.pageHasEmptyNotasGrid()) {
      await this.dismissBlockingDialogs();
      throw new NoNotasError("Nao foram encontradas Nota Fiscais para o periodo informado.", cnpj);
    }

    // Revalida apos troca de mes (troca de contexto nao pode mudar a empresa).
    await this.assertSelectedEmpresa(cnpj, codigo);

    // Loading + SweetAlert "Ops!" costumam aparecer depois do timeout curto do download.
    const downloadTimeoutMs = this.config.longTimeout * 1000;
    const graceMs = 20_000;
    const totalWaitMs = downloadTimeoutMs + graceMs;

    const downloadPromise = this.page.waitForEvent("download", { timeout: totalWaitMs });
    const noNotasAlertPromise = this.waitForAndCloseNoNotasAlert(totalWaitMs);

    await this.servicosPage.clickDownloadExcel();

    let download: Download;
    try {
      const result = await Promise.race([
        downloadPromise.then(
          (d) => ({ type: "download" as const, d }),
          async (error) => {
            await this.waitForLoadingGone(graceMs);
            if (await this.closeVisibleSweetAlertAsNoNotas() || await this.pageHasEmptyNotasGrid()) {
              return { type: "no-notas" as const } as const;
            }
            throw error;
          },
        ),
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
        await this.waitForLoadingGone(graceMs);
        if (await this.closeVisibleSweetAlertAsNoNotas() || await this.pageHasEmptyNotasGrid()) {
          throw new NoNotasError(
            "Nao foram encontradas Nota Fiscais para o periodo informado.",
            cnpj,
          );
        }
        download = await downloadPromise.catch(async (error) => {
          await this.waitForLoadingGone(5_000);
          if (await this.closeVisibleSweetAlertAsNoNotas() || await this.pageHasEmptyNotasGrid()) {
            throw new NoNotasError(
              "Nao foram encontradas Nota Fiscais para o periodo informado.",
              cnpj,
            );
          }
          throw error;
        });
      } else {
        download = result.d;
      }
    } catch (error) {
      if (error instanceof NoNotasError) throw error;
      if (error instanceof DownloadError) throw error;

      await this.waitForLoadingGone(10_000);
      if (await this.closeVisibleSweetAlertAsNoNotas() || await this.pageHasEmptyNotasGrid()) {
        throw new NoNotasError(
          "Nao foram encontradas Nota Fiscais para o periodo informado.",
          cnpj,
        );
      }

      await this.dismissBlockingDialogs();
      throw new DownloadError(`Download timeout apos ${this.config.longTimeout}s`, downloadsDir, "timeout");
    }

    let baseName = download.suggestedFilename() || `${cnpj}.xlsx`;
    if (!baseName.toLowerCase().endsWith(".xlsx")) baseName += ".xlsx";

    if (!empresaNome?.trim()) {
      throw new DownloadError(
        "Nome da empresa ausente; recusa salvar download sem validacao de identidade.",
        downloadsDir,
        "identity_mismatch",
      );
    }

    const identity = matchEmpresaFileIdentity(baseName, empresaNome);
    if (!identity.ok) {
      throw new DownloadError(identity.reason, downloadsDir, "identity_mismatch");
    }

    const finalName =
      codigo && !baseName.startsWith(`${codigo} - `) ? `${codigo} - ${baseName}` : baseName;
    const finalPath = path.join(downloadsDir, finalName);

    await download.saveAs(finalPath);

    const failure = await download.failure();
    if (failure) {
      this.safeUnlink(finalPath);
      throw new DownloadError(`Download falhou: ${failure}`, finalPath, "download_failure");
    }

    // Revalida o nome final gravado (inclui prefixo de codigo).
    const savedIdentity = matchEmpresaFileIdentity(path.basename(finalPath), empresaNome);
    if (!savedIdentity.ok) {
      this.safeUnlink(finalPath);
      throw new DownloadError(savedIdentity.reason, finalPath, "identity_mismatch");
    }

    const readiness = await ensureWorkbookReady(finalPath, {
      timeoutMs: DownloadFlow.WORKBOOK_READY_TIMEOUT_MS,
      pollIntervalMs: DownloadFlow.WORKBOOK_READY_POLL_INTERVAL_MS,
    });
    if (!readiness.stable) {
      this.safeUnlink(finalPath);
      throw new DownloadError(
        `Download gerou planilha instavel apos ${readiness.attempts} verificacoes`,
        finalPath,
        "workbook_not_ready",
      );
    }

    return finalPath;
  }

  private safeUnlink(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // Melhor falhar o item do que deixar arquivo trocado no lote.
    }
  }

  private async pageHasEmptyNotasGrid(): Promise<boolean> {
    return this.page.evaluate(() => {
      const text = (document.body?.innerText ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return text.includes("nao ha dados a serem exibidos");
    });
  }

  private async waitForLoadingGone(timeoutMs: number): Promise<void> {
    const loading = this.page.locator("#Loading_modalLoading");
    try {
      const visible = await loading.isVisible().catch(() => false);
      if (!visible) return;
      await loading.waitFor({ state: "hidden", timeout: timeoutMs });
    } catch {
      // Força remoção se o loading travar na frente do SweetAlert.
      await this.page.evaluate(() => {
        const el = document.querySelector("#Loading_modalLoading, .modalLoading") as HTMLElement | null;
        if (!el) return;
        el.style.display = "none";
        el.classList.remove("in", "show");
      });
    }
  }

  private async waitForAndCloseNoNotasAlert(timeoutMs = DownloadFlow.NO_NOTAS_ALERT_TIMEOUT_MS): Promise<boolean> {
    const alertLocator = this.page
      .locator("div.sweet-alert.showSweetAlert.visible, div.sweet-alert.visible, div.sweet-alert.showSweetAlert")
      .filter({ hasText: /n[aã]o foram encontradas|ops!/i });

    try {
      await alertLocator
        .first()
        .waitFor({ state: "visible", timeout: timeoutMs });
      const confirm = alertLocator.first().locator("button.confirm");
      await confirm.click({ timeout: 5_000, force: true });
      await this.page.locator(".sweet-overlay").first().waitFor({ state: "hidden", timeout: 3_000 }).catch(() => undefined);
      await this.dismissBlockingDialogs();
      return true;
    } catch {
      return this.closeVisibleSweetAlertAsNoNotas();
    }
  }

  /** Fecha SweetAlert de "sem notas" mesmo se ja estiver com display:none no DOM. */
  private async closeVisibleSweetAlertAsNoNotas(): Promise<boolean> {
    if (await this.checkAndCloseNoNotasAlert()) return true;
    return false;
  }

  private async checkAndCloseNoNotasAlert(): Promise<boolean> {
    return this.page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll("div.sweet-alert")) as HTMLElement[];

      for (const alert of alerts) {
        const style = window.getComputedStyle(alert);
        const text = (alert.textContent ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const isNoNotas =
          text.includes("nao foram encontradas") ||
          text.includes("nota fiscais para o periodo") ||
          (text.includes("ops!") && text.includes("periodo"));

        const visiblyShown =
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          (alert.classList.contains("visible") ||
            alert.classList.contains("showSweetAlert") ||
            alert.style.display === "block");

        if (!isNoNotas) continue;

        if (!visiblyShown) {
          // Texto residual no DOM apos o Unecont auto-fechar — so limpa.
          for (const node of Array.from(alert.querySelectorAll("h2, p.lead, p"))) {
            node.textContent = "";
          }
          continue;
        }

        const button = alert.querySelector("button.confirm") as HTMLElement | null;
        if (button) button.click();
        alert.style.display = "none";
        alert.classList.remove("visible", "showSweetAlert");
        for (const node of Array.from(alert.querySelectorAll("h2, p.lead, p"))) {
          node.textContent = "";
        }
        for (const overlay of Array.from(document.querySelectorAll(".sweet-overlay"))) {
          (overlay as HTMLElement).style.display = "none";
          overlay.remove();
        }
        return true;
      }
      return false;
    });
  }
}
