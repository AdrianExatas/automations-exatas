import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { getEnv } from './schemas/env';
import { LoginPage } from './pages/LoginPage';
import { NFeImportReceitaFederalPage } from './pages/NFeImportReceitaFederalPage';

test.describe('Importação Receita Federal (certificado)', () => {
  test('abre NFe Import Receita Federal e preenche fluxo de certificado', async ({
    page,
  }) => {
    const env = getEnv();
    const baseUrl = env.ONVIO_BASE_URL;

    await test.step('Fazer login no ONVIO', async () => {
      const loginPage = new LoginPage(page);
      await loginPage.goto(baseUrl);
      await loginPage.login(env.ONVIO_EMAIL, env.ONVIO_PASSWORD);
      await loginPage.waitForLoginSuccess(/\/staff\/|portal-do-cliente|onvio\.com\.br\/br-/);
    });

    await test.step('Navegar para NFe Import Receita Federal', async () => {
      const nfePage = new NFeImportReceitaFederalPage(page);
      await nfePage.goto(baseUrl);
      await expect(page).toHaveURL(new RegExp('manifesto/nfe-import'));
    });

    const nfePage = new NFeImportReceitaFederalPage(page);

    await test.step('Preencher filtros, certificado e enviar', async () => {
      await nfePage.runImportFlow({
        cnpj: env.ONVIO_CNPJ,
        pfxPath: env.ONVIO_PFX_PATH,
        pfxPassword: env.ONVIO_PFX_PASSWORD,
      });
    });

    await test.step('Verificar que o fluxo foi acionado (modal submetido ou feedback visível)', async () => {
      await expect(
        page.getByTestId('form-modal-submit-button')
      ).not.toBeVisible({ timeout: 15_000 });
    });
  });
});
