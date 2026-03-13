import type { Page } from "playwright";

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

  constructor(private readonly page: Page) {}

  async closeNovidadeModal(): Promise<void> {
    const checkbox = this.page.locator("#naoAvisarNovamenteProgramaIndicacaoFase02");
    try {
      await checkbox.check({ timeout: 1000 });
    } catch {
      return;
    }
    const closeBtn = this.page.locator(".modal-content button.close[data-dismiss='modal']");
    await closeBtn.click({ timeout: 1000 }).catch(() => {});
  }

  private async clearOverlays(): Promise<void> {
    await this.page.evaluate(() => {
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

    await this.page
      .locator(
        "#LeftSideBarControl_divEmpresaSelecionadaPrincipal button.btSelecionaParceiroEmpresa",
      )
      .click();
    await this.page
      .getByPlaceholder("Pesquise por Cnpj/Cpf, Razão")
      .waitFor({ state: "visible", timeout: EmpresaSelectionPage.LIST_LOAD_TIMEOUT_MS });
  }

  async closeSelectionModal(): Promise<void> {
    const closeButton = this.page.locator(
      "#modalSelecionaParceiroEmpresaSelecao button.close[data-dismiss='modal']",
    );
    await closeButton.click({ timeout: 1000 }).catch(() => {});
    await this.clearOverlays();
  }

  async searchCnpj(cnpj: string): Promise<void> {
    const input = this.page.getByPlaceholder("Pesquise por Cnpj/Cpf, Razão");
    await input.fill(normalizeCnpj(cnpj));
    await input.press("Enter");
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
