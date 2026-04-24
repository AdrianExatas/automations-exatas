const DEFAULT_DOWNLOAD_URL = "https://api.sieg.com/BaixarXml";
const RETRY_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const SUPPORTED_XML_TYPES = new Map([
  [55, 1],
  [57, 2],
  [65, 4],
]);

export type SiegClientOptions = {
  apiKey: string;
  downloadUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
};

export class SiegXmlClient {
  private readonly apiKey: string;
  private readonly downloadUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly retryCount: number;
  private readonly retryDelayMs: number;

  constructor(options: SiegClientOptions) {
    this.apiKey = options.apiKey.trim();
    this.downloadUrl = options.downloadUrl ?? DEFAULT_DOWNLOAD_URL;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.retryCount = options.retryCount ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 2_000;

    if (!this.apiKey) {
      throw new Error("API key da SIEG nao configurada no build.");
    }
  }

  async downloadXml(chave: string, signal?: AbortSignal): Promise<string> {
    const normalizedKey = validateAccessKey(chave);
    const url = buildDownloadUrl(this.downloadUrl, this.apiKey, inferXmlType(normalizedKey));
    let lastError = "Falha apos retries";

    for (let attempt = 0; attempt < this.retryCount; attempt += 1) {
      throwIfAborted(signal);
      const timeoutController = new AbortController();
      const timeout = setTimeout(() => timeoutController.abort(), this.timeoutMs);
      const combinedSignal = combineSignals(signal, timeoutController.signal);

      try {
        const response = await this.fetchImpl(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/xml, application/json, */*" },
          body: JSON.stringify(normalizedKey),
          signal: combinedSignal,
        });

        const text = (await response.text()).trim();
        if (response.status === 200) {
          const xml = parseSiegXmlResponse(text);
          if (!xml) {
            lastError = "Resposta 200 mas conteudo nao e XML";
          } else {
            return xml;
          }
        } else {
          lastError = `HTTP ${response.status}: ${text.slice(0, 200).replace(/\r?\n/g, " ")}`;
          if (!RETRY_STATUS_CODES.has(response.status)) {
            break;
          }
        }
      } catch (error) {
        throwIfAborted(signal);
        lastError = error instanceof Error && error.name === "AbortError" ? "Timeout na requisicao" : messageOf(error);
      } finally {
        clearTimeout(timeout);
      }

      if (attempt < this.retryCount - 1) {
        await sleep(this.retryDelayMs * (attempt + 1), signal);
      }
    }

    throw new Error(lastError);
  }
}

export function validateAccessKey(chave: string): string {
  const normalized = chave.trim();
  if (!/^\d{44}$/.test(normalized)) {
    throw new Error("Chave invalida (deve ter 44 digitos numericos)");
  }
  if (!SUPPORTED_XML_TYPES.has(Number(normalized.slice(20, 22)))) {
    const modelo = Number(normalized.slice(20, 22));
    throw new Error(`Documento modelo ${modelo} nao suportado para download (suportados: NFe=55, NFCe=65, CTe=57)`);
  }
  return normalized;
}

export function inferXmlType(chave: string): number {
  const normalized = validateAccessKey(chave);
  return SUPPORTED_XML_TYPES.get(Number(normalized.slice(20, 22)))!;
}

export function parseSiegXmlResponse(text: string): string | undefined {
  let content = text.trim();
  if (!content) {
    return undefined;
  }

  if (content.startsWith("{")) {
    try {
      const payload = JSON.parse(content) as { Codigo?: unknown; codigo?: unknown; Mensagens?: unknown };
      const candidate = payload.Codigo ?? payload.codigo ?? (Array.isArray(payload.Mensagens) ? payload.Mensagens[0] : undefined);
      content = typeof candidate === "string" ? candidate.trim() : "";
    } catch {
      return undefined;
    }
  }

  if (content.startsWith('"') && content.endsWith('"')) {
    try {
      const parsed = JSON.parse(content) as unknown;
      content = typeof parsed === "string" ? parsed.trim() : "";
    } catch {
      return undefined;
    }
  }

  return content.startsWith("<") ? content : undefined;
}

function buildDownloadUrl(baseUrl: string, apiKey: string, xmlType: number): string {
  const url = new URL(baseUrl);
  url.searchParams.set("xmlType", String(xmlType));
  url.searchParams.set("api_key", apiKey);
  return url.toString();
}

function combineSignals(primary: AbortSignal | undefined, secondary: AbortSignal): AbortSignal {
  if (!primary) {
    return secondary;
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (primary.aborted || secondary.aborted) {
    controller.abort();
  } else {
    primary.addEventListener("abort", abort, { once: true });
    secondary.addEventListener("abort", abort, { once: true });
  }
  return controller.signal;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new Error("Execucao cancelada pelo usuario.");
  }
}

async function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  if (ms <= 0) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(new Error("Execucao cancelada pelo usuario."));
      },
      { once: true },
    );
  });
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
