/**
 * Cliente para todos os endpoints de Certificado da API SIEG.
 * Swagger: https://api.sieg.com/swagger/ui/index (Certificado)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  SIEG_API_KEY,
  API_BASE_URL,
  CERTIFICADO_BASE,
  REQUEST_TIMEOUT,
} from "./config.js";
import { logger } from "./utils/logger.js";

export type ResultadoCertificado = [sucesso: boolean, mensagem: string];

/** Request para Registrar (cadastro) - CertificadoRequest no Swagger */
export interface CertificadoRequest {
  Nome?: string;
  CnpjCpf?: string;
  Certificado: string;
  SenhaCertificado: string;
  TipoCertificado?: "Pfx" | "P12";
  TipoConsultaNfse?: "Municipal" | "Nacional";
  UfCertificado?: string;
  ConsultaNfe?: boolean;
  ConsultaCte?: boolean;
  ConsultaNfse?: boolean;
  ConsultaNfce?: boolean;
  [key: string]: unknown;
}

/** Request para Editar - CertificadoRequestEdit no Swagger (exige CertificadoId) */
export interface CertificadoRequestEdit {
  CertificadoId: string;
  SenhaCertificado?: string;
  TipoCertificado?: "Pfx" | "P12";
  Certificado?: string;
  UfCertificado?: string;
  ConsultaSat?: boolean;
  ConsultaNfe?: boolean;
  ConsultaCte?: boolean;
  ConsultaNfse?: boolean;
  ConsultaNfce?: boolean;
  BaixarCancelados?: boolean;
  ConsultaNoturna?: boolean;
  ExcluirTransferenciaFiliais?: boolean;
  TipoConsultaNfse?: string;
  ServicoPrestador?: boolean;
  ServicoTomador?: boolean;
  [key: string]: unknown;
}

/** Resposta da API para operações de listagem/status */
export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  mensagem: string;
  status: number;
}

/** Resposta da listagem de certificados */
export interface ListarCertificadosResponse {
  ok: boolean;
  data?: unknown[];
  mensagem: string;
}

/** Resposta da busca por CNPJ */
export interface BuscarPorCnpjResponse {
  ok: boolean;
  certificado?: unknown;
  mensagem: string;
}

/** Resposta do status do certificado */
export interface StatusResponse {
  ok: boolean;
  data?: unknown;
  mensagem: string;
}

export class SiegCertificadoClient {
  private readonly apiKey: string;
  private readonly base: string;
  private readonly certBase: string;
  private readonly timeout: number;

  constructor(apiKey?: string) {
    this.apiKey = (apiKey ?? SIEG_API_KEY ?? "").trim();
    if (!this.apiKey) {
      throw new Error(
        "SIEG_API_KEY é obrigatória. Configure no .env ou passe apiKey no construtor."
      );
    }
    this.base = API_BASE_URL;
    this.certBase = CERTIFICADO_BASE;
    this.timeout = REQUEST_TIMEOUT * 1000;
  }

  /**
   * Mascara a API key em uma URL para logs seguros.
   */
  private maskApiKey(url: string): string {
    return url.replace(/api_key=[^&]+/, "api_key=***");
  }

  private buildUrl(
    action: string,
    queryParams?: Record<string, string>
  ): string {
    const q = new URLSearchParams({ api_key: this.apiKey });
    if (queryParams) {
      for (const [k, v] of Object.entries(queryParams)) {
        if (v !== undefined && v !== "") q.set(k, v);
      }
    }
    return `${this.base}/${this.certBase}/${action}?${q.toString()}`;
  }

  private async request<T>(
    method: "GET" | "POST",
    action: string,
    options?: { query?: Record<string, string>; body?: unknown }
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(action, options?.query);
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: this.apiKey,
      "X-API-Key": this.apiKey,
    };

