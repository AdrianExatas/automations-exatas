import type { Locator, Page } from "playwright";

function normalizeCnpj(cnpj: string): string {
  return cnpj.replace(/[./\-]/g, "");
}

function formatTaxId(raw: string): string {
  const digits = normalizeCnpj(raw);
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }
  return raw;
}

export class EmpresaSelectionPage {
  private static readonly LIST_LOAD_TIMEOUT_MS = 15_000;
  private static readonly MODAL_CLICK_TIMEOUT_MS = 2_000;

  constructor(private readonly page: Page) {}

  private get selectionModal(): Locator {
    return this.page.locator("#modalSelecionaParceiroEmpresaSelecao");
  }

  private get searchInput(): Locator {
    return this.selectionModal
      .locator("input[type='search']:visible, #txtBuscaConteudoMenuLateral:visible")
      .first();
  }

  private async waitForSelectionModal(timeout: number): Promise<void> {
    await this.selectionModal.waitFor({
      state: "visible",
      timeout,
    });
  }

  private async openSelectionModalWithFallback(): Promise<void> {
    await this.page
      .locator(
        "#LeftSideBarControl_divEmpresaSelecionadaPrincipal button.btSelecionaParceiroEmpresa",
      )
      .click();

    try {
      await this.waitForSelectionModal(EmpresaSelectionPage.MODAL_CLICK_TIMEOUT_MS);
      return;
    } catch {
      await this.page.evaluate(() => {
        const opener = (
          window as typeof window & {
            ExibeModalSelecionaParceiroEmpresaMenuLateral?: () => void;
          }
        ).ExibeModalSelecionaParceiroEmpresaMenuLateral;

        if (typeof opener !== "function") {
          throw new Error("Funcao de abertura do modal de empresas nao encontrada");
        }

        opener();
      });
    }

    await this.waitForSelectionModal(EmpresaSelectionPage.LIST_LOAD_TIMEOUT_MS);
  }

  async closeNovidadeModal(): Promise<void> {
    const checkbox = this.page.locator("#naoAvisarNovamenteProgramaIndicacaoFase02");
    try {
      await checkbox.check({ timeout: 1000 });
    } catch {
      // O modal pode aparecer sem checkbox clicavel; ainda assim precisa sair da frente.
    }
    const closeBtn = this.page
      .locator("#novidadeProgramaIndicacaoFase02 button.close[data-dismiss='modal']")
      .first();
    await closeBtn.click({ timeout: 1000 }).catch(() => {});
    await this.page.evaluate(() => {
      if (typeof document === "undefined") return;
      const modal = document.querySelector("#novidadeProgramaIndicacaoFase02");
      if (modal) modal.remove();
      const body = document.body;
      if (!body) return;
      document.querySelectorAll(".modal-backdrop").forEach((backdrop: Element) => backdrop.remove());
      body.classList.remove("modal-open");
      body.style.overflow = "";
      body.style.paddingRight = "";
    });
  }

  private async clearOverlays(): Promise<void> {
    await this.page.evaluate(() => {
      if (typeof document === "undefined") return;
      const body = document.body;
      if (!body) return;
      document.querySelectorAll(".modal-backdrop").forEach((backdrop: Element) => backdrop.remove());
      body.classList.remove("modal-open");
      body.style.overflow = "";
      body.style.paddingRight = "";
    });
  }

  async clickSelecionarEmpresa(): Promise<void> {
    await this.closeNovidadeModal();
    await this.clearOverlays();

    await this.openSelectionModalWithFallback();
    await this.searchInput.waitFor({
      state: "visible",
      timeout: EmpresaSelectionPage.LIST_LOAD_TIMEOUT_MS,
    });
  }

  async closeSelectionModal(): Promise<void> {
    const closeButton = this.page.locator(
      "#modalSelecionaParceiroEmpresaSelecao button.close[data-dismiss='modal']",
    );
    await closeButton.click({ timeout: 1000 }).catch(() => {});
    await this.clearOverlays();
  }

  async searchCnpj(cnpj: string): Promise<void> {
    const input = this.searchInput;
    const normalized = normalizeCnpj(cnpj);
    await input.click();
    await input.fill("");
    await input.type(normalized, { delay: 20 });
    await input.press("Enter");
    await this.page.evaluate((value) => {
      const input = document.querySelector<HTMLInputElement>(
        "#modalSelecionaParceiroEmpresaSelecao #txtBuscaConteudoMenuLateral",
      );
      if (!input) return;

      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));

      const filter = (
        window as typeof window & {
          FiltraEmpresaSelecaoMenuLateral?: () => void;
        }
      ).FiltraEmpresaSelecaoMenuLateral;
      if (typeof filter === "function") {
        filter();
      }
    }, normalized);
  }

  async selectEmpresaByCnpj(cnpj: string): Promise<void> {
    await this.closeNovidadeModal();

    const formatted = formatTaxId(cnpj);
    const cell = this.page.locator("td.text-nowrap").filter({ hasText: formatted });
    const emptyResultsAlert = this.page
      .locator("#modalSelecionaParceiroEmpresaSelecao div.alert.alert-warning")
      .filter({ hasText: /não há dados a serem exibidos|nao ha dados a serem exibidos/i });

    try {
      const result = await Promise.race([
        cell
          .first()
          .waitFor({
            state: "visible",
            timeout: EmpresaSelectionPage.LIST_LOAD_TIMEOUT_MS,
          })
          .then(() => "cell" as const),
        emptyResultsAlert
          .first()
          .waitFor({
            state: "visible",
            timeout: EmpresaSelectionPage.LIST_LOAD_TIMEOUT_MS,
          })
          .then(() => "empty" as const),
      ]);

      if (result === "empty") {
        await this.closeSelectionModal();
        throw new Error(`CNPJ não encontrado nos resultados: ${cnpj}`);
      }

      await cell.first().click();
    } catch {
      await this.closeSelectionModal();
      throw new Error(`CNPJ não encontrado nos resultados: ${cnpj}`);
    }
  }
}
