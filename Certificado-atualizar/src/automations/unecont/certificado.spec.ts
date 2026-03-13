import { test, expect } from '@playwright/test';
import { getEnv } from './schemas/env.js';
import { onlyDigits } from './utils/cnpj.js';
import { UnecontLoginPage } from './pages/UnecontLoginPage.js';
import { EmpresasCertificadoPage } from './pages/EmpresasCertificadoPage.js';

/**
 * Teste: atualizar certificado na UNECONT.
 * Exige UNECONT_CNPJ (14 dígitos) e UNECONT_PFX_PASSWORD no .env; caso contrário o teste é ignorado.
 */
test('UNECONT atualizar certificado', async ({ page }) => {
  const env = getEnv();
  const {
    UNECONT_EMAIL,
    UNECONT_PASSWORD,
    UNECONT_CNPJ,
    UNECONT_PFX_PASSWORD,
    UNECONT_SELECAO_MANUAL,
  } = env;

  const cnpjDigits = onlyDigits(UNECONT_CNPJ);
  if (cnpjDigits.length < 14 || !UNECONT_PFX_PASSWORD) {
    test.skip();
    return;
  }

  const login = new UnecontLoginPage(page);
  await login.goto();
  await login.fillEmail(UNECONT_EMAIL);
  await login.fillPassword(UNECONT_PASSWORD);
  await login.submit();
  await login.waitForRedirect();
  await login.closeIndicacaoModal();

  const empresas = new EmpresasCertificadoPage(page);
  await empresas.goto();

  await test.step('Pesquisar por CNPJ', async () => {
    await empresas.searchByCnpj(cnpjDigits);
  });

  if (UNECONT_SELECAO_MANUAL) {
    await test.step('Clicar em .tooltipView.fa (abre modal)', async () => {
      await empresas.clickTooltipViewManual();
    });
  } else {
    await test.step('Clicar no ícone do certificado da empresa (validar CNPJ)', async () => {
      const row = empresas.getRowByCnpj(cnpjDigits);
      await row.waitFor({ state: 'visible', timeout: 15_000 });
      await empresas.clickCertificadoIcon(row);
    });
  }

  await empresas.waitAfterModalOpen();

  await test.step('Excluir certificado atual', async () => {
    await empresas.excluirCertificado();
  });

  await test.step('Confirmar exclusão (Sim, está correto!)', async () => {
    await empresas.confirmarExclusao();
  });

  await new Promise((r) => setTimeout(r, 800));

  await test.step('Clique aqui para incluir arquivo', async () => {
    await empresas.clicarIncluirArquivo();
    if (UNECONT_SELECAO_MANUAL) {
      await page.pause();
    }
  });

  await test.step('Marcar Sim (competência)', async () => {
    await empresas.marcarSimCompetencia();
  });

  await test.step('Preencher senha e salvar', async () => {
    await empresas.preencherSenhaESalvar(UNECONT_PFX_PASSWORD);
  });

  await test.step('Fechar feedback (OK)', async () => {
    await empresas.fecharFeedbackOk();
  });

  await test.step('Validar que o certificado foi atualizado', async () => {
    await empresas.voltar();
    const subjectText = await empresas.validarCertificadoNaLinha(cnpjDigits);
    expect(
      subjectText,
      'O certificado salvo deve ser o da empresa: subject (CN=...) deve conter o CNPJ ' + cnpjDigits
    ).toContain(cnpjDigits);
  });
});
