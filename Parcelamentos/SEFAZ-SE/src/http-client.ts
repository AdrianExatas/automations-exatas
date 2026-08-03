import fs from "node:fs/promises";
import path from "node:path";
import { request as playwrightRequest, type APIRequestContext } from "playwright";
import type { CriterioRotulo, InputRow, ParcelMetadata, RunResult, SituacaoVencimento } from "./types.js";
import {
  buildParcelLabel,
  buildPdfFileName,
  buildSolicitationMonthFolder,
  classifyDueDate,
  shouldEmitParcelByDueStatus,
} from "./utils.js";

const API_BASE = "https://api.sefaz.se.gov.br:8443";
const TOKEN_URL = `${API_BASE}/corporativo/v1/obterToken?chave=l7xx547d0f47fcab415896f09c41a0e16d36`;
const REFERER = "https://autoregv2-portal.apps.sefaz.se.gov.br/";

export class HttpPortalUnsupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HttpPortalUnsupportedError";
  }
}

export interface HttpPortalClientOptions {
  cwd: string;
  mapDir?: string;
  apiBase?: string;
  tokenUrl?: string;
}

export interface HttpReplayPlan {
  parcels: HttpReplayParcel[];
}

export interface HttpReplayParcel {
  metadata: ParcelMetadata;
  pdfRequest: {
    url: string;
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    postData?: string | Record<string, unknown>;
    filename?: string;
  };
}

interface HttpMapWithReplayPlan {
  replayPlan?: HttpReplayPlan;
}

interface TokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: string;
}

interface ApiEnvelope<T> {
  cdRetorno?: number | string;
  msgTecnica?: string;
  msgUsuario?: string;
  dados?: T;
  result?: {
    cdRetorno?: number | string;
    msgTecnica?: string;
    msgUsuario?: string;
    dados?: T;
  };
}

interface ContribuinteDados {
  cdPessoa?: string;
  nmPessoa?: string;
  cdPessoaSolicitante?: string;
  nmSolicitante?: string;
}

interface SessaoDados {
  nrSessao?: number;
}

interface DebitosPage {
  conteudo?: DebitoParcelamento[];
}

interface DebitoParcelamento {
  nrSequencial?: number;
  dsDebito?: string;
  dtVencimento?: string;
  vlPagar?: number;
  nrSaldoParcelas?: number;
  nrMaxParcelas?: number;
  detalhes?: {
    qtdParcelas?: number;
    nrParcelasPagas?: number;
    nrParcelasAtrasadas?: number;
    vlSaldoParcelamento?: number;
  };
}

interface GerarPagamentoDados {
  nrDAE?: number;
  dsDAE?: string;
}

interface HttpSession {
  context: APIRequestContext;
  authHeaders: Record<string, string>;
}

export class HttpPortalClient {
  private readonly apiBase: string;
  private readonly tokenUrl: string;
  private cachedAuthHeaders: Record<string, string> | null = null;
  private authInFlight: Promise<Record<string, string>> | null = null;

  constructor(private readonly options: HttpPortalClientOptions) {
    this.apiBase = options.apiBase ?? API_BASE;
    this.tokenUrl = options.tokenUrl ?? TOKEN_URL;
  }

  async processRow(row: InputRow): Promise<RunResult[]> {
    const context = await playwrightRequest.newContext({
      extraHTTPHeaders: baseHeaders(),
    });

    try {
      const authHeaders = await this.authenticate(context);
      const collection = await this.collectParcels({ context, authHeaders }, row);
      const results: RunResult[] = [...collection.errors];

      for (const metadata of collection.parcels) {
        if (!shouldEmitParcelByDueStatus(metadata.situacaoVencimento)) {
          results.push(buildIgnoredResult(row, metadata));
          continue;
        }

        results.push(await this.emitSingleParcel(row, metadata));
      }

      if (results.length === 0) {
        return [
          {
            rowNumber: row.rowNumber,
            codigo: row.codigo,
            empresa: row.empresa,
            cnpj: row.cnpj,
            vencimento: "",
            transport: "http",
            status: "erro",
            mensagem: `Nenhuma parcela disponivel foi identificada para o codigo ${row.codigo}.`,
          },
        ];
      }

      return results;
    } finally {
      await context.dispose();
    }
  }

