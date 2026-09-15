/**
 * Cliente HTTP para a API Integra Contador (SERPRO) com envelope oficial,
 * gestão de headers, retry seguro e renovação automática de tokens.
 */
import { randomUUID } from "node:crypto";
import {
  type HttpTransport,
  type HttpResponse,
  defaultHttpsTransport,
  SerproAuthManager,
  SerproHttpError,
} from "./auth.ts";

export interface Identification {
  numero: string;
  tipo: 1 | 2 | 3 | 4;
}

export interface IntegraEnvelope<T> {
  contratante: Identification;
  autorPedidoDados: Identification;
  contribuinte: Identification;
  pedidoDados: {
    idSistema: string;
    idServico: string;
    versaoSistema: string;
    dados: string; // JSON escapado (exatamente 1 stringify)
  };
}

export interface IntegraResponse<T = unknown> extends IntegraEnvelope<unknown> {
  status: number;
  dados: string;
  mensagens: Array<{ codigo: string; texto: string }>;
  dadosParsed?: T;
}

export type OperationPath = "Apoiar" | "Consultar" | "Declarar" | "Emitir" | "Monitorar";

export interface CallOperationInput<TRequestData> {
  contribuinteCnpj: string;
  idSistema: string;
  idServico: string;
  versaoSistema?: string;
  dados: TRequestData | string;
  requestTag?: string;
}

export class SerproClient {
  private baseUrl = "https://gateway.apiserpro.serpro.gov.br/integra-contador/v1";

  constructor(
    private readonly authManager: SerproAuthManager,
    private readonly contratanteCnpj: string,
    private readonly transport: HttpTransport = defaultHttpsTransport,
    customBaseUrl?: string,
  ) {
    if (customBaseUrl) this.baseUrl = customBaseUrl;
  }

  public async callOperation<TRequestData, TResponseData>(
    operationPath: OperationPath,
    input: CallOperationInput<TRequestData>,
  ): Promise<IntegraResponse<TResponseData>> {
    const contratanteNumero = this.contratanteCnpj.replace(/\D/g, "");
    const contribuinteNumero = input.contribuinteCnpj.replace(/\D/g, "");

    if (contratanteNumero.length !== 14) {
      throw new Error(`CNPJ do contratante inválido: ${this.contratanteCnpj}`);
    }
    if (contribuinteNumero.length !== 14 && contribuinteNumero.length !== 11) {
      throw new Error(`Identificador do contribuinte inválido: ${input.contribuinteCnpj}`);
    }

    const tipoContribuinte = contribuinteNumero.length === 11 ? 1 : 2;

    const payloadDados = typeof input.dados === "string"
      ? input.dados
      : JSON.stringify(input.dados);

    const envelope: IntegraEnvelope<unknown> = {
      contratante: { numero: contratanteNumero, tipo: 2 },
      autorPedidoDados: { numero: contratanteNumero, tipo: 2 },
      contribuinte: { numero: contribuinteNumero, tipo: tipoContribuinte as 1 | 2 },
      pedidoDados: {
        idSistema: input.idSistema,
        idServico: input.idServico,
        versaoSistema: input.versaoSistema || "1.0",
        dados: payloadDados,
      },
    };

    const tag = (input.requestTag || randomUUID().replace(/-/g, "")).slice(0, 32);

    return this.executeWithRetry<TResponseData>({
      operationPath,
      envelope,
      requestTag: tag,
      attempt: 1,
    });
  }

  public async callConsultar<TRequestData, TResponseData>(
    input: CallOperationInput<TRequestData>,
  ): Promise<IntegraResponse<TResponseData>> {
    return this.callOperation<TRequestData, TResponseData>("Consultar", input);
  }

  public async callEmitir<TRequestData, TResponseData>(
    input: CallOperationInput<TRequestData>,
  ): Promise<IntegraResponse<TResponseData>> {
    return this.callOperation<TRequestData, TResponseData>("Emitir", input);
  }

  public async callApoiar<TRequestData, TResponseData>(
    input: CallOperationInput<TRequestData>,
  ): Promise<IntegraResponse<TResponseData>> {
    return this.callOperation<TRequestData, TResponseData>("Apoiar", input);
  }

  public async callDeclarar<TRequestData, TResponseData>(
    input: CallOperationInput<TRequestData>,
  ): Promise<IntegraResponse<TResponseData>> {
    return this.callOperation<TRequestData, TResponseData>("Declarar", input);
  }

  public async callMonitorar<TRequestData, TResponseData>(
    input: CallOperationInput<TRequestData>,
  ): Promise<IntegraResponse<TResponseData>> {
    return this.callOperation<TRequestData, TResponseData>("Monitorar", input);
  }

  private async executeWithRetry<TResponseData>(params: {
    operationPath: OperationPath;
    envelope: IntegraEnvelope<unknown>;
    requestTag: string;
    attempt: number;
  }): Promise<IntegraResponse<TResponseData>> {
    const tokens = await this.authManager.getTokens();

    const url = new URL(`${this.baseUrl}/${params.operationPath}`);
    const headers: Record<string, string> = {
      accept: "application/json",
      authorization: `Bearer ${tokens.access_token}`,
      "content-type": "application/json",
      jwt_token: tokens.jwt_token,
      "x-request-tag": params.requestTag,
    };

    let response: HttpResponse;
    try {
      response = await this.transport({
        url,
        method: "POST",
        headers,
        body: JSON.stringify(params.envelope),
      });
    } catch (err: unknown) {
      throw new Error(`Erro de rede ao conectar com o SERPRO: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Tratamento de 401: renova token e tenta mais 1 vez
    if (response.status === 401 && params.attempt === 1) {
      this.authManager.invalidateTokens();
      await this.authManager.getTokens(true);
      return this.executeWithRetry({ ...params, attempt: params.attempt + 1 });
    }

    // Tratamento de 429: Rate Limit com backoff
    if (response.status === 429 && params.attempt <= 2) {
      await new Promise((r) => setTimeout(r, 1000 * params.attempt));
      return this.executeWithRetry({ ...params, attempt: params.attempt + 1 });
    }

    // Erros HTTP (incluindo 504 que NÃO deve ser repetido)
    if (response.status < 200 || response.status >= 300) {
      const responseId = this.authManager.extractResponseId(response);
      throw new SerproHttpError(response.status, response.body, responseId);
    }

    if (!response.body.trim()) {
      return {
        ...params.envelope,
        status: response.status,
        dados: "",
        mensagens: [],
      } as IntegraResponse<TResponseData>;
    }

    let parsedResponse: IntegraResponse<TResponseData>;
    try {
      parsedResponse = JSON.parse(response.body) as IntegraResponse<TResponseData>;
    } catch {
      throw new Error(`Resposta SERPRO não é um JSON válido: ${response.body.slice(0, 200)}`);
    }

    if (typeof parsedResponse.dados === "string" && parsedResponse.dados.trim()) {
      try {
        parsedResponse.dadosParsed = JSON.parse(parsedResponse.dados) as TResponseData;
      } catch (parseErr: unknown) {
        throw new Error(
          `O campo 'dados' da resposta SERPRO não contém JSON válido: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
        );
      }
    }

    return parsedResponse;
  }
}
