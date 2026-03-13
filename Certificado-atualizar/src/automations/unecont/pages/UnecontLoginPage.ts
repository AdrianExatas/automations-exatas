import type { Page } from '@playwright/test';

const LOGIN_URL = 'https://app.unecont.com/_login/Login.aspx';

export class UnecontLoginPage {
  readonly #page: Page;

  constructor(page: Page) {
    this.#page = page;
  }

  async goto(): Promise<void> {
    await this.#page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
  }

  async fillEmail(email: string): Promise<void> {
    await this.#page.getByRole('textbox', { name: 'Seu e-mail...' }).click();
    await this.#page.getByRole('textbox', { name: 'Seu e-mail...' }).fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.#page.getByRole('textbox', { name: 'Sua senha' }).click();
    await this.#page.getByRole('textbox', { name: 'Sua senha' }).fill(password);
  }

  async submit(): Promise<void> {
    await this.#page.getByRole('button', { name: 'Entrar' }).click();
  }

  async waitForRedirect(): Promise<void> {
    await this.#page.waitForURL('**/Contador/**', { timeout: 20_000 });
  }

  /**
   * Fecha o modal "Programa Indique UneCont": marca "Não exibir este aviso" e fecha (ou só fecha).
   */
  async closeIndicacaoModal(): Promise<void> {
    const timeout = 5000;
    try {
      const naoExibir = this.#page.getByText('Não exibir este aviso');
      await naoExibir.click({ timeout });
      await this.#page.locator('#naoAvisarNovamenteProgramaIndicacaoFase02').check({ timeout: 2000 });
    } catch {
      // Checkbox ou texto não encontrado, tenta só fechar
    }
    const fechar = this.#page
      .getByRole('button', { name: /Fechar|×/i })
      .or(this.#page.locator('.modal .close, .btn-close').first());
    await fechar.click({ timeout }).catch(() => {});
  }
}
