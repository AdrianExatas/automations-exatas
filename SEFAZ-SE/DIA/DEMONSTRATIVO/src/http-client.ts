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

  async get(pathOrUrl: string, headers?: HeadersInit): Promise<HttpResult> {
    return this.request(pathOrUrl, { method: "GET", headers });
  }

  async postForm(pathOrUrl: string, fields: Record<string, string>, headers?: HeadersInit): Promise<HttpResult> {
    return this.request(pathOrUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        ...headers,
      },
      body: new URLSearchParams(fields),
    });
  }

  text(result: HttpResult): string {
    const contentType = result.headers.get("content-type") ?? "";
    const charset = contentType.match(/charset=([^;\s]+)/i)?.[1] ?? "iso-8859-1";
    return new TextDecoder(charset, { fatal: false }).decode(result.bytes);
  }

  resolve(pathOrUrl: string): string {
    return new URL(pathOrUrl, this.baseUrl).toString();
  }

  private async request(pathOrUrl: string, init: RequestInit, redirects = 0): Promise<HttpResult> {
    if (redirects > 10) {
      throw new Error("Redirecionamentos em excesso ao acessar a SEFAZ.");
    }

    const url = this.resolve(pathOrUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
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
        signal: controller.signal,
      });
      this.jar.storeFrom(response.headers);

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (location) {
          return this.request(new URL(location, url).toString(), { method: "GET" }, redirects + 1);
        }
      }

      return {
        url: response.url || url,
        status: response.status,
        headers: response.headers,
        bytes: new Uint8Array(await response.arrayBuffer()),
      };
    } finally {
      clearTimeout(timeout);
    }
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
