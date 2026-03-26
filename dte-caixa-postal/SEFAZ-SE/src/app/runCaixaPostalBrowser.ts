import { access } from 'node:fs/promises';

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from 'playwright-core';

import { buildCompanyArtifacts, buildErrorArtifacts, type CollectCaixaPostalDataResult } from './caixaPostalDomain';
import {
  extractCompanies,
  extractLidosTabUrl,
  extractOccurrencesPage,
  normalizeComparableText,
  type CompanyLink,
  type Occurrence,
  type OccurrenceSource,
} from './sefazPortalParsers';
import type { RunCallbacks, RunLogEntry, RunOptions } from './types';

const LOGIN_URL = 'https://www.sefaz.se.gov.br/SitePages/acesso_usuario.aspx';
const CERTIFICATE_ORIGINS = [
  'https://security.sefaz.se.gov.br',
  'https://security.sefaz.se.gov.br:443',
];

export async function runCaixaPostalBrowser(
  options: RunOptions,
  callbacks: RunCallbacks,
  referenceDate: Date,
): Promise<CollectCaixaPostalDataResult> {
  await validateBrowserOptions(options);

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    browser = await launchChrome(options);
    context = await createSefazContext(browser, options);

    const page = await context.newPage();
    page.setDefaultTimeout(20_000);

    emitLog(callbacks, 'info', 'Autenticando no portal da SEFAZ com certificado digital via browser.');
    await accessPortalWithCertificate(page, options.certificateUser);
    await openCompanyList(page);

    const companies = extractCompanies(await page.content(), page.url());
    if (companies.length === 0) {
      throw new Error('Nenhuma empresa foi encontrada na lista da Caixa Postal.');
    }

    emitLog(callbacks, 'info', `${companies.length} empresa(s) localizada(s) para processamento.`);

    const rows = [];
    const failures = [];
    const messages = [];

    for (const [index, company] of companies.entries()) {
      const processed = index + 1;
      callbacks.onProgress?.({
        current: processed,
        total: companies.length,
        companyId: company.identificacao,
        companyName: company.razaoSocial,
      });
      emitLog(
        callbacks,
        'info',
        `[${processed}/${companies.length}] Processando ${company.identificacao} - ${company.razaoSocial}`,
      );

      try {
        const { unreadMessages, readMessages } = await collectCompanyMessages(page, company);
        const artifacts = buildCompanyArtifacts(company, unreadMessages, readMessages, referenceDate);
        rows.push(artifacts.row);
        messages.push(...artifacts.messages);
      } catch (error) {
        const artifacts = buildErrorArtifacts(company, formatError(error));
        rows.push(artifacts.row);
        failures.push(artifacts.failure);
        emitLog(
          callbacks,
          'error',
          `Falha ao processar ${company.identificacao} via browser: ${artifacts.failure.erro}`,
        );
      } finally {
        await returnToCompanyList(page, company.identificacao);
      }
    }

    return {
      rows,
      failures,
      messages,
      processed: companies.length,
    };
  } finally {
    await context?.close();
    await browser?.close();
  }
}

async function validateBrowserOptions(options: RunOptions): Promise<void> {
  try {
    await access(options.certificatePath);
  } catch {
    throw new Error(`Certificado .pfx nao encontrado no caminho configurado: ${options.certificatePath}`);
  }
}

async function launchChrome(options: RunOptions): Promise<Browser> {
  try {
    return await chromium.launch({
      channel: options.chromeChannel,
      headless: false,
    });
  } catch (error) {
    const message = formatError(error).toLowerCase();
    if (message.includes('chrome')) {
      throw new Error(
        'Nao foi possivel abrir o Google Chrome. Verifique se o Chrome esta instalado nesta maquina Windows.',
      );
    }

    throw error;
  }
}

async function createSefazContext(browser: Browser, options: RunOptions): Promise<BrowserContext> {
  return browser.newContext({
    acceptDownloads: true,
    clientCertificates: CERTIFICATE_ORIGINS.map((origin) => ({
      origin,
      pfxPath: options.certificatePath,
      passphrase: options.certificatePassword,
    })),
  });
}

async function accessPortalWithCertificate(page: Page, certificateUser: string): Promise<void> {
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
  await acceptCookiesIfNeeded(page);

  await page.getByRole('link', { name: 'Paris', exact: true }).click({ noWaitAfter: true });
  try {
    await page.waitForURL(/security\.sefaz\.se\.gov\.br\/(certificado|internet)/, {
      timeout: 30_000,
      waitUntil: 'commit',
    });
  } catch (error) {
    throw new Error(
      `O acesso por certificado nao avancou para o dominio security.sefaz.se.gov.br. ` +
        `Verifique o .pfx configurado ou se o navegador ainda exibiu a janela nativa de certificado. ` +
        `URL atual: ${page.url()}. Causa original: ${formatError(error)}`,
    );
  }

  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2_000);

  await selectCertificateUserIfNeeded(page, certificateUser);
  await waitForPortalPage(page);
}

async function openCompanyList(page: Page): Promise<void> {
  await returnToCompanyList(page);
}

async function returnToCompanyList(page: Page, identificacaoAtual?: string): Promise<void> {
  if (await isCompanyListLoaded(page)) {
    return;
  }

  const caixaPostalLink = page
    .locator('a.menucomlink[href*="AppName=DEH"][href*="TransId=T923"]')
    .first();

  if ((await caixaPostalLink.count()) > 0 && (await caixaPostalLink.isVisible().catch(() => false))) {
    await caixaPostalLink.click({ noWaitAfter: true });
    await waitForCompanyList(page);
    return;
  }

  const genericLink = page.getByRole('link', { name: 'Caixa Postal', exact: true }).first();
  if ((await genericLink.count()) === 0) {
    throw new Error(
      `Nao foi possivel localizar o link de retorno para Caixa Postal` +
        (identificacaoAtual ? ` apos consultar ${identificacaoAtual}.` : '.'),
    );
  }

  await genericLink.click({ noWaitAfter: true });
  await waitForCompanyList(page);
}

