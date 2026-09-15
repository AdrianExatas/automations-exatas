import fs from "node:fs";
import forge from "node-forge";
import { decodeSefazText } from "./http-client";
import {
  extractDemonstrativoLink,
  extractExcelDownloaderPath,
  extractPdfPath,
  extractPortalError,
  parseCompanies,
} from "./parser";
import { isPdf, isXls, looksLikeHtml } from "./signatures";
import type { Company, Competencia, DownloadResult, ReportFormat } from "./types";

const SECURITY = "https://security.sefaz.se.gov.br";
const CERT_LOGIN = `${SECURITY}/certificado/login.aspx`;
const PORTAL = `${SECURITY}/internet/portal.jsp`;
const PROCESS = `${SECURITY}/internet/process.jsp`;
const TRANS_ID = "T34693";
const DEFAULT_JASPER = `${SECURITY}/iBusinessPortal/jsp/templates/Pdf/JasperPDF.jsp?AppName=SIT&TransId=${TRANS_ID}`;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

/** Timeout só do probe legado (não usa SEFAZ_TIMEOUT_MS dos downloads). */
export const LEGACY_MTLS_PROBE_TIMEOUT_MS = 8_000;

export class PortalIncompatibleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortalIncompatibleError";
  }
}

export class PortalBusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortalBusinessError";
  }
}

type HttpResponse = {
  url: string;
  status: number;
  headers: Headers;
  text: string;
  bytes: Uint8Array;
};

type PemCert = { cert: string; key: string };

/**
 * Cliente HTTP do Demonstrativo no padrao XML-TS:
 * login mTLS em certificado/login.aspx → portal.jsp → process.jsp T34693.
 */
export class DemonstrativoMtlsHttpClient {
  private readonly cookies = new Map<string, string>();
  private formHtml?: string;
  private formUrl?: string;

  constructor(private readonly timeoutMs = 60_000) {}

  /**
   * Probe do portal legado (certificado/login.aspx → portal.jsp).
   * Usa timeout curto por padrão para não atrasar o fallback Playwright.
   */
  async loginComCertificado(
    pfxPath: string,
    pfxPassword: string,
    options: { timeoutMs?: number } = {},
  ): Promise<void> {
    if (!pfxPath || !fs.existsSync(pfxPath)) {
      throw new PortalIncompatibleError(`Certificado PFX nao encontrado: ${pfxPath}`);
    }
    if (!pfxPassword) {
      throw new PortalIncompatibleError("Senha do certificado PFX vazia.");
    }

    const probeTimeoutMs = options.timeoutMs ?? LEGACY_MTLS_PROBE_TIMEOUT_MS;

    let response: HttpResponse;
    try {
      const pem = loadPfxPem(pfxPath, pfxPassword);
      response = await this.requestWithClientCertificate(CERT_LOGIN, pem, {
        method: "GET",
        referer: "https://www.sefaz.se.gov.br/",
        timeoutMs: probeTimeoutMs,
      });
      assertNotLegacyAccessDenied(response);
      response = await this.followCertificateNavigation(response, pem, probeTimeoutMs);
    } catch (error) {
      throw normalizeCertificateLoginError(error);
    }

    if (!/portal\.jsp/i.test(response.url)) {
      assertNotLegacyAccessDenied(response);
      throw new PortalIncompatibleError(
        extractPortalError(response.text) ?? describeMtlsLoginFailure(response),
      );
    }
  }

  /** Copia cookies do Playwright para continuar downloads sem browser. */
  async adotarSessao(
    browserCookies: Array<{ name: string; value: string; domain?: string }>,
  ): Promise<void> {
    for (const cookie of browserCookies) {
      this.cookies.set(cookie.name, cookie.value);
    }
  }

  async openDemonstrativoForm(): Promise<string> {
    const portal = await this.request("GET", PORTAL);
    let href: string;
    try {
      href = extractDemonstrativoLink(portal.text);
    } catch (error) {
      throw new PortalIncompatibleError(
        error instanceof Error ? error.message : "Link Demonstrativo nao encontrado no portal legado.",
      );
    }
    const formUrl = absoluteUrl(href, `${SECURITY}/internet/`);
    const form = await this.request("GET", formUrl, { referer: portal.url });
    if (!/cdPessoaLookup/i.test(form.text)) {
      throw new PortalIncompatibleError("Formulario do Demonstrativo nao carregou por HTTP (sem cdPessoaLookup).");
    }
    this.formHtml = form.text;
    this.formUrl = form.url;
    return form.text;
  }

