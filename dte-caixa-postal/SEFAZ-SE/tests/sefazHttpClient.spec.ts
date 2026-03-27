import path from 'node:path';

import { expect, test } from '@playwright/test';

import { ensureAppConfig, resolveRunOptions } from '../src/app/config';
import { runCaixaPostalHttp } from '../src/app/runCaixaPostalHttp';
import {
  extractCaixaPostalUrl,
  extractCompanies,
  extractLidosTabUrl,
  extractOccurrence,
  extractOccurrencesPage,
  getNextPageUrl,
} from '../src/app/sefazPortalParsers';
import { SefazHttpClient } from '../src/app/sefazHttpClient';

test('extractCompanies, extractOccurrence e paginação interpretam o HTML da SEFAZ', () => {
  const listHtml = `
    <table>
      <tr class="trTableTitle">
        <td>Identificação</td>
        <td>Razão Social</td>
        <td>Msg não lidas</td>
      </tr>
      <tr class="trTableImpar">
        <td><a class="trLink" href="/internet/process.jsp?AppName=DEH&TransId=T983&token=abc">16.806.229/0001-58</a></td>
        <td><a class="trLink" href="/internet/process.jsp?AppName=DEH&TransId=T983&token=abc">SPEED TELECOM LTDA</a></td>
        <td>3</td>
      </tr>
    </table>
  `;
  const detailHtml = `
    <a href="?AppName=DEH&TransId=T983&AppNameAba=DEH&TransIdAba=T1000&CodAbaAtiva=2&token=lidos">Lidos</a>
    <table>
      <tr class="trTableTitle">
        <td>Identificação</td>
        <td>Órgão</td>
        <td>Unidade</td>
        <td>Nr. Documento</td>
        <td>Assunto</td>
        <td>Data Publicação</td>
        <td>Data de Ciência</td>
        <td>Responsável Ciência</td>
      </tr>
      <tr class="trTableImpar">
        <td><a href="/internet/process.jsp?AppName=DEH&TransId=T111&token=abc">MSG-1</a></td>
        <td>SEFAZ</td>
        <td>ARACAJU</td>
        <td>123</td>
        <td>Assunto recente</td>
        <td>25/03/2026 09:10:11</td>
        <td>26/03/2026 10:11:12</td>
        <td>USUARIO A</td>
      </tr>
    </table>
  `;
  const readHtml = `
    <table>
      <tr class="trTableTitle">
        <td>Identificação</td>
        <td>Órgão</td>
        <td>Unidade</td>
        <td>Nr. Documento</td>
        <td>Assunto</td>
        <td>Data Publicação</td>
        <td>Data de Ciência</td>
        <td>Responsável Ciência</td>
      </tr>
      <tr class="trTableImpar">
        <td><a href="/internet/process.jsp?AppName=DEH&TransId=T222&token=def">MSG-2</a></td>
        <td>SEFAZ</td>
        <td>ITABAIANA</td>
        <td>456</td>
        <td>Assunto antigo</td>
        <td>24/03/2026 08:00:00</td>
        <td>24/03/2026 09:00:00</td>
        <td>USUARIO B</td>
      </tr>
    </table>
  `;
  const pagedHtml = `
    <font class="fontValue">de <font class="fontNavDestaque">21</font> a <font class="fontNavDestaque">40</font> em <font class="fontNavDestaque">373</font>&nbsp;ocorrência(s)</font>
    ${readHtml}
  `;
  const portalHtml = `<a href="process.jsp?AppName=DEH&TransId=T923&token=xyz">Caixa Postal</a>`;

  const companies = extractCompanies(listHtml, 'https://security.sefaz.se.gov.br/internet/process.jsp');
  const unreadOccurrence = extractOccurrence(
    detailHtml,
    'https://security.sefaz.se.gov.br/internet/process.jsp?AppName=DEH&TransId=T983',
    'nao_lidos',
  );
  const readOccurrence = extractOccurrence(
    readHtml,
    'https://security.sefaz.se.gov.br/internet/process.jsp?AppName=DEH&TransId=T983&CodAbaAtiva=2',
    'lidos',
  );
  const pagedResult = extractOccurrencesPage(
    pagedHtml,
    'https://security.sefaz.se.gov.br/internet/process.jsp?AppName=DEH&TransId=T983&CodAbaAtiva=2',
    'lidos',
  );

  expect(extractCaixaPostalUrl(portalHtml, 'https://security.sefaz.se.gov.br/internet/portal.jsp')).toBe(
    'https://security.sefaz.se.gov.br/internet/process.jsp?AppName=DEH&TransId=T923&token=xyz',
  );
  expect(companies).toEqual([
    {
      identificacao: '16.806.229/0001-58',
      razaoSocial: 'SPEED TELECOM LTDA',
      msgNaoLidas: 3,
      url: 'https://security.sefaz.se.gov.br/internet/process.jsp?AppName=DEH&TransId=T983&token=abc',
    },
  ]);
  expect(extractLidosTabUrl(detailHtml, 'https://security.sefaz.se.gov.br/internet/process.jsp')).toBe(
    'https://security.sefaz.se.gov.br/internet/process.jsp?AppName=DEH&TransId=T983&AppNameAba=DEH&TransIdAba=T1000&CodAbaAtiva=2&token=lidos',
  );
  expect(unreadOccurrence?.assunto).toBe('Assunto recente');
  expect(unreadOccurrence?.link).toContain('TransId=T111');
  expect(readOccurrence?.assunto).toBe('Assunto antigo');
  expect(pagedResult.pagination).toEqual({
    currentStart: 21,
    currentEnd: 40,
    total: 373,
    pageSize: 20,
  });
  expect(
    getNextPageUrl(
      'https://security.sefaz.se.gov.br/internet/process.jsp?AppName=DEH&TransId=T983&CodAbaAtiva=2',
      pagedResult.pagination,
    ),
  ).toContain('navInicio=41');
});

