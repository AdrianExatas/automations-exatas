import { createHash } from "node:crypto";
import type { APIRequestContext } from "playwright";

import { DTE_ORIGIN, DteTokenStore } from "./dte-auth.js";
import type { DteMessage, FailureCategory, ProcurationTarget } from "./types.js";
import { booleanValue, sleep, stringValue } from "./utils.js";

const RETRY_DELAYS_MS = [1_000, 2_000, 4_000] as const;
const DET_SERVICE_CODE = "DET0003";

export interface HttpResponseLike {
  status: number;
  headers: Record<string, string>;
  text: string;
}

export interface DteTransport {
  get(url: string, headers: Record<string, string>): Promise<HttpResponseLike>;
}

export class PlaywrightDteTransport implements DteTransport {
  constructor(private readonly request: APIRequestContext) {}

  async get(url: string, headers: Record<string, string>): Promise<HttpResponseLike> {
    const response = await this.request.get(url, { headers, failOnStatusCode: false });
    return {
      status: response.status(),
      headers: response.headers(),
      text: await response.text(),
    };
  }
}

export class DteRequestError extends Error {
  constructor(
    message: string,
    readonly category: FailureCategory,
    readonly httpStatus: number | null,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "DteRequestError";
  }
}

export interface DteClientOptions {
  transport: DteTransport;
  tokenStore: DteTokenStore;
  procuratorCnpj: string;
  reauthenticate: () => Promise<string>;
  sleep?: (ms: number) => Promise<void>;
}

export interface MailboxResult {
  unreadMessages: number;
  messages: DteMessage[];
}

export class DteClient {
  private readonly wait: (ms: number) => Promise<void>;

  constructor(private readonly options: DteClientOptions) {
    this.wait = options.sleep ?? sleep;
  }

  async checkDetPermission(targetCnpj: string): Promise<boolean> {
    const exists = await this.requestJson(
      `/services/v1/procuracoes/existe/${targetCnpj}`,
      targetCnpj,
    );
    if (booleanValue(exists) !== true) return false;

    const services = await this.requestJson(
      `/services/v1/procuracoes/servicos-habilitados/${this.options.procuratorCnpj}/${targetCnpj}`,
      targetCnpj,
    );
    if (!extractServiceCodes(services).includes(DET_SERVICE_CODE)) return false;

    const specificallyAuthorized = await this.requestJson(
      `/services/v1/procuracoes/servico-autorizado/${this.options.procuratorCnpj}/${targetCnpj}/${DET_SERVICE_CODE}`,
      targetCnpj,
    );
    return booleanValue(specificallyAuthorized) === true;
  }

  async getMailbox(target: ProcurationTarget): Promise<MailboxResult> {
    const unreadPayload = await this.requestJson(
      `/services/v1/caixapostal/${target.cnpj}/nao-lidas`,
      target.cnpj,
    );
    const unreadMessages = Number(unreadPayload);
    if (!Number.isInteger(unreadMessages) || unreadMessages < 0) {
      throw new DteRequestError(
        "DTE retornou um contador de nao lidas invalido.",
        "invalid_response",
        null,
        false,
      );
    }

    const mailboxPayload = await this.requestJson(
      `/services/v1/caixapostal/${target.cnpj}?filiais=false`,
      target.cnpj,
    );
    const mailboxItems = normalizeMailboxPayload(mailboxPayload);
    if (!mailboxItems) {
      throw new DteRequestError(
        "DTE retornou uma caixa postal fora do formato esperado.",
        "invalid_response",
        null,
        false,
      );
    }

    const messages = deduplicateMessages(
      mailboxItems
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
        .map((item, index) => mapDteMessage(item, target, index)),
    );
    return { unreadMessages, messages };
  }

