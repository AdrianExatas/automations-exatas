import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import type { IncomingHttpHeaders } from "node:http";
import { request as httpsRequest } from "node:https";
import { join } from "node:path";
import iconv from "iconv-lite";
import forge from "node-forge";
import { CookieJar } from "tough-cookie";
import { PATHS, SEFAZ_HTTP_RETRY_ATTEMPTS, SEFAZ_HTTP_TIMEOUT_MS } from "../core/config.js";
import { downloadState } from "../download/state.js";
import { organizeDownloadedZip, parseNomeEmpresaEAnoMes, verificarZipValido } from "../download/files.js";
import type { DownloadInfo, DownloadListingPage, HtmlForm, SolicitacaoResultado } from "../types.js";
import { ensureDir } from "../utils/fs.js";
import { sleep } from "../utils/retry.js";
import {
  firstValue,
  isSessionExpired,
  parseDownloadListing,
  parseEmpresasDoFormulario,
  parseErrorMessage,
  parseForm,
  parseJsRedirect,
  parsePortalMenuLink,
  simplifyFormPayload,
} from "./parser.js";

interface HttpResponse {
  url: string;
  status: number;
  headers: Headers;
  text: string;
  buffer: Buffer;
}

interface RequestOptions {
  data?: Array<[string, string]>;
  params?: Array<[string, string]>;
  headers?: Record<string, string>;
  referer?: string;
  checkSession?: boolean;
  asBinary?: boolean;
  retry?: boolean;
  timeoutMs?: number;
}

interface CertificateRequestOptions {
  pfxPath: string;
  pfxPassword: string;
  method?: "GET" | "POST";
  data?: Array<[string, string]>;
  referer?: string;
  redirectLimit?: number;
  timeoutMs?: number;
}

interface ClientCertificatePem {
  cert: string;
  key: string;
}

export class SefazHttpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SefazHttpError";
  }
}

export class SefazSessionExpiredError extends SefazHttpError {
  constructor(message: string) {
    super(message);
    this.name = "SefazSessionExpiredError";
  }
}

/** A rota/formulario mudou e o transporte HTTP nao pode continuar com seguranca. */
export class SefazPortalIncompatibleError extends SefazHttpError {
  constructor(message: string) {
    super(message);
    this.name = "SefazPortalIncompatibleError";
  }
}

/** Resposta funcional do portal; nunca deve disparar um novo envio automatico. */
export class SefazPortalBusinessError extends SefazHttpError {
  constructor(message: string) {
    super(message);
    this.name = "SefazPortalBusinessError";
  }
}

class SefazNonRetryableHttpError extends SefazHttpError {
  constructor(message: string) {
    super(message);
    this.name = "SefazHttpError";
  }
}

function isAbortLikeError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error.name === "AbortError" ||
    error.message.toLowerCase().includes("aborted") ||
    error.message.toLowerCase().includes("abort")
  );
}

export class SefazHttpClient {
  static readonly publicLoginUrl = "https://www.sefaz.se.gov.br/SitePages/acesso_usuario.aspx";
  static readonly portalIframeUrl = "https://security.sefaz.se.gov.br/internet/portal/acesso.jsp";
  static readonly loginPostUrl = "https://security.sefaz.se.gov.br/internet/login/login.jsp";
  static readonly certificateLoginUrl = "https://security.sefaz.se.gov.br/certificado/login.aspx";
  static readonly internetBaseUrl = "https://security.sefaz.se.gov.br/internet/";
  static readonly portalUrl = "https://security.sefaz.se.gov.br/internet/portal.jsp";
  static readonly navPageStride = 15;

  private readonly cookieJar = new CookieJar();
  private portalHtml?: string;
  private portalUrl?: string;
  private listingUrl?: string;
  private listingPage?: DownloadListingPage;
  private lastListingHtml?: string;
  private solicitacaoFormCache?: HtmlForm;
  private empresasCache?: Array<{ inscricao: string; nome: string }>;

  constructor(
    private readonly timeoutMs = SEFAZ_HTTP_TIMEOUT_MS,
    private readonly retryAttempts = SEFAZ_HTTP_RETRY_ATTEMPTS,
  ) {}