  async listCompanies(): Promise<Company[]> {
    const html = this.formHtml ?? (await this.openDemonstrativoForm());
    const companies = parseCompanies(html);
    if (companies.length === 0) {
      throw new PortalIncompatibleError("Nenhuma empresa encontrada no formulario HTTP.");
    }
    return companies;
  }

  async download(company: Company, competencia: Competencia, format: ReportFormat): Promise<DownloadResult> {
    await this.prepareCompany(company.inscricao);

    const generated = await this.request("POST", PROCESS, {
      form: {
        TransId: TRANS_ID,
        Option: "process",
        AppName: "SIT",
        CancelUrl: "/internet/portal.jsp",
        cdCnpj: "",
        cdPessoaLookup: company.inscricao,
        nrMesDia: competencia.monthSelectValue,
        nrAno: String(competencia.year),
        tpFormato: format === "xls" ? "1" : "0",
        DetailField: "",
        MasterField: "",
        okButton: " Ok ",
      },
      referer: this.formUrl ?? PORTAL,
    });

    if (generated.status === 401 || generated.status === 403) {
      throw new PortalIncompatibleError(`HTTP submit Unauthorized status=${generated.status}`);
    }

    if (format === "pdf" && isPdf(generated.bytes)) {
      return { bytes: generated.bytes, contentType: generated.headers.get("content-type") ?? undefined, via: "http" };
    }
    if (format === "xls" && isXls(generated.bytes)) {
      return { bytes: generated.bytes, contentType: generated.headers.get("content-type") ?? undefined, via: "http" };
    }

    const portalError = extractPortalError(generated.text);
    if (portalError) {
      throw new PortalBusinessError(portalError);
    }
    if (/401|unauthorized|access is denied/i.test(generated.text)) {
      throw new PortalIncompatibleError("HTTP submit retornou Unauthorized no HTML.");
    }

    return format === "xls"
      ? this.fetchXlsFromHtml(generated.text, generated.url)
      : this.fetchPdfFromHtml(generated.text, generated.url);
  }

  private async prepareCompany(inscricao: string): Promise<void> {
    if (!this.formHtml) {
      await this.openDemonstrativoForm();
    }
    const response = await this.request("POST", PROCESS, {
      form: {
        TransId: TRANS_ID,
        Option: "",
        AppName: "SIT",
        CancelUrl: "/internet/portal.jsp",
        cdCnpj: "",
        cdPessoaLookup: inscricao,
        DetailField: "",
        MasterField: "",
      },
      referer: this.formUrl ?? PORTAL,
    });
    const portalError = extractPortalError(response.text);
    if (portalError) {
      throw new PortalBusinessError(portalError);
    }
    if (!/nrMesDia/i.test(response.text)) {
      // Alguns ambientes aceitam submit direto sem prepare.
      return;
    }
    this.formHtml = response.text;
    this.formUrl = response.url;
  }

