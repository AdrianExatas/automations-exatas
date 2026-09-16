import type { Page } from "playwright";

import type { SafeLogger } from "./logger.js";
import type {
  FapCalculoItem,
  FapEmpresaVinculada,
  FapEstabelecimentoInfo,
  FapProcuracaoDireta,
} from "./types.js";
import { digitsOnly, sleep, stringValue } from "./utils.js";

export class FapRequestError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number | null = null,
    public readonly endpoint: string = "",
    public readonly category: "authorization" | "rate_limit" | "server" | "network" | "invalid_response" | "unknown" = "unknown",
  ) {
    super(message);
    this.name = "FapRequestError";
  }
}

interface BrowserFetchResult {
  status: number;
  ok: boolean;
  text: string;
}

export class FapClient {
  constructor(
    private readonly page: Page,
    private readonly requestDelayMs: number,
    private readonly logger: SafeLogger,
  ) {}

  private async fetchApi(path: string, options: { method?: string; body?: unknown } = {}): Promise<unknown> {
    await sleep(this.requestDelayMs);

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts += 1;

      const result = (await this.page
        .evaluate(
          async ({ urlPath, method, body }) => {
            // Obtem token XSRF dos cookies se disponivel
            const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
            const xsrfToken = match ? decodeURIComponent(match[1]) : "";

            const headers: Record<string, string> = {
              accept: "application/json, text/plain, */*",
            };
            if (xsrfToken) {
              headers["X-XSRF-TOKEN"] = xsrfToken;
            }
            if (body) {
              headers["content-type"] = "application/json";
            }

            try {
              const res = await fetch(urlPath, {
                method: method || "GET",
                credentials: "include",
                headers,
                body: body ? JSON.stringify(body) : undefined,
              });
              const text = await res.text();
              return { status: res.status, ok: res.ok, text };
            } catch (err: unknown) {
              return {
                status: 0,
                ok: false,
                text: err instanceof Error ? err.message : String(err),
              };
            }
          },
          { urlPath: path, method: options.method, body: options.body },
        )
        .catch((err) => ({
          status: 0,
          ok: false,
          text: String(err?.message || err),
        }))) as BrowserFetchResult;

      if (result.status === 429) {
        const backoff = 1000 * Math.pow(2, attempts);
        await this.logger.log("warn", `Rate limit HTTP 429 em ${path}. Aguardando ${backoff}ms...`);
        await sleep(backoff);
        continue;
      }

      if (result.status === 401) {
        throw new FapRequestError(
          `Sessao expirada ou nao autenticada em ${path} (HTTP 401).`,
          401,
          path,
          "authorization",
        );
      }

      if (result.status === 403) {
        throw new FapRequestError(
          `Acesso nao autorizado para o recurso ${path} (HTTP 403).`,
          403,
          path,
          "authorization",
        );
      }

      if (!result.ok && result.status >= 500) {
        if (attempts < maxAttempts) {
          await sleep(1000 * attempts);
          continue;
        }
        throw new FapRequestError(
          `Erro interno do servidor Dataprev em ${path} (HTTP ${result.status}).`,
          result.status,
          path,
          "server",
        );
      }

      if (!result.ok) {
        throw new FapRequestError(
          `Requisicao para ${path} falhou com HTTP ${result.status}: ${result.text.slice(0, 200)}`,
          result.status,
          path,
          result.status === 0 ? "network" : "unknown",
        );
      }

      if (!result.text || !result.text.trim()) {
        return null;
      }

      try {
        return JSON.parse(result.text);
      } catch {
        throw new FapRequestError(
          `Resposta de ${path} nao e um JSON valido: ${result.text.slice(0, 100)}`,
          result.status,
          path,
          "invalid_response",
        );
      }
    }

