import { readFile } from 'node:fs/promises';
import https from 'node:https';

import { load } from 'cheerio';

import {
  extractCaixaPostalUrl,
  extractCompanies,
  extractLidosTabUrl,
  extractOccurrence,
  hasPortalMarker,
  normalizeComparableText,
  type CompanyLink,
  type Occurrence,
} from './sefazPortalParsers';
import type { RunOptions } from './types';

const LOGIN_URL = 'https://security.sefaz.se.gov.br/certificado/login.aspx';
const PORTAL_URL = 'https://security.sefaz.se.gov.br/internet/portal.jsp';
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';

type HttpMethod = 'GET' | 'POST';

type HttpResponse = {
  url: string;
  status: number;
  text: string;
  headers: Record<string, string | string[] | undefined>;
};

type ParsedForm = {
  actionUrl: string;
  hiddenFields: Record<string, string>;
};

export class SefazHttpClient {
  private readonly agent: https.Agent;
  private readonly cookieJar = new Map<string, string>();
  private readonly certificateUser: string;

  private constructor(agent: https.Agent, certificateUser: string) {
    this.agent = agent;
    this.certificateUser = certificateUser;
  }

  static async create(options: RunOptions): Promise<SefazHttpClient> {
    const pfx = await readFile(options.certificatePath);
    const agent = new https.Agent({
      keepAlive: true,
      pfx,
      passphrase: options.certificatePassword,
      rejectUnauthorized: true,
    });

    return new SefazHttpClient(agent, options.certificateUser);
  }

  async login(): Promise<void> {
    const certificateResponse = await this.request(LOGIN_URL);
    if (containsAccessDenied(certificateResponse.text)) {
      throw this.buildError(
        'auth_certificate_entry',
        certificateResponse,
        'O endpoint de certificado respondeu com acesso negado. Verifique o .pfx, a senha e a validade do certificado.',
      );
    }

    const certificateForm = parseForm(certificateResponse.text, certificateResponse.url);
    if (!certificateForm || !isAutoSubmitPage(certificateResponse.text)) {
      throw this.buildError(
        'auth_certificate_entry',
        certificateResponse,
        'A pagina de certificado nao retornou o formulario de auto-submissao esperado.',
      );
    }

    let response = await this.postForm(
      certificateForm.actionUrl,
      certificateForm.hiddenFields,
      'auth_certificate_submit',
    );

    if (requiresUserSelection(response.text)) {
      const userSelection = parseUserSelection(response.text, response.url, this.certificateUser);
      if (!userSelection) {
        throw this.buildError(
          'auth_user_selection',
          response,
          `Nao foi possivel localizar o usuario do certificado: ${this.certificateUser}.`,
        );
      }

      response = await this.postForm(
        userSelection.form.actionUrl,
        {
          ...userSelection.form.hiddenFields,
          usuariosCadastrados: userSelection.selectedValue,
          okButton: '    OK    ',
        },
        'auth_user_submit',
      );
    }

    response = await this.followHtmlRedirects(response, 'auth_portal_redirect');

    if (!hasPortalMarker(response.text) && !extractCaixaPostalUrl(response.text, response.url)) {
      throw this.buildError(
        'auth_portal_validation',
        response,
        'A autenticacao HTTP nao chegou ao portal da SEFAZ nem encontrou o menu da Caixa Postal.',
      );
    }
  }

  async getCompanies(): Promise<CompanyLink[]> {
    const portalResponse = await this.request(PORTAL_URL);
    const caixaPostalUrl = extractCaixaPostalUrl(portalResponse.text, portalResponse.url);
    if (!caixaPostalUrl) {
      throw this.buildError(
        'caixa_postal_menu',
        portalResponse,
        'Nao foi possivel localizar o link da Caixa Postal no portal autenticado.',
      );
    }

    const companyListResponse = await this.request(caixaPostalUrl);
    const companies = extractCompanies(companyListResponse.text, companyListResponse.url);
    if (companies.length === 0) {
      throw this.buildError(
        'caixa_postal_list',
        companyListResponse,
        'A lista HTTP da Caixa Postal foi carregada, mas nenhuma empresa foi extraida da tabela principal.',
      );
    }

    return companies;
  }

