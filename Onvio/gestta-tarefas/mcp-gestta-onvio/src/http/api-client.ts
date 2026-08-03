import type { AuthManager } from "../auth/auth-manager.js";
import type { AppConfig } from "../config.js";
import type { HttpMethod } from "../types.js";
import { redact, safeError } from "../security/redact.js";

export interface ApiRequest {
  provider: "gestta" | "onvio";
  method: HttpMethod;
  path: string;
  query?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string>;
  readLike?: boolean;
  responseMode?: "json" | "binary";
}

export interface BinaryResponse {
  bytes: Uint8Array;
  contentType: string;
  contentLength: number;
  fileName?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function buildUrl(base: string, requestPath: string, query?: Record<string, unknown>): URL {
  const url = new URL(requestPath, `${base}/`);
  for (const [key, raw] of Object.entries(query || {})) {
    if (raw === undefined || raw === null || raw === "") continue;
    if (Array.isArray(raw)) {
      for (const item of raw) url.searchParams.append(key, String(item));
    } else if (typeof raw === "object") {
      url.searchParams.set(key, JSON.stringify(raw));
    } else {
      url.searchParams.set(key, String(raw));
    }
  }
  return url;
}

function retryDelay(response: Response | undefined, attempt: number): number {
  const retryAfter = response?.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.min(seconds * 1000, 30_000);
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.max(0, Math.min(date - Date.now(), 30_000));
  }
  return Math.min(500 * 2 ** attempt, 8_000) + Math.floor(Math.random() * 150);
}

function contentDispositionName(value: string | null): string | undefined {
  const match = value?.match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i);
  return match?.[1] ? decodeURIComponent(match[1].replace(/"$/, "")) : undefined;
}

export class ApiClient {
  private activeRequests = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(
    private readonly config: AppConfig,
    private readonly auth: AuthManager,
  ) {}

  async request<T = unknown>(request: ApiRequest): Promise<T> {
    await this.acquire();
    try {
      let refreshed = false;
      for (;;) {
        try {
          return await this.requestWithRetries<T>(request);
        } catch (error) {
          if (
            !refreshed &&
            error instanceof ApiError &&
            (error.status === 401 || error.status === 403) &&
            this.auth.status().refreshConfigured
          ) {
            refreshed = true;
            await this.auth.refresh(false);
            continue;
          }
          throw error;
        }
      }
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (this.activeRequests < this.config.concurrency) {
      this.activeRequests += 1;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.activeRequests += 1;
  }

  private release(): void {
    this.activeRequests -= 1;
    this.waiters.shift()?.();
  }

  private async requestWithRetries<T>(request: ApiRequest): Promise<T> {
    const retryable = request.readLike || request.method === "GET";
    const maxAttempts = retryable ? this.config.readRetries + 1 : 1;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      let response: Response | undefined;
      try {
        response = await this.fetchOnce(request);
        if (response.ok) return (await this.parseResponse(response, request.responseMode)) as T;

        const body = await this.parseErrorBody(response);
        const apiError = new ApiError(
          `${request.provider} ${request.method} ${request.path}: HTTP ${response.status}`,
          response.status,
          redact(body),
        );
        if (!retryable || ![429, 500, 502, 503, 504].includes(response.status) || attempt + 1 >= maxAttempts) {
          throw apiError;
        }
        lastError = apiError;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        lastError = error;
        if (!retryable || attempt + 1 >= maxAttempts) {
          throw new ApiError(`${request.provider} ${request.method} ${request.path}: ${safeError(error)}`);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
    }
    throw lastError;
  }

  private async fetchOnce(request: ApiRequest): Promise<Response> {
    const base = request.provider === "gestta" ? this.config.gesttaBaseUrl : this.config.onvioBaseUrl;
    const url = buildUrl(base, request.path, request.query);
    const headers = new Headers({ Accept: "application/json, text/plain, */*", ...request.headers });
    if (request.provider === "gestta") {
      headers.set("Authorization", `JWT ${this.auth.getGesttaJwt()}`);
      headers.set("Origin", "https://app.gestta.com.br");
      headers.set("Referer", "https://app.gestta.com.br/");
    } else {
      headers.set("Authorization", `UDSLongToken ${this.auth.getOnvioToken()}`);
      headers.set("Referer", "https://onvio.com.br/staff/");
    }

    let body: BodyInit | undefined;
    if (request.body instanceof FormData) {
      body = request.body;
    } else if (request.body !== undefined) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(request.body);
    }

    return fetch(url, {
      method: request.method,
      headers,
      body,
      signal: AbortSignal.timeout(this.config.httpTimeoutMs),
    });
  }

  private async parseResponse(response: Response, mode: ApiRequest["responseMode"]): Promise<unknown> {
    if (mode === "binary") {
      const bytes = new Uint8Array(await response.arrayBuffer());
      return {
        bytes,
        contentType: response.headers.get("content-type") || "application/octet-stream",
        contentLength: bytes.byteLength,
        fileName: contentDispositionName(response.headers.get("content-disposition")),
      } satisfies BinaryResponse;
    }
    if (response.status === 204) return null;
    const text = await response.text();
    if (!text) return null;
    try {
      return redact(JSON.parse(text));
    } catch {
      return redact(text);
    }
  }

  private async parseErrorBody(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text.slice(0, 2000);
    }
  }
}
