import type { AxiosInstance, AxiosResponse } from "axios";
import FormData from "form-data";
import { log } from "../shared/logger";

const TOKEN_PATTERNS = [
  /name="inputTokenCSRF"[^>]*value="([^"]+)"/i,
  /value="([^"]+)"[^>]*name="inputTokenCSRF"/i,
  /id="inputTokenCSRF"[^>]*value="([^"]+)"/i,
  /value="([^"]+)"[^>]*id="inputTokenCSRF"/i,
  /name="__RequestVerificationToken"\s+value="([^"]+)"/i,
  /name="__RequestVerificationToken"[^>]*value="([^"]+)"/i,
  /value="([^"]+)"[^>]*name="__RequestVerificationToken"/i,
  /__RequestVerificationToken[\s\S]*?value=["']([^"']+)["']/i,
  /value=["']([^"']+)["'][\s\S]*?__RequestVerificationToken/i,
];

interface JsonError {
  Erro?: boolean;
  Mensagem?: string;
}

interface ParceiroEmpresa {
  Id: number;
  CnpjCpf?: string;
  RazaoSocialNome?: string;
}

interface Documento {
  Id: number;
  NumeroItem?: number;
  Nome: string;
  Tamanho?: number;
}

interface ConfigCert {
  Folder?: string;
  Documento?: Documento;
}

export function extractToken(html: unknown): string {
  const str: string = typeof html === "string" ? html : String(html ?? "");
  for (const re of TOKEN_PATTERNS) {
    const m = str.match(re);
    if (m && m[1]) return m[1];
  }
  throw new Error("Token anti-CSRF não encontrado no HTML.");
}

function isCnpj(value: string): boolean {
  const cleaned = String(value).replace(/\D/g, "");
  return cleaned.length >= 10 && cleaned.length <= 14;
}

function _newFolderGuid(): string {
  const hex = "0123456789abcdef";
  const rnd = () => Array.from({ length: 4 }, () => hex[Math.floor(Math.random() * 16)]).join("");
  return `${rnd()}${rnd()}-${rnd()}-${rnd()}-${rnd()}-${rnd()}${rnd()}${rnd()}`;
}

function checkJsonError(d: JsonError | undefined, step: string): void {
  if (d && d.Erro === true) {
    const msg = d.Mensagem != null ? d.Mensagem : "Erro desconhecido";
    throw new Error(`${step}: ${msg}`);
  }
}

function parseSetCookie(headers: Record<string, unknown>): string[] {
  const setCookie = headers["set-cookie"];
  if (!setCookie) return [];
  return Array.isArray(setCookie) ? (setCookie as string[]) : [String(setCookie)];
}

