import { writeFileSync } from "node:fs";
import { join } from "node:path";
import iconv from "iconv-lite";
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
  static readonly internetBaseUrl = "https://security.sefaz.se.gov.br/internet/";
  static readonly portalUrl = "https://security.sefaz.se.gov.br/internet/portal.jsp";
  static readonly navPageStride = 15;

  private readonly cookieJar = new CookieJar();
  private portalHtml?: string;
  private portalUrl?: string;
  private listingUrl?: string;
  private listingPage?: DownloadListingPage;
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

  async abrirFormularioSolicitacao(forceRefresh = false): Promise<HtmlForm> {
    if (!forceRefresh && this.solicitacaoFormCache) {
      return this.solicitacaoFormCache;
    }
    const listing = await this.abrirListagemDownloads();
    if (!listing.newRequestUrl) {
      throw new SefazHttpError("Nao foi possivel localizar o link 'Novo' na listagem");
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
    const empresas: Array<{ inscricao: string; nome: string }> = [];
    for (const [texto, valor] of Object.entries(form.selectOptions.cdPessoaContribuinte ?? {})) {
      const inscricao = valor.trim();
      const nome = texto.trim();
      if (!inscricao || !nome || nome.toLowerCase().startsWith("selecione")) {
        continue;
      }
      empresas.push({ inscricao, nome });
    }
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

  async abrirListagemDownloads(readyOnly = false): Promise<DownloadListingPage> {
    if (!readyOnly && this.listingPage) {
      return this.listingPage;
    }
    const portal = await this.ensurePortal();
    const solicitarXmlUrl = parsePortalMenuLink(portal.url, portal.text, "Solicitar Arquivos XML");
    if (!solicitarXmlUrl) {
      throw new SefazHttpError("Nao foi possivel localizar o menu 'Solicitar Arquivos XML'");
    }

    let response = await this.request("GET", solicitarXmlUrl, { referer: portal.url });
    response = await this.followJsRedirect(response, solicitarXmlUrl);
    const listing = parseDownloadListing(SefazHttpClient.internetBaseUrl, response.url, response.text, readyOnly);
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

    if (pagina === 1 && current.currentPage === 1) {
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
    let downloadUrl = info.url;
    let referer = this.listingUrl ?? SefazHttpClient.portalUrl;

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
      break;
    }

    if (!verificarZipValido(tempFile)) {
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

  private async requestOnce(
    method: "GET" | "POST",
    requestUrl: URL,
    options: RequestOptions,
    timeoutMs: number,
  ): Promise<HttpResponse> {
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
    } finally {
      clearTimeout(timeout);
    }

    await this.storeCookies(response, requestUrl.toString());
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const text = options.asBinary && !contentType.includes("text/html")
      ? ""
      : iconv.decode(buffer, contentType.includes("utf-8") ? "utf8" : "latin1");

    return { url: response.url, status: response.status, headers: response.headers, text, buffer };
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
    for (const cookie of cookies) {
      await this.cookieJar.setCookie(cookie, url);
    }
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

  private salvarHtmlDownloadInesperado(info: DownloadInfo, htmlText: string): string {
    const debugDir = join(PATHS.projectRoot, "_local", "debug", "sefaz_download_html");
    ensureDir(debugDir);
    const nomeBase = [info.nmArquivo, info.dtSolicitacao, info.tipoDownload].filter(Boolean).join("_") || "download_html";
    const safeName = nomeBase.replace(/[<>:"/\\|?*\x00-\x1f]+/g, "_").replace(/\s+/g, "_").replace(/^[._\s]+|[._\s]+$/g, "").slice(0, 120);
    const path = join(debugDir, `${safeName || "download_html"}.html`);
    writeFileSync(path, htmlText, "utf8");
    return path;
  }

  parseOutputPath(info: DownloadInfo): [string, string, string] {
    return parseNomeEmpresaEAnoMes(info.nmArquivo, info.dtSolicitacao);
  }
}
