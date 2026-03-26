import { access } from 'node:fs/promises';

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from 'playwright-core';

import { writeCaixaPostalReport } from './caixaPostalReport';
import type {
  EmpresaReportRow,
  FailureRow,
  RunCallbacks,
  RunLogEntry,
  RunOptions,
  RunResult,
} from './types';

const LOGIN_URL = 'https://www.sefaz.se.gov.br/SitePages/acesso_usuario.aspx';
const CERTIFICATE_ORIGINS = [
  'https://security.sefaz.se.gov.br',
  'https://security.sefaz.se.gov.br:443',
];

type CompanyLink = {
  identificacao: string;
  razaoSocial: string;
  msgNaoLidas: number;
  url: string;
};

type OccurrenceSource = 'nao_lidos' | 'lidos';

type Occurrence = {
  numero: string;
  orgao: string;
  unidade: string;
  assunto: string;
  dataPublicacao: string;
  dataCiencia: string;
  responsavelCiencia: string;
  link: string;
  source: OccurrenceSource;
  timestamp: number;
};

export async function runCaixaPostal(
  options: RunOptions,
  callbacks: RunCallbacks = {},
): Promise<RunResult> {
  const startedAt = new Date().toISOString();
  let processed = 0;

  await validateRunOptions(options);
  emitLog(callbacks, 'info', 'Inicializando automacao da Caixa Postal.');

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    browser = await launchChrome(options);
    context = await createSefazContext(browser, options);

    const page = await context.newPage();
    page.setDefaultTimeout(20_000);

    emitLog(callbacks, 'info', 'Acessando o portal da SEFAZ com certificado digital.');
    await accessPortalWithCertificate(page, options.certificateUser);
    await openCompanyList(page);

    const companies = await extractCompanies(page);
    if (companies.length === 0) {
      throw new Error('Nenhuma empresa foi encontrada na lista da Caixa Postal.');
    }

    emitLog(callbacks, 'info', `${companies.length} empresa(s) localizada(s) para processamento.`);

    const rows: EmpresaReportRow[] = [];
    const failures: FailureRow[] = [];

    for (const [index, company] of companies.entries()) {
      processed = index + 1;
      emitProgress(callbacks, {
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
        rows.push(await processCompany(page, company));
      } catch (error) {
        const message = formatError(error);
        rows.push(buildErrorRow(company, message));
        failures.push({
          identificacao: company.identificacao,
          razao_social: company.razaoSocial,
          erro: message,
        });
        emitLog(callbacks, 'error', `Falha ao processar ${company.identificacao}: ${message}`);
      } finally {
        await returnToCompanyList(page, company.identificacao);
      }
    }

    const outputPath = await writeCaixaPostalReport({
      outputDir: options.outputDir,
      rows,
      failures,
    });

    emitLog(callbacks, 'info', `Relatorio salvo em: ${outputPath}`);

    return {
      outputPath,
      processed,
      failures,
      startedAt,
      finishedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = formatError(error);
    emitLog(callbacks, 'error', message);
    throw new Error(message);
  } finally {
    await context?.close();
    await browser?.close();
  }
}

async function validateRunOptions(options: RunOptions): Promise<void> {
  if (options.chromeChannel !== 'chrome') {
    throw new Error(`Canal de navegador nao suportado: ${options.chromeChannel}.`);
  }

  try {
    await access(options.certificatePath);
  } catch {
    throw new Error(`Certificado .pfx nao encontrado no caminho configurado: ${options.certificatePath}`);
  }

  if (!options.certificatePassword.trim()) {
    throw new Error('A senha do certificado esta vazia no config.json.');
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
    normalizeComparableText(selectedOption) !== normalizeComparableText(certificateUser) &&
    options.some(
      (option) => normalizeComparableText(option) === normalizeComparableText(certificateUser),
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
    const bodyText = normalizeComparableText(await page.locator('body').textContent());
    if (!bodyText.includes('caixa postal') && !bodyText.includes('domicilio eletronico')) {
      throw new Error(
        `A confirmacao do vinculo nao levou ao portal da SEFAZ. URL atual: ${page.url()}. ` +
          `Conteudo identificado: ${bodyText.slice(0, 240) || 'vazio'}`,
      );
    }
  }
}

async function openCompanyList(page: Page): Promise<void> {
  await returnToCompanyList(page);
}

async function extractCompanies(page: Page): Promise<CompanyLink[]> {
  return page.evaluate((currentUrl) => {
    const normalize = (value: string | null | undefined): string =>
      (value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const titleRow = Array.from(document.querySelectorAll('tr.trTableTitle')).find((row) => {
      const text = normalize(row.textContent);
      return (
        text.includes('Identificacao') &&
        text.includes('Razao Social') &&
        text.includes('Msg nao lidas')
      );
    });

    const table = titleRow?.closest('table');
    if (!table) {
      return [];
    }

    return Array.from(table.querySelectorAll('tr.trTableImpar, tr.trTablePar'))
      .map((row) => {
        const cells = Array.from(row.querySelectorAll('td'));
        const firstLink = row.querySelector('a.trLink') as HTMLAnchorElement | null;

        return {
          identificacao: normalize(cells[0]?.textContent),
          razaoSocial: normalize(cells[1]?.textContent),
          msgNaoLidas: Number.parseInt(normalize(cells[2]?.textContent) || '0', 10) || 0,
          url:
            firstLink?.getAttribute('href') != null
              ? new URL(firstLink.getAttribute('href') ?? '', currentUrl).toString()
              : '',
        };
      })
      .filter((company) => company.identificacao && company.razaoSocial && company.url);
  }, page.url());
}

async function processCompany(page: Page, company: CompanyLink): Promise<EmpresaReportRow> {
  await page.goto(company.url, { waitUntil: 'domcontentloaded' });
  await waitForCompanyPage(page, company.identificacao);

  const unreadOccurrence = await extractOccurrenceFromCurrentTab(page, 'nao_lidos');
  const readTabUrl = await getLidosTabUrl(page);
  const readOccurrence = readTabUrl
    ? await extractOccurrenceAtUrl(page, readTabUrl, company.identificacao, 'lidos')
    : null;

  const latestOccurrence = pickLatestOccurrence(unreadOccurrence, readOccurrence);
  const status = latestOccurrence || unreadOccurrence || readOccurrence ? 'ok' : 'sem_ocorrencias';

  return {
    identificacao: company.identificacao,
    razao_social: company.razaoSocial,
    msg_nao_lidas_lista: company.msgNaoLidas,
    ultima_geral_origem: latestOccurrence?.source ?? '',
    ultima_geral_numero: latestOccurrence?.numero ?? '',
    ultima_geral_orgao: latestOccurrence?.orgao ?? '',
    ultima_geral_unidade: latestOccurrence?.unidade ?? '',
    ultima_geral_assunto: latestOccurrence?.assunto ?? '',
    ultima_geral_data_publicacao: latestOccurrence?.dataPublicacao ?? '',
    ultima_geral_data_ciencia: latestOccurrence?.dataCiencia ?? '',
    ultima_geral_responsavel_ciencia: latestOccurrence?.responsavelCiencia ?? '',
    ultima_geral_link: latestOccurrence?.link ?? '',
    ultima_nao_lida_numero: unreadOccurrence?.numero ?? '',
    ultima_nao_lida_orgao: unreadOccurrence?.orgao ?? '',
    ultima_nao_lida_unidade: unreadOccurrence?.unidade ?? '',
    ultima_nao_lida_assunto: unreadOccurrence?.assunto ?? '',
    ultima_nao_lida_data_publicacao: unreadOccurrence?.dataPublicacao ?? '',
    ultima_nao_lida_data_ciencia: unreadOccurrence?.dataCiencia ?? '',
    ultima_nao_lida_responsavel_ciencia: unreadOccurrence?.responsavelCiencia ?? '',
    ultima_nao_lida_link: unreadOccurrence?.link ?? '',
    status,
    erro: '',
  };
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
  } else {
    const genericLink = page.getByRole('link', { name: 'Caixa Postal', exact: true }).first();
    if ((await genericLink.count()) === 0) {
      throw new Error(
        `Nao foi possivel localizar o link de retorno para Caixa Postal` +
          (identificacaoAtual ? ` apos consultar ${identificacaoAtual}` : '.'),
      );
    }

    await genericLink.click({ noWaitAfter: true });
  }

  await waitForCompanyList(page);
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

async function getLidosTabUrl(page: Page): Promise<string | null> {
  const lidosLink = page.getByRole('link', { name: 'Lidos', exact: true }).first();
  if ((await lidosLink.count()) === 0) {
    return null;
  }

  const href = await lidosLink.getAttribute('href');
  return href ? new URL(href, page.url()).toString() : null;
}

async function extractOccurrenceAtUrl(
  page: Page,
  url: string,
  identificacao: string,
  source: OccurrenceSource,
): Promise<Occurrence | null> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitForCompanyPage(page, identificacao);
  return extractOccurrenceFromCurrentTab(page, source);
}

async function extractOccurrenceFromCurrentTab(
  page: Page,
  source: OccurrenceSource,
): Promise<Occurrence | null> {
  const occurrence = await page.evaluate(
    ({ currentUrl, currentSource }) => {
      const normalize = (value: string | null | undefined): string =>
        (value ?? '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\u00a0/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const titleRow = Array.from(document.querySelectorAll('tr.trTableTitle')).find((row) => {
        const text = normalize(row.textContent);
        return (
          text.includes('Orgao') &&
          text.includes('Assunto') &&
          text.includes('Data Publicacao')
        );
      });

      const table = titleRow?.closest('table');
      if (!table) {
        return null;
      }

      const firstRow = table.querySelector('tr.trTableImpar, tr.trTablePar');
      if (!firstRow) {
        return null;
      }

      const cells = Array.from(firstRow.querySelectorAll('td'));
      const firstLink = firstRow.querySelector('td a') as HTMLAnchorElement | null;

      if (cells.length < 8) {
        return null;
      }

      return {
        numero: normalize(cells[0]?.textContent),
        orgao: normalize(cells[1]?.textContent),
        unidade: normalize(cells[2]?.textContent),
        assunto: normalize(cells[4]?.textContent),
        dataPublicacao: normalize(cells[5]?.textContent),
        dataCiencia: normalize(cells[6]?.textContent),
        responsavelCiencia: normalize(cells[7]?.textContent),
        link:
          firstLink?.getAttribute('href') != null
            ? new URL(firstLink.getAttribute('href') ?? '', currentUrl).toString()
            : currentUrl,
        source: currentSource,
      };
    },
    { currentUrl: page.url(), currentSource: source },
  );

  if (!occurrence || !occurrence.numero) {
    return null;
  }

  return {
    ...occurrence,
    timestamp: parseBrazilDateTime(occurrence.dataPublicacao),
  };
}

function pickLatestOccurrence(
  unreadOccurrence: Occurrence | null,
  readOccurrence: Occurrence | null,
): Occurrence | null {
  if (!unreadOccurrence) {
    return readOccurrence;
  }

  if (!readOccurrence) {
    return unreadOccurrence;
  }

  return unreadOccurrence.timestamp >= readOccurrence.timestamp ? unreadOccurrence : readOccurrence;
}

function parseBrazilDateTime(value: string): number {
  const match = value.match(
    /(?<day>\d{2})\/(?<month>\d{2})\/(?<year>\d{4})(?:\s+(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2}))?/,
  );

  if (!match?.groups) {
    return 0;
  }

  const day = Number.parseInt(match.groups.day, 10);
  const month = Number.parseInt(match.groups.month, 10);
  const year = Number.parseInt(match.groups.year, 10);
  const hour = Number.parseInt(match.groups.hour ?? '0', 10);
  const minute = Number.parseInt(match.groups.minute ?? '0', 10);
  const second = Number.parseInt(match.groups.second ?? '0', 10);

  return Date.UTC(year, month - 1, day, hour, minute, second);
}

function buildErrorRow(company: CompanyLink, error: string): EmpresaReportRow {
  return {
    identificacao: company.identificacao,
    razao_social: company.razaoSocial,
    msg_nao_lidas_lista: company.msgNaoLidas,
    ultima_geral_origem: '',
    ultima_geral_numero: '',
    ultima_geral_orgao: '',
    ultima_geral_unidade: '',
    ultima_geral_assunto: '',
    ultima_geral_data_publicacao: '',
    ultima_geral_data_ciencia: '',
    ultima_geral_responsavel_ciencia: '',
    ultima_geral_link: '',
    ultima_nao_lida_numero: '',
    ultima_nao_lida_orgao: '',
    ultima_nao_lida_unidade: '',
    ultima_nao_lida_assunto: '',
    ultima_nao_lida_data_publicacao: '',
    ultima_nao_lida_data_ciencia: '',
    ultima_nao_lida_responsavel_ciencia: '',
    ultima_nao_lida_link: '',
    status: 'erro',
    erro: error,
  };
}

function normalizeComparableText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function emitProgress(
  callbacks: RunCallbacks,
  progress: { current: number; total: number; companyId: string; companyName: string },
): void {
  callbacks.onProgress?.(progress);
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
