import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { getEnv } from '../src/schemas/env';
import { NFeImportReceitaFederalPage } from '../src/pages/NFeImportReceitaFederalPage';

test.describe('Importação Receita Federal (certificado)', () => {
  test('abre NFe Import Receita Federal e preenche fluxo de certificado', async ({
    page,
  }) => {
    const env = getEnv();
    const baseUrl = env.ONVIO_BASE_URL;
    const nfePage = new NFeImportReceitaFederalPage(page);

    await test.step('Navegar para NFe Import Receita Federal', async () => {
      await nfePage.goto(baseUrl);
      await expect(page).toHaveURL(new RegExp('manifesto/nfe-import'));
    });

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