  async getCompanyOccurrences(
    company: CompanyLink,
  ): Promise<{ unreadOccurrence: Occurrence | null; readOccurrence: Occurrence | null }> {
    const detailResponse = await this.request(company.url);
    if (!normalizeComparableText(detailResponse.text).includes(company.identificacao)) {
      throw this.buildError(
        'company_detail',
        detailResponse,
        `A pagina HTTP da empresa nao confirmou a identificacao esperada: ${company.identificacao}.`,
      );
    }

    const unreadOccurrence = extractOccurrence(detailResponse.text, detailResponse.url, 'nao_lidos');
    const readTabUrl = extractLidosTabUrl(detailResponse.text, detailResponse.url);

    let readOccurrence: Occurrence | null = null;
    if (readTabUrl) {
      const readResponse = await this.request(readTabUrl);
      readOccurrence = extractOccurrence(readResponse.text, readResponse.url, 'lidos');
    }

    return {
      unreadOccurrence,
      readOccurrence,
    };
  }

  private async postForm(
    url: string,
    fields: Record<string, string>,
    stage: string,
  ): Promise<HttpResponse> {
    const body = new URLSearchParams(fields).toString();
    const response = await this.request(url, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.status >= 400) {
      throw this.buildError(stage, response, 'O formulario HTTP retornou status de erro.');
    }

    return response;
  }

  private async followHtmlRedirects(response: HttpResponse, stage: string): Promise<HttpResponse> {
    let currentResponse = response;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const redirectUrl = extractJavaScriptRedirect(currentResponse.text, currentResponse.url);
      if (!redirectUrl) {
        return currentResponse;
      }

      currentResponse = await this.request(redirectUrl);
    }

