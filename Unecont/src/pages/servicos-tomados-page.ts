import type { Page } from "playwright";

export class ServicosTomadosPage {
  constructor(private readonly page: Page) {}

  async isLoaded(timeout = 5000): Promise<boolean> {
    try {
      await this.page.waitForSelector("#btDownloadExcel", { timeout });
      return true;
    } catch {
      return false;
    }
  }

  /** Texto da pagina usado para validar Empresa: CODIGO - CNPJ - NOME. */
  async getPageIdentityText(): Promise<string> {
    return this.page.evaluate(() => document.body?.innerText ?? "");
  }

  async selectUltimoMes(): Promise<void> {
    await this.page.locator("#linkMesAnoReferenciaAnterior").click({ timeout: 5000, force: true });
    await this.page.locator("#Loading_modalLoading").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
    await this.page.locator("#btDownloadExcel").waitFor({ state: "visible", timeout: 5000 });
  }

  async clickDownloadExcel(): Promise<void> {
    await this.page.locator("#Loading_modalLoading").waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
    await this.page.locator("#btDownloadExcel").click({ force: true });
  }
}
