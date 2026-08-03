import fs from "node:fs";
import { createRequire } from "node:module";
import type { AuthArtifacts } from "@exatas/onvio-auth";
import type { AppConfig } from "../config.js";

const require = createRequire(import.meta.url);
const {
  captureOnvioAndGesttaTokens,
  loadAuthArtifactsFromFile,
  resolveWorkspaceAuthArtifactPath,
} = require("@exatas/onvio-auth") as typeof import("@exatas/onvio-auth");

interface TokenState {
  gesttaJwt?: string;
  onvioUdsLongToken?: string;
  source: "none" | "environment" | "artifact" | "refreshed-artifact";
  capturedAt?: string;
  artifactPath?: string;
}

export interface AuthStatus {
  authenticated: boolean;
  source: TokenState["source"];
  artifactPath?: string;
  capturedAt?: string;
  gesttaExpiresAt?: string;
  gesttaExpired?: boolean;
  onvioCookieExpiresAt?: string;
  refreshConfigured: boolean;
}

function decodeJwtExpiry(jwt: string): Date | undefined {
  try {
    const [, payload] = jwt.split(".");
    if (!payload) return undefined;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    return typeof decoded.exp === "number" ? new Date(decoded.exp * 1000) : undefined;
  } catch {
    return undefined;
  }
}

function requireArtifacts(artifacts: AuthArtifacts | null, artifactPath: string): AuthArtifacts {
  if (!artifacts?.gestta.jwt || !artifacts.onvio.udsLongToken) {
    throw new Error(`Artefato de autenticação ausente ou inválido em ${artifactPath}.`);
  }
  return artifacts;
}

export class AuthManager {
  private state: TokenState;
  private refreshPromise?: Promise<TokenState>;
  private artifact?: AuthArtifacts;

  constructor(private readonly config: AppConfig) {
    this.state = this.loadInitialState();
  }

  private resolveArtifactPath(): string {
    return this.config.artifactPath || resolveWorkspaceAuthArtifactPath(process.cwd());
  }

  private loadInitialState(): TokenState {
    const gesttaEnv = process.env.GESTTA_JWT_TOKEN?.trim() || process.env.JWT_GESTTA?.trim();
    const onvioEnv = process.env.ONVIO_UDS_LONG_TOKEN?.trim();
    const artifactPath = this.resolveArtifactPath();
    const artifact = fs.existsSync(artifactPath) ? loadAuthArtifactsFromFile(artifactPath) : null;
    if (artifact) this.artifact = artifact;

    const gesttaJwt = gesttaEnv || artifact?.gestta.jwt;
    const onvioUdsLongToken = onvioEnv || artifact?.onvio.udsLongToken;
    return {
      gesttaJwt,
      onvioUdsLongToken,
      source: gesttaJwt && onvioUdsLongToken ? (gesttaEnv || onvioEnv ? "environment" : "artifact") : "none",
      capturedAt: artifact?.capturedAt,
      artifactPath: artifact ? artifactPath : undefined,
    };
  }

  getGesttaJwt(): string {
    if (!this.state.gesttaJwt) throw new Error("Token Gestta ausente; renove ou configure a autenticação.");
    return this.state.gesttaJwt;
  }

  getOnvioToken(): string {
    if (!this.state.onvioUdsLongToken) throw new Error("Token Onvio ausente; renove ou configure a autenticação.");
    return this.state.onvioUdsLongToken;
  }

  status(): AuthStatus {
    const expiry = this.state.gesttaJwt ? decodeJwtExpiry(this.state.gesttaJwt) : undefined;
    return {
      authenticated: Boolean(this.state.gesttaJwt && this.state.onvioUdsLongToken),
      source: this.state.source,
      artifactPath: this.state.artifactPath,
      capturedAt: this.state.capturedAt,
      gesttaExpiresAt: expiry?.toISOString(),
      gesttaExpired: expiry ? expiry.getTime() <= Date.now() : undefined,
      onvioCookieExpiresAt: this.artifact?.onvio.cookieExpiresAt,
      refreshConfigured: Boolean(process.env.ONVIO_EMAIL?.trim() && process.env.ONVIO_PASSWORD?.trim()),
    };
  }

  async refresh(headed = false): Promise<AuthStatus> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.performRefresh(headed).finally(() => {
        this.refreshPromise = undefined;
      });
    }
    this.state = await this.refreshPromise;
    return this.status();
  }

  private async performRefresh(headed: boolean): Promise<TokenState> {
    const email = process.env.ONVIO_EMAIL?.trim();
    const password = process.env.ONVIO_PASSWORD?.trim();
    if (!email || !password) {
      throw new Error("ONVIO_EMAIL e ONVIO_PASSWORD são necessários para renovar a sessão.");
    }

    const artifactPath = this.resolveArtifactPath();
    const artifacts = requireArtifacts(
      await captureOnvioAndGesttaTokens({
        email,
        password,
        artifactPath,
        writeArtifact: true,
        browser: { headless: headed ? false : this.config.browserHeadless },
        mfa: {
          method: (process.env.ONVIO_MFA_METHOD?.trim() as "E-mail" | "SMS" | "Telefonema") || "E-mail",
          code: process.env.ONVIO_MFA_CODE?.trim() || undefined,
        },
      }),
      artifactPath,
    );
    this.artifact = artifacts;
    return {
      gesttaJwt: artifacts.gestta.jwt,
      onvioUdsLongToken: artifacts.onvio.udsLongToken,
      source: "refreshed-artifact",
      capturedAt: artifacts.capturedAt,
      artifactPath,
    };
  }
}
