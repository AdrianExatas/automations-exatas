import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { formatCnpj } from '../utils/cnpj';

const NFE_IMPORT_PATH = '/br-portal-do-cliente/manifesto/nfe-import';

export class NFeImportReceitaFederalPage {
  readonly #page: Page;
  readonly #toggleFiltersButton: Locator;
  readonly #cnpjInput: Locator;
  readonly #selectionModalConfirm: Locator;
  readonly #disableButton: Locator;
  readonly #fileInput: Locator;
  readonly #dateInput: Locator;
  readonly #formModalSubmitButton: Locator;

  constructor(page: Page) {
    this.#page = page;
    this.#toggleFiltersButton = page.getByTestId(
      'toggle-filters-button-client-enabling-config'
    );
    this.#cnpjInput = page.getByTitle('CNPJ/CPF').locator('input[type="text"]');
    this.#selectionModalConfirm = page.getByTestId(
      'selection-modal-confirm-button'
    );
    this.#disableButton = page.getByRole('button', { name: 'DESABILITAR' });
    this.#fileInput = page.getByRole('dialog').locator('input[type="file"]');
    this.#dateInput = page.getByRole('dialog').getByTestId('input-date');
    this.#formModalSubmitButton = page.getByTestId('form-modal-submit-button');
  }

  async goto(baseUrl: string): Promise<void> {
    await this.#page.goto(`${baseUrl}${NFE_IMPORT_PATH}`);
    await expect(this.#toggleFiltersButton).toBeVisible({ timeout: 15_000 });
  }

  async openFilters(): Promise<void> {
    await expect(this.#toggleFiltersButton).toBeVisible();
    await expect(this.#toggleFiltersButton).toBeEnabled();
    await this.#toggleFiltersButton.click();
  }

  async fillCnpj(cnpj: string): Promise<void> {
    await expect(this.#cnpjInput).toBeVisible();
    await this.#cnpjInput.click();
    await this.#cnpjInput.fill(cnpj);
  }

  async openToggle(cnpj: string): Promise<void> {
    const formattedCnpj = formatCnpj(cnpj);
    const toggleInRow = this.#page
      .getByRole('row')
      .filter({ hasText: formattedCnpj })
      .first()
      .getByTestId('my-toggle');
    await expect(toggleInRow).toBeVisible();
    await toggleInRow.click();
  }

  async confirmSelection(): Promise<void> {
    const btn = this.#selectionModalConfirm;
    try {
      await btn.waitFor({ state: 'visible', timeout: 5_000 });
      await expect(btn).toBeEnabled();
      await btn.click();
    } catch {
      // Modal de seleção pode não aparecer
    }
  }

  async disableIfModalAppears(cnpj: string): Promise<void> {
    try {
      await this.#disableButton.waitFor({ state: 'visible', timeout: 3_000 });
      await this.#disableButton.click();
      await this.#page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 10_000 });
      const formattedCnpj = formatCnpj(cnpj);
      const row = this.#page.getByRole('row').filter({ hasText: formattedCnpj }).first();
      await expect(row).toContainText('Desabilitado', { timeout: 10_000 });
    } catch {
      // Modal de desabilitar não apareceu (cliente já estava desabilitado)
    }
  }

  async setCertificateFile(absolutePath: string): Promise<void> {
    await expect(this.#fileInput).toBeVisible({ timeout: 5_000 });
    await this.#fileInput.setInputFiles(absolutePath);
  }

  /** Preenche a data inicial com hoje no formato DD/MM/AAAA. */
  async fillInitialImportDate(): Promise<void> {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}/${month}/${year}`;
    await expect(this.#dateInput).toBeVisible({ timeout: 10_000 });
    await this.#dateInput.fill(dateStr);
  }

  async fillCertificatePassword(password: string): Promise<void> {
    const passwordField = this.#page
      .getByRole('textbox', { name: 'Senha' })
      .or(this.#page.locator('input[type="password"]'))
      .last();
    await expect(passwordField).toBeVisible({ timeout: 10_000 });
    await passwordField.click();
    await passwordField.fill(password);
  }

  async submitForm(): Promise<void> {
    await expect(this.#formModalSubmitButton).toBeVisible();
    await expect(this.#formModalSubmitButton).toBeEnabled();
    await this.#formModalSubmitButton.click();
  }

  async runImportFlow(params: {
    cnpj: string;
    pfxPath: string;
    pfxPassword: string;
  }): Promise<void> {
    const { cnpj, pfxPath, pfxPassword } = params;

    await this.openFilters();
    await this.fillCnpj(cnpj);
    await this.openToggle(cnpj);
    await this.disableIfModalAppears(cnpj);
    try {
      await this.#fileInput.waitFor({ state: 'visible', timeout: 3_000 });
    } catch {
      await this.openToggle(cnpj);
    }
    await this.setCertificateFile(pfxPath);
    await this.fillInitialImportDate();
    await this.fillCertificatePassword(pfxPassword);
    await this.submitForm();
  }
}
