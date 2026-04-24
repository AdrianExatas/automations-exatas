const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

export type HttpResult = {
  url: string;
  status: number;
  headers: Headers;
  bytes: Uint8Array;
};

export class CookieJar {
  private readonly cookies = new Map<string, string>();

  get header(): string {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  storeFrom(headers: Headers): void {
    for (const rawCookie of getSetCookieHeaders(headers)) {
      const pair = rawCookie.split(";", 1)[0]?.trim();
      if (!pair) {
        continue;
      }

      const separator = pair.indexOf("=");
      if (separator <= 0) {
        continue;
      }

      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      this.cookies.set(name, value);
    }
  }
}

export class HttpClient {
  readonly jar = new CookieJar();

  constructor(private readonly baseUrl: string, private readonly timeoutMs: number) {}

  async get(pathOrUrl: string, headers?: HeadersInit, signal?: AbortSignal): Promise<HttpResult> {
    return this.request(pathOrUrl, { method: "GET", headers }, 0, signal);
  }

  async postForm(pathOrUrl: string, fields: Record<string, string>, headers?: HeadersInit, signal?: AbortSignal): Promise<HttpResult> {
    return this.request(pathOrUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        ...headers,
      },
      body: new URLSearchParams(fields),
    }, 0, signal);
  }

  text(result: HttpResult): string {
    const contentType = result.headers.get("content-type") ?? "";
    const charset = contentType.match(/charset=([^;\s]+)/i)?.[1] ?? "iso-8859-1";
    return new TextDecoder(charset, { fatal: false }).decode(result.bytes);
  }

  resolve(pathOrUrl: string): string {
    return new URL(pathOrUrl, this.baseUrl).toString();
  }

  private async request(pathOrUrl: string, init: RequestInit, redirects = 0, externalSignal?: AbortSignal): Promise<HttpResult> {
    if (redirects > 10) {
      throw new Error("Redirecionamentos em excesso ao acessar a SEFAZ.");
    }
    throwIfAborted(externalSignal);

    const url = this.resolve(pathOrUrl);
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);
    const signal = combineSignals(externalSignal, controller.signal);
    const requestHeaders = new Headers(init.headers);
    requestHeaders.set("user-agent", requestHeaders.get("user-agent") ?? DEFAULT_USER_AGENT);
    requestHeaders.set("accept", requestHeaders.get("accept") ?? "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
    if (this.jar.header) {
      requestHeaders.set("cookie", this.jar.header);
    }

    try {
      const response = await fetch(url, {
        ...init,
        headers: requestHeaders,
        redirect: "manual",
        signal,
      });
      this.jar.storeFrom(response.headers);

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (location) {
          return this.request(new URL(location, url).toString(), { method: "GET" }, redirects + 1, externalSignal);
        }
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      if (response.status < 200 || response.status >= 300) {
        throw new Error(buildHttpStatusError(response.status, url, response.headers, bytes));
      }

      return {
        url: response.url || url,
        status: response.status,
        headers: response.headers,
        bytes,
      };
    } catch (error) {
      if (timedOut) {
        throw new Error(`Timeout ao acessar ${url}.`);
      }
      throwIfAborted(externalSignal);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function buildHttpStatusError(status: number, url: string, headers: Headers, bytes: Uint8Array): string {
  const contentType = headers.get("content-type") ?? "";
  const charset = contentType.match(/charset=([^;\s]+)/i)?.[1] ?? "utf-8";
  const text = new TextDecoder(charset, { fatal: false }).decode(bytes).replace(/\s+/g, " ").trim();
  const excerpt = text ? `: ${text.slice(0, 200)}` : "";
  return `HTTP ${status} ao acessar ${url}${excerpt}`;
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

function getSetCookieHeaders(headers: Headers): string[] {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof withGetSetCookie.getSetCookie === "function") {
    return withGetSetCookie.getSetCookie();
  }

  const raw = headers.get("set-cookie");
  return raw ? splitCombinedSetCookie(raw) : [];
}

function splitCombinedSetCookie(value: string): string[] {
  return value.split(/,(?=\s*[^;,=\s]+=[^;,]+)/g).map((cookie) => cookie.trim()).filter(Boolean);
}
