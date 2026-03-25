import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.sefaz.ba.gov.br/');
  await page.getByRole('link', { name: 'Inspetoria Eletrônica' }).click();
  await page.getByRole('link', { name: 'Inspetoria Eletrônica' }).press('MediaPlayPause');
  await page.locator('#menu-item-2602').getByRole('link', { name: 'ICMS' }).click();
  await page.getByRole('button', { name: 'Close' }).press('MediaPlayPause');
  await page.getByRole('button', { name: 'Close' }).click();
  await page.locator('#pagamentos').getByText('Pagamentos').click();
  await page.locator('#pagamentos').press('MediaPlayPause');
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Débitos Lançados' }).click();
  const page1 = await page1Promise;
  await page1.locator('#PHConteudo_txtNumeroRenavam').click();
  await page1.locator('#PHConteudo_txtNumeroPaf').click();
  await page1.locator('#PHConteudo_txtNumeroPaf').fill('8100002183242');
  await page1.getByRole('link', { name: ' Aplicar Filtro' }).click();
  await page1.getByTitle('Consultar PAF').click();
  await page1.getByRole('link', { name: ' Emitir DAE' }).click();
  await page1.getByRole('link', { name: ' Emitir DAE' }).click();
  await page1.getByText('×A situação associada ao').click();
});