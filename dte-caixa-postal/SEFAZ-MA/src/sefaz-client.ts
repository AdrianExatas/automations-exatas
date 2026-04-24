import { load, type Cheerio, type CheerioAPI } from "cheerio";
import { readFileSync } from "node:fs";
import { Agent, request as httpsRequest } from "node:https";
import { URL, URLSearchParams } from "node:url";

export interface DateWindow {
  start: Date;
  end: Date;
}

export interface MailboxMessage {
  emitente: string;
  assunto: string;
  classificacao: string;
  dataEnvio: string;
  dataLeitura: string;
  exigeCiencia: string;
  situacao: string;
  vencimento: string;
  sentAt?: Date;
}

export interface MailboxFormState {
  action: string;
  fields: Record<string, string>;
  pageSize: number;
}

export interface ParsedMailboxPage {
  hasMailbox: boolean;
  hasSessionConflict: boolean;
  form: MailboxFormState | null;
  messages: MailboxMessage[];
}

export interface SefazClientConfig {
  baseUrl: string;
  pfxPath: string;
  passphrasePath: string;
  companyName: string;
  dateWindow: DateWindow;
}

interface RequestOptions {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
}

interface RequestResult {
  body: string;
}

interface CollectMessagesOptions {
  initialHtml: string;
  dateWindow: DateWindow;
  getNextPageHtml: (form: MailboxFormState) => Promise<string>;
  maxPages?: number;
  onPageProcessed?: (info: {
    pageNumber: number;
    pageMessageCount: number;
    acceptedMessageCount: number;
    oldestSentAt?: Date;
  }) => void;
}

interface RequestRetryOptions {
  method: string;
  url: string;
  maxRetries?: number;
  retryDelaysMs?: readonly number[];
  sleep?: SleepFunction;
  log?: LogFunction;
}

type SleepFunction = (ms: number) => Promise<void>;
type LogFunction = (message: string) => void;

const SESSION_CONFLICT_MARKER = "ACEO005-004";
const RETRYABLE_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
  "ECONNABORTED",
  "EAI_AGAIN",
]);
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_REQUEST_RETRIES = 5;
const REQUEST_RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 8_000] as const;

export const MAILBOX_COLUMNS = [
  { key: "emitente", header: "Emitente" },
  { key: "assunto", header: "Assunto" },
  { key: "classificacao", header: "Classificação" },
  { key: "dataEnvio", header: "Data de Envio" },
  { key: "dataLeitura", header: "Data de Leitura" },
  { key: "exigeCiencia", header: "Exige ciência?" },
  { key: "situacao", header: "Situação" },
  { key: "vencimento", header: "Vencimento" },
] as const;

export class SessionConflictError extends Error {
  constructor(message = "O portal informou que o usuário já está conectado em outra sessão.") {
    super(message);
    this.name = "SessionConflictError";
  }
}

export class MailboxPageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MailboxPageError";
  }
}

export class RequestRetriesExhaustedError extends Error {
  readonly method: string;
  readonly url: string;
  readonly attempts: number;
  readonly lastErrorCode: string;

  constructor(options: {
    method: string;
    url: string;
    attempts: number;
    lastError: Error;
  }) {
    const lastErrorCode = getErrorCode(options.lastError) ?? "UNKNOWN";
    super(
      `Falha na requisicao ${options.method} ${options.url} apos ${options.attempts} tentativas. ` +
        `Ultimo codigo: ${lastErrorCode}. Ultima mensagem: ${options.lastError.message}`,
    );
    this.name = "RequestRetriesExhaustedError";
    this.method = options.method;
    this.url = options.url;
    this.attempts = options.attempts;
    this.lastErrorCode = lastErrorCode;
  }
}

export function createDateWindow(referenceDate: Date): DateWindow {
  const start = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() - 1,
    1,
    0,
    0,
    0,
    0,
  );
  const end = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  return { start, end };
}