  async login(usuario: string, senha: string): Promise<boolean> {
    await this.request("GET", SefazHttpClient.publicLoginUrl, { checkSession: false });
    await this.request("GET", SefazHttpClient.portalIframeUrl, { checkSession: false });

    const response = await this.request("POST", SefazHttpClient.loginPostUrl, {
      data: [
        ["UserName", usuario],
        ["Password", senha],
        ["aba", "contabilista"],
        ["Op", "1"],
        ["Login", "Contabilista"],
      ],
      headers: {
        Origin: "https://security.sefaz.se.gov.br",
        Referer: SefazHttpClient.portalIframeUrl,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      checkSession: false,
    });

    if (!response.url.toLowerCase().includes("portal.jsp")) {
      throw new SefazHttpError(parseErrorMessage(response.text) ?? "Falha no login HTTP");
    }

    this.portalUrl = response.url;
    this.portalHtml = response.text;
    return true;
  }

  async loginComCertificado(pfxPath: string, pfxPassword: string): Promise<boolean> {
    if (!pfxPath) {
      throw new SefazHttpError("SEFAZ_CERT_PFX_PATH nao configurado no .env");
    }
    if (!existsSync(pfxPath)) {
      throw new SefazHttpError(`Certificado PFX nao encontrado: ${pfxPath}`);
    }
    if (!pfxPassword) {
      throw new SefazHttpError("SEFAZ_CERT_PFX_PASSWORD nao configurado no .env");
    }

    let response: HttpResponse;
    try {
      response = await this.requestWithClientCertificate(SefazHttpClient.certificateLoginUrl, {
        pfxPath,
        pfxPassword,
        referer: "https://www.sefaz.se.gov.br/",
      });
      await this.storeHeadersCookies(response.headers, response.url);
      response = await this.followCertificateJsRedirects(response, pfxPath, pfxPassword);
    } catch (error) {
      throw this.normalizeCertificateLoginError(error);
    }

    if (!response.url.toLowerCase().includes("portal.jsp")) {
      throw new SefazPortalIncompatibleError(
        parseErrorMessage(response.text) ?? "Falha no login por certificado no portal legado",
      );
    }

    this.portalUrl = response.url;
    this.portalHtml = response.text;
    return true;
  }

  async abrirFormularioSolicitacao(forceRefresh = false): Promise<HtmlForm> {
    if (!forceRefresh && this.solicitacaoFormCache) {
      return this.solicitacaoFormCache;
    }
    let listing = await this.abrirListagemDownloads(false, forceRefresh);
    if (!listing.newRequestUrl) {
      this.clearNavigationCache();
      listing = await this.abrirListagemDownloads(false, true);
    }
    if (!listing.newRequestUrl) {
      const debugPath = this.salvarHtmlListagemSemNovo(listing);
      throw new SefazPortalIncompatibleError(
        `Nao foi possivel localizar o comando de nova solicitacao na listagem. URL final: ${this.redactSefazTokens(listing.url)}. Links encontrados: ${listing.linkCount ?? 0}. HTML salvo em ${debugPath}`,
      );
    }
    const response = await this.request("GET", listing.newRequestUrl, { referer: listing.url });
    this.solicitacaoFormCache = parseForm(SefazHttpClient.internetBaseUrl, response.url, response.text);
    return this.solicitacaoFormCache;
  }

  async listarEmpresas(): Promise<Array<{ inscricao: string; nome: string }>> {
    if (this.empresasCache) {
      return [...this.empresasCache];
    }
    const form = await this.abrirFormularioSolicitacao();
    const empresas = parseEmpresasDoFormulario(form);
    this.empresasCache = [...empresas];
    return empresas;
  }

  async preflightSolicitacao(inscricaoMunicipal: string): Promise<boolean> {
    await this.abrirFormTipoArquivo(inscricaoMunicipal);
    return true;
  }

  async solicitarXml(params: Record<string, string>): Promise<SolicitacaoResultado> {
    const formTipo = await this.abrirFormTipoArquivo(params.inscricao_municipal ?? "");
    const tipoMap: Record<string, string> = { NFE: "0", CTE: "1", NFC: "2" };
    const tipoArquivo = (params.tipo_arquivo ?? "").trim().toUpperCase();
    const tipoValue = tipoMap[tipoArquivo];
    if (!tipoValue) {
      throw new SefazHttpError(`Tipo de arquivo desconhecido: ${tipoArquivo}`);
    }

    const responseCriterio = await this.submitForm(formTipo, {
      cdPessoaContribuinte: firstValue(formTipo, "cdPessoaContribuinte", ""),
      tipoArquivo: tipoValue,
    });
    const redirectedCriterio = await this.followJsRedirect(responseCriterio, formTipo.actionUrl);
    const formCriterio = parseForm(SefazHttpClient.internetBaseUrl, redirectedCriterio.url, redirectedCriterio.text);
    const criterioPayload = this.buildCriterioPayload(formCriterio, params);
    const responseFinal = await this.submitForm(formCriterio, criterioPayload, { retry: false });
    const finalPage = await this.followJsRedirect(responseFinal, formCriterio.actionUrl);
    const mensagem = parseErrorMessage(finalPage.text);

    return {
      sucesso: true,
      mensagem: mensagem ? "Solicitacao enviada com aviso" : "Solicitacao concluida com sucesso",
      aviso: mensagem,
      pageUrl: finalPage.url,
    };
  }

  async abrirListagemDownloads(readyOnly = false, forceRefresh = false): Promise<DownloadListingPage> {
    if (!readyOnly && !forceRefresh && this.listingPage) {
      return this.listingPage;
    }
    const portal = await this.ensurePortal();
    const solicitarXmlUrl = parsePortalMenuLink(portal.url, portal.text, "Solicitar Arquivos XML");
    if (!solicitarXmlUrl) {
      throw new SefazPortalIncompatibleError("Nao foi possivel localizar o menu 'Solicitar Arquivos XML'");
    }

    let response = await this.request("GET", solicitarXmlUrl, { referer: portal.url });
    response = await this.followJsRedirect(response, solicitarXmlUrl);
    const listing = parseDownloadListing(SefazHttpClient.internetBaseUrl, response.url, response.text, readyOnly);
    this.lastListingHtml = response.text;
    this.listingUrl = response.url;
    if (!readyOnly) {
      this.listingPage = listing;
    }
    return listing;
  }

  async listarDownloads(pagina = 1, readyOnly = false): Promise<DownloadListingPage> {
    if (pagina < 1) {
      throw new Error("pagina deve ser >= 1");
    }

    let current = await this.abrirListagemDownloads(readyOnly);
    if (current.currentPage == null || current.currentPage > pagina) {
      const response = await this.request("GET", this.listingUrl ?? current.url, { referer: SefazHttpClient.portalUrl });
      current = parseDownloadListing(SefazHttpClient.internetBaseUrl, response.url, response.text, readyOnly);
      if (!readyOnly) {
        this.listingPage = current;
      }
    }

    if (pagina === 1 && (current.currentPage == null || current.currentPage === 1)) {
      return current;
    }

    if (pagina > 1) {
      const response = await this.request("GET", this.buildListingPageUrl(current.url, pagina), { referer: current.url });
      const directPage = parseDownloadListing(SefazHttpClient.internetBaseUrl, response.url, response.text, readyOnly);
      if (directPage.currentPage === pagina) {
        if (!readyOnly) {
          this.listingPage = directPage;
        }
        return directPage;
      }
    }

    while (current.currentPage == null || current.currentPage < pagina) {
      const nextUrl = current.pageLinks[(current.currentPage ?? 1) + 1] ?? current.nextPageUrl;
      if (!nextUrl) {
        throw new SefazHttpError(`Pagina ${pagina} nao disponivel`);
      }
      const response = await this.request("GET", nextUrl, { referer: current.url });
      current = parseDownloadListing(SefazHttpClient.internetBaseUrl, response.url, response.text, readyOnly);
      if (!readyOnly) {
        this.listingPage = current;
      }
    }
    return current;
  }

  async baixarArquivo(infoDownload: DownloadInfo | string, destino = PATHS.downloadsDir): Promise<string> {
    const info = typeof infoDownload === "string"
      ? { url: infoDownload, nmArquivo: "arquivo", situacao: "PRONTO PARA DOWNLOAD", tipoDownload: "DESCONHECIDO", rowText: "" }
      : infoDownload;
    ensureDir(destino);

    const tempFile = join(destino, `${info.nmArquivo || info.dtSolicitacao || "arquivo_tmp"}.zip`);
    if (existsSync(tempFile)) {
      rmSync(tempFile, { force: true });
    }
    let downloadUrl = info.url;
    let referer = this.listingUrl ?? SefazHttpClient.portalUrl;
    let downloaded = false;

    for (let tentativa = 0; tentativa < 3; tentativa += 1) {
      const response = await this.request("GET", downloadUrl, { referer, checkSession: false, asBinary: true });
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (contentType.includes("text/html")) {
        const redirectUrl = parseJsRedirect(response.url, response.text);
        if (redirectUrl) {
          downloadUrl = redirectUrl;
          referer = response.url;
          continue;
        }
        const debugPath = this.salvarHtmlDownloadInesperado(info, response.text);
        if (isSessionExpired(response.text)) {
          throw new SefazSessionExpiredError("Sessao expirada ou portal redirecionou para login");
        }
        const message = parseErrorMessage(response.text);
        if (message) {
          throw new SefazHttpError(message);
        }
        throw new SefazHttpError(`O portal retornou HTML em vez do ZIP solicitado (amostra salva em ${debugPath})`);
      }

      writeFileSync(tempFile, response.buffer);
      downloaded = true;
      break;
    }

    if (!downloaded) {
      if (existsSync(tempFile)) {
        rmSync(tempFile, { force: true });
      }
      throw new SefazHttpError("O portal retornou redirecionamentos HTML repetidos em vez do ZIP solicitado");
    }

    if (!verificarZipValido(tempFile)) {
      if (existsSync(tempFile)) {
        rmSync(tempFile, { force: true });
      }
      throw new SefazHttpError(`ZIP baixado esta corrompido: ${info.nmArquivo}`);
    }

    return organizeDownloadedZip(tempFile, info, downloadState.extrairZips);
  }

  private async ensurePortal(): Promise<HttpResponse> {
    if (this.portalHtml && this.portalUrl) {
      return {
        url: this.portalUrl,
        status: 200,
        headers: new Headers(),
        text: this.portalHtml,
        buffer: Buffer.from(this.portalHtml, "latin1"),
      };
    }
    const response = await this.request("GET", SefazHttpClient.portalUrl);
    this.portalHtml = response.text;
    this.portalUrl = response.url;
    return response;
  }

  private async request(
    method: "GET" | "POST",
    url: string,
    options: RequestOptions = {},
  ): Promise<HttpResponse> {
    const requestUrl = new URL(url);
    for (const [key, value] of options.params ?? []) {
      requestUrl.searchParams.append(key, value);
    }

    const maxAttempts = options.retry === false ? 1 : Math.max(1, this.retryAttempts);
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await this.requestOnce(method, requestUrl, options, timeoutMs);
        if (this.shouldRetryStatus(response.status) && attempt < maxAttempts) {
          lastError = new SefazHttpError(
            `Falha HTTP ${response.status} em ${response.url} (tentativa ${attempt}/${maxAttempts})`,
          );
          await this.waitBeforeRetry(attempt);
          continue;
        }
        if (response.status >= 400) {
          throw new SefazNonRetryableHttpError(`Falha HTTP ${response.status} em ${response.url}`);
        }
        if (options.checkSession !== false && isSessionExpired(response.text)) {
          throw new SefazSessionExpiredError("Sessao expirada ou redirecionada para login");
        }
        return response;
      } catch (error) {
        lastError = this.normalizeRequestError(error, method, requestUrl.toString(), timeoutMs, attempt, maxAttempts);
        if (attempt >= maxAttempts || !this.shouldRetryError(lastError)) {
          throw lastError;
        }
        await this.waitBeforeRetry(attempt);
      }
    }

