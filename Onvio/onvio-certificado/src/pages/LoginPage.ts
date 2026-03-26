import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';

const LOGIN_URL_PATH = '/login/#/';

export class LoginPage {
  readonly #page: Page;
  readonly #emailInput: Locator;
  readonly #passwordInput: Locator;
  readonly #entrarButton: Locator;

  constructor(page: Page) {
    this.#page = page;
    this.#emailInput = page.getByRole('textbox', { name: 'E-mail' });
    this.#passwordInput = page.getByRole('textbox', { name: 'Senha' });
    this.#entrarButton = page.getByRole('button', { name: 'Entrar' });
  }

  async goto(baseUrl: string): Promise<void> {
    await this.#page.goto(`${baseUrl}${LOGIN_URL_PATH}`);
    await this.#waitUntilReady();
  }

  async #waitUntilReady(): Promise<void> {
    await this.#entrarButton.waitFor({ state: 'visible' });
    await this.#page.waitForLoadState('domcontentloaded');
  }

  async clickEntrar(): Promise<void> {
    await expect(this.#entrarButton).toBeVisible();
    await expect(this.#entrarButton).toBeEnabled();
    await this.#entrarButton.click();
  }

  async fillEmail(email: string): Promise<void> {
    await expect(this.#emailInput).toBeVisible();
    await this.#emailInput.click();
    await this.#emailInput.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await expect(this.#passwordInput).toBeVisible();
    await this.#passwordInput.fill(password);
  }

  async submitEmail(): Promise<void> {
    await this.#emailInput.press('Enter');
  }

  async submitPassword(): Promise<void> {
    await this.#passwordInput.press('Enter');
  }

  async login(email: string, password: string): Promise<void> {
    await this.clickEntrar();
    await this.fillEmail(email);
    await this.submitEmail();
    await this.clickEntrar();
    await this.fillPassword(password);
    await this.clickEntrar();
  }

  async waitForLoginSuccess(nextUrlPattern: string | RegExp): Promise<void> {
    await this.#page.waitForURL(nextUrlPattern, { timeout: 30_000 });
  }
}