  async processReplayPlan(row: InputRow): Promise<RunResult[]> {
    const replayPlan = await this.loadReplayPlan();
    const context = await playwrightRequest.newContext();

    try {
      const results: RunResult[] = [];

      for (const parcel of replayPlan.parcels) {
        results.push(await this.downloadReplayParcel(context, row, parcel));
      }

      return results;
    } finally {
      await context.dispose();
    }
  }

  private async authenticate(context: APIRequestContext): Promise<Record<string, string>> {
    if (this.cachedAuthHeaders) {
      return this.cachedAuthHeaders;
    }

    if (this.authInFlight) {
      return this.authInFlight;
    }

    this.authInFlight = this.fetchAuthHeaders(context);
    try {
      this.cachedAuthHeaders = await this.authInFlight;
      return this.cachedAuthHeaders;
    } finally {
      this.authInFlight = null;
    }
  }

  private async fetchAuthHeaders(context: APIRequestContext): Promise<Record<string, string>> {
    const token = await getJson<TokenResponse>(context, this.tokenUrl);
    const accessToken = String(token.access_token ?? "").trim();
    const tokenType = String(token.token_type ?? "Bearer").trim() || "Bearer";

    if (!accessToken) {
      throw new Error("Endpoint de token nao retornou access_token.");
    }

    return {
      ...baseHeaders(),
      authorization: `${tokenType} ${accessToken}`,
    };
  }

