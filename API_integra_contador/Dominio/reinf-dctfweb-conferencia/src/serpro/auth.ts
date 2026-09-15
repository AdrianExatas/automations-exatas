/**
 * Autenticação mTLS SERPRO Integra Contador com cache de tokens e renovação
 */
import { readFile } from "node:fs/promises";
import { request as httpsRequest, type RequestOptions } from "node:https";

export interface SerproTokens {
  access_token: string;
  jwt_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  obtained_at: number; // timestamp ms
}

export interface HttpRequest {
  url: URL;
  method: "POST" | "GET";
  headers: Record<string, string>;
  body: string;
  pfx?: Uint8Array;
  passphrase?: string;
  cert?: Buffer | string;
  key?: Buffer | string;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

export type HttpTransport = (request: HttpRequest) => Promise<HttpResponse>;

export class SerproHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly responseBody: string,
    public readonly responseId: string | null = null,
  ) {
    super(`SERPRO respondeu HTTP ${status}${responseId ? ` (responseId: ${responseId})` : ""}`);
    this.name = status === 504 ? "SerproIndeterminateOperationError" : "SerproHttpError";
  }
}

export const defaultHttpsTransport: HttpTransport = async (input) =>
  new Promise((resolve, reject) => {
    const options: RequestOptions = {
      protocol: input.url.protocol,
      hostname: input.url.hostname,
      port: input.url.port ? Number(input.url.port) : 443,
      path: `${input.url.pathname}${input.url.search}`,
      method: input.method,
      headers: {
        ...input.headers,
        "content-length": Buffer.byteLength(input.body).toString(),
      },
      pfx: input.cert ? undefined : (input.pfx ? Buffer.from(input.pfx) : undefined),
      cert: input.cert,
      key: input.key,
      passphrase: input.passphrase,
      minVersion: "TLSv1.2",
    };

    const req = httpsRequest(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      res.on("end", () => {
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });

    req.on("error", reject);
    req.end(input.body);
  });

export class SerproAuthManager {
  private cachedTokens: SerproTokens | null = null;
  private pfxBuffer: Uint8Array | null = null;
  private pemCertAndKey: { cert: Buffer; key: Buffer } | null = null;

  constructor(
    private readonly options: {
      consumerKey: string;
      consumerSecret: string;
      certificatePfxPath: string;
      certificatePassword: string;
      authUrl?: string;
    },
    private readonly transport: HttpTransport = defaultHttpsTransport,
  ) {}

  public async getTokens(forceRefresh = false): Promise<SerproTokens> {
    const now = Date.now();
    // Reutilizar se ainda faltarem mais de 60 segundos para expirar
    if (
      !forceRefresh &&
      this.cachedTokens &&
      now < this.cachedTokens.obtained_at + (this.cachedTokens.expires_in - 60) * 1000
    ) {
      return this.cachedTokens;
    }

    return this.authenticate();
  }

  public invalidateTokens(): void {
    this.cachedTokens = null;
  }

  private async loadPfx(): Promise<Uint8Array> {
    if (!this.pfxBuffer) {
      if (!this.options.certificatePfxPath) {
        throw new Error("Caminho do certificado PFX não informado (SERPRO_CERT_PFX_PATH).");
      }
      this.pfxBuffer = new Uint8Array(await readFile(this.options.certificatePfxPath));
    }
    return this.pfxBuffer;
  }

  private async loadCredentials(): Promise<{ pfx?: Uint8Array; cert?: Buffer; key?: Buffer }> {
    if (this.pemCertAndKey) {
      return this.pemCertAndKey;
    }

    // Se tiver caminho do PFX, tenta extrair cert/key via OpenSSL em memória (compatibilidade com Bun)
    if (this.options.certificatePfxPath) {
      try {
        const { spawnSync } = await import("node:child_process");
        const { resolve } = await import("node:path");
        const child = spawnSync(
          "openssl",
          ["pkcs12", "-in", resolve(this.options.certificatePfxPath), "-passin", "stdin", "-nodes"],
          {
            input: this.options.certificatePassword,
            windowsHide: true,
          },
        );

        if (child.status === 0 && child.stdout && child.stdout.length > 0) {
          const pemBuf = Buffer.from(child.stdout);
          this.pemCertAndKey = { cert: pemBuf, key: pemBuf };
          return this.pemCertAndKey;
        }
      } catch {
        // Segue para fallback com loadPfx()
      }
    }

    const pfx = await this.loadPfx();
    return { pfx };
  }

  private async authenticate(): Promise<SerproTokens> {
    if (!this.options.consumerKey || !this.options.consumerSecret) {
      throw new Error("SERPRO Consumer Key ou Consumer Secret não informados.");
    }

    const basic = Buffer.from(
      `${this.options.consumerKey}:${this.options.consumerSecret}`,
      "utf8",
    ).toString("base64");

    const creds = await this.loadCredentials();
    const authUrl = this.options.authUrl || "https://autenticacao.sapi.serpro.gov.br/authenticate";

    const response = await this.transport({
      url: new URL(authUrl),
      method: "POST",
      headers: {
        authorization: `Basic ${basic}`,
        "content-type": "application/x-www-form-urlencoded",
        "role-type": "TERCEIROS",
      },
      body: "grant_type=client_credentials",
      pfx: creds.pfx,
      cert: creds.cert,
      key: creds.key,
      passphrase: this.options.certificatePassword,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new SerproHttpError(response.status, response.body, this.extractResponseId(response));
    }

    const parsed = JSON.parse(response.body) as Partial<SerproTokens>;
    if (!parsed.access_token || !parsed.jwt_token || typeof parsed.expires_in !== "number") {
      throw new Error("Resposta de autenticação SERPRO incompleta (sem access_token ou jwt_token).");
    }

    this.cachedTokens = {
      access_token: parsed.access_token,
      jwt_token: parsed.jwt_token,
      expires_in: parsed.expires_in,
      token_type: parsed.token_type || "Bearer",
      scope: parsed.scope,
      obtained_at: Date.now(),
    };

    return this.cachedTokens;
  }

  public extractResponseId(response: HttpResponse): string | null {
    const header =
      response.headers.responseid ??
      response.headers["response-id"] ??
      response.headers["x-response-id"];
    if (Array.isArray(header)) return header[0] ?? null;
    if (typeof header === "string") return header;
    try {
      const bodyParsed = JSON.parse(response.body) as Record<string, unknown>;
      return typeof bodyParsed.responseId === "string" ? bodyParsed.responseId : null;
    } catch {
      return null;
    }
  }
}
