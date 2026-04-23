import { HttpClient } from "./http-client";
import {
  extractDemonstrativoLink,
  extractExcelDownloaderPath,
  extractPdfPath,
  extractPortalError,
  hasSelectOption,
  parseCompanies,
} from "./parser";
import { isPdf, isXls, looksLikeHtml } from "./signatures";
import type { Company, Competencia, DownloadResult, ReportFormat } from "./types";

const BASE_URL = "https://security.sefaz.se.gov.br";
const LOGIN_FORM_URL = "/internet/portal/contabilista/atoAcessoContabilista.jsp";
const LOGIN_POST_URL = "/internet/login/login.jsp";
const PORTAL_URL = "/internet/portal.jsp";
const PROCESS_URL = "/internet/process.jsp";
const TRANS_ID = "T34693";

export class SefazHttpClient {
  private readonly http: HttpClient;
  private demonstrativoHref?: string;

  constructor(timeoutMs: number) {
    this.http = new HttpClient(BASE_URL, timeoutMs);
  }

  async login(user: string, password: string): Promise<void> {
    await this.http.get(LOGIN_FORM_URL);
    const response = await this.http.postForm(LOGIN_POST_URL, {
      aba: "contabilista",
      UserName: user,
      Password: password,
      submit: " OK ",
      Op: "1",
      Login: "Contabilista",
    });
    const html = this.http.text(response);
    if (!/portal\.jsp/i.test(response.url) && !/logout\.jsp|DIA/i.test(html)) {
      throw new Error("Login HTTP nao confirmou acesso ao portal.");
    }
  }

  async listCompanies(): Promise<Company[]> {
    const html = await this.openDemonstrativoForm();
    const companies = parseCompanies(html);
    if (companies.length === 0) {
      throw new Error("Nenhuma empresa disponivel foi encontrada no portal.");
    }

    return companies;
  }

  async download(company: Company, competencia: Competencia, format: ReportFormat): Promise<DownloadResult> {
    const html = await this.prepareCompany(company.inscricao);
    this.assertOptionAvailable(html, "nrMesDia", competencia.monthSelectValue, "mes");
    this.assertOptionAvailable(html, "nrAno", String(competencia.year), "ano");

    const generated = await this.http.postForm(PROCESS_URL, {
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
    });

    const responseHtml = this.http.text(generated);
    const portalError = extractPortalError(responseHtml);
    if (portalError) {
      throw new Error(portalError);
    }

    return format === "xls" ? this.downloadExcel(responseHtml) : this.downloadPdf(responseHtml);
  }

  private async openDemonstrativoForm(): Promise<string> {
    const portal = await this.http.get(PORTAL_URL);
    const portalHtml = this.http.text(portal);
    this.demonstrativoHref = extractDemonstrativoLink(portalHtml);
    const form = await this.http.get(`/internet/${this.demonstrativoHref.replace(/^\/?internet\//, "")}`);
    const html = this.http.text(form);
    if (!/cdPessoaLookup/i.test(html)) {
      throw new Error("Formulario do Demonstrativo nao carregou por HTTP.");
    }

    return html;
  }

  private async prepareCompany(inscricao: string): Promise<string> {
    await this.openDemonstrativoForm();
    const response = await this.http.postForm(PROCESS_URL, {
      TransId: TRANS_ID,
      Option: "",
      AppName: "SIT",
      CancelUrl: "/internet/portal.jsp",
      cdCnpj: "",
      cdPessoaLookup: inscricao,
      DetailField: "",
      MasterField: "",
    });
    const html = this.http.text(response);
    const portalError = extractPortalError(html);
    if (portalError) {
      throw new Error(portalError);
    }
    if (!/nrMesDia/i.test(html) || !/nrAno/i.test(html) || !/tpFormato/i.test(html)) {
      throw new Error("Formulario de competencia/formato nao carregou apos selecionar a empresa.");
    }

    return html;
  }

  private async downloadExcel(html: string): Promise<DownloadResult> {
    const downloaderPath = extractExcelDownloaderPath(html);
    const response = await this.http.get(downloaderPath);
    if (!isXls(response.bytes) || looksLikeHtml(response.bytes)) {
      throw new Error("Resposta do Excel nao contem um XLS valido.");
    }

    return {
      bytes: response.bytes,
      suggestedFilename: filenameFromDisposition(response.headers.get("content-disposition") ?? undefined),
      contentType: response.headers.get("content-type") ?? undefined,
    };
  }

  private async downloadPdf(html: string): Promise<DownloadResult> {
    const pdfPath = extractPdfPath(html);
    const response = await this.http.get(pdfPath);
    if (!isPdf(response.bytes) || looksLikeHtml(response.bytes)) {
      throw new Error("Resposta do Jasper nao contem um PDF valido.");
    }

    return {
      bytes: response.bytes,
      suggestedFilename: filenameFromDisposition(response.headers.get("content-disposition") ?? undefined),
      contentType: response.headers.get("content-type") ?? undefined,
    };
  }

  private assertOptionAvailable(html: string, selectId: string, value: string, label: string): void {
    if (!hasSelectOption(html, selectId, value)) {
      throw new Error(`Opcao de ${label} '${value}' nao disponivel para a empresa.`);
    }
  }
}

function filenameFromDisposition(disposition: string | undefined): string | undefined {
  return disposition?.match(/filename\*?=(?:"([^"]+)"|([^;\s]+))/i)?.[1] ?? disposition?.match(/filename\*?=(?:"([^"]+)"|([^;\s]+))/i)?.[2];
}
