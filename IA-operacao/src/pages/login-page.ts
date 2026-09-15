import type { Page } from "playwright";

export class LoginPage {
  constructor(private readonly page: Page) {}

  async isLoaded(timeout = 10000): Promise<boolean> {
    try {
      await this.page
        .getByRole("button", { name: "Entrar" })
        .waitFor({ state: "visible", timeout });
      return true;
    } catch {
      return false;
    }
  }

  async login(login: string, senha: string): Promise<void> {
    await this.page.getByRole("textbox", { name: "Seu e-mail..." }).fill(login);
    await this.page.getByRole("textbox", { name: "Sua senha" }).fill(senha);
    await this.page.getByRole("button", { name: "Entrar" }).click();
    await this.handleNovidadeModal();
  }

  /**
   * Modal "Programa Indique UneCont": marca checkbox e fecha.
   * O modal pode não aparecer (programa de indicação).
   */
  async handleNovidadeModal(): Promise<void> {
    const checkbox = this.page.locator("#naoAvisarNovamenteProgramaIndicacaoFase02");
    try {
      await checkbox.check({ timeout: 2000 });
    } catch {
      return;
    }
    const closeBtn = this.page.locator(".modal-content button.close[data-dismiss='modal']");
    await closeBtn.click({ timeout: 1000 }).catch(() => {});
  }
}