test('SefazHttpClient recarrega a lista autenticada antes de trocar de empresa na mesma sessao', async () => {
  const portalUrl = 'https://security.sefaz.se.gov.br/internet/portal.jsp';
  const listUrl = 'https://security.sefaz.se.gov.br/internet/process.jsp?AppName=DEH&TransId=T923&token=list';
  const companyAInitialUrl = 'https://security.sefaz.se.gov.br/internet/process.jsp?empresa=A-inicial';
  const companyBInitialUrl = 'https://security.sefaz.se.gov.br/internet/process.jsp?empresa=B-inicial';
  const companyARefreshedUrl = 'https://security.sefaz.se.gov.br/internet/process.jsp?empresa=A-refrescada';
  const companyBRefreshedUrl = 'https://security.sefaz.se.gov.br/internet/process.jsp?empresa=B-refrescada';
  const refreshLogs: string[] = [];

  const portalHtml = `<a href="${listUrl}">Caixa Postal</a>`;
  const initialListHtml = buildCompanyListHtml([
    ['11.111.111/0001-11', 'Empresa A LTDA', 3, companyAInitialUrl],
    ['22.222.222/0001-22', 'Empresa B LTDA', 2, companyBInitialUrl],
  ]);
  const firstRefreshListHtml = buildCompanyListHtml([
    ['11.111.111/0001-11', 'Empresa A LTDA', 3, companyARefreshedUrl],
    ['22.222.222/0001-22', 'Empresa B LTDA', 2, companyBInitialUrl],
  ]);
  const secondRefreshListHtml = buildCompanyListHtml([
    ['11.111.111/0001-11', 'Empresa A LTDA', 3, companyARefreshedUrl],
    ['22.222.222/0001-22', 'Empresa B LTDA', 2, companyBRefreshedUrl],
  ]);

  const companyADetailHtml = buildOccurrenceDetailHtml(
    '11.111.111/0001-11',
    '2026/ 000100001',
    'ASSUNTO A',
  );
  const companyBDetailHtml = buildOccurrenceDetailHtml(
    '22.222.222/0001-22',
    '2026/ 000200002',
    'ASSUNTO B',
  );

  const client = Object.create(SefazHttpClient.prototype) as SefazHttpClient & {
    caixaPostalListUrl: string | null;
    lastResolvedCompanyId: string | null;
    request: (url: string) => Promise<{
      url: string;
      status: number;
      text: string;
      headers: Record<string, string | string[] | undefined>;
    }>;
  };

  let listRequestCount = 0;
  client.caixaPostalListUrl = null;
  client.lastResolvedCompanyId = null;
  client.request = async (url: string) => {
    if (url === portalUrl) {
      return response(portalUrl, portalHtml);
    }

    if (url === listUrl) {
      listRequestCount += 1;
      if (listRequestCount === 1) {
        return response(listUrl, initialListHtml);
      }

      if (listRequestCount === 2) {
        return response(listUrl, firstRefreshListHtml);
      }

      return response(listUrl, secondRefreshListHtml);
    }

    if (url === companyARefreshedUrl || url === companyAInitialUrl || url === companyBInitialUrl) {
      return response(url, companyADetailHtml);
    }

    if (url === companyBRefreshedUrl) {
      return response(url, companyBDetailHtml);
    }

    throw new Error(`URL nao esperada no teste: ${url}`);
  };

  const companies = await client.getCompanies();
  const companyAMessages = await client.getCompanyMessages(companies[0]!, {
    onContextRefresh: (message) => refreshLogs.push(message),
  });
  const companyBMessages = await client.getCompanyMessages(companies[1]!, {
    onContextRefresh: (message) => refreshLogs.push(message),
  });

  expect(companyAMessages.unreadMessages[0]?.assunto).toBe('ASSUNTO A');
  expect(companyBMessages.unreadMessages[0]?.assunto).toBe('ASSUNTO B');
  expect(companyBMessages.unreadMessages[0]?.numero).toBe('2026/ 000200002');
  expect(listRequestCount).toBe(3);
  expect(refreshLogs).toEqual([
    'Recarregando a lista HTTP da Caixa Postal para trocar o contexto de empresa antes de abrir 22.222.222/0001-22.',
  ]);
});

