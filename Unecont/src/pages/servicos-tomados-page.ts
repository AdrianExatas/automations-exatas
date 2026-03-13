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

  async selectUltimoMes(): Promise<void> {
    await this.page.locator("#linkMesAnoReferenciaAnterior").click({ timeout: 5000 });
    await this.page.locator("#btDownloadExcel").waitFor({ state: "visible", timeout: 3000 });
  }

  async clickDownloadExcel(): Promise<void> {
    await this.page.click("#btDownloadExcel");
  }
}