  private async collectParcels(session: HttpSession, row: InputRow): Promise<{ parcels: ParcelMetadata[]; errors: RunResult[] }> {
    try {
      const bootstrap = await this.bootstrapSession(session, row);
      const debitos = await this.fetchDebitosParcelamento(session, bootstrap.nrSessao, bootstrap.usuarioLogado, row.inscricaoEstadual);
      const parcels = debitos.map((debito) => metadataFromDebito(debito));

      if (parcels.length === 0) {
        return {
          parcels: [],
          errors: [
            {
              rowNumber: row.rowNumber,
              codigo: row.codigo,
              empresa: row.empresa,
              cnpj: row.cnpj,
              vencimento: "",
              transport: "http",
              status: "erro",
              mensagem: `Nenhum registro encontrado para o codigo ${row.codigo}.`,
            },
          ],
        };
      }

      return { parcels, errors: [] };
    } catch (error) {
      return {
        parcels: [],
        errors: [
          {
            rowNumber: row.rowNumber,
            codigo: row.codigo,
            empresa: row.empresa,
            cnpj: row.cnpj,
            vencimento: "",
            transport: "http",
            status: "erro",
            mensagem: `Falha ao consultar parcelas via HTTP: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async emitSingleParcel(row: InputRow, target: ParcelMetadata): Promise<RunResult> {
    const context = await playwrightRequest.newContext({
      extraHTTPHeaders: baseHeaders(),
    });

    try {
      const authHeaders = await this.authenticate(context);
      const session = { context, authHeaders };
      const bootstrap = await this.bootstrapSession(session, row);
      const debitos = await this.fetchDebitosParcelamento(session, bootstrap.nrSessao, bootstrap.usuarioLogado, row.inscricaoEstadual);
      const targetDebito = findMatchingDebito(debitos, target);
      const metadata = metadataFromDebito(targetDebito);

      await putJson(
        context,
        `${this.apiBase}/fazendario/v1/src/carrinhos/atualizarItensParcelamentoCarrinhoPagamento`,
        {
          nrSessao: bootstrap.nrSessao,
          detalhes: [
            {
              nrParcelas: 1,
              nrSequencial: targetDebito.nrSequencial,
            },
          ],
          flPagarDebito: "1",
          flParcelarDebito: "0",
        },
        authHeaders,
      );

      await getJson(
        context,
        `${this.apiBase}/fazendario/v1/src/carrinhos/buscarResumoCarrinhos?nrSessao=${bootstrap.nrSessao}&usuarioLogado=${encodeURIComponent(bootstrap.usuarioLogado)}`,
        authHeaders,
      );
      await getJson(
        context,
        `${this.apiBase}/fazendario/v1/src/carrinhos/buscarCarrinhoPagamento?${paginationQuery()}&nrSessao=${bootstrap.nrSessao}&usuarioLogado=${encodeURIComponent(bootstrap.usuarioLogado)}`,
        authHeaders,
      );

      const paymentEnvelope = await postJson<ApiEnvelope<GerarPagamentoDados[]>>(
        context,
        `${this.apiBase}/fazendario/v1/src/autorregularizacao/gerarPagamentoDebitos`,
        { nrSessao: bootstrap.nrSessao },
        authHeaders,
      );
      const paymentItems = unwrapApiData(paymentEnvelope, "gerarPagamentoDebitos");
      const nrDAE = paymentItems?.[0]?.nrDAE;
      if (!nrDAE) {
        throw new Error("gerarPagamentoDebitos nao retornou nrDAE.");
      }

      const response = await context.get(`${this.apiBase}/fazendario/v1/SAE/imprimirDAE?nrDAE=${nrDAE}`, {
        headers: authHeaders,
        timeout: 90_000,
      });
      if (!response.ok()) {
        throw new Error(`imprimirDAE retornou HTTP ${response.status()}.`);
      }

      const body = await response.body();
      validatePdfResponse(body, response.headers());
      const pdfPath = await saveHttpPdf(this.options.cwd, row, metadata, body);

      return {
        rowNumber: row.rowNumber,
        codigo: row.codigo,
        empresa: row.empresa,
        cnpj: row.cnpj,
        protocolo: metadata.protocolo,
        vencimento: metadata.vencimento,
        valorParcela: metadata.valorParcela,
        qtdeParcelas: metadata.qtdeParcelas,
        parcelasPagas: metadata.parcelasPagas,
        parcelasAtrasadas: metadata.parcelasAtrasadas,
        situacaoVencimento: metadata.situacaoVencimento,
        parcelLabel: metadata.parcelLabel,
        criterioRotulo: metadata.criterioRotulo,
        nomeOriginalPdf: `SAE_DAE_${nrDAE}.pdf`,
        pdfPath,
        transport: "http",
        status: "sucesso",
        mensagem: `PDF gerado via HTTP para o protocolo ${metadata.protocolo}.`,
      };
    } catch (error) {
      return {
        rowNumber: row.rowNumber,
        codigo: row.codigo,
        empresa: row.empresa,
        cnpj: row.cnpj,
        protocolo: target.protocolo,
        vencimento: target.vencimento,
        valorParcela: target.valorParcela,
        qtdeParcelas: target.qtdeParcelas,
        parcelasPagas: target.parcelasPagas,
        parcelasAtrasadas: target.parcelasAtrasadas,
        situacaoVencimento: target.situacaoVencimento,
        parcelLabel: target.parcelLabel,
        criterioRotulo: target.criterioRotulo,
        transport: "http",
        status: "erro",
        mensagem: `Falha ao emitir parcela via HTTP: ${error instanceof Error ? error.message : String(error)}`,
      };
    } finally {
      await context.dispose();
    }
  }

  private async bootstrapSession(
    session: HttpSession,
    row: InputRow,
  ): Promise<{ nrSessao: number; usuarioLogado: string; contribuinte: ContribuinteDados }> {
    const { context, authHeaders } = session;

    await getJson(
      context,
      `${this.apiBase}/fazendario/v1/src/pagamentoDebitos/validarIdentificacaoAutorreg?tpIdentificacao=InscricaoEstadual&cdIdentificacao=${encodeURIComponent(row.inscricaoEstadual)}&cdPessoaSolicitante=${encodeURIComponent(row.cpf)}&processoRenavam=`,
      authHeaders,
    );
    const usuarioEnvelope = await getJson<ApiEnvelope<{ usuarioLogado?: string }>>(
      context,
      `${this.apiBase}/fazendario/v1/corp/criptografia/criptografarUsuario?cdIdentificacao=${encodeURIComponent(row.inscricaoEstadual)}`,
      authHeaders,
    );
    const usuarioLogado = unwrapApiData(usuarioEnvelope, "criptografarUsuario")?.usuarioLogado;
    if (!usuarioLogado) {
      throw new Error("criptografarUsuario nao retornou usuarioLogado.");
    }

    const contribuinteEnvelope = await getJson<ApiEnvelope<ContribuinteDados>>(
      context,
      `${this.apiBase}/fazendario/v1/src/contribuinte/buscar?cdPessoa=${encodeURIComponent(row.inscricaoEstadual)}&usuarioLogado=${encodeURIComponent(usuarioLogado)}`,
      authHeaders,
    );
    const contribuinte = unwrapApiData(contribuinteEnvelope, "contribuinte/buscar");
    if (!contribuinte?.nmPessoa) {
      throw new Error("contribuinte/buscar nao retornou dados do contribuinte.");
    }

    const sessaoEnvelope = await getJson<ApiEnvelope<SessaoDados>>(
      context,
      `${this.apiBase}/fazendario/v1/sap/parcelamentoItensSessao/gerarNumSessao`,
      authHeaders,
    );
    const nrSessao = unwrapApiData(sessaoEnvelope, "gerarNumSessao")?.nrSessao;
    if (!nrSessao) {
      throw new Error("gerarNumSessao nao retornou nrSessao.");
    }

    await getJson(context, `${this.apiBase}/fazendario/v1/src/carrinhos/buscarResumoCarrinhos?nrSessao=0`, authHeaders);
    await this.seedDebitos(context, authHeaders, row, contribuinte, nrSessao, usuarioLogado);

    return { nrSessao, usuarioLogado, contribuinte };
  }

  private async seedDebitos(
    context: APIRequestContext,
    authHeaders: Record<string, string>,
    row: InputRow,
    contribuinte: ContribuinteDados,
    nrSessao: number,
    usuarioLogado: string,
  ): Promise<void> {
    const today = formatBrazilianDate(new Date());
    const body = {
      cdIdentificacao: row.inscricaoEstadual,
      cdSolicitante: row.cpf,
      nmIdentificacao: contribuinte.nmPessoa ?? row.empresa ?? "",
      nmSolicitante: contribuinte.nmSolicitante ?? "",
      nrSessao,
      dtPagamento: today,
      dtSolicitacao: today,
    };

    await postJson(context, `${this.apiBase}/fazendario/v1/src/debitosContribuinte/cadastrar?usuarioLogado=${encodeURIComponent(usuarioLogado)}`, body, authHeaders);
    await postJson(context, `${this.apiBase}/fazendario/v1/src/totalPendenciaSessao/cadastrar?usuarioLogado=${encodeURIComponent(usuarioLogado)}`, { cdPessoa: row.inscricaoEstadual, nrSessao }, authHeaders);

    for (const endpoint of [
      "cadastrarDebitosITCMD",
      "cadastrarDebitosIPVA",
      "cadastrarDebitosICMS",
      "cadastrarDebitosParcelamento",
      "cadastrarDebitosNaoTributarios",
    ]) {
      await postJson(
        context,
        `${this.apiBase}/fazendario/v1/src/itensDebitosContribuinte/${endpoint}?usuarioLogado=${encodeURIComponent(usuarioLogado)}`,
        { cdPessoaContribuinte: row.inscricaoEstadual, nrSessao },
        authHeaders,
      );
    }
  }

  private async fetchDebitosParcelamento(
    session: HttpSession,
    nrSessao: number,
    usuarioLogado: string,
    inscricaoEstadual: string,
  ): Promise<DebitoParcelamento[]> {
    const response = await getJson<ApiEnvelope<DebitosPage>>(
      session.context,
      `${this.apiBase}/fazendario/v1/src/itensDebitosContribuinte/buscarDebitosParcelamento?${paginationQuery()}&nrSessao=${nrSessao}&usuarioLogado=${encodeURIComponent(usuarioLogado)}&cdPessoaContribuinte=${encodeURIComponent(inscricaoEstadual)}`,
      session.authHeaders,
    );

    return unwrapDirectApiData(response, "buscarDebitosParcelamento")?.conteudo ?? [];
  }

  private async downloadReplayParcel(
    context: APIRequestContext,
    row: InputRow,
    parcel: HttpReplayParcel,
  ): Promise<RunResult> {
    try {
      const response = await context.fetch(parcel.pdfRequest.url, {
        method: parcel.pdfRequest.method ?? "GET",
        headers: parcel.pdfRequest.headers,
        data: parcel.pdfRequest.postData,
        timeout: 90_000,
      });

      if (!response.ok()) {
        throw new Error(`endpoint PDF retornou HTTP ${response.status()}.`);
      }

      const headers = response.headers();
      const body = await response.body();
      validatePdfResponse(body, headers);
      const pdfPath = await saveHttpPdf(this.options.cwd, row, parcel.metadata, body);

      return buildHttpSuccessResult(row, parcel.metadata, parcel.pdfRequest.filename ?? "DAE.pdf", pdfPath);
    } catch (error) {
      return buildHttpErrorResult(row, parcel.metadata, `Falha ao baixar PDF via HTTP: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async loadReplayPlan(): Promise<HttpReplayPlan> {
    const mapPath = await resolveMapPath(this.options.cwd, this.options.mapDir);
    const mapText = await fs.readFile(mapPath, "utf8");
    const parsed = JSON.parse(mapText) as HttpMapWithReplayPlan;

    if (!parsed.replayPlan?.parcels?.length) {
      throw new HttpPortalUnsupportedError(
        `O mapa HTTP ${mapPath} ainda nao possui replayPlan.parcels. O fluxo HTTP parametrizado nao depende dele; use --transport http sem replayPlan para executar pelos endpoints mapeados.`,
      );
    }

    return parsed.replayPlan;
  }
}

export function validatePdfResponse(body: Buffer, headers: Record<string, string>): void {
  const contentType = headerValue(headers, "content-type");
  const contentDisposition = headerValue(headers, "content-disposition");

  if (!/application\/pdf/i.test(contentType) && !/\.pdf\b/i.test(contentDisposition)) {
    throw new Error("resposta HTTP nao possui cabecalho de PDF.");
  }

  if (body.length === 0) {
    throw new Error("resposta PDF vazia.");
  }

  const header = body.subarray(0, 16).toString("latin1");
  if (!header.includes("%PDF")) {
    throw new Error("resposta HTTP nao parece ser um arquivo PDF.");
  }
}

function metadataFromDebito(debito: DebitoParcelamento): ParcelMetadata {
  const protocolo = String(debito.dsDebito ?? "").match(/PROTOCOLO\s+N[°º]\s*(\d+)/i)?.[1]
    ?? String(debito.dsDebito ?? "").match(/(\d{8,})/)?.[1]
    ?? "";
  const vencimento = String(debito.dtVencimento ?? "");
  const valorParcela = formatCurrency(debito.vlPagar ?? 0);
  const qtdeParcelas = Number(debito.detalhes?.qtdParcelas ?? debito.nrMaxParcelas ?? 0);
  const parcelasPagas = Number(debito.detalhes?.nrParcelasPagas ?? 0);
  const parcelasAtrasadas = Number(debito.detalhes?.nrParcelasAtrasadas ?? 0);
  const situacaoVencimento = classifyDueDate(vencimento) as SituacaoVencimento;
  const parcelLabel = buildParcelLabel(qtdeParcelas, parcelasPagas, parcelasAtrasadas);
  const criterioRotulo: CriterioRotulo = "fallback";

  if (!protocolo) {
    throw new Error(`Nao foi possivel identificar protocolo em "${debito.dsDebito ?? ""}".`);
  }

  return {
    portalRowId: debito.nrSequencial === undefined ? undefined : String(debito.nrSequencial),
    protocolo,
    vencimento,
    valorParcela,
    qtdeParcelas,
    parcelasPagas,
    parcelasAtrasadas,
    situacaoVencimento,
    parcelLabel,
    criterioRotulo,
  };
}

function findMatchingDebito(debitos: DebitoParcelamento[], metadata: ParcelMetadata): DebitoParcelamento {
  const matches = debitos.filter((debito) => {
    const current = metadataFromDebito(debito);
    return current.protocolo === metadata.protocolo
      && current.vencimento === metadata.vencimento
      && current.valorParcela === metadata.valorParcela;
  });

  if (matches.length === 1) {
    return matches[0]!;
  }

  if (matches.length > 1 && metadata.portalRowId) {
    const matchById = matches.find((debito) => String(debito.nrSequencial) === metadata.portalRowId);
    if (matchById) {
      return matchById;
    }
  }

  if (matches.length > 1) {
    throw new Error(`Mais de uma parcela HTTP corresponde ao protocolo ${metadata.protocolo}.`);
  }

  throw new Error(`Parcela HTTP do protocolo ${metadata.protocolo} nao foi encontrada na sessao reaberta.`);
}

async function getJson<T>(context: APIRequestContext, url: string, headers?: Record<string, string>): Promise<T> {
  const response = await context.get(url, { headers, timeout: 90_000 });
  return parseJsonResponse<T>(response.status(), await response.text(), url);
}

async function postJson<T>(
  context: APIRequestContext,
  url: string,
  data: Record<string, unknown>,
  headers: Record<string, string>,
): Promise<T> {
  const response = await context.post(url, { headers, data, timeout: 90_000 });
  return parseJsonResponse<T>(response.status(), await response.text(), url);
}

async function putJson<T>(
  context: APIRequestContext,
  url: string,
  data: Record<string, unknown>,
  headers: Record<string, string>,
): Promise<T> {
  const response = await context.put(url, { headers, data, timeout: 90_000 });
  return parseJsonResponse<T>(response.status(), await response.text(), url);
}

function parseJsonResponse<T>(status: number, text: string, url: string): T {
  if (status < 200 || status >= 300) {
    throw new Error(`${url} retornou HTTP ${status}: ${text.slice(0, 300)}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`${url} nao retornou JSON valido: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function unwrapApiData<T>(envelope: ApiEnvelope<T>, context: string): T | undefined {
  const result = envelope.result ?? envelope;
  const retorno = String(result.cdRetorno ?? "");
  if (retorno && retorno !== "200" && retorno !== "201") {
    throw new Error(`${context}: ${result.msgUsuario || result.msgTecnica || `retorno ${retorno}`}`);
  }

  return result.dados;
}

function unwrapDirectApiData<T>(envelope: ApiEnvelope<T>, context: string): T | undefined {
  const retorno = String(envelope.cdRetorno ?? envelope.result?.cdRetorno ?? "");
  if (retorno && retorno !== "200" && retorno !== "201") {
    throw new Error(`${context}: ${envelope.msgUsuario || envelope.result?.msgUsuario || `retorno ${retorno}`}`);
  }

  return envelope.dados ?? envelope.result?.dados;
}

async function saveHttpPdf(cwd: string, row: InputRow, metadata: ParcelMetadata, body: Buffer): Promise<string> {
  const targetDirectory = path.resolve(cwd, row.saveDir, buildSolicitationMonthFolder());
  await fs.mkdir(targetDirectory, { recursive: true });
  const filename = buildPdfFileName(row.codigo, metadata.parcelLabel, row.empresa, metadata.vencimento);
  const pdfPath = path.join(targetDirectory, filename);
  await fs.writeFile(pdfPath, body);
  return pdfPath;
}

function buildHttpSuccessResult(row: InputRow, metadata: ParcelMetadata, originalFilename: string, pdfPath: string): RunResult {
  return {
    rowNumber: row.rowNumber,
    codigo: row.codigo,
    empresa: row.empresa,
    cnpj: row.cnpj,
    protocolo: metadata.protocolo,
    vencimento: metadata.vencimento,
    valorParcela: metadata.valorParcela,
    qtdeParcelas: metadata.qtdeParcelas,
    parcelasPagas: metadata.parcelasPagas,
    parcelasAtrasadas: metadata.parcelasAtrasadas,
    situacaoVencimento: metadata.situacaoVencimento,
    parcelLabel: metadata.parcelLabel,
    criterioRotulo: metadata.criterioRotulo,
    nomeOriginalPdf: originalFilename,
    pdfPath,
    transport: "http",
    status: "sucesso",
    mensagem: `PDF gerado via HTTP para o protocolo ${metadata.protocolo}.`,
  };
}

function buildHttpErrorResult(row: InputRow, metadata: ParcelMetadata, mensagem: string): RunResult {
  return {
    rowNumber: row.rowNumber,
    codigo: row.codigo,
    empresa: row.empresa,
    cnpj: row.cnpj,
    protocolo: metadata.protocolo,
    vencimento: metadata.vencimento,
    valorParcela: metadata.valorParcela,
    qtdeParcelas: metadata.qtdeParcelas,
    parcelasPagas: metadata.parcelasPagas,
    parcelasAtrasadas: metadata.parcelasAtrasadas,
    situacaoVencimento: metadata.situacaoVencimento,
    parcelLabel: metadata.parcelLabel,
    criterioRotulo: metadata.criterioRotulo,
    transport: "http",
    status: "erro",
    mensagem,
  };
}

function buildIgnoredResult(row: InputRow, metadata: ParcelMetadata): RunResult {
  return {
    rowNumber: row.rowNumber,
    codigo: row.codigo,
    empresa: row.empresa,
    cnpj: row.cnpj,
    protocolo: metadata.protocolo,
    vencimento: metadata.vencimento,
    valorParcela: metadata.valorParcela,
    qtdeParcelas: metadata.qtdeParcelas,
    parcelasPagas: metadata.parcelasPagas,
    parcelasAtrasadas: metadata.parcelasAtrasadas,
    situacaoVencimento: metadata.situacaoVencimento,
    parcelLabel: metadata.parcelLabel,
    criterioRotulo: metadata.criterioRotulo,
    transport: "http",
    status: "ignorado",
    mensagem: "Parcela futura ignorada conforme regra de emissao.",
  };
}

async function resolveMapPath(cwd: string, mapDir: string | undefined): Promise<string> {
  if (mapDir) {
    const stat = await fs.stat(mapDir);
    return stat.isDirectory() ? path.join(mapDir, "network-map.json") : mapDir;
  }

  const baseDir = path.join(cwd, "output", "http-map");
  const entries = await fs.readdir(baseDir, { withFileTypes: true }).catch(() => []);
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();

  const latest = directories[0];
  if (!latest) {
    throw new HttpPortalUnsupportedError(
      `Nenhum mapa HTTP foi encontrado em ${baseDir}. Execute primeiro: npm run start -- --http-map --input ./model.xlsx --headed`,
    );
  }

  return path.join(baseDir, latest, "network-map.json");
}

function baseHeaders(): Record<string, string> {
  return {
    accept: "application/json, text/plain, */*",
    "accept-language": "pt-BR",
    referer: REFERER,
    "sec-ch-ua": "\"Chromium\";v=\"145\", \"Not:A-Brand\";v=\"99\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
  };
}

function paginationQuery(): string {
  return "pagina=0&totalDePaginas=0&elementosPorPagina=15&totalElementosDaPagina=10&totalDeElementos=0&possuiConteudo=false&conteudo=false&anterior=false&proxima=false&primeira=true&ultima=true";
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatBrazilianDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
}

function headerValue(headers: Record<string, string>, name: string): string {
  return headers[name] ?? headers[name.toLowerCase()] ?? "";
}
