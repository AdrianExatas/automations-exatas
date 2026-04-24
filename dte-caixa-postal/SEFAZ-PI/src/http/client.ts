import { readFileSync } from "node:fs";
import { Agent, fetch as undiciFetch, type Dispatcher } from "undici";

export const SEFAZ_PI_DOMAIN = "sefaz.pi.gov.br";

export type CookieJar = Map<string, string>;

type FetchInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
  redirect?: "follow" | "manual" | "error";
  dispatcher?: Dispatcher;
};

export type HttpClient = {
  fetch(url: string | URL, init?: FetchInit): Promise<Response>;
  cookies: CookieJar;
};

export function createCookieJar(): CookieJar {
  return new Map<string, string>();
}

export function serializeCookies(jar: CookieJar): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

export function parseSetCookieHeaders(jar: CookieJar, headers: string[]): void {
  for (const header of headers) {
    const parts = header.split(";");
    const nameValue = parts[0]?.trim();
    if (!nameValue) continue;
    const eqIdx = nameValue.indexOf("=");
    if (eqIdx === -1) continue;
    const name = nameValue.slice(0, eqIdx).trim();
    const value = nameValue.slice(eqIdx + 1).trim();
    if (name) jar.set(name, value);
  }
}

export function createMtlsAgent(pfxPath: string, passphrase: string): Agent {
  return new Agent({
    connect: {
      pfx: readFileSync(pfxPath),
      passphrase,
    },
  });
}

export function createHttpClient(
  jar: CookieJar,
  mtlsAgent?: Agent,
): HttpClient {
  const defaultAgent = new Agent({});

  async function fetchWithCookies(
    url: string | URL,
    init: FetchInit = {},
  ): Promise<Response> {
    const urlStr = url.toString();
    const isCertDomain = urlStr.includes("siatweb-certificado");
    const dispatcher = init.dispatcher ?? (isCertDomain && mtlsAgent ? mtlsAgent : defaultAgent);

    const cookieHeader = serializeCookies(jar);
    const headers: Record<string, string> = {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      ...(init.headers ?? {}),
    };

    if (cookieHeader) {
      headers["cookie"] = cookieHeader;
    }

    const response = await undiciFetch(urlStr, {
      method: init.method ?? "GET",
      headers,
      body: init.body ?? null,
      redirect: init.redirect ?? "manual",
      dispatcher,
    } as Parameters<typeof undiciFetch>[1]);

    const setCookieList = response.headers.getSetCookie?.() ?? [];
    parseSetCookieHeaders(jar, setCookieList);

    return response as unknown as Response;
  }

  return { fetch: fetchWithCookies, cookies: jar };
}

export function followRedirectUrl(base: string, location: string): string {
  if (location.startsWith("http")) return location;
  const u = new URL(base);
  return `${u.protocol}//${u.host}${location}`;
}