    throw this.buildError(stage, currentResponse, 'Numero maximo de redirecionamentos HTML excedido.');
  }

  private async request(
    url: string,
    options: {
      method?: HttpMethod;
      body?: string;
      headers?: Record<string, string>;
    } = {},
    redirectCount = 0,
  ): Promise<HttpResponse> {
    if (redirectCount > 10) {
      throw new Error(`Numero maximo de redirects HTTP excedido para ${url}.`);
    }

    const method = options.method ?? 'GET';
    const urlObject = new URL(url);
    const requestHeaders: Record<string, string> = {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'User-Agent': DEFAULT_USER_AGENT,
      ...(options.headers ?? {}),
    };

    const cookieHeader = this.getCookieHeader();
    if (cookieHeader) {
      requestHeaders.Cookie = cookieHeader;
    }

    const body = options.body;
    if (body) {
      requestHeaders['Content-Length'] = String(Buffer.byteLength(body));
    }

    const response = await new Promise<HttpResponse>((resolve, reject) => {
      const request = https.request(
        {
          agent: this.agent,
          hostname: urlObject.hostname,
          port: urlObject.port || 443,
          method,
          path: `${urlObject.pathname}${urlObject.search}`,
          headers: requestHeaders,
        },
        (rawResponse) => {
          const chunks: Buffer[] = [];
          this.storeCookies(rawResponse.headers['set-cookie']);

          rawResponse.on('data', (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });

          rawResponse.on('end', () => {
            resolve({
              url,
              status: rawResponse.statusCode ?? 0,
              text: decodeBody(Buffer.concat(chunks), rawResponse.headers['content-type']),
              headers: rawResponse.headers,
            });
          });
        },
      );

      request.on('error', reject);

      if (body) {
        request.write(body);
      }

      request.end();
    });

    if (isRedirect(response.status)) {
      const location = response.headers.location;
      const locationHeader = Array.isArray(location) ? location[0] : location;
      if (!locationHeader) {
        throw this.buildError('http_redirect', response, 'O servidor retornou redirect sem cabecalho Location.');
      }

      const redirectUrl = new URL(locationHeader, url).toString();
      return this.request(
        redirectUrl,
        {
          method: method === 'POST' ? 'GET' : method,
        },
        redirectCount + 1,
      );
    }

    return response;
  }

  private storeCookies(setCookieHeader: string[] | string | undefined): void {
    if (!setCookieHeader) {
      return;
    }

    const entries = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    for (const entry of entries) {
      const [cookie] = entry.split(';');
      const separatorIndex = cookie.indexOf('=');
      if (separatorIndex <= 0) {
        continue;
      }

      this.cookieJar.set(cookie.slice(0, separatorIndex), cookie.slice(separatorIndex + 1));
    }
  }

  private getCookieHeader(): string {
    return [...this.cookieJar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  private buildError(stage: string, response: HttpResponse, detail: string): Error {
    const cookies = [...this.cookieJar.keys()];
    const preview = normalizeComparableText(load(response.text).root().text()).slice(0, 240) || 'vazio';
    const cookieSummary = cookies.length > 0 ? cookies.join(', ') : 'nenhum';

    return new Error(
      `Falha HTTP na etapa ${stage}. URL: ${response.url}. Status: ${response.status}. ` +
        `Cookies: ${cookieSummary}. Detalhe: ${detail}. Conteudo: ${preview}`,
    );
  }
}

function parseForm(html: string, currentUrl: string): ParsedForm | null {
  const $ = load(html);
  const form = $('form').first();
  if (!form.length) {
    return null;
  }

  const action = form.attr('action');
  if (!action) {
    return null;
  }

  const hiddenFields: Record<string, string> = {};
  form.find('input[type="hidden"][name]').each((_, input) => {
    const name = $(input).attr('name');
    if (!name) {
      return;
    }

    hiddenFields[name] = $(input).attr('value')?.replace(/&#58;/g, ':') ?? '';
  });

  return {
    actionUrl: new URL(action.replace(/&amp;/g, '&'), currentUrl).toString(),
    hiddenFields,
  };
}

function parseUserSelection(
  html: string,
  currentUrl: string,
  certificateUser: string,
): { form: ParsedForm; selectedValue: string } | null {
  const form = parseForm(html, currentUrl);
  if (!form) {
    return null;
  }

  const $ = load(html);
  const options = $('select[name="usuariosCadastrados"] option')
    .toArray()
    .map((option) => ({
      value: $(option).attr('value') ?? '',
      label: normalizeComparableText($(option).text()).toLowerCase(),
      selected: $(option).is('[selected]'),
    }))
    .filter((option) => option.value);

  if (options.length === 0) {
    return null;
  }

  const normalizedCertificateUser = normalizeComparableText(certificateUser).toLowerCase();
  const match =
    options.find((option) => option.label === normalizedCertificateUser) ||
    options.find((option) => option.selected) ||
    options[0];

  if (!match) {
    return null;
  }

  return {
    form,
    selectedValue: match.value,
  };
}

function requiresUserSelection(html: string): boolean {
  return load(html)('select[name="usuariosCadastrados"]').length > 0;
}

function isAutoSubmitPage(html: string): boolean {
  return /document\.forms\[[^\]]+\]\.submit\(\)/i.test(html) || /onload=['"][^'"]*submit\(\)/i.test(html);
}

function extractJavaScriptRedirect(html: string, currentUrl: string): string | null {
  const match = html.match(/window\.location\s*=\s*['"]([^'"]+)['"]/i);
  if (!match?.[1]) {
    return null;
  }

  return new URL(match[1].replace(/&amp;/g, '&'), currentUrl).toString();
}

function containsAccessDenied(html: string): boolean {
  return normalizeComparableText(load(html).root().text()).toLowerCase().includes('acesso negado');
}

function isRedirect(status: number): boolean {
  return status >= 300 && status < 400;
}

function decodeBody(buffer: Buffer, contentTypeHeader: string | string[] | undefined): string {
  const headerValue = Array.isArray(contentTypeHeader) ? contentTypeHeader.join(';') : contentTypeHeader ?? '';
  const charsetMatch = headerValue.match(/charset=([^;]+)/i);
  const charset = charsetMatch?.[1]?.trim().toLowerCase() ?? 'utf-8';

  if (charset === 'utf-8' || charset === 'utf8') {
    return buffer.toString('utf8');
  }

  if (charset === 'iso-8859-1' || charset === 'latin1') {
    return buffer.toString('latin1');
  }

  return buffer.toString('utf8');
}
