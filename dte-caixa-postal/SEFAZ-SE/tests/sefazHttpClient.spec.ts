import path from 'node:path';

import { expect, test } from '@playwright/test';

import { ensureAppConfig, resolveRunOptions } from '../src/app/config';
import {
  extractCaixaPostalUrl,
  extractCompanies,
  extractLidosTabUrl,
  extractOccurrence,
  pickLatestOccurrence,
} from '../src/app/sefazPortalParsers';
import { SefazHttpClient } from '../src/app/sefazHttpClient';

test('extractCompanies, extractOccurrence e pickLatestOccurrence interpretam o HTML da SEFAZ', () => {
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
  expect(pickLatestOccurrence(unreadOccurrence, readOccurrence)?.source).toBe('nao_lidos');
});

test('SefazHttpClient autentica e lista empresas via HTTP real', async () => {
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

  expect(companies.length).toBeGreaterThan(0);
  expect(companies[0]?.identificacao).toBeTruthy();
  expect(companies[0]?.url).toContain('TransId=T983');
});
