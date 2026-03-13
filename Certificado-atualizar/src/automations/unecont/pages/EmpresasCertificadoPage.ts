import type { Page, Locator } from '@playwright/test';
import { cnpjNaTabelaRegex } from '../utils/cnpj.js';

const EMPRESAS_URL = 'https://app.unecont.com/Contador/Empresas/Default.aspx';

/**
 * Sleep obrigatório após navegar para Empresas: a aplicação demora a renderizar
 * o conteúdo e esperas dinâmicas (waitForSelector, etc.) falham de forma intermitente.
 * Mantido por decisão de projeto; não remover sem validar em ambiente real.
 */
const SLEEP_APOS_GOTO_MS = 1000;

export class EmpresasCertificadoPage {
  readonly #page: Page;

  constructor(page: Page) {
    this.#page = page;
  }

  /**
   * Navega para a página Empresas e aplica o sleep obrigatório após carregamento.
   */
  async goto(): Promise<void> {
    await this.#page.goto(EMPRESAS_URL);
    await this.#page.waitForLoadState('domcontentloaded');
    await new Promise((r) => setTimeout(r, SLEEP_APOS_GOTO_MS));
  }

  getSearchbox(): Locator {
    return this.#page.getByRole('searchbox', { name: 'Pesquise por Cnpj, Nome, Có' });
  }

  async searchByCnpj(cnpjDigits: string): Promise<void> {
    const busca = this.getSearchbox();
    await busca.waitFor({ state: 'visible', timeout: 15_000 });
    await busca.click();
    await busca.click();
    await busca.fill(cnpjDigits);
    await busca.press('Enter');
    await new Promise((r) => setTimeout(r, 1200));
  }

  getRowByCnpj(cnpjDigits: string): Locator {
    const cnpjRegex = cnpjNaTabelaRegex(cnpjDigits);
    return this.#page
      .locator('table tbody tr')
      .filter({
        has: this.#page.locator('td').filter({ hasText: cnpjRegex }),
      })
      .first();
  }

  getCertificadoCell(row: Locator): Locator {
    return row
      .locator('td.tooltipView')
      .filter({
        has: row.locator('i.fa-clock-o, i.fa-check'),
      })
      .or(row.locator('td[onclick*="CarregaDadosModalCertificadoPor"]'))
      .first();
  }

  async clickCertificadoIcon(row: Locator): Promise<void> {
    const certCell = this.getCertificadoCell(row);
    await certCell.click({ timeout: 10_000 });
  }

  async clickTooltipViewManual(): Promise<void> {
    await this.#page.locator('.tooltipView.fa').first().waitFor({ state: 'visible', timeout: 15_000 });
    await this.#page.locator('.tooltipView.fa').first().click();
  }

  async waitAfterModalOpen(): Promise<void> {
    await this.#page.waitForLoadState('networkidle').catch(() => {});
    await new Promise((r) => setTimeout(r, 1200));
  }

  async excluirCertificado(): Promise<void> {
    const linkExcluir = this.#page.getByRole('link', { name: /Excluir/i }).first();
    await linkExcluir.waitFor({ state: 'visible', timeout: 20_000 });
    await linkExcluir.click({ timeout: 10_000 });
  }

  async confirmarExclusao(): Promise<void> {
    const btnConfirmar = this.#page
      .locator('.sweet-alert button.confirm')
      .or(this.#page.getByRole('button', { name: 'Sim, está correto!' }))
      .first();
    await btnConfirmar.waitFor({ state: 'visible', timeout: 15_000 });
    await new Promise((r) => setTimeout(r, 700));
    await btnConfirmar.click({ force: true });
    await this.#page.locator('.sweet-alert').waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => {});
  }

  async clicarIncluirArquivo(): Promise<void> {
    const clicarIncluir = this.#page
      .getByText('Clique aqui para incluir arquivo:', { exact: false })
      .first();
    await clicarIncluir.waitFor({ state: 'visible', timeout: 15_000 });
    await clicarIncluir.click();
  }

  async marcarSimCompetencia(): Promise<void> {
    const radioSim = this.#page
      .getByRole('radio', { name: /Sim/i })
      .or(this.#page.locator('.modal input[type="radio"][value="Sim"]'))
      .first();
    await radioSim.check({ timeout: 3_000 }).catch(() => {});
  }

  async preencherSenhaESalvar(senhaCertificado: string): Promise<void> {
    const senhaInput = this.#page
      .locator('#txtSenhaCertificado')
      .or(this.#page.getByRole('textbox', { name: 'Senha do Certificado', exact: true }))
      .first();
    await senhaInput.waitFor({ state: 'visible', timeout: 10_000 });
    await senhaInput.click();
    await senhaInput.fill(senhaCertificado);
    await this.#page.getByRole('button', { name: /Salvar/i }).click({ timeout: 8_000 });
    await this.#page.waitForLoadState('networkidle').catch(() => {});
    await new Promise((r) => setTimeout(r, 2500));
  }

  async fecharFeedbackOk(): Promise<void> {
    const btnOk = this.#page.getByRole('button', { name: 'OK' });
    await btnOk.waitFor({ state: 'visible', timeout: 20_000 });
    await btnOk.click();
    await this.#page.locator('.sweet-alert').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1000));
  }

  async voltar(): Promise<void> {
    await new Promise((r) => setTimeout(r, 2000));
    await this.#page.getByRole('button', { name: /Voltar/i }).click({ timeout: 3_000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1000));
  }

  async validarCertificadoNaLinha(cnpjDigits: string): Promise<string> {
    const row = this.getRowByCnpj(cnpjDigits);
    await row.waitFor({ state: 'visible', timeout: 10_000 });
    await this.clickCertificadoIcon(row);
    await this.#page.waitForLoadState('networkidle').catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));
    const subjectCert = this.#page
      .locator('.modal.in, .modal.show, [role="dialog"]')
      .getByText(/CN=[^,]+/)
      .first();
    await subjectCert.waitFor({ state: 'visible', timeout: 10_000 });
    const text = await subjectCert.textContent();
    return text ?? '';
  }
}
