import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { APIRequestContext, Frame, Page, Request } from "playwright";
import { extractExcelDownloaderPath, extractPdfPath, extractPortalError, parseCompanies } from "./parser";
import { decodeSefazText } from "./http-client";
import { isPdf, isXls, looksLikeHtml } from "./signatures";
import type { Company, Competencia, DownloadResult, ReportFormat } from "./types";

const SECURITY_ORIGIN = "https://security.sefaz.se.gov.br";
const DEFAULT_SUBMIT = `${SECURITY_ORIGIN}/internet/process.jsp`;
const DEFAULT_JASPER = `${SECURITY_ORIGIN}/iBusinessPortal/jsp/templates/Pdf/JasperPDF.jsp?AppName=SIT&TransId=T34693`;
const FORM_GET_CANDIDATES = [
  `${SECURITY_ORIGIN}/internet/process.jsp?TransId=T34693&AppName=SIT`,
  `${SECURITY_ORIGIN}/internet/process.jsp?AppName=SIT&TransId=T34693&Option=`,
];

export type DemonstrativoSubmitFields = {
  cdPessoaLookup: string;
  nrMesDia: string;
  nrAno: string;
  tpFormato: "0" | "1";
  extra?: Record<string, string>;
};

export type DemonstrativoFormContract = {
  submitUrl: string;
  /** Campos base do formulario (hidden + defaults), sem os selects variaveis. */
  baseFields: Record<string, string>;
  capturedAt: string;
  source: "dom" | "network" | "legacy-default";
};

export type HttpCaptureEvent = {
  kind: "request" | "response";
  method?: string;
  url: string;
  status?: number;
  contentType?: string;
  postData?: string;
};

/**
 * Converte URL do viewer Keycloak no GET real do PDF.
 */