async function collectCompanyMessages(
  page: Page,
  company: CompanyLink,
): Promise<{ unreadMessages: Occurrence[]; readMessages: Occurrence[] }> {
  await page.goto(company.url, { waitUntil: 'domcontentloaded' });
  await waitForCompanyPage(page, company.identificacao);

  const unreadMessages = await collectMessagesAtCurrentPage(page, company.identificacao, 'nao_lidos');
  const currentHtml = await page.content();
  const readTabUrl = extractLidosTabUrl(currentHtml, page.url());
  const readMessages = readTabUrl
    ? await collectMessagesAtUrl(page, readTabUrl, company.identificacao, 'lidos')
    : [];

  return {
    unreadMessages,
    readMessages,
  };
}

async function collectMessagesAtCurrentPage(
  page: Page,
  _companyId: string,
  source: OccurrenceSource,
): Promise<Occurrence[]> {
  return extractOccurrencesPage(await page.content(), page.url(), source).messages;
}

async function collectMessagesAtUrl(
  page: Page,
  url: string,
  companyId: string,
  source: OccurrenceSource,
): Promise<Occurrence[]> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitForCompanyPage(page, companyId);
  return extractOccurrencesPage(await page.content(), page.url(), source).messages;
}

async function acceptCookiesIfNeeded(page: Page): Promise<void> {
  const acceptButton = page.getByRole('button', { name: 'Aceitar', exact: true });
  if ((await acceptButton.count()) > 0 && (await acceptButton.isVisible().catch(() => false))) {
    await acceptButton.click();
  }
}

async function selectCertificateUserIfNeeded(page: Page, certificateUser: string): Promise<void> {
  const userSelect = page.locator('select').first();
  if ((await userSelect.count()) === 0) {
    return;
  }

  if (!(await userSelect.isVisible().catch(() => false))) {
    return;
  }

  const options = await userSelect.locator('option').allTextContents();
  const selectedOption = await userSelect.locator('option:checked').textContent();
  if (
    normalizeComparableText(selectedOption).toLowerCase() !==
      normalizeComparableText(certificateUser).toLowerCase() &&
    options.some(
      (option) =>
        normalizeComparableText(option).toLowerCase() ===
        normalizeComparableText(certificateUser).toLowerCase(),
    )
  ) {
    await userSelect.selectOption({ label: certificateUser });
  }

  const okButton = page.locator('input[name="okButton"]').first();
  if ((await okButton.count()) > 0 && (await okButton.isVisible().catch(() => false))) {
    await okButton.click({ noWaitAfter: true });
    await page.waitForTimeout(8_000);
    return;
  }

  const clicked = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('input, button'));
    const match = candidates.find((element) => {
      const input = element as HTMLInputElement;
      const text = (input.value || element.textContent || '').trim().toUpperCase();
      return text === 'OK';
    });

    if (!match) {
      return false;
    }

    (match as HTMLElement).click();
    return true;
  });

  if (!clicked) {
    throw new Error('A tela de escolha do usuario foi exibida, mas o botao OK nao foi encontrado.');
  }
}

async function waitForPortalPage(page: Page): Promise<void> {
  try {
    await page.waitForFunction(
      () => {
        const text = (document.body?.innerText ?? '').toLowerCase();
        return (
          window.location.pathname.endsWith('/internet/portal.jsp') ||
          text.includes('portal do usuario') ||
          text.includes('encerrar')
        );
      },
      {
        timeout: 30_000,
      },
    );
  } catch {
    const bodyText = normalizeComparableText(await page.locator('body').textContent()).toLowerCase();
    if (!bodyText.includes('caixa postal') && !bodyText.includes('domicilio eletronico')) {
      throw new Error(
        `A confirmacao do vinculo nao levou ao portal da SEFAZ. URL atual: ${page.url()}. ` +
          `Conteudo identificado: ${bodyText.slice(0, 240) || 'vazio'}`,
      );
    }
  }
}

async function waitForCompanyPage(page: Page, identificacao: string): Promise<void> {
  await page.waitForFunction(
    (expectedId) => document.body.textContent?.includes(expectedId) ?? false,
    identificacao,
  );
}

async function waitForCompanyList(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const normalize = (value: string | null | undefined): string =>
        (value ?? '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\u00a0/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();

      return Array.from(document.querySelectorAll('tr.trTableTitle')).some((row) => {
        const text = normalize(row.textContent);
        return (
          text.includes('identificacao') &&
          text.includes('razao social') &&
          text.includes('msg nao lidas')
        );
      });
    },
    {
      timeout: 30_000,
    },
  );
}

async function isCompanyListLoaded(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const normalize = (value: string | null | undefined): string =>
      (value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

    return Array.from(document.querySelectorAll('tr.trTableTitle')).some((row) => {
      const text = normalize(row.textContent);
      return (
        text.includes('identificacao') &&
        text.includes('razao social') &&
        text.includes('msg nao lidas')
      );
    });
  });
}

function emitLog(callbacks: RunCallbacks, level: RunLogEntry['level'], message: string): void {
  callbacks.onLog?.({
    timestamp: new Date().toISOString(),
    level,
    message,
  });
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