  private async requestJson(path: string, targetCnpj: string): Promise<unknown> {
    let reauthenticated = false;
    let networkError: unknown;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const token = this.options.tokenStore.get();
        if (!token) {
          throw new DteRequestError("Token do DTE ausente.", "authentication", 401, false);
        }

        const response = await this.options.transport.get(`${DTE_ORIGIN}${path}`, {
          accept: "application/json, text/plain, */*",
          authorization: `Bearer ${token}`,
          PerfilProcuracao: "3",
          NiOutorgante: targetCnpj,
          referer: `${DTE_ORIGIN}/`,
        });
        const refreshedToken = findHeader(response.headers, "set-token");
        if (refreshedToken) this.options.tokenStore.set(refreshedToken);

        if (response.status === 401 && !reauthenticated) {
          reauthenticated = true;
          this.options.tokenStore.set(await this.options.reauthenticate());
          continue;
        }

        if (isRetryableStatus(response.status) && attempt < RETRY_DELAYS_MS.length) {
          await this.wait(RETRY_DELAYS_MS[attempt] ?? 4_000);
          continue;
        }

        if (response.status < 200 || response.status >= 300) {
          throw errorFromStatus(response.status);
        }

        try {
          return JSON.parse(response.text) as unknown;
        } catch {
          throw new DteRequestError(
            `DTE retornou JSON malformado em ${new URL(path, DTE_ORIGIN).pathname}.`,
            "invalid_response",
            response.status,
            false,
          );
        }
      } catch (error) {
        if (error instanceof DteRequestError) throw error;
        networkError = error;
        if (attempt < RETRY_DELAYS_MS.length) {
          await this.wait(RETRY_DELAYS_MS[attempt] ?? 4_000);
          continue;
        }
      }
    }

    throw new DteRequestError(
      `Falha de rede ao consultar o DTE: ${networkError instanceof Error ? networkError.message : "erro desconhecido"}`,
      "network",
      null,
      true,
    );
  }
}

export function normalizeMailboxPayload(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return payload;
  if (payload === null) return [];
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;
    if (Object.keys(record).length === 0) return [];
    if (Array.isArray(record.content)) return record.content;
  }
  return null;
}

export function extractServiceCodes(payload: unknown): string[] {
  const values = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).content)
      ? ((payload as Record<string, unknown>).content as unknown[])
      : [];
  return values
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") return stringValue((item as Record<string, unknown>).codigo);
      return "";
    })
    .filter(Boolean);
}

export function mapDteMessage(
  raw: Record<string, unknown>,
  target: ProcurationTarget,
  index = 0,
): DteMessage {
  const base = {
    cnpj: target.cnpj,
    corporateName: target.corporateName,
    title: stringValue(raw.titulo),
    text: stringValue(raw.texto),
    sender: stringValue(raw.remetente),
    type: stringValue(raw.tipo),
    situation: stringValue(raw.situacao),
    archived: booleanValue(raw.arquivada),
    createdAt: stringValue(raw.dataHoraCriacao),
    readAt: stringValue(raw.dataHoraLeitura),
    readByDeadlineAt: stringValue(raw.dataHoraLeituraDecursoPrazo),
    sourceSystem: stringValue(raw.sistemaOrigem),
  };
  const suppliedUid = stringValue(raw.uid);
  const uid = suppliedUid || `derived-${createHash("sha256").update(JSON.stringify({ ...base, index })).digest("hex").slice(0, 24)}`;
  return { ...base, uid };
}

export function deduplicateMessages(messages: DteMessage[]): DteMessage[] {
  const seen = new Set<string>();
  return messages.filter((message) => {
    const key = `${message.cnpj}:${message.uid}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findHeader(headers: Record<string, string>, name: string): string {
  const expected = name.toLowerCase();
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === expected);
  return entry?.[1] ?? "";
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function errorFromStatus(status: number): DteRequestError {
  if (status === 401) return new DteRequestError("Sessao do DTE nao autorizada.", "authentication", 401, false);
  if (status === 403) return new DteRequestError("Procuracao sem autorizacao para a operacao.", "authorization", 403, false);
  if (status === 429) return new DteRequestError("DTE limitou a taxa de requisicoes.", "rate_limit", 429, true);
  if (status >= 500) return new DteRequestError(`DTE indisponivel (HTTP ${status}).`, "server", status, true);
  return new DteRequestError(`Consulta ao DTE falhou com HTTP ${status}.`, "unknown", status, false);
}