export function jasperUrlFromPopup(pageUrl: string): string | undefined {
  try {
    const parsed = new URL(pageUrl);
    const hash = parsed.hash.replace(/^#/, "");
    if (hash && /JasperPDF\.jsp/i.test(hash)) {
      const pathName = hash.startsWith("/") ? hash : `/${hash}`;
      return `${parsed.origin}${pathName}`;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function defaultFormContract(): DemonstrativoFormContract {
  return {
    submitUrl: DEFAULT_SUBMIT,
    baseFields: {
      TransId: "T34693",
      Option: "process",
      AppName: "SIT",
      CancelUrl: "/internet/portal.jsp",
      cdCnpj: "",
      DetailField: "",
      MasterField: "",
      okButton: " Ok ",
    },
    capturedAt: new Date().toISOString(),
    source: "legacy-default",
  };
}

export function isRealFormContract(contract: DemonstrativoFormContract | undefined): boolean {
  return Boolean(contract && contract.source !== "legacy-default");
}

function contractSourceRank(source: DemonstrativoFormContract["source"]): number {
  if (source === "network") {
    return 3;
  }
  if (source === "dom") {
    return 2;
  }
  return 1;
}

/** Une contratos: source mais forte vence submitUrl; campos sao mesclados (primary sobrescreve). */
export function mergeFormContracts(
  a: DemonstrativoFormContract | undefined,
  b: DemonstrativoFormContract | undefined,
): DemonstrativoFormContract | undefined {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  const preferB = contractSourceRank(b.source) >= contractSourceRank(a.source);
  const primary = preferB ? b : a;
  const secondary = preferB ? a : b;
  const baseFields = { ...secondary.baseFields, ...primary.baseFields };
  let submitUrl = primary.submitUrl || secondary.submitUrl;

  // Preserva token na query mesmo se o POST network veio sem ele na URL.
  const token =
    baseFields.token ||
    (() => {
      try {
        return new URL(secondary.submitUrl).searchParams.get("token") || undefined;
      } catch {
        return undefined;
      }
    })() ||
    (() => {
      try {
        return new URL(primary.submitUrl).searchParams.get("token") || undefined;
      } catch {
        return undefined;
      }
    })();
  if (token) {
    baseFields.token = token;
    try {
      const submit = new URL(submitUrl);
      if (!submit.searchParams.get("token")) {
        submit.searchParams.set("token", token);
      }
      submitUrl = submit.toString();
    } catch {
      /* ignore */
    }
  }

  return {
    submitUrl,
    baseFields,
    capturedAt: new Date().toISOString(),
    source: primary.source,
  };
}

/**
 * Extrai action + campos hidden/input/select do formulario SIT no DOM.
 * Inclui token da URL/scripts (portal novo rejeita POST sem token).
 */
export async function extractFormContractFromDom(root: Page | Frame): Promise<DemonstrativoFormContract | undefined> {
  const raw = await root
    .evaluate(() => {
      const lookup = document.querySelector("#cdPessoaLookup, select[name='cdPessoaLookup']");
      const form =
        (lookup?.closest("form") as HTMLFormElement | null) ??
        (document.querySelector("form") as HTMLFormElement | null);
      if (!form && !lookup) {
        return undefined;
      }

      const fields: Record<string, string> = {};
      const scope: ParentNode = form ?? document;
      for (const el of scope.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input[name], select[name], textarea[name]",
      )) {
        const name = el.getAttribute("name");
        if (!name) {
          continue;
        }
        if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio") && !el.checked) {
          continue;
        }
        fields[name] = "value" in el ? String(el.value ?? "") : "";
      }

      let action = form?.action || "";
      if (!action && form?.getAttribute("action")) {
        action = form.getAttribute("action") || "";
      }
      if (!action) {
        action = `${location.origin}/internet/process.jsp`;
      }

      const tokens: string[] = [];
      try {
        const fromUrl = new URL(location.href).searchParams.get("token");
        if (fromUrl) {
          tokens.push(fromUrl);
        }
      } catch {
        /* ignore */
      }
      try {
        const actionUrl = new URL(action, location.href);
        const fromAction = actionUrl.searchParams.get("token");
        if (fromAction) {
          tokens.push(fromAction);
        }
      } catch {
        /* ignore */
      }
      const html = document.documentElement?.outerHTML ?? "";
      for (const match of html.matchAll(/[?&]token=([^&"'<\s]+)/gi)) {
        if (match[1]) {
          tokens.push(decodeURIComponent(match[1]));
        }
      }
      if (!fields.token && tokens[0]) {
        fields.token = tokens[0];
      }

      return { action, fields, pageUrl: location.href, token: fields.token || tokens[0] || "" };
    })
    .catch(() => undefined);

  if (!raw) {
    return undefined;
  }

  let submitUrl = raw.action;
  try {
    submitUrl = new URL(raw.action, raw.pageUrl || SECURITY_ORIGIN).toString();
  } catch {
    submitUrl = DEFAULT_SUBMIT;
  }

  // Remove campos que serao sobrescritos por download.
  const baseFields = { ...raw.fields };
  delete baseFields.cdPessoaLookup;
  delete baseFields.nrMesDia;
  delete baseFields.nrAno;
  delete baseFields.tpFormato;

  if (!baseFields.TransId) {
    baseFields.TransId = "T34693";
  }
  if (!baseFields.AppName) {
    baseFields.AppName = "SIT";
  }
  if (!baseFields.Option) {
    baseFields.Option = "process";
  }
  if (!baseFields.okButton) {
    baseFields.okButton = " Ok ";
  }
  if (raw.token && !baseFields.token) {
    baseFields.token = raw.token;
  }

  // Portal novo exige token na query do process.jsp.
  if (baseFields.token) {
    try {
      const submit = new URL(submitUrl);
      if (!submit.searchParams.get("token")) {
        submit.searchParams.set("token", baseFields.token);
      }
      submitUrl = submit.toString();
    } catch {
      /* ignore */
    }
  }

  return {
    submitUrl,
    baseFields,
    capturedAt: new Date().toISOString(),
    source: "dom",
  };
}

export function contractFromNetworkPost(url: string, postData: string | undefined): DemonstrativoFormContract | undefined {
  if (!postData) {
    return undefined;
  }
  // So aceita POST do process.jsp (evita openid-connect/token cujo body pode conter "T34693" ao acaso).
  if (!/process\.jsp/i.test(url)) {
    return undefined;
  }
  const params = new URLSearchParams(postData);
  const baseFields: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (["cdPessoaLookup", "nrMesDia", "nrAno", "tpFormato"].includes(key)) {
      continue;
    }
    baseFields[key] = value;
  }
  if (!baseFields.TransId) {
    baseFields.TransId = "T34693";
  }
  if (!baseFields.AppName) {
    baseFields.AppName = "SIT";
  }
  if (!baseFields.Option) {
    baseFields.Option = "process";
  }

  return {
    submitUrl: url,
    baseFields,
    capturedAt: new Date().toISOString(),
    source: "network",
  };
}

/**
 * Lista empresas via GET HTML autenticado (cookies do BrowserContext).
 * Tenta a URL do form e candidatos process.jsp; retorna undefined se nao achar select.
 */
export async function listCompaniesViaHttp(
  request: APIRequestContext,
  options: { formPageUrl?: string; contract?: DemonstrativoFormContract } = {},
): Promise<Company[] | undefined> {
  const urls: string[] = [];
  if (options.formPageUrl && /^https?:\/\//i.test(options.formPageUrl)) {
    urls.push(options.formPageUrl.split("#")[0]!);
  }
  if (options.contract?.submitUrl) {
    try {
      const submit = new URL(options.contract.submitUrl);
      submit.searchParams.set("TransId", options.contract.baseFields.TransId || "T34693");
      submit.searchParams.set("AppName", options.contract.baseFields.AppName || "SIT");
      urls.push(submit.toString());
    } catch {
      /* ignore */
    }
  }
  urls.push(...FORM_GET_CANDIDATES);

  const seen = new Set<string>();
  for (const url of urls) {
    if (seen.has(url)) {
      continue;
    }
    seen.add(url);
    try {
      const response = await request.get(url, { timeout: 30_000, maxRedirects: 10 });
      if (response.status() === 401 || response.status() === 403) {
        throw new Error(`HTTP listCompanies Unauthorized status=${response.status()} url=${response.url()}`);
      }
      if (response.status() >= 400) {
        continue;
      }
      const html = await response.text();
      if (/401|unauthorized|access is denied/i.test(html) && !/cdPessoaLookup/i.test(html)) {
        throw new Error(`HTTP listCompanies Unauthorized url=${response.url()}`);
      }
      if (!/cdPessoaLookup/i.test(html)) {
        continue;
      }
      const companies = parseCompanies(html);
      if (companies.length > 0) {
        return companies;
      }
    } catch (error) {
      if (/Unauthorized|401/i.test(error instanceof Error ? error.message : String(error))) {
        throw error;
      }
    }
  }

  return undefined;
}

export class DemonstrativoApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private contract: DemonstrativoFormContract = defaultFormContract(),
  ) {}

  getContract(): DemonstrativoFormContract {
    return this.contract;
  }

  setContract(contract: DemonstrativoFormContract): void {
    this.contract = contract;
  }

  buildForm(
    company: Company,
    competencia: Competencia,
    format: ReportFormat,
  ): Record<string, string> {
    const base = this.contract.baseFields;
    // Ordem igual ao POST real da UI (servidor SIT e sensivel a isso).
    return {
      TransId: base.TransId || "T34693",
      Option: base.Option || "process",
      AppName: base.AppName || "SIT",
      CancelUrl: base.CancelUrl || "/internet/portal.jsp",
      cdCnpj: base.cdCnpj ?? "",
      cdPessoaLookup: company.inscricao,
      nrMesDia: competencia.monthSelectValue,
      nrAno: String(competencia.year),
      tpFormato: format === "xls" ? "1" : "0",
      DetailField: base.DetailField ?? "",
      MasterField: base.MasterField ?? "",
      okButton: base.okButton || " Ok ",
    };
  }

  async download(company: Company, competencia: Competencia, format: ReportFormat): Promise<DownloadResult> {
    return this.downloadOnce(company, competencia, format, true);
  }

  private async downloadOnce(
    company: Company,
    competencia: Competencia,
    format: ReportFormat,
    allowTokenRetry: boolean,
  ): Promise<DownloadResult> {
    const form = this.buildForm(company, competencia, format);
    // UI real posta em process.jsp limpo (sem query). Token/cancelButton no POST causam logout.
    let submitUrl = this.contract.submitUrl;
    try {
      const parsed = new URL(this.contract.submitUrl);
      submitUrl = `${parsed.origin}${parsed.pathname}`;
    } catch {
      submitUrl = DEFAULT_SUBMIT;
    }

    // Reabre o form via GET (estado server-side apos um Ok anterior).
    const formGet = `${submitUrl}?TransId=${encodeURIComponent(form.TransId || "T34693")}&AppName=${encodeURIComponent(form.AppName || "SIT")}`;

    // Body na ordem exata do POST UI. URLSearchParams usa '+' nos espacos (como o browser).
    const params = new URLSearchParams();
    for (const [key, value] of [
      ["TransId", form.TransId],
      ["Option", form.Option],
      ["AppName", form.AppName],
      ["CancelUrl", form.CancelUrl],
      ["cdCnpj", form.cdCnpj],
      ["cdPessoaLookup", form.cdPessoaLookup],
      ["nrMesDia", form.nrMesDia],
      ["nrAno", form.nrAno],
      ["tpFormato", form.tpFormato],
      ["DetailField", form.DetailField],
      ["MasterField", form.MasterField],
      ["okButton", form.okButton],
    ] as Array<[string, string]>) {
      params.append(key, value ?? "");
    }
    const postBody = params.toString();

    const referer = submitUrl;

    // UI dispara change no select antes do Ok — o servidor precisa desse POST parcial.
    const prepareParams = new URLSearchParams();
    for (const [key, value] of [
      ["TransId", form.TransId],
      ["Option", ""],
      ["AppName", form.AppName],
      ["CancelUrl", form.CancelUrl],
      ["cdCnpj", form.cdCnpj],
      ["cdPessoaLookup", form.cdPessoaLookup],
      ["DetailField", form.DetailField],
      ["MasterField", form.MasterField],
    ] as Array<[string, string]>) {
      prepareParams.append(key, value ?? "");
    }
    await this.request
      .post(submitUrl, {
        data: prepareParams.toString(),
        timeout: 60_000,
        maxRedirects: 5,
        headers: {
          Referer: referer,
          Origin: SECURITY_ORIGIN,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })
      .catch(() => undefined);

    process.stderr.write(`[http-map] HTTP POST ${submitUrl}\n[http-map] body=${postBody.slice(0, 500)}\n`);
    let response = await this.request.post(submitUrl, {
      data: postBody,
      timeout: 90_000,
      maxRedirects: 0,
      headers: {
        Referer: referer,
        Origin: SECURITY_ORIGIN,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    let status = response.status();
    let contentType = response.headers()["content-type"] ?? "";
    let body = new Uint8Array(await response.body());
    let finalUrl = response.url() || this.contract.submitUrl;

    // Segue redirects manuais, abortando se for logout/unauthorized.
    for (let redirects = 0; status >= 300 && status < 400 && redirects < 8; redirects += 1) {
      const location = response.headers()["location"];
      if (!location) {
        break;
      }
      const next = absoluteUrl(location, finalUrl.startsWith("http") ? finalUrl : SECURITY_ORIGIN);
      if (/logout|erroLogin|unauthorized|access.?denied/i.test(next)) {
        throw new Error(`HTTP submit redirecionou para logout/unauth: ${next}`);
      }
      response = await this.request.get(next, {
        timeout: 90_000,
        maxRedirects: 0,
        headers: { Referer: referer },
      });
      status = response.status();
      contentType = response.headers()["content-type"] ?? "";
      body = new Uint8Array(await response.body());
      finalUrl = response.url() || next;
    }

    if (status === 401 || status === 403) {
      throw new Error(`HTTP submit falhou status=${status} Unauthorized url=${finalUrl}`);
    }
    if (status >= 400) {
      throw new Error(`HTTP submit falhou status=${status} url=${finalUrl}`);
    }

    if (format === "pdf" && isPdf(body)) {
      return { bytes: body, contentType, via: "http" };
    }
    if (format === "xls" && isXls(body)) {
      return { bytes: body, contentType, via: "http" };
    }

    if (!looksLikeHtml(body) && body.byteLength > 64) {
      if (format === "xls" || /excel|octet|spreadsheet/i.test(contentType)) {
        return { bytes: body, contentType, via: "http" };
      }
    }

    const html = decodeSefazText(body, contentType);
    if (/logout_certificate|Saida\s*<\/title>/i.test(html)) {
      throw new Error(`HTTP submit invalidou a sessao (logout). url=${finalUrl}`);
    }
    const portalError = extractPortalError(html);
    if (portalError) {
      throw new Error(portalError);
    }
    if (/401|unauthorized|access is denied/i.test(html)) {
      throw new Error(`HTTP submit retornou Unauthorized (401) url=${finalUrl}`);
    }

    // Soft-redirect do portal novo: window.location = process.jsp?...&token=...
    const tokenRedirect = html.match(/window\.location\s*=\s*['"]([^'"]*process\.jsp[^'"]*token=[^'"]+)['"]/i)?.[1];
    if (tokenRedirect && allowTokenRetry) {
      const absolute = absoluteUrl(tokenRedirect, finalUrl.startsWith("http") ? finalUrl : SECURITY_ORIGIN);
      try {
        const redirected = new URL(absolute);
        const token = redirected.searchParams.get("token");
        if (token) {
          // Atualiza token e reabre a URL do redirect (GET) antes de reenviar o POST.
          await this.request.get(absolute, { timeout: 30_000, maxRedirects: 5 }).catch(() => undefined);
          this.contract = {
            ...this.contract,
            submitUrl: (() => {
              try {
                const submit = new URL(this.contract.submitUrl);
                submit.searchParams.set("token", token);
                return submit.toString();
              } catch {
                return this.contract.submitUrl;
              }
            })(),
            baseFields: { ...this.contract.baseFields, token },
            capturedAt: new Date().toISOString(),
            source: this.contract.source === "legacy-default" ? "network" : this.contract.source,
          };
          return this.downloadOnce(company, competencia, format, false);
        }
      } catch {
        /* segue fluxo normal */
      }
    }

    if (format === "pdf") {
      try {
        return await this.fetchPdfFromHtml(html, finalUrl);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`${msg} | submitUrl=${finalUrl} bytes=${body.byteLength} excerpt=${html.replace(/\s+/g, " ").trim().slice(0, 320)}`);
      }
    }
    try {
      return await this.fetchXlsFromHtml(html, finalUrl);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`${msg} | submitUrl=${finalUrl} bytes=${body.byteLength} excerpt=${html.replace(/\s+/g, " ").trim().slice(0, 320)}`);
    }
  }

  async followFromHtml(html: string, baseUrl: string, format: ReportFormat): Promise<DownloadResult> {
    const portalError = extractPortalError(html);
    if (portalError) {
      throw new Error(portalError);
    }
    if (/401|unauthorized|access is denied|logout_certificate/i.test(html)) {
      throw new Error(`HTTP followFromHtml Unauthorized/base=${baseUrl}`);
    }
    if (format === "pdf") {
      return this.fetchPdfFromHtml(html, baseUrl);
    }
    return this.fetchXlsFromHtml(html, baseUrl);
  }

  private async fetchPdfFromHtml(html: string, baseUrl: string): Promise<DownloadResult> {
    let pdfPath: string | undefined;
    try {
      pdfPath = extractPdfPath(html);
    } catch {
      pdfPath = undefined;
    }

    const openMatch = html.match(/window\.open\(\s*['"]([^'"]+)['"]/i)?.[1];
    const candidate = pdfPath || openMatch;
    let absolute =
      candidate && /JasperPDF|popup\.jsp/i.test(candidate)
        ? absoluteUrl(candidate, baseUrl)
        : DEFAULT_JASPER;

    const fromPopup = jasperUrlFromPopup(absolute);
    if (fromPopup) {
      absolute = fromPopup;
    }

    const fileResponse = await this.request.get(absolute, { timeout: 90_000 });
    const bytes = new Uint8Array(await fileResponse.body());
    if (!isPdf(bytes)) {
      // fallback padrao SIT
      const fallback = await this.request.get(DEFAULT_JASPER, { timeout: 90_000 });
      const fallbackBytes = new Uint8Array(await fallback.body());
      if (!isPdf(fallbackBytes)) {
        throw new Error("HTTP PDF: resposta nao e um PDF valido.");
      }
      return { bytes: fallbackBytes, contentType: fallback.headers()["content-type"], via: "http" };
    }
    return { bytes, contentType: fileResponse.headers()["content-type"], via: "http" };
  }

  private async fetchXlsFromHtml(html: string, baseUrl: string): Promise<DownloadResult> {
    let downloader: string | undefined;
    try {
      downloader = extractExcelDownloaderPath(html);
    } catch {
      const loc = html.match(/window\.location\s*=\s*['"]([^'"]*Downloader\.jsp[^'"]*)['"]/i)?.[1];
      const href = html.match(/["']([^"']*Downloader\.jsp\?Arquivo=[^"']+)['"]/i)?.[1];
      downloader = loc || href;
    }
    if (!downloader) {
      throw new Error("HTTP XLS: HTML sem Downloader.jsp (contrato incompleto).");
    }

    const absolute = absoluteUrl(downloader, baseUrl.startsWith("http") ? baseUrl : SECURITY_ORIGIN);
    const fileResponse = await this.request.get(absolute, { timeout: 90_000 });
    const bytes = new Uint8Array(await fileResponse.body());
    if (!isXls(bytes) && looksLikeHtml(bytes)) {
      throw new Error("HTTP XLS: Downloader retornou HTML em vez de XLS.");
    }
    return { bytes, contentType: fileResponse.headers()["content-type"], via: "http" };
  }
}

export function isInterestingSefazRequest(request: Request): boolean {
  const url = request.url();
  return /sefaz\.se\.gov\.br/i.test(url) && /process\.jsp|Downloader\.jsp|JasperPDF|popup\.jsp/i.test(url);
}

export async function saveHttpCaptureSummary(
  events: HttpCaptureEvent[],
  contract: DemonstrativoFormContract | undefined,
  meta: Record<string, unknown> = {},
): Promise<string> {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../scripts/har");
  await fs.mkdir(dir, { recursive: true });
  const outPath = path.join(dir, "demonstrativo-xls-summary.json");
  const interesting = events.filter((event) =>
    /process\.jsp|Downloader|JasperPDF|popup\.jsp|octet|excel|pdf/i.test(event.url + (event.contentType ?? "")),
  );
  const fieldKeys = contract ? Object.keys(contract.baseFields).sort() : [];
  const tokenLikeFields = fieldKeys.filter((key) =>
    /token|csrf|sess|viewstate|javax|hash|nonce|captcha|ticket/i.test(key),
  );
  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        savedAt: new Date().toISOString(),
        contract,
        contractMeta: contract
          ? {
              source: contract.source,
              submitUrl: contract.submitUrl,
              fieldCount: fieldKeys.length,
              fieldKeys,
              tokenLikeFields,
            }
          : undefined,
        interesting,
        events: events.slice(-120),
        ...meta,
      },
      null,
      2,
    ),
    "utf8",
  );
  return outPath;
}

function absoluteUrl(maybeRelative: string, baseUrl: string): string {
  try {
    return new URL(maybeRelative, baseUrl).toString();
  } catch {
    return maybeRelative;
  }
}