export function formatDateForFilename(referenceDate: Date): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
  const day = String(referenceDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function slugifyCompanyName(companyName: string): string {
  return companyName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parsePortalDate(value: string): Date | undefined {
  const match = value.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (!match) {
    return undefined;
  }

  const [, day, month, year, hour = "00", minute = "00", second = "00"] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
}

export function filterMessagesByDateWindow(
  messages: MailboxMessage[],
  dateWindow: DateWindow,
): MailboxMessage[] {
  return messages.filter((message) => {
    if (!message.sentAt) {
      return false;
    }

    return message.sentAt >= dateWindow.start && message.sentAt <= dateWindow.end;
  });
}

export function deduplicateMessages(messages: MailboxMessage[]): MailboxMessage[] {
  const seen = new Set<string>();
  const uniqueMessages: MailboxMessage[] = [];

  for (const message of messages) {
    const identity = getMailboxMessageIdentity(message);
    if (seen.has(identity)) {
      continue;
    }

    seen.add(identity);
    uniqueMessages.push(message);
  }

  return uniqueMessages;
}

export function parseMailboxPage(html: string): ParsedMailboxPage {
  const $ = load(html);
  const formNode = $('form[name="caixaEntradaDomicilioForm"]').first();

  return {
    hasMailbox: formNode.length > 0,
    hasSessionConflict: html.includes(SESSION_CONFLICT_MARKER),
    form: formNode.length > 0 ? extractMailboxFormState($, formNode) : null,
    messages: formNode.length > 0 ? extractMailboxMessages($, formNode) : [],
  };
}

export async function collectMessagesInDateWindow({
  initialHtml,
  dateWindow,
  getNextPageHtml,
  maxPages = 50,
  onPageProcessed,
}: CollectMessagesOptions): Promise<MailboxMessage[]> {
  const collected: MailboxMessage[] = [];
  const seenPageSignatures = new Set<string>();
  let currentHtml = initialHtml;
  let page = 0;

  while (page < maxPages) {
    const parsed = parseMailboxPage(currentHtml);

    if (parsed.hasSessionConflict) {
      throw new SessionConflictError();
    }

    if (!parsed.form) {
      throw new MailboxPageError("A página retornada não contém o formulário da caixa de entrada.");
    }

    if (parsed.messages.length === 0) {
      break;
    }

    const pageSignature = parsed.messages.map(getMailboxMessageIdentity).join("|");
    if (seenPageSignatures.has(pageSignature)) {
      break;
    }

    seenPageSignatures.add(pageSignature);
    const acceptedMessages = filterMessagesByDateWindow(parsed.messages, dateWindow);
    collected.push(...acceptedMessages);

    const oldestMessage = parsed.messages[parsed.messages.length - 1];
    const oldestSentAt = oldestMessage.sentAt;
    onPageProcessed?.({
      pageNumber: page + 1,
      pageMessageCount: parsed.messages.length,
      acceptedMessageCount: acceptedMessages.length,
      oldestSentAt,
    });

    if (!oldestSentAt || oldestSentAt < dateWindow.start) {
      break;
    }

    if (parsed.messages.length < parsed.form.pageSize) {
      break;
    }

    currentHtml = await getNextPageHtml(parsed.form);
    page += 1;
  }

  return deduplicateMessages(collected);
}

export async function executeWithRequestRetries<T>(
  operation: () => Promise<T>,
  options: RequestRetryOptions,
): Promise<T> {
  const maxRetries = options.maxRetries ?? MAX_REQUEST_RETRIES;
  const retryDelaysMs = options.retryDelaysMs ?? REQUEST_RETRY_DELAYS_MS;
  const sleep = options.sleep ?? delay;
  const log = options.log;
  let attempts = 0;

  while (true) {
    attempts += 1;
    log?.(`[http] tentativa ${attempts}/${maxRetries + 1} ${options.method} ${options.url}`);

    try {
      const result = await operation();
      log?.(`[http] sucesso na tentativa ${attempts} ${options.method} ${options.url}`);
      return result;
    } catch (error) {
      if (!(error instanceof Error) || !isRetryableNetworkError(error)) {
        log?.(
          `[http] erro nao-retryable ${options.method} ${options.url}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        throw error;
      }

      if (attempts > maxRetries) {
        log?.(`[http] retries esgotados ${options.method} ${options.url} apos ${attempts} tentativas`);
        throw new RequestRetriesExhaustedError({
          method: options.method,
          url: options.url,
          attempts,
          lastError: error,
        });
      }

      const retryDelayMs = getRetryDelayMs(retryDelaysMs, attempts - 1);
      log?.(
        `[http] erro retryable ${options.method} ${options.url}: ${error.message}. ` +
          `Aguardando ${retryDelayMs}ms antes da proxima tentativa.`,
      );
      await sleep(retryDelayMs);
    }
  }
}

export class SefazClient {
  private readonly agent: Agent;
  private readonly baseUrl: URL;
  private readonly cookieJar = new Map<string, string>();
  private readonly config: SefazClientConfig;
  private readonly log: LogFunction;

  constructor(config: SefazClientConfig, log: LogFunction = createTimestampLogger()) {
    const pfx = readFileSync(config.pfxPath);
    const passphrase = readFileSync(config.passphrasePath, "utf8").trim();

    this.config = config;
    this.baseUrl = new URL(config.baseUrl);
    this.log = log;
    this.agent = new Agent({
      pfx,
      passphrase,
      rejectUnauthorized: false,
      keepAlive: false,
      maxCachedSessions: 0,
    });
  }

  async fetchMessages(): Promise<MailboxMessage[]> {
    this.log(`[client] iniciando extracao para ${this.config.companyName}`);
    this.log(
      `[client] janela de busca: ${this.config.dateWindow.start.toISOString()} ate ${this.config.dateWindow.end.toISOString()}`,
    );
    const loginPage = await this.login();
    this.log("[client] login com certificado concluido");
    const mailboxLandingPage = await this.ensureMailboxPage(loginPage);
    this.log("[client] pagina inicial da caixa de entrada carregada");
    const preparedMailboxPage = await this.submitMailboxForm(
      this.requireMailboxForm(mailboxLandingPage),
      "filtrarCaixaEntrada",
    );
    this.log("[client] filtros da caixa aplicados");

    const messages = await collectMessagesInDateWindow({
      initialHtml: preparedMailboxPage,
      dateWindow: this.config.dateWindow,
      getNextPageHtml: async (form) => {
        this.log("[client] carregando proxima pagina da caixa");
        return this.submitMailboxForm(form, "carregarProximaPagina");
      },
      onPageProcessed: (info) => {
        this.log(
          `[client] pagina ${info.pageNumber}: ${info.pageMessageCount} mensagens, ` +
            `${info.acceptedMessageCount} dentro do periodo, ` +
            `data mais antiga da pagina: ${info.oldestSentAt?.toISOString() ?? "sem data"}`,
        );
      },
    });

    this.log(`[client] extracao concluida com ${messages.length} mensagens unicas`);
    return messages;
  }

  async logoff(): Promise<void> {
    if (this.cookieJar.size === 0) {
      return;
    }

    try {
      this.log("[client] executando logoff");
      await this.requestText("/sefaznet/logoff.do?method=efetuarLogoff");
      this.log("[client] logoff concluido");
    } finally {
      this.cookieJar.clear();
    }
  }

  private async login(): Promise<string> {
    this.log("[client] solicitando login por certificado");
    const page = await this.requestText("/sefaznet/loginCert.do?method=efetuarLoginCertificado");

    if (page.includes(SESSION_CONFLICT_MARKER)) {
      throw new SessionConflictError();
    }

    return page;
  }

  private async ensureMailboxPage(html: string): Promise<string> {
    const parsed = parseMailboxPage(html);
    if (parsed.form) {
      this.log("[client] caixa de entrada ja veio no HTML do login");
      return html;
    }

    this.log("[client] HTML do login nao trouxe a caixa; buscando pagina inicial da caixa");
    const page = await this.requestText("/sefaznet/caixaEntradaDomicilio.do?method=mostrarPaginaInicial");
    const parsedMailbox = parseMailboxPage(page);

    if (!parsedMailbox.form) {
      throw new MailboxPageError(
        "Não foi possível localizar a caixa de entrada após o login com certificado.",
      );
    }

    return page;
  }

  private requireMailboxForm(html: string): MailboxFormState {
    const parsed = parseMailboxPage(html);

    if (parsed.hasSessionConflict) {
      throw new SessionConflictError();
    }

    if (!parsed.form) {
      throw new MailboxPageError("O formulário da caixa de entrada não foi encontrado.");
    }

    return parsed.form;
  }

  private async submitMailboxForm(
    form: MailboxFormState,
    method: "filtrarCaixaEntrada" | "carregarProximaPagina",
  ): Promise<string> {
    const action = resolveMailboxAction(this.baseUrl, form.action, method);
    this.log(`[client] enviando formulario da caixa: method=${method} action=${action}`);
    const body = new URLSearchParams({
      ...form.fields,
      method,
      visualizarMensagens: "1",
      quantidadeRegistrosPagina: "100",
      ordenarMensagens: "2",
    }).toString();

    return this.requestText(action, {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  }

  private async requestText(pathname: string, options: RequestOptions = {}): Promise<string> {
    const method = options.method ?? "GET";
    const url = new URL(pathname, this.baseUrl).toString();
    const { body } = await executeWithRequestRetries(() => this.executeRequest(pathname, options), {
      method,
      url,
      log: this.log,
    });
    return body;
  }

  private async executeRequest(pathname: string, options: RequestOptions): Promise<RequestResult> {
    const requestUrl = new URL(pathname, this.baseUrl);
    const bodyBuffer = options.body ? Buffer.from(options.body, "utf8") : undefined;

    return new Promise<RequestResult>((resolve, reject) => {
      const request = httpsRequest(
        requestUrl,
        {
          method: options.method ?? "GET",
          agent: this.agent,
          headers: {
            "User-Agent": "sefaz-ma-mailbox-extractor",
            Connection: "close",
            ...(bodyBuffer
              ? {
                  "Content-Length": String(bodyBuffer.length),
                }
              : {}),
            ...(this.cookieJar.size > 0 ? { Cookie: this.buildCookieHeader() } : {}),
            ...options.headers,
          },
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
          response.on("end", () => {
            this.storeCookies(response.headers["set-cookie"]);

            resolve({
              body: Buffer.concat(chunks).toString("latin1"),
            });
          });
        },
      );

      request.setTimeout(REQUEST_TIMEOUT_MS, () => {
        const timeoutError = new Error(`Timeout ao conectar em ${requestUrl.toString()}`);
        (timeoutError as NodeJS.ErrnoException).code = "ETIMEDOUT";
        request.destroy(timeoutError);
      });

      request.on("error", (error) => {
        const wrappedError = new Error(
          `Falha na requisicao ${options.method ?? "GET"} ${requestUrl.toString()}: ${error.message}`,
        );
        (wrappedError as NodeJS.ErrnoException).code = (error as NodeJS.ErrnoException).code;
        (wrappedError as { cause?: unknown }).cause = error;
        reject(wrappedError);
      });

      if (bodyBuffer) {
        request.write(bodyBuffer);
      }

      request.end();
    });
  }

  private buildCookieHeader(): string {
    return Array.from(this.cookieJar.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  private storeCookies(setCookieHeader: string[] | string | undefined): void {
    if (!setCookieHeader) {
      return;
    }

    const setCookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

    for (const header of setCookies) {
      const [cookie] = header.split(";", 1);
      const separatorIndex = cookie.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }

      const name = cookie.slice(0, separatorIndex);
      const value = cookie.slice(separatorIndex + 1);
      this.cookieJar.set(name, value);
    }
  }
}

function extractMailboxFormState($: CheerioAPI, formNode: Cheerio<any>): MailboxFormState {
  const fields: Record<string, string> = {};

  formNode.find("input[name], select[name], textarea[name]").each((_, element) => {
    const node = $(element);
    const name = node.attr("name");

    if (!name) {
      return;
    }

    if (element.tagName === "input") {
      const type = (node.attr("type") ?? "text").toLowerCase();
      if (["checkbox", "radio", "submit", "button", "image", "file"].includes(type)) {
        return;
      }

      fields[name] = node.attr("value") ?? "";
      return;
    }

    if (element.tagName === "select") {
      const selectedOption = node.find("option[selected]").first();
      const firstOption = node.find("option").first();
      fields[name] =
        selectedOption.attr("value") ??
        firstOption.attr("value") ??
        cleanCellText(node.text());
      return;
    }

    fields[name] = cleanCellText(node.text());
  });

  return {
    action: formNode.attr("action") ?? "/sefaznet/caixaEntradaDomicilio.do",
    fields,
    pageSize: Number.parseInt(fields.quantidadeRegistrosPagina ?? "25", 10) || 25,
  };
}

function extractMailboxMessages($: CheerioAPI, formNode: Cheerio<any>): MailboxMessage[] {
  const rows = new Map<string, MailboxMessage>();

  formNode
    .find('a[href*="abrirMensagem"], a[onclick*="abrirMensagem"], a[href*="idMensagemDestinatario"]')
    .each((_, element) => {
      const row = $(element).closest("tr");
      if (row.length === 0) {
        return;
      }

      const message = extractMailboxMessageFromRow($, row);
      if (!message) {
        return;
      }

      rows.set(getMailboxMessageIdentity(message), message);
    });

  return Array.from(rows.values());
}

function extractMailboxMessageFromRow(
  $: CheerioAPI,
  rowNode: Cheerio<any>,
): MailboxMessage | null {
  const cells = rowNode
    .find("td")
    .toArray()
    .map((cell) => extractDisplayedCellText($, $(cell)));

  if (cells.length < MAILBOX_COLUMNS.length) {
    return null;
  }

  const values = cells.slice(-MAILBOX_COLUMNS.length);

  const message: MailboxMessage = {
    emitente: values[0] ?? "",
    assunto: values[1] ?? "",
    classificacao: values[2] ?? "",
    dataEnvio: values[3] ?? "",
    dataLeitura: values[4] ?? "",
    exigeCiencia: values[5] ?? "",
    situacao: values[6] ?? "",
    vencimento: values[7] ?? "",
  };

  message.sentAt = parsePortalDate(message.dataEnvio);
  return message;
}

function extractDisplayedCellText($: CheerioAPI, cellNode: Cheerio<any>): string {
  const directText = cleanCellText(cellNode.text());
  if (directText) {
    return directText;
  }

  const attributeCandidates = cellNode
    .find("[alt], [title], [aria-label], [value]")
    .toArray()
    .flatMap((element) => {
      const node = $(element);
      return [
        node.attr("alt"),
        node.attr("title"),
        node.attr("aria-label"),
        node.attr("value"),
      ];
    })
    .filter((value): value is string => Boolean(value))
    .map((value) => cleanCellText(value))
    .filter(Boolean);

  return attributeCandidates[0] ?? "";
}

function cleanCellText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function getMailboxMessageIdentity(message: MailboxMessage): string {
  return [
    message.emitente,
    message.assunto,
    message.classificacao,
    message.dataEnvio,
    message.dataLeitura,
    message.exigeCiencia,
    message.situacao,
    message.vencimento,
  ].join("|");
}

function resolveMailboxAction(baseUrl: URL, action: string, method: string): string {
  const url = new URL(action, baseUrl);
  url.search = "";
  url.searchParams.set("method", method);
  return `${url.pathname}${url.search}`;
}

function getRetryDelayMs(delays: readonly number[], retryIndex: number): number {
  if (delays.length === 0) {
    return 0;
  }

  return delays[Math.min(retryIndex, delays.length - 1)] ?? 0;
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorCode(error: Error): string | undefined {
  return (error as NodeJS.ErrnoException).code;
}

function createTimestampLogger(): LogFunction {
  return (message: string) => {
    console.log(`[${new Date().toISOString()}] ${message}`);
  };
}

function isRetryableNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorCode = getErrorCode(error);
  if (errorCode && RETRYABLE_ERROR_CODES.has(errorCode)) {
    return true;
  }

  return /socket hang up|timeout ao conectar|connect etimedout|econnreset|econnrefused|eai_again/i.test(
    error.message,
  );
}