  private async fetchPdfFromHtml(html: string, baseUrl: string): Promise<DownloadResult> {
    let path: string | undefined;
    try {
      path = extractPdfPath(html);
    } catch {
      path = html.match(/window\.open\(\s*['"]([^'"]+)['"]/i)?.[1];
    }
    let absolute = path ? absoluteUrl(path, baseUrl) : DEFAULT_JASPER;
    const hashMatch = absolute.match(/#(\/?iBusinessPortal\/jsp\/templates\/Pdf\/JasperPDF\.jsp[^#]*)/i);
    if (hashMatch?.[1]) {
      absolute = `${SECURITY}${hashMatch[1].startsWith("/") ? "" : "/"}${hashMatch[1]}`;
    }
    const file = await this.request("GET", absolute, { referer: baseUrl });
    if (!isPdf(file.bytes)) {
      const fallback = await this.request("GET", DEFAULT_JASPER, { referer: baseUrl });
      if (!isPdf(fallback.bytes)) {
        throw new PortalIncompatibleError("HTTP PDF: resposta nao e um PDF valido.");
      }
      return { bytes: fallback.bytes, contentType: fallback.headers.get("content-type") ?? undefined, via: "http" };
    }
    return { bytes: file.bytes, contentType: file.headers.get("content-type") ?? undefined, via: "http" };
  }

  private async fetchXlsFromHtml(html: string, baseUrl: string): Promise<DownloadResult> {
    let downloader: string | undefined;
    try {
      downloader = extractExcelDownloaderPath(html);
    } catch {
      downloader =
        html.match(/window\.location\s*=\s*['"]([^'"]*Downloader\.jsp[^'"]*)['"]/i)?.[1] ??
        html.match(/["']([^"']*Downloader\.jsp\?Arquivo=[^"']+)['"]/i)?.[1];
    }
    if (!downloader) {
      throw new PortalIncompatibleError("HTTP XLS: HTML sem Downloader.jsp.");
    }
    const absolute = absoluteUrl(downloader, baseUrl.startsWith("http") ? baseUrl : SECURITY);
    const file = await this.request("GET", absolute, { referer: baseUrl });
    if (!isXls(file.bytes) && looksLikeHtml(file.bytes)) {
      throw new PortalIncompatibleError("HTTP XLS: Downloader retornou HTML.");
    }
    return { bytes: file.bytes, contentType: file.headers.get("content-type") ?? undefined, via: "http" };
  }

  private async followCertificateNavigation(
    initial: HttpResponse,
    pem: PemCert,
    timeoutMs?: number,
  ): Promise<HttpResponse> {
    let current = initial;
    for (let i = 0; i < 8; i += 1) {
      assertNotLegacyAccessDenied(current);
      if (/portal\.jsp/i.test(current.url)) {
        return current;
      }

      // Paridade XML-TS: form de selecao de usuario / auto-submit no /certificado/
      const certificateForm = parseCertificateFormToSubmit(current.text, current.url);
      if (certificateForm) {
        current = await this.requestWithClientCertificate(certificateForm.action, pem, {
          method: certificateForm.method,
          form: certificateForm.fields,
          referer: current.url,
          timeoutMs,
        });
        continue;
      }

      const redirect = parseJsRedirect(current.url, current.text);
      if (redirect) {
        current = /\/certificado\//i.test(redirect)
          ? await this.requestWithClientCertificate(redirect, pem, {
              method: "GET",
              referer: current.url,
              timeoutMs,
            })
          : await this.request("GET", redirect, { referer: current.url, timeoutMs });
        continue;
      }

      return current;
    }
    throw new PortalIncompatibleError(`Limite de redirects no login mTLS: ${current.url}`);
  }

  private async request(
    method: "GET" | "POST",
    url: string,
    options: { form?: Record<string, string>; referer?: string; timeoutMs?: number } = {},
  ): Promise<HttpResponse> {
    const headers = new Headers({
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    });
    if (options.referer) {
      headers.set("referer", options.referer);
    }
    const cookie = this.cookieHeader();
    if (cookie) {
      headers.set("cookie", cookie);
    }

    let body: string | undefined;
    if (options.form) {
      headers.set("content-type", "application/x-www-form-urlencoded");
      body = new URLSearchParams(options.form).toString();
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? this.timeoutMs);
    try {
      let response = await fetch(url, {
        method,
        headers,
        body,
        redirect: "manual",
        signal: controller.signal,
      });
      this.storeCookies(response.headers);

      let redirects = 0;
      while (response.status >= 300 && response.status < 400 && redirects < 10) {
        const location = response.headers.get("location");
        if (!location) {
          break;
        }
        const nextUrl = new URL(location, response.url || url).toString();
        response = await fetch(nextUrl, {
          method: "GET",
          headers: (() => {
            const h = new Headers({ "user-agent": USER_AGENT, accept: headers.get("accept") ?? "*/*" });
            const c = this.cookieHeader();
            if (c) {
              h.set("cookie", c);
            }
            h.set("referer", response.url || url);
            return h;
          })(),
          redirect: "manual",
          signal: controller.signal,
        });
        this.storeCookies(response.headers);
        redirects += 1;
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      const text = decodeSefazText(bytes, response.headers.get("content-type"));
      return {
        url: response.url || url,
        status: response.status,
        headers: response.headers,
        text,
        bytes,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private async requestWithClientCertificate(
    url: string,
    pem: PemCert,
    options: {
      method?: "GET" | "POST";
      form?: Record<string, string>;
      referer?: string;
      timeoutMs?: number;
    },
  ): Promise<HttpResponse> {
    const method = options.method ?? "GET";
    const headers = new Headers({
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "upgrade-insecure-requests": "1",
    });
    if (options.referer) {
      headers.set("referer", options.referer);
    }
    const cookie = this.cookieHeader();
    if (cookie) {
      headers.set("cookie", cookie);
    }
    let body: string | undefined;
    if (options.form) {
      headers.set("content-type", "application/x-www-form-urlencoded");
      body = new URLSearchParams(options.form).toString();
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? this.timeoutMs);
    try {
      let response = await fetch(url, {
        method,
        headers,
        body,
        redirect: "manual",
        signal: controller.signal,
        tls: { cert: pem.cert, key: pem.key },
      } as RequestInit & { tls: { cert: string; key: string } });
      this.storeCookies(response.headers);

      let redirects = 0;
      while ([301, 302, 303, 307, 308].includes(response.status) && redirects < 5) {
        const location = response.headers.get("location");
        if (!location) {
          break;
        }
        const nextUrl = new URL(location, response.url || url).toString();
        response = await fetch(nextUrl, {
          method: "GET",
          headers: (() => {
            const h = new Headers({
              "user-agent": USER_AGENT,
              accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "upgrade-insecure-requests": "1",
              referer: response.url || url,
            });
            const c = this.cookieHeader();
            if (c) {
              h.set("cookie", c);
            }
            return h;
          })(),
          redirect: "manual",
          signal: controller.signal,
          tls: { cert: pem.cert, key: pem.key },
        } as RequestInit & { tls: { cert: string; key: string } });
        this.storeCookies(response.headers);
        redirects += 1;
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      const text = decodeSefazText(bytes, response.headers.get("content-type"));
      return {
        url: response.url || url,
        status: response.status,
        headers: response.headers,
        text,
        bytes,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private cookieHeader(): string {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  private storeCookies(headers: Headers): void {
    const raw = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
    const list = raw.length > 0 ? raw : [headers.get("set-cookie")].filter(Boolean) as string[];
    for (const item of list) {
      const pair = item.split(";", 1)[0]?.trim();
      if (!pair) {
        continue;
      }
      const sep = pair.indexOf("=");
      if (sep <= 0) {
        continue;
      }
      this.cookies.set(pair.slice(0, sep), pair.slice(sep + 1));
    }
  }
}

export function isPortalIncompatibleError(error: unknown): boolean {
  return error instanceof PortalIncompatibleError ||
    (error instanceof Error && error.name === "PortalIncompatibleError");
}

export function isPortalBusinessError(error: unknown): boolean {
  return error instanceof PortalBusinessError ||
    (error instanceof Error && error.name === "PortalBusinessError");
}

function loadPfxPem(pfxPath: string, pfxPassword: string): PemCert {
  const pfxBuffer = fs.readFileSync(pfxPath);
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
    .filter((item): item is forge.pki.Certificate => Boolean(item))
    .map((item) => forge.pki.certificateToPem(item))
    .join("");
  const key = keyBags.find((bag) => bag.key)?.key;
  if (!cert || !key) {
    throw new PortalIncompatibleError("PFX sem certificado/chave utilizaveis.");
  }
  return { cert, key: forge.pki.privateKeyToPem(key) };
}

function parseJsRedirect(baseUrl: string, html: string): string | undefined {
  const patterns = [
    /location\.href\s*=\s*['"]([^'"]+)['"]/i,
    /window\.location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/i,
    /document\.location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/i,
    /location\.replace\(\s*['"]([^'"]+)['"]\s*\)/i,
    /content=["']\d+;\s*url=([^"']+)["']/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) {
      return absoluteUrl(match[1].replace(/&amp;/gi, "&"), baseUrl);
    }
  }
  return undefined;
}

/**
 * Equivalente a parseCertificateFormToSubmit do XML-TS:
 * form com usuariosCadastrados ou auto-submit; inclui selects e botoes submit.
 */
function parseCertificateFormToSubmit(
  html: string,
  pageUrl: string,
): { action: string; method: "GET" | "POST"; fields: Record<string, string> } | undefined {
  const forms = [...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)];
  if (forms.length === 0) {
    return undefined;
  }

  let best:
    | {
        action: string;
        method: "GET" | "POST";
        fields: Record<string, string>;
        score: number;
      }
    | undefined;

  for (const form of forms) {
    const attrs = form[1] ?? "";
    const body = form[2] ?? "";
    const actionAttr = attrs.match(/\baction=["']([^"']*)["']/i)?.[1] || pageUrl;
    const method = /method=["']post["']/i.test(attrs) ? "POST" : "GET";
    const fields: Record<string, string> = {};
    let score = 0;

    for (const input of body.matchAll(/<input\b[^>]*>/gi)) {
      const tag = input[0];
      const name = tag.match(/\bname=["']([^"']+)["']/i)?.[1];
      if (!name) {
        continue;
      }
      const type = (tag.match(/\btype=["']([^"']+)["']/i)?.[1] ?? "text").toLowerCase();
      if (type === "radio" || type === "checkbox") {
        if (!/\bchecked\b/i.test(tag)) {
          continue;
        }
      }
      const value = tag.match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? (type === "checkbox" ? "on" : "");
      fields[name] = value;
      if (type === "submit" || name.toLowerCase().includes("ok") || name.toLowerCase() === "submit") {
        score += 1;
      }
    }

    for (const select of body.matchAll(/<select\b[^>]*\bname=["']([^"']+)["'][^>]*>([\s\S]*?)<\/select>/gi)) {
      const name = select[1] ?? "";
      const optionsHtml = select[2] ?? "";
      const selected = optionsHtml.match(/<option\b[^>]*\bselected\b[^>]*\bvalue=["']([^"']*)["']/i)?.[1];
      const firstValue = [...optionsHtml.matchAll(/<option\b[^>]*\bvalue=["']([^"']*)["']/gi)]
        .map((m) => m[1] ?? "")
        .find((v) => v.trim().length > 0);
      fields[name] = selected ?? firstValue ?? "";
      if (/usuariosCadastrados/i.test(name)) {
        score += 5;
      }
      score += 1;
    }

    if (/usuariosCadastrados/i.test(body)) {
      score += 5;
    }
    if (/submit\s*\(/i.test(html) || /onload\s*=\s*['"][^'"]*submit/i.test(html)) {
      score += 2;
    }
    if (/__VIEWSTATE/i.test(body) && /\/certificado\//i.test(pageUrl)) {
      score += 2;
    }

    if (Object.keys(fields).length === 0) {
      continue;
    }

    if (!best || score > best.score) {
      best = {
        action: absoluteUrl(actionAttr, pageUrl),
        method,
        fields,
        score,
      };
    }
  }

  if (!best) {
    return undefined;
  }
  // Exige indício de form de certificado / auto-submit (evita POST aleatório).
  if (best.score < 2 && !/\/certificado\//i.test(pageUrl)) {
    return undefined;
  }
  if (best.score < 1) {
    return undefined;
  }
  return { action: best.action, method: best.method, fields: best.fields };
}

/** 403 do legado: status HTTP ou pagina HTML "403 - acesso negado" (as vezes com status 200). */
function isLegacyAccessDenied(response: HttpResponse): boolean {
  if (response.status === 403) {
    return true;
  }
  const title =
    response.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
  const sample = `${title}\n${response.text.slice(0, 800)}`.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return /403/i.test(sample) && /acesso\s+negado/i.test(sample);
}

function assertNotLegacyAccessDenied(response: HttpResponse): void {
  if (isLegacyAccessDenied(response)) {
    throw new PortalIncompatibleError(
      "Portal legado retornou 403 (acesso negado) em certificado/login.aspx.",
    );
  }
}

function describeMtlsLoginFailure(response: HttpResponse): string {
  const title =
    response.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
  const snippet = response.text.replace(/\s+/g, " ").trim().slice(0, 280);
  return (
    `Login mTLS nao chegou em portal.jsp ` +
    `(url=${response.url} status=${response.status} bytes=${response.bytes.byteLength}` +
    `${title ? ` title=${title}` : ""}). ` +
    `Portal legado indisponivel para este PFX (comum com Keycloak/portal novo). ` +
    `Trecho: ${snippet || "(html vazio)"}`
  );
}

function normalizeCertificateLoginError(error: unknown): Error {
  if (error instanceof PortalIncompatibleError || error instanceof PortalBusinessError) {
    return error;
  }
  if (!(error instanceof Error)) {
    return new PortalIncompatibleError(`Falha no login por certificado: ${String(error)}`);
  }
  const lower = error.message.toLowerCase();
  if (
    error.name === "AbortError" ||
    lower.includes("aborted") ||
    lower.includes("abort") ||
    lower.includes("timed out") ||
    lower.includes("timeout")
  ) {
    return new PortalIncompatibleError(
      `Probe mTLS legado esgotou o timeout (${LEGACY_MTLS_PROBE_TIMEOUT_MS / 1000}s; portal legado lento ou bloqueado).`,
    );
  }
  if (
    lower.includes("mac verify failure") ||
    lower.includes("bad decrypt") ||
    lower.includes("pkcs") ||
    lower.includes("pfx") ||
    lower.includes("passphrase") ||
    lower.includes("password")
  ) {
    return new PortalIncompatibleError(
      "Falha ao abrir certificado PFX. Verifique a senha e se o arquivo informado e um .pfx valido.",
    );
  }
  return new PortalIncompatibleError(`Falha no login por certificado: ${error.message}`);
}

function absoluteUrl(maybeRelative: string, baseUrl: string): string {
  try {
    return new URL(maybeRelative, baseUrl).toString();
  } catch {
    return maybeRelative;
  }
}