test('runCaixaPostalHttp preserva progresso e quantidade de linhas ao processar empresas via cliente HTTP', async () => {
  const originalCreate = SefazHttpClient.create;
  const progressUpdates: Array<{ current: number; total: number; companyId: string; companyName: string }> = [];
  const logMessages: string[] = [];

  const fakeClient = {
    async login(): Promise<void> {},
    async getCompanies() {
      return [
        {
          identificacao: '11.111.111/0001-11',
          razaoSocial: 'Empresa A LTDA',
          msgNaoLidas: 1,
          url: 'https://exemplo.local/empresa-a',
        },
        {
          identificacao: '22.222.222/0001-22',
          razaoSocial: 'Empresa B LTDA',
          msgNaoLidas: 2,
          url: 'https://exemplo.local/empresa-b',
        },
      ];
    },
    async getCompanyMessages(company: { identificacao: string }, options?: { onContextRefresh?: (message: string) => void }) {
      if (company.identificacao === '22.222.222/0001-22') {
        options?.onContextRefresh?.(
          `Recarregando a lista HTTP da Caixa Postal para trocar o contexto de empresa antes de abrir ${company.identificacao}.`,
        );
      }

      return {
        unreadMessages: [
          {
            numero: `NUM-${company.identificacao}`,
            orgao: 'SEFAZ',
            unidade: 'ASSCAUTO',
            assunto: `ASSUNTO-${company.identificacao}`,
            dataPublicacao: '25/03/2026 09:10:11',
            dataCiencia: '',
            responsavelCiencia: '',
            link: `https://exemplo.local/${company.identificacao}`,
            source: 'nao_lidos' as const,
            timestamp: Date.UTC(2026, 2, 25, 9, 10, 11),
          },
        ],
        readMessages: [],
      };
    },
  };

  Object.defineProperty(SefazHttpClient, 'create', {
    configurable: true,
    writable: true,
    value: async () => fakeClient,
  });

  try {
    const result = await runCaixaPostalHttp(
      {
        certificatePath: 'certificado/mock.pfx',
        certificatePassword: 'senha',
        certificateUser: 'usuario',
        outputDir: 'output',
        chromeChannel: 'chrome',
        executionStrategy: 'http',
      },
      {
        onProgress: (progress) => progressUpdates.push(progress),
        onLog: (entry) => logMessages.push(entry.message),
      },
      new Date('2026-03-26T12:00:00.000Z'),
    );

    expect(result.processed).toBe(2);
    expect(result.rows).toHaveLength(2);
    expect(result.failures).toHaveLength(0);
    expect(progressUpdates).toEqual([
      {
        current: 1,
        total: 2,
        companyId: '11.111.111/0001-11',
        companyName: 'Empresa A LTDA',
      },
      {
        current: 2,
        total: 2,
        companyId: '22.222.222/0001-22',
        companyName: 'Empresa B LTDA',
      },
    ]);
    expect(logMessages).toContain(
      'Recarregando a lista HTTP da Caixa Postal para trocar o contexto de empresa antes de abrir 22.222.222/0001-22.',
    );
  } finally {
    Object.defineProperty(SefazHttpClient, 'create', {
      configurable: true,
      writable: true,
      value: originalCreate,
    });
  }
});