    throw new FapRequestError(`Falha persistente ao consultar ${path}`, null, path, "network");
  }

  async getAnosVigencia(): Promise<number[]> {
    const raw = await this.fetchApi("/gateway/fap/v1/vigencias/anos");
    if (Array.isArray(raw)) {
      return raw
        .map((x) => Number(x))
        .filter((n) => Number.isInteger(n) && n > 2000)
        .sort((a, b) => b - a);
    }
    return [];
  }

  async getVigenciaDetalhe(ano: number): Promise<import("./types.js").FapVigenciaDetalhe | null> {
    try {
      const raw = (await this.fetchApi(`/gateway/fap/v1/vigencias/${ano}`)) as Record<string, unknown>;
      if (raw && typeof raw === "object") {
        return {
          anoVigencia: Number(raw.anoVigencia || ano),
          consultaCompetencia: stringValue(raw.consultaCompetencia),
          inicioPeriodoBase: stringValue(raw.inicioPeriodoBase),
          fimPeriodoBase: stringValue(raw.fimPeriodoBase),
          dataInicioContestacao: stringValue(raw.dataInicioContestacao),
          dataFimContestacao: stringValue(raw.dataFimContestacao),
          portariaFap: stringValue(raw.portariaFap),
          situacao: stringValue(raw.situacao),
        };
      }
    } catch (error) {
      await this.logger.log("warn", `Nao foi possivel obter detalhes da vigencia ${ano}: ${error}`);
    }
    return null;
  }

  async getEmpresasVinculadas(): Promise<FapEmpresaVinculada[]> {
    try {
      const tokenData = (await this.fetchApi("/gateway/oauth2/token")) as Record<string, unknown>;
      if (!tokenData || typeof tokenData !== "object") return [];

      const rawVinc = tokenData.empresasVinculadas;
      if (typeof rawVinc === "string") {
        const parsed = JSON.parse(rawVinc);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => ({
            cnpj: digitsOnly(item.cnpj),
            razaoSocial: stringValue(item.razaoSocial),
            dataCriacao: stringValue(item.dataCriacao),
          }));
        }
      }
    } catch (error) {
      await this.logger.log("warn", `Nao foi possivel obter empresas vinculadas do token: ${error}`);
    }
    return [];
  }

  async getProcuracoesDataprev(): Promise<FapProcuracaoDireta[]> {
    try {
      const raw = await this.fetchApi("/gateway/fap/v1/procuracoes/empresas");
      if (Array.isArray(raw)) {
        return raw.map((item) => ({
          cnpj: digitsOnly(item.cnpj),
          nome: stringValue(item.nome),
          tipoProcuracao: item.tipoProcuracao,
        }));
      }
    } catch (error) {
      await this.logger.log("warn", `Nao foi possivel obter procuracoes diretas Dataprev: ${error}`);
    }
    return [];
  }

  async getEstabelecimentos(ano: number, cnpjRaiz: string): Promise<string[]> {
    const normalizedRaiz = digitsOnly(cnpjRaiz).slice(0, 8);
    const raw = await this.fetchApi(`/gateway/fap/v1/vigencias/${ano}/empresa/${normalizedRaiz}/estabelecimentos`);
    if (Array.isArray(raw)) {
      return raw.map((item) => digitsOnly(item).padStart(14, "0"));
    }
    return [];
  }

  async getEstabelecimentoInfo(ano: number, cnpj: string): Promise<FapEstabelecimentoInfo | null> {
    const normalized = digitsOnly(cnpj).padStart(14, "0");
    const raw = (await this.fetchApi(`/gateway/fap/v1/vigencias/${ano}/empresa/${normalized}`)) as Record<string, unknown>;
    if (!raw || typeof raw !== "object") return null;

    return {
      anoVigencia: Number(raw.anoVigencia || ano),
      cnpj: digitsOnly(raw.cnpj || normalized),
      cnpjRaiz: digitsOnly(raw.cnpjRaiz || normalized.slice(0, 8)),
      razaoSocial: stringValue(raw.razaoSocial),
      dataInicioAtividade: stringValue(raw.dataInicioAtividade),
      dataSituacaoRFB: stringValue(raw.dataSituacaoRFB),
      bloqueado: Boolean(raw.bloqueado),
      reprocessadoPorEstabelecimento: Boolean(raw.reprocessadoPorEstabelecimento),
      efeitoSuspensivo: Boolean(raw.efeitoSuspensivo),
      logradouro: stringValue(raw.logradouro),
      bairro: stringValue(raw.bairro),
      municipio: stringValue(raw.municipio),
      uf: stringValue(raw.uf),
      cep: stringValue(raw.cep),
    };
  }

  async getCalculosFap(ano: number, cnpj: string): Promise<FapCalculoItem[]> {
    const normalized = digitsOnly(cnpj).padStart(14, "0");
    const raw = await this.fetchApi(`/gateway/fap/v1/vigencias/${ano}/empresa/${normalized}/calculos`);
    if (Array.isArray(raw)) {
      return raw as FapCalculoItem[];
    }
    return [];
  }

  async getMensagensEmpresa(ano: number, cnpj: string): Promise<string[]> {
    try {
      const normalized = digitsOnly(cnpj).padStart(14, "0");
      const raw = await this.fetchApi(`/gateway/fap/v1/vigencias/${ano}/empresa/${normalized}/mensagens`);
      if (Array.isArray(raw)) {
        return raw.map((m) => stringValue(m.texto || m.descricao || m));
      }
    } catch {
      // Mensagens sao complementares
    }
    return [];
  }

  async getMensagensCalculo(ano: number, cnpj: string, calculoId: number): Promise<string[]> {
    try {
      const normalized = digitsOnly(cnpj).padStart(14, "0");
      const raw = await this.fetchApi(
        `/gateway/fap/v1/vigencias/${ano}/empresa/${normalized}/calculos/${calculoId}/mensagens`,
      );
      if (Array.isArray(raw)) {
        return raw.map((m) => stringValue(m.texto || m.descricao || m));
      }
    } catch {
      // Mensagens de calculo sao opcionais
    }
    return [];
  }
}