    logger.debug(`[SIEG] ${method} ${this.maskApiKey(url)}`);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body:
          options?.body !== undefined
            ? JSON.stringify(options.body)
            : undefined,
        signal: AbortSignal.timeout(this.timeout),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, mensagem: `Erro de conexão: ${msg}`, status: 0 };
    }

    const text = await response.text();
    let mensagem: string;
    let data: T | undefined;

    try {
      const parsed = JSON.parse(text || "{}") as Record<string, unknown>;
      mensagem =
        (parsed.message as string) ??
        (parsed.mensagem as string) ??
        (parsed.Mensagem as string) ??
        text;
      if (response.ok) data = parsed as T;
    } catch {
      mensagem = text || `HTTP ${response.status}`;
    }

    if (response.status === 401) {
      return {
        ok: false,
        mensagem: "Não autorizado. Verifique SIEG_API_KEY no .env.",
        status: 401,
      };
    }

    if (response.status === 404) {
      logger.debug(`[SIEG] 404 - URL completa: ${this.maskApiKey(url)}`);
      logger.debug(`[SIEG] 404 - Resposta: ${text.slice(0, 500)}`);
      return {
        ok: false,
        mensagem: `Endpoint não encontrado (404). URL: ${this.maskApiKey(url)}. Verifique se a SIEG_API_KEY está válida e ativa.`,
        status: 404,
      };
    }

    return {
      ok: response.ok,
      data: response.ok ? data : undefined,
      mensagem,
      status: response.status,
    };
  }

  /** GET /api/Certificado/ListarCertificados - Listar certificados de uma página */
  async listarCertificados(
    active?: boolean,
    pagina?: number
  ): Promise<ListarCertificadosResponse> {
    const query: Record<string, string> = {
      active: String(active ?? true),
    };
    if (pagina !== undefined) query.pagina = String(pagina);
    const res = await this.request<unknown[]>("GET", "ListarCertificados", {
      query,
    });
    return { ok: res.ok, data: res.data, mensagem: res.mensagem };
  }

  /**
   * Lista TODOS os certificados cadastrados (todas as páginas).
   * A API retorna 100 por página, então buscamos até não haver mais resultados.
   */
  async listarTodosCertificados(
    active?: boolean
  ): Promise<ListarCertificadosResponse> {
    const todosResultados: unknown[] = [];
    let pagina = 0;
    const MAX_PAGINAS = 100; // Limite de segurança (10.000 certificados)

    while (pagina < MAX_PAGINAS) {
      logger.debug(`[SIEG] Buscando página ${pagina}...`);
      const res = await this.listarCertificados(active, pagina);

      if (!res.ok) {
        if (pagina === 0) {
          return res;
        }
        break;
      }

      const dados = res.data ?? [];
      if (dados.length === 0) {
        break;
      }

      todosResultados.push(...dados);
      logger.debug(
        `[SIEG] Página ${pagina}: ${dados.length} certificados (total: ${todosResultados.length})`
      );

      if (dados.length < 100) {
        break;
      }

      pagina++;
    }

    return {
      ok: true,
      data: todosResultados,
      mensagem: `${todosResultados.length} certificados encontrados`,
    };
  }

  /**
   * Busca um certificado específico pelo CNPJ em todas as páginas.
   * Retorna o certificado encontrado ou null.
   */
  async buscarPorCnpj(
    cnpj: string,
    active?: boolean
  ): Promise<BuscarPorCnpjResponse> {
    const cnpjLimpo = cnpj.replace(/\D/g, "");
    let pagina = 0;
    const MAX_PAGINAS = 100;

    while (pagina < MAX_PAGINAS) {
      logger.debug(`[SIEG] Buscando CNPJ ${cnpjLimpo} na página ${pagina}...`);
      const res = await this.listarCertificados(active, pagina);

      if (!res.ok) {
        if (pagina === 0) {
          return { ok: false, mensagem: res.mensagem };
        }
        break;
      }

      const dados = res.data ?? [];
      if (dados.length === 0) {
        break;
      }

      const encontrado = dados.find((cert: unknown) => {
        const c = cert as Record<string, unknown>;
        const certCnpj = String(
          c.CnpjCpf ?? c.cnpjCpf ?? c.Cnpj ?? c.cnpj ?? ""
        ).replace(/\D/g, "");
        return certCnpj === cnpjLimpo;
      });

      if (encontrado) {
        logger.debug(`[SIEG] CNPJ ${cnpjLimpo} encontrado na página ${pagina}`);
        return {
          ok: true,
          certificado: encontrado,
          mensagem: "Certificado encontrado",
        };
      }

      if (dados.length < 100) {
        break;
      }

      pagina++;
    }

    return {
      ok: false,
      mensagem: `Nenhum certificado encontrado com CNPJ ${cnpjLimpo}`,
    };
  }

  /** POST /api/Certificado/Registrar - Cadastrar certificado */
  async registrarCertificado(
    body: CertificadoRequest
  ): Promise<ResultadoCertificado> {
    const res = await this.request("POST", "Registrar", { body });
    return [res.ok, res.mensagem];
  }

  /** POST /api/Certificado/Editar - Atualizar certificado */
  async editarCertificado(
    body: CertificadoRequestEdit
  ): Promise<ResultadoCertificado> {
    const res = await this.request("POST", "Editar", { body });
    return [res.ok, res.mensagem];
  }

  /** POST /api/Certificado/habilitar - Ativar certificado */
  async habilitar(id: string): Promise<ResultadoCertificado> {
    const res = await this.request("POST", "habilitar", { query: { id } });
    return [res.ok, res.mensagem];
  }

  /** POST /api/Certificado/desabilitar - Desativar certificado */
  async desabilitar(id: string): Promise<ResultadoCertificado> {
    const res = await this.request("POST", "desabilitar", { query: { id } });
    return [res.ok, res.mensagem];
  }

  /** GET /api/Certificado/status - Status do certificado (tipo: NFe, CTe, NFSe, NFCe, CFe) */
  async status(id: string, tipoNota?: string): Promise<StatusResponse> {
    const query: Record<string, string> = { id };
    if (tipoNota) query.tipoNota = tipoNota;
    const res = await this.request("GET", "status", { query });
    return { ok: res.ok, data: res.data, mensagem: res.mensagem };
  }

  /**
   * Cadastra certificado a partir de arquivo ou Buffer (conveniência que monta CertificadoRequest).
   */
  async cadastrarAtualizarCertificado(
    arquivoPfx: string | Buffer,
    senhaPfx: string,
    cnpj?: string
  ): Promise<ResultadoCertificado> {
    let pfxBase64: string;

    if (Buffer.isBuffer(arquivoPfx)) {
      pfxBase64 = arquivoPfx.toString("base64");
    } else {
      const absolutePath = resolve(arquivoPfx);
      if (!existsSync(absolutePath)) {
        return [false, `Arquivo não encontrado: ${arquivoPfx}`];
      }
      try {
        const buf = readFileSync(absolutePath);
        pfxBase64 = Buffer.from(buf).toString("base64");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return [false, `Erro ao ler PFX: ${msg}`];
      }
    }

    const payload: CertificadoRequest = {
      Certificado: pfxBase64,
      SenhaCertificado: senhaPfx,
      TipoCertificado: "Pfx",
    };

    if (cnpj) payload.CnpjCpf = cnpj.replace(/[./\-]/g, "");
    return this.registrarCertificado(payload);
  }
}