    throw lastError;
  }

  /**
   * Adota a sessao temporaria criada pelo navegador no Portal Fazendario.
   * Cookies permanecem apenas na instancia atual do cliente HTTP.
   */
  async adotarSessaoDoPortal(
    cookies: Array<{ name: string; value: string; domain: string; path?: string; secure?: boolean }>,
    servicoXmlUrl: string,
  ): Promise<void> {
    for (const cookie of cookies) {
      const domain = cookie.domain.replace(/^\./, "");
      if (!domain) continue;
      const serialized = [
        `${cookie.name}=${cookie.value}`,
        `Domain=${cookie.domain}`,
        `Path=${cookie.path || "/"}`,
        cookie.secure === false ? "" : "Secure",
      ].filter(Boolean).join("; ");
      await this.cookieJar.setCookie(serialized, `https://${domain}/`);
    }
    this.portalUrl = servicoXmlUrl;
    this.portalHtml = `<a href="${servicoXmlUrl}">Solicitar Arquivos XML</a>`;
    this.listingUrl = undefined;
    this.listingPage = undefined;
    this.solicitacaoFormCache = undefined;
    this.empresasCache = undefined;
  }

  private async requestOnce(
    method: "GET" | "POST",
    requestUrl: URL,
    options: RequestOptions,
    timeoutMs: number,
  ): Promise<HttpResponse> {
    const headers = await this.buildRequestHeaders(requestUrl, options);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const body = options.data ? new URLSearchParams(options.data).toString() : undefined;
    if (body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/x-www-form-urlencoded");
    }

    let response: Response;
    try {
      response = await fetch(requestUrl, {
        method,
        headers,
        body,
        redirect: "follow",
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      if (this.shouldFallbackToNodeHttps(error, requestUrl)) {
        return this.requestOnceWithNodeHttps(method, requestUrl, headers, body, timeoutMs, options.asBinary);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    await this.storeCookies(response, response.url || requestUrl.toString());
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const text = options.asBinary && !contentType.includes("text/html")
      ? ""
      : iconv.decode(buffer, contentType.includes("utf-8") ? "utf8" : "latin1");

    return { url: response.url, status: response.status, headers: response.headers, text, buffer };
  }

  private shouldFallbackToNodeHttps(error: unknown, requestUrl: URL): boolean {
    return (
      requestUrl.protocol === "https:" &&
      error instanceof Error &&
      error.message.toLowerCase().includes("unable to connect")
    );
  }

  private async requestOnceWithNodeHttps(
    method: "GET" | "POST",
    requestUrl: URL,
    headers: Headers,
    body: string | undefined,
    timeoutMs: number,
    asBinary?: boolean,
    redirectsRemaining = 5,
  ): Promise<HttpResponse> {
    const response = await this.nodeHttpsOnce(method, requestUrl, headers, body, timeoutMs, asBinary);
    await this.storeHeadersCookies(response.headers, requestUrl.toString());

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const redirectLocation = response.headers.get("location");
      if (!redirectLocation) {
        return response;
      }
      if (redirectsRemaining <= 0) {
        throw new SefazHttpError(`Limite de redirects excedido em ${method} ${requestUrl.toString()}`);
      }
      const redirectUrl = new URL(redirectLocation, requestUrl);
      const nextMethod: "GET" | "POST" = [307, 308].includes(response.status) ? method : "GET";
      const nextHeaders = await this.buildRequestHeaders(redirectUrl, { referer: requestUrl.toString() });
      if (nextMethod === "POST" && body && !nextHeaders.has("Content-Type")) {
        nextHeaders.set("Content-Type", "application/x-www-form-urlencoded");
      }
      return this.requestOnceWithNodeHttps(
        nextMethod,
        redirectUrl,
        nextHeaders,
        nextMethod === "GET" ? undefined : body,
        timeoutMs,
        asBinary,
        redirectsRemaining - 1,
      );
    }

    return response;
  }

  private nodeHttpsOnce(
    method: "GET" | "POST",
    requestUrl: URL,
    headers: Headers,
    body: string | undefined,
    timeoutMs: number,
    asBinary?: boolean,
  ): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
      const request = httpsRequest(
        requestUrl,
        {
          method,
          headers: Object.fromEntries(headers.entries()),
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer | string) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          response.on("end", () => {
            try {
              const responseHeaders = this.headersFromIncoming(response.headers);
              const buffer = Buffer.concat(chunks);
              const contentType = responseHeaders.get("content-type")?.toLowerCase() ?? "";
              const text = asBinary && !contentType.includes("text/html")
                ? ""
                : iconv.decode(buffer, contentType.includes("utf-8") ? "utf8" : "latin1");
              resolve({
                url: requestUrl.toString(),
                status: response.statusCode ?? 0,
                headers: responseHeaders,
                text,
                buffer,
              });
            } catch (error) {
              reject(error);
            }
          });
        },
      );

      request.setTimeout(timeoutMs, () => {
        request.destroy(new SefazHttpError(`Timeout HTTP apos ${timeoutMs}ms em ${method} ${requestUrl.toString()}`));
      });
      request.on("error", reject);
      if (body) {
        request.write(body);
      }
      request.end();
    });
  }

  private headersFromIncoming(headers: IncomingHttpHeaders): Headers {
    const result = new Headers();
    for (const [key, value] of Object.entries(headers)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          result.append(key, item);
        }
      } else if (value != null) {
        result.set(key, String(value));
      }
    }
    return result;
  }

  private async buildRequestHeaders(
    requestUrl: URL,
    options: Pick<RequestOptions, "headers" | "referer">,
  ): Promise<Headers> {
    const headers = new Headers(options.headers ?? {});
    headers.set(
      "User-Agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    );
    headers.set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
    headers.set("Accept-Language", "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7");
    if (options.referer) {
      headers.set("Referer", options.referer);
    }
    const cookie = await this.cookieJar.getCookieString(requestUrl.toString());
    if (cookie) {
      headers.set("Cookie", cookie);
    }
    return headers;
  }

  private async requestWithClientCertificate(
    url: string,
    options: CertificateRequestOptions,
  ): Promise<HttpResponse> {
    const certificate = this.loadClientCertificatePem(options.pfxPath, options.pfxPassword);
    return this.requestWithClientCertificateRedirects(
      new URL(url),
      certificate,
      options.method ?? "GET",
      options.data,
      options.referer,
      options.timeoutMs ?? this.timeoutMs,
      options.redirectLimit ?? 5,
    );
  }

  private async requestWithClientCertificateRedirects(
    requestUrl: URL,
    certificate: ClientCertificatePem,
    method: "GET" | "POST",
    data: Array<[string, string]> | undefined,
    referer: string | undefined,
    timeoutMs: number,
    redirectsRemaining: number,
  ): Promise<HttpResponse> {
    const response = await this.requestWithClientCertificateOnce(requestUrl, certificate, method, data, referer, timeoutMs);
    await this.storeHeadersCookies(response.headers, response.url);

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const redirectLocation = response.headers.get("location");
      if (!redirectLocation) {
        return response;
      }
      if (redirectsRemaining <= 0) {
        throw new SefazHttpError(`Limite de redirects excedido no login por certificado: ${response.url}`);
      }
      const redirectUrl = new URL(redirectLocation, response.url);
      return this.requestWithClientCertificateRedirects(
        redirectUrl,
        certificate,
        "GET",
        undefined,
        response.url,
        timeoutMs,
        redirectsRemaining - 1,
      );
    }

    if (response.status >= 400) {
      throw new SefazNonRetryableHttpError(`Falha HTTP ${response.status} em ${response.url}`);
    }

    return response;
  }

  private async requestWithClientCertificateOnce(
    requestUrl: URL,
    certificate: ClientCertificatePem,
    method: "GET" | "POST",
    data: Array<[string, string]> | undefined,
    referer: string | undefined,
    timeoutMs: number,
  ): Promise<HttpResponse> {
    const headers = await this.buildRequestHeaders(requestUrl, {
      referer,
      headers: { "Upgrade-Insecure-Requests": "1" },
    });
    const body = data ? new URLSearchParams(data).toString() : undefined;
    if (body) {
      headers.set("Content-Type", "application/x-www-form-urlencoded");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(requestUrl, {
        method,
        headers,
        body,
        redirect: "manual",
        signal: controller.signal,
        tls: {
          cert: certificate.cert,
          key: certificate.key,
        },
      } as RequestInit & { tls: { cert: string; key: string } });
    } finally {
      clearTimeout(timeout);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const text = iconv.decode(buffer, contentType.includes("utf-8") ? "utf8" : "latin1");

    return {
      url: response.url || requestUrl.toString(),
      status: response.status,
      headers: response.headers,
      text,
      buffer,
    };
  }

  private loadClientCertificatePem(pfxPath: string, pfxPassword: string): ClientCertificatePem {
    const pfxBuffer = readFileSync(pfxPath);
    const p12Der = forge.util.decode64(pfxBuffer.toString("base64"));
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, pfxPassword);

    const certBagOid = String(forge.pki.oids.certBag);
    const shroudedKeyBagOid = String(forge.pki.oids.pkcs8ShroudedKeyBag);
    const keyBagOid = String(forge.pki.oids.keyBag);

    const certBags = (p12.getBags({ bagType: certBagOid })[certBagOid] ?? []) as Array<{
      cert?: forge.pki.Certificate;
    }>;
    const keyBags = [
      ...(p12.getBags({ bagType: shroudedKeyBagOid })[shroudedKeyBagOid] ?? []),
      ...(p12.getBags({ bagType: keyBagOid })[keyBagOid] ?? []),
    ] as Array<{ key?: forge.pki.PrivateKey }>;

    const cert = certBags
      .map((bag) => bag.cert)
      .filter((cert): cert is forge.pki.Certificate => Boolean(cert))
      .map((cert) => forge.pki.certificateToPem(cert))
      .join("");
    const key = keyBags.find((bag) => bag.key)?.key;

    if (!cert || !key) {
      throw new SefazHttpError("Certificado PFX nao contem certificado e chave privada utilizaveis");
    }

    return {
      cert,
      key: forge.pki.privateKeyToPem(key),
    };
  }

  private async followCertificateJsRedirects(
    response: HttpResponse,
    pfxPath: string,
    pfxPassword: string,
  ): Promise<HttpResponse> {
    let current = response;
    for (let redirectCount = 0; redirectCount < 5; redirectCount += 1) {
      if (current.url.toLowerCase().includes("portal.jsp")) {
        return current;
      }

      const certificateForm = this.parseCertificateFormToSubmit(current);
      if (certificateForm) {
        current = await this.requestWithClientCertificate(certificateForm.actionUrl, {
          pfxPath,
          pfxPassword,
          method: certificateForm.method,
          data: simplifyFormPayload(certificateForm, {}),
          referer: current.url,
        });
        await this.storeHeadersCookies(current.headers, current.url);
        continue;
      }

      const redirectUrl = parseJsRedirect(current.url, current.text);
      if (redirectUrl) {
        current = redirectUrl.includes("/certificado/")
          ? await this.requestWithClientCertificate(redirectUrl, {
            pfxPath,
            pfxPassword,
            referer: current.url,
          })
          : await this.request("GET", redirectUrl, { referer: current.url, checkSession: false });
        await this.storeHeadersCookies(current.headers, current.url);
        continue;
      }

      return current;
    }
    throw new SefazHttpError(`Limite de navegacao excedido no login por certificado: ${current.url}`);
  }

  private parseCertificateFormToSubmit(response: HttpResponse): HtmlForm | undefined {
    try {
      const form = parseForm(response.url, response.url, response.text, "form");
      if (/submit\s*\(/i.test(response.text) || form.fields.usuariosCadastrados) {
        return form;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  private shouldRetryStatus(status: number): boolean {
    return [500, 502, 503, 504].includes(status);
  }

  private shouldRetryError(error: unknown): boolean {
    if (error instanceof SefazSessionExpiredError) {
      return false;
    }
    if (error instanceof SefazNonRetryableHttpError) {
      return false;
    }
    if (error instanceof SefazHttpError) {
      return true;
    }
    return isAbortLikeError(error);
  }

  private normalizeRequestError(
    error: unknown,
    method: string,
    url: string,
    timeoutMs: number,
    attempt: number,
    maxAttempts: number,
  ): unknown {
    if (isAbortLikeError(error)) {
      return new SefazHttpError(
        `Timeout HTTP apos ${timeoutMs}ms em ${method} ${url} (tentativa ${attempt}/${maxAttempts})`,
      );
    }
    if (error instanceof SefazHttpError) {
      return error;
    }
    if (error instanceof Error) {
      return new SefazHttpError(
        `Falha HTTP em ${method} ${url}: ${error.message} (tentativa ${attempt}/${maxAttempts})`,
      );
    }
    return new SefazHttpError(`Falha HTTP em ${method} ${url}: ${String(error)} (tentativa ${attempt}/${maxAttempts})`);
  }

  private async waitBeforeRetry(attempt: number): Promise<void> {
    await sleep(Math.min(5_000, 500 * 2 ** (attempt - 1)));
  }

  private async storeCookies(response: Response, url: string): Promise<void> {
    const headersWithSetCookie = response.headers as Headers & { getSetCookie?: () => string[] };
    const cookies = headersWithSetCookie.getSetCookie?.() ?? [];
    const single = response.headers.get("set-cookie");
    if (!cookies.length && single) {
      cookies.push(single);
    }
    await this.storeCookieHeaders(cookies, url);
  }

  private async storeHeadersCookies(headers: Headers, url: string): Promise<void> {
    const headersWithSetCookie = headers as Headers & { getSetCookie?: () => string[] };
    const cookies = headersWithSetCookie.getSetCookie?.() ?? [];
    const single = headers.get("set-cookie");
    if (!cookies.length && single) {
      cookies.push(single);
    }
    await this.storeCookieHeaders(cookies, url);
  }

  private async storeCookieHeaders(cookies: string[], url: string): Promise<void> {
    for (const cookie of cookies) {
      await this.cookieJar.setCookie(cookie, url);
    }
  }

  private normalizeCertificateLoginError(error: unknown): SefazHttpError {
    if (error instanceof SefazHttpError) {
      return error;
    }
    if (!(error instanceof Error)) {
      return new SefazHttpError(`Falha no login por certificado: ${String(error)}`);
    }

    const lowerMessage = error.message.toLowerCase();
    if (
      lowerMessage.includes("mac verify failure") ||
      lowerMessage.includes("bad decrypt") ||
      lowerMessage.includes("pkcs") ||
      lowerMessage.includes("pfx") ||
      lowerMessage.includes("passphrase") ||
      lowerMessage.includes("password")
    ) {
      return new SefazHttpError(
        "Falha ao abrir certificado PFX. Verifique a senha e se o arquivo informado e um .pfx valido.",
      );
    }

    return new SefazHttpError(`Falha no login por certificado: ${error.message}`);
  }

  private async followJsRedirect(response: HttpResponse, referer?: string): Promise<HttpResponse> {
    const redirectUrl = parseJsRedirect(response.url, response.text);
    if (!redirectUrl) {
      return response;
    }
    return this.request("GET", redirectUrl, { referer: referer ?? response.url });
  }

  private async submitForm(
    form: HtmlForm,
    overrides: Record<string, unknown>,
    options: { retry?: boolean } = {},
  ): Promise<HttpResponse> {
    const payload = simplifyFormPayload(form, overrides);
    if (form.method === "POST") {
      return this.request("POST", form.actionUrl, {
        data: payload,
        headers: { Origin: "https://security.sefaz.se.gov.br", "Content-Type": "application/x-www-form-urlencoded" },
        referer: form.url,
        retry: options.retry,
      });
    }
    return this.request("GET", form.actionUrl, { params: payload, referer: form.url, retry: options.retry });
  }

  private async abrirFormTipoArquivo(inscricaoMunicipal: string, forceRefresh = false): Promise<HtmlForm> {
    const tentativas = forceRefresh ? 1 : 2;
    for (let tentativa = 0; tentativa < tentativas; tentativa += 1) {
      const formInicial = await this.abrirFormularioSolicitacao(forceRefresh || tentativa > 0);
      const responseTipo = await this.submitForm(formInicial, { cdPessoaContribuinte: inscricaoMunicipal });
      const redirected = await this.followJsRedirect(responseTipo, formInicial.actionUrl);
      const formTipo = parseForm(SefazHttpClient.internetBaseUrl, redirected.url, redirected.text);
      if (firstValue(formTipo, "tipoArquivo") !== undefined) {
        return formTipo;
      }
      this.solicitacaoFormCache = undefined;
    }
    throw new SefazHttpError("O portal nao retornou o formulario de tipo de arquivo para a inscricao selecionada");
  }

  private buildCriterioPayload(form: HtmlForm, params: Record<string, string>): Record<string, string> {
    const tipoArquivo = (params.tipo_arquivo ?? "").trim().toUpperCase();
    const overrides: Record<string, string> = {
      dtInicio: (params.data_inicial ?? "").trim(),
      dtFinal: (params.data_final ?? "").trim(),
    };

    if (tipoArquivo === "NFE" || tipoArquivo === "NFC") {
      const pesquisarPor = (params.pesquisar_por ?? "").trim();
      const value = form.selectOptions.tipoPesquisa?.[pesquisarPor];
      if (!value) {
        throw new SefazHttpError(`Tipo de pesquisa invalido para ${tipoArquivo}: ${pesquisarPor}`);
      }
      overrides.tipoPesquisa = value;
      return overrides;
    }

    if (tipoArquivo === "CTE") {
      const checkboxMap: Record<string, string> = {
        Remetente: "Remetente",
        Expedidor: "Expedidor",
        Recebedor: "Recebedor",
        "Destinatário": "Destinatario",
        Destinatario: "Destinatario",
        Emitente: "Emitente",
        Outros: "Outros",
      };
      const checkboxName = checkboxMap[(params.pesquisar_por ?? "").trim()];
      if (!checkboxName) {
        throw new SefazHttpError(`Tipo de pesquisa invalido para CTE: ${params.pesquisar_por}`);
      }
      overrides[checkboxName] = "on";
      return overrides;
    }

    throw new SefazHttpError(`Tipo de arquivo desconhecido: ${tipoArquivo}`);
  }

  private buildListingPageUrl(baseUrl: string, pagina: number): string {
    const parsed = new URL(baseUrl);
    parsed.searchParams.set("navInicio", String((pagina - 1) * SefazHttpClient.navPageStride + 1));
    return parsed.toString();
  }

  private clearNavigationCache(): void {
    this.portalHtml = undefined;
    this.portalUrl = undefined;
    this.listingUrl = undefined;
    this.listingPage = undefined;
    this.solicitacaoFormCache = undefined;
  }

  private salvarHtmlListagemSemNovo(listing: DownloadListingPage): string {
    const debugDir = join(PATHS.projectRoot, "_local", "debug", "sefaz_listing_sem_novo");
    ensureDir(debugDir);
    const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    const path = join(debugDir, `listing_sem_novo_${timestamp}.html`);
    const body = this.lastListingHtml
      ? this.redactSefazTokens(this.lastListingHtml)
      : `Listagem sem HTML capturado. URL: ${this.redactSefazTokens(listing.url)}`;
    writeFileSync(path, body, "utf8");
    return path;
  }

  private redactSefazTokens(value: string): string {
    return value
      .replace(/([?&;]token=)[^"'&;\s<>]+/gi, "$1<redacted>")
      .replace(/(token%3d)[^%&"'<>;\s]+/gi, "$1<redacted>");
  }

  private salvarHtmlDownloadInesperado(info: DownloadInfo, htmlText: string): string {
    const debugDir = join(PATHS.projectRoot, "_local", "debug", "sefaz_download_html");
    ensureDir(debugDir);
    const nomeBase = [info.nmArquivo, info.dtSolicitacao, info.tipoDownload].filter(Boolean).join("_") || "download_html";
    const safeName = nomeBase.replace(/[<>:"/\\|?*\x00-\x1f]+/g, "_").replace(/\s+/g, "_").replace(/^[._\s]+|[._\s]+$/g, "").slice(0, 120);
    const path = join(debugDir, `${safeName || "download_html"}.html`);
    writeFileSync(path, this.redactSefazTokens(htmlText), "utf8");
    return path;
  }

  parseOutputPath(info: DownloadInfo): [string, string, string] {
    return parseNomeEmpresaEAnoMes(info.nmArquivo, info.dtSolicitacao);
  }
}