test('SefazHttpClient autentica, lista empresas e coleta mensagens via HTTP real', async () => {
  test.skip(
    !process.env.RUN_SEFAZ_INTEGRATION,
    'Defina RUN_SEFAZ_INTEGRATION=1 para executar a integracao real contra a SEFAZ.',
  );

  test.setTimeout(10 * 60 * 1000);

  const tempRoot = path.resolve(process.cwd(), '.tmp-tests', 'sefaz-http-client');
  const environment = {
    userDataDir: path.resolve(tempRoot, 'userData'),
    documentsDir: path.resolve(tempRoot, 'documents'),
    resourcesDir: process.cwd(),
    cwd: process.cwd(),
  };

  const { config } = await ensureAppConfig(environment);
  const client = await SefazHttpClient.create(resolveRunOptions(config));

  await client.login();
  const companies = await client.getCompanies();
  const messages = await client.getCompanyMessages(companies[0]!);

  expect(companies.length).toBeGreaterThan(0);
  expect(companies[0]?.identificacao).toBeTruthy();
  expect(companies[0]?.url).toContain('TransId=T983');
  expect(messages.unreadMessages.length + messages.readMessages.length).toBeGreaterThan(0);
});

function response(url: string, text: string): {
  url: string;
  status: number;
  text: string;
  headers: Record<string, string | string[] | undefined>;
} {
  return {
    url,
    status: 200,
    text,
    headers: {},
  };
}

function buildCompanyListHtml(
  companies: Array<[identificacao: string, razaoSocial: string, msgNaoLidas: number, url: string]>,
): string {
  const rows = companies
    .map(
      ([identificacao, razaoSocial, msgNaoLidas, url], index) => `
        <tr class="${index % 2 === 0 ? 'trTableImpar' : 'trTablePar'}">
          <td><a class="trLink" href="${url}">${identificacao}</a></td>
          <td><a class="trLink" href="${url}">${razaoSocial}</a></td>
          <td><a class="trLink" href="${url}">${msgNaoLidas}</a></td>
        </tr>
      `,
    )
    .join('');

  return `
    <table>
      <tr class="trTableTitle">
        <td>Identificacao</td>
        <td>Razao Social</td>
        <td>Msg nao lidas</td>
      </tr>
      ${rows}
    </table>
  `;
}

function buildOccurrenceDetailHtml(
  identificacao: string,
  numero: string,
  assunto: string,
): string {
  return `
    <div>${identificacao}</div>
    <table>
      <tr class="trTableTitle">
        <td>Identificacao</td>
        <td>Orgao</td>
        <td>Unidade</td>
        <td>Nr. Documento</td>
        <td>Assunto</td>
        <td>Data Publicacao</td>
        <td>Data de Ciencia</td>
        <td>Responsavel Ciencia</td>
      </tr>
      <tr class="trTableImpar">
        <td><a href="https://exemplo.local/detalhe">${numero}</a></td>
        <td>SEFAZ</td>
        <td>ASSCAUTO</td>
        <td></td>
        <td>${assunto}</td>
        <td>25/03/2026 09:10:11</td>
        <td></td>
        <td></td>
      </tr>
    </table>
  `;
}