function cookieHeader(cookieLines: string[]): string {
  return cookieLines
    .map((line) => line.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

const BASE_URL = "https://app.unecont.com";
const LOGIN_URL = `${BASE_URL}/_login/Login.aspx`;
const EMPRESAS_URL = `${BASE_URL}/Contador/Empresas/Default.aspx`;
const UPLOAD_URL = `${BASE_URL}/_pages/_upload/Upload.ashx`;

export class UnecontCertificadoService {
  private client: AxiosInstance;
  private cookieLines: string[] = [];
  private empresasToken = "";

  constructor(client: AxiosInstance) {
    this.client = client;
    this.client.interceptors.response.use((response: AxiosResponse) => {
      const newCookies = parseSetCookie(response.headers as Record<string, unknown>);
      if (newCookies.length) this.cookieLines = [...this.cookieLines, ...newCookies];
      return response;
    });
  }

  async login(email: string, senha: string): Promise<void> {
    log("Obtendo página de login...");
    const loginPage = await this.client.get(LOGIN_URL, {
      maxRedirects: 5,
      validateStatus: (s: number) => s >= 200 && s < 400,
      headers: this.cookieLines.length ? { Cookie: cookieHeader(this.cookieLines) } : {},
    });
    const loginToken = extractToken(loginPage.data);
    log("Token de login obtido.");

    log("Efetuando login...");
    const loginRes = await this.client.post(
      `${LOGIN_URL}/LogaUsuario`,
      { login: email, senha },
      {
        headers: {
          Cookie: cookieHeader(this.cookieLines),
          requestverificationtoken: loginToken,
          "Content-Type": "application/json; charset=UTF-8",
        },
      },
    );
    const loginData = loginRes.data as { d?: JsonError };
    if (loginData?.d?.Erro === true) {
      throw new Error("Login: " + (loginData.d.Mensagem || "Falha no login"));
    }
    log("Login OK.");

    log("Carregando página Empresas...");
    const empresasPage = await this.client.get(`${EMPRESAS_URL}/Default.aspx`, {
      maxRedirects: 5,
      validateStatus: (s: number) => s >= 200 && s < 400,
      headers: { Cookie: cookieHeader(this.cookieLines) },
    });
    this.empresasToken = extractToken(empresasPage.data);
    log("Token da área Empresas obtido.");
  }

  private defaultHeaders(): Record<string, string> {
    return {
      Cookie: cookieHeader(this.cookieLines),
      requestverificationtoken: this.empresasToken,
      "Content-Type": "application/json; charset=UTF-8",
    };
  }

  async buscarEmpresa(empresa: string): Promise<{
    parceiroEmpresa: ParceiroEmpresa;
    folder: string | null;
    documento: Documento | null;
  }> {
    let parceiroEmpresaId: number;

    if (isCnpj(empresa)) {
      log("Buscando empresa por CNPJ...");
      const listRes = await this.client.post(
        `${EMPRESAS_URL}/ListaEmpresas`,
        {
          parametroPesquisa: {
            TextoPesquisa: empresa.trim(),
            Pagina: 1,
            QuantidadeRegistros: 10,
          },
          filtroListagem: null,
          exibeExcluido: 0,
        },
        { headers: this.defaultHeaders() },
      );
      const d = (listRes.data as { d?: { items?: { Id: number }[] } })?.d;
      checkJsonError(d as JsonError, "ListaEmpresas");
      const items = d?.items ?? [];
      if (items.length === 0) throw new Error("Nenhuma empresa encontrada para o CNPJ informado.");
      parceiroEmpresaId = items[0].Id;
      log(`Empresa encontrada: ParceiroEmpresaId=${parceiroEmpresaId}`);
    } else {
      parceiroEmpresaId = parseInt(empresa.trim(), 10);
      if (Number.isNaN(parceiroEmpresaId))
        throw new Error("UNECONT_EMPRESA deve ser CNPJ ou número (parceiroEmpresaId).");
      log(`Usando ParceiroEmpresaId=${parceiroEmpresaId}`);
    }

    log("Selecionando empresa (certificado)...");
    const selRes = await this.client.post(
      `${EMPRESAS_URL}/SelecionaParceiroEmpresaComCertificado`,
      { parceiroEmpresaId },
      { headers: this.defaultHeaders() },
    );
    const selD = (selRes.data as { d?: { DTO?: Record<string, unknown> } })?.d;
    checkJsonError(selD as JsonError, "SelecionaParceiroEmpresaComCertificado");
    const dto = selD?.DTO as Record<string, unknown> | undefined;
    if (!dto) throw new Error("Resposta sem DTO em SelecionaParceiroEmpresaComCertificado");

    const configCert = (dto.ParceiroEmpresaConfiguracao as Record<string, unknown> | undefined)
      ?.ParceiroEmpresaCertificado as ConfigCert | undefined;

    return {
      parceiroEmpresa: {
        Id: dto.ParceiroEmpresaId as number,
        CnpjCpf: (dto.Cnpj ?? dto.CnpjCpf) as string | undefined,
        RazaoSocialNome: dto.RazaoSocialNome as string | undefined,
      },
      folder: configCert?.Folder ?? null,
      documento: configCert?.Documento ?? null,
    };
  }

  async excluirCertificado(
    parceiroEmpresa: ParceiroEmpresa,
    documento: Documento,
    folder: string,
  ): Promise<string> {
    log("Excluindo certificado existente...");
    const excluiBody = {
      certificadoDTO: {
        ParceiroEmpresa: parceiroEmpresa,
        Senha: "",
        Documento: {
          Id: documento.Id,
          NumeroItem: documento.NumeroItem || 1,
          Nome: documento.Nome,
          Tamanho: String(documento.Tamanho || 0),
          Exclui: true,
        },
        Folder: folder,
        DataInicioDownload: "2025-01-01T06:00:00.000Z",
        AlteraCompetenciaInicioCaptura: false,
      },
    };
    const excluiRes = await this.client.post(`${EMPRESAS_URL}/ExcluiCertificado`, excluiBody, {
      headers: this.defaultHeaders(),
    });
    const excluiD = (excluiRes.data as { d?: { DTO?: { Folder?: string } } })?.d;
    checkJsonError(excluiD as JsonError, "ExcluiCertificado");
    log("Certificado anterior excluído.");
    return excluiD?.DTO?.Folder ?? folder;
  }

  async uploadCertificado(
    parceiroEmpresa: ParceiroEmpresa,
    pfxBuffer: Buffer,
    pfxNome: string,
    certSenha: string,
    folder: string,
  ): Promise<void> {
    const form = new FormData();
    form.append("folder", folder);
    form.append("tipoDownload", "2");
    form.append("file", pfxBuffer, { filename: pfxNome });

    log("Enviando arquivo .pfx...");
    const uploadRes = await this.client.post(UPLOAD_URL, form, {
      headers: {
        ...form.getHeaders(),
        Cookie: cookieHeader(this.cookieLines),
        requestverificationtoken: this.empresasToken,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    const uploadText =
      typeof uploadRes.data === "string" ? uploadRes.data : String(uploadRes.data ?? "");
    if (!uploadText || !uploadText.includes("uploaded successfully")) {
      throw new Error("Upload: resposta inesperada - " + (uploadText || uploadRes.status));
    }
    log("Upload OK.");

    const certificadoDTO = {
      ParceiroEmpresa: parceiroEmpresa,
      Senha: certSenha,
      Documento: { Nome: pfxNome, Tamanho: pfxBuffer.length, NumeroItem: 1, Exclui: false },
      Folder: folder,
      DataInicioDownload: "2025-01-01T06:00:00.000Z",
      AlteraCompetenciaInicioCaptura: false,
    };

    log("Validando certificado...");
    const validaRes = await this.client.post(
      `${EMPRESAS_URL}/ValidaCertificado`,
      { certificadoDTO },
      { headers: this.defaultHeaders() },
    );
    checkJsonError((validaRes.data as { d?: JsonError })?.d, "ValidaCertificado");
    log("Validação OK.");

    log("Salvando certificado...");
    const salvaRes = await this.client.post(
      `${EMPRESAS_URL}/SalvaCertificado`,
      { certificadoDTO },
      { headers: this.defaultHeaders() },
    );
    const salvaD = (salvaRes.data as { d?: JsonError & { Mensagem?: string } })?.d;
    checkJsonError(salvaD as JsonError, "SalvaCertificado");
    const msg = salvaD?.Mensagem ?? "";
    if (msg && !msg.toLowerCase().includes("sucesso")) {
      log("Aviso: " + msg);
    } else {
      log("Certificado salvo com sucesso.");
    }
  }
}
