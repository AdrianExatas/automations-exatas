import axios, { type AxiosInstance } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";
import {
  buildDownloadPayload,
  buildListPayload,
  buildLoginPayload,
  buildLoginPollPayload,
  buildPagePayload,
  type Payload,
} from "./payloads";
import { formatBrDate, parseIsoDate, yearMonthFromBrDate } from "./dates";
import { parseFilterFields, parseNotaPage, parseViewState } from "./parser";
import type { DownloadPeriodInput, DownloadResult, FilterFields, LogCallback, NotaFiscal } from "./types";

const ALIAS = "pmboquim";
const MAX_WORKERS = 8;
const BASE_URL = "https://agnfseprd.agapesistemas.com.br";
const TIMEOUT_MS = 60_000;

export class AgapeNfseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgapeNfseError";
  }
}

export class AgapeNfseClient {
  readonly maxWorkers = MAX_WORKERS;
  private readonly baseUrl: string;
  private readonly consultUrl: string;
  private readonly jar: CookieJar;
  private readonly http: AxiosInstance;
  private filterFields?: FilterFields;

  constructor(baseUrl = BASE_URL, jar = new CookieJar()) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.consultUrl = new URL("/Admin/NotaFiscalAvulsaConsult.xhtml", this.baseUrl).toString();
    this.jar = jar;
    this.http = createHttp(this.baseUrl, jar);
  }

  async downloadPeriod(input: DownloadPeriodInput): Promise<DownloadResult> {
    const login = input.login.trim();
    const password = input.password;
    if (!login || !password) {
      throw new AgapeNfseError("Login e senha sao obrigatorios.");
    }

    const start = parseIsoDate(input.startDate);
    const end = parseIsoDate(input.endDate);
    if (start.getTime() > end.getTime()) {
      throw new AgapeNfseError("Data inicial nao pode ser maior que a data final.");
    }
    if (start.getUTCFullYear() !== end.getUTCFullYear()) {
      throw new AgapeNfseError("Informe um periodo dentro do mesmo exercicio/ano.");
    }

    const outputDir = input.outputDir;
    await this.loginSite(login, password);
    await this.prepareQuery();
    let fields = this.requireFilterFields();

    await mkdir(outputDir, { recursive: true });
    log(input.onLog, `Listando notas de ${formatBrDate(start)} ate ${formatBrDate(end)}...`);
    let page = await this.listFirstPage(fields, start, end);
    fields = this.updateViewState(fields, page.viewState);

    let totalNotas = 0;
    let baixados = 0;
    let pulados = 0;
    let erros = 0;
    let paginaAtual = page.currentPage;

    while (true) {
      log(input.onLog, `Pagina ${paginaAtual}: ${page.notas.length} nota(s)`);
      const pendentes: Array<{ nota: NotaFiscal; destino: string }> = [];

      for (const nota of page.notas) {
        totalNotas += 1;
        const destino = this.destinoNota(outputDir, nota);
        if (await exists(destino)) {
          pulados += 1;
          log(input.onLog, `[SKIP] NFSe ${nota.numero} codigo ${nota.codigo} ja existe`);
          continue;
        }
        pendentes.push({ nota, destino });
      }

      const result = await this.downloadPending(fields, start, end, pendentes, input.onLog);
      baixados += result.baixados;
      erros += result.erros;

      const next = paginaAtual + 1;
      if (!page.pageLinks.has(next) && !page.hasNext) {
        break;
      }
      page = await this.listPage(fields, start, end, page.tableId, next);
      fields = this.updateViewState(fields, page.viewState);
      paginaAtual = page.currentPage || next;
    }

    return { totalNotas, baixados, pulados, erros, destino: outputDir };
  }

  private async loginSite(login: string, password: string): Promise<void> {
    const loginUrl = `${this.baseUrl}/?alias=${ALIAS}`;
    const response = await this.http.get(loginUrl);
    let viewState = parseViewState(response.data);
    viewState = await this.refreshLoginViewState(viewState, loginUrl);

    const loginResponse = await this.http.post(
      new URL("/Principal.xhtml", this.baseUrl).toString(),
      encode(buildLoginPayload(login, password, viewState)),
      {
        maxRedirects: 0,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Origin: this.baseUrl,
          Referer: loginUrl,
          Accept: "*/*",
        },
        validateStatus: (status) => status >= 200 && status < 400,
      },
    );

    const location = loginResponse.headers.location as string | undefined;
    const ajaxResponse = String(loginResponse.headers["ajax-response"] ?? "");
    if (location) {
      await this.http.get(new URL(location, this.baseUrl).toString());
      return;
    }
    if (!ajaxResponse.toLowerCase().includes("redirect")) {
      const body = String(loginResponse.data).slice(0, 300);
      throw new AgapeNfseError(`Falha no login. Resposta inesperada: ${body}`);
    }
  }

  private async refreshLoginViewState(viewState: string, referer: string): Promise<string> {
    try {
      const response = await this.http.post(
        new URL("/Principal.xhtml", this.baseUrl).toString(),
        encode(buildLoginPollPayload(viewState)),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Origin: this.baseUrl,
            Referer: referer,
            Accept: "*/*",
          },
        },
      );
      return parseViewState(response.data);
    } catch {
      return viewState;
    }
  }

  private async prepareQuery(): Promise<void> {
    const response = await this.http.get(this.consultUrl);
    const viewState = parseViewState(response.data);
    this.filterFields = parseFilterFields(response.data, viewState);
  }

  private async listFirstPage(fields: FilterFields, start: Date, end: Date) {
    const response = await this.http.post(this.consultUrl, encode(buildListPayload(fields, start, end)), {
      headers: this.formHeaders("*/*"),
    });
    return parseNotaPage(response.data, fields.viewState);
  }

  private async listPage(fields: FilterFields, start: Date, end: Date, tableId: string, page: number) {
    const response = await this.http.post(this.consultUrl, encode(buildPagePayload(fields, start, end, tableId, page)), {
      headers: this.formHeaders("*/*"),
    });
    return parseNotaPage(response.data, fields.viewState);
  }

  private async downloadPending(
    fields: FilterFields,
    start: Date,
    end: Date,
    pendentes: Array<{ nota: NotaFiscal; destino: string }>,
    onLog?: LogCallback,
  ): Promise<{ baixados: number; erros: number }> {
    if (!pendentes.length) {
      return { baixados: 0, erros: 0 };
    }

    const workers = Math.min(this.maxWorkers, pendentes.length);
    log(onLog, `Baixando ${pendentes.length} XML(s) com ${workers} conexao(oes)...`);

    let baixados = 0;
    let erros = 0;
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < pendentes.length) {
        const item = pendentes[nextIndex++];
        if (!item) {
          continue;
        }
        try {
          await this.downloadNotaIsolated(fields, start, end, item.nota, item.destino);
          baixados += 1;
          log(onLog, `[OK] NFSe ${item.nota.numero} codigo ${item.nota.codigo}`);
        } catch (error) {
          erros += 1;
          log(onLog, `[ERRO] NFSe ${item.nota.numero} codigo ${item.nota.codigo}: ${errorMessage(error)}`);
        }
      }
    };

    await Promise.all(Array.from({ length: workers }, worker));
    return { baixados, erros };
  }

  private async downloadNotaIsolated(fields: FilterFields, start: Date, end: Date, nota: NotaFiscal, destino: string): Promise<void> {
    const serializedJar = this.jar.serializeSync();
    if (!serializedJar) {
      throw new AgapeNfseError("Nao foi possivel clonar cookies da sessao.");
    }
    const jar = CookieJar.deserializeSync(serializedJar);
    const http = createHttp(this.baseUrl, jar);
    const response = await http.post(
      this.consultUrl,
      encode(buildDownloadPayload(fields, start, end, nota.xmlActionName)),
      {
        responseType: "arraybuffer",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Origin: this.baseUrl,
          Referer: this.consultUrl,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      },
    );
    const content = Buffer.from(response.data).subarray(0);
    if (!looksLikeXml(content)) {
      const contentType = String(response.headers["content-type"] ?? "");
      throw new AgapeNfseError(`Resposta nao parece XML (content-type=${contentType})`);
    }
    await mkdir(path.dirname(destino), { recursive: true });
    await writeFile(destino, content);
  }

  private destinoNota(outputDir: string, nota: NotaFiscal): string {
    const yearMonth = yearMonthFromBrDate(nota.emissao);
    const fileName = `nfse-${safeFilename(nota.numero)}_codigo-${safeFilename(nota.codigo)}.xml`;
    return path.join(outputDir, yearMonth, fileName);
  }

  private requireFilterFields(): FilterFields {
    if (!this.filterFields) {
      throw new AgapeNfseError("Consulta ainda nao foi preparada.");
    }
    return this.filterFields;
  }

  private updateViewState(fields: FilterFields, viewState: string): FilterFields {
    if (!viewState || viewState === fields.viewState) {
      return fields;
    }
    const updated = { ...fields, viewState };
    this.filterFields = updated;
    return updated;
  }

  private formHeaders(accept: string): Record<string, string> {
    return {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: this.baseUrl,
      Referer: this.consultUrl,
      Accept: accept,
    };
  }
}

export function defaultDownloadsDir(): string {
  return path.join(process.env.USERPROFILE ?? process.env.HOME ?? process.cwd(), "Downloads", "XML AgapeNFS-e");
}

function createHttp(baseUrl: string, jar: CookieJar): AxiosInstance {
  return wrapper(
    axios.create({
      baseURL: baseUrl,
      jar,
      withCredentials: true,
      timeout: TIMEOUT_MS,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    }),
  );
}

function encode(payload: Payload): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (key) {
      params.append(key, value);
    }
  }
  return params;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function looksLikeXml(content: Buffer): boolean {
  const trimmed = content.subarray(0, 200).toString("utf8").trimStart().toLowerCase();
  return trimmed.startsWith("<?xml") || (trimmed.includes("<") && trimmed.includes("</") && !trimmed.includes("<html"));
}

function safeFilename(value: string): string {
  return value.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "sem-identificacao";
}

function log(onLog: LogCallback | undefined, message: string): void {
  onLog?.(message);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
