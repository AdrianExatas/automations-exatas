/**
 * Fluxo OIDC PKCE com mTLS para o portal SEFAZ-PI.
 *
 * 1. GET auth endpoint → HTML da página de login Keycloak
 * 2. Extrair URL do form action (session_code, execution, tab_id)
 * 3. POST form action com mTLS cert (corpo vazio — cert é validado na camada TLS)
 * 4. Capturar ?code=... do header Location (302)
 * 5. POST token endpoint → access_token, refresh_token
 * 6. Montar todos os cookies que o portal SIATWEB espera
 */

import { randomBytes } from "node:crypto";
import { load as cheerioLoad } from "cheerio";
import {
  CERT_HOST,
  OIDC_AUTH_BASE,
  OIDC_TOKEN_URL,
  REDIRECT_URI,
  SIATWEB_HOST,
} from "../config/siatweb-urls.js";
import { createHttpClient, createCookieJar, createMtlsAgent, type HttpClient } from "./client.js";

const AUTH_BASE = OIDC_AUTH_BASE;
const TOKEN_URL = OIDC_TOKEN_URL;

const CLIENT_ID = "controle-acesso-sefaz";
/** Valor embutido no front do portal; prefira definir SEFAZ_PI_OIDC_CLIENT_SECRET no .env. */
const DEFAULT_OIDC_CLIENT_SECRET_FALLBACK = "j3dOJDSYzQiR0dbqTpBndduBoP0zSUBN";

function resolveOidcClientSecret(): string {
  const fromEnv = process.env.SEFAZ_PI_OIDC_CLIENT_SECRET?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_OIDC_CLIENT_SECRET_FALLBACK;
}

export type OidcSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  refreshExpiresAt: number;
  codeVerifier: string;
  client: HttpClient;
};

function generateVerifier(): string {
  return randomBytes(32).toString("hex");
}

function generateState(): string {
  return randomBytes(5).toString("base64url").slice(0, 10);
}

function extractFormAction(html: string): string {
  const $ = cheerioLoad(html);
  const action =
    $("form[method='post']").attr("action") ??
    $("form").attr("action") ??
    $("input[name='login']").closest("form").attr("action");
  if (!action) throw new Error("Não foi possível extrair o form action da página de login Keycloak");
  return action.startsWith("http") ? action : `https://${CERT_HOST}${action}`;
}

export async function authenticate(
  pfxPath: string,
  passphrase: string,
): Promise<OidcSession> {
  const codeVerifier = generateVerifier();
  const state = generateState();
  const jar = createCookieJar();
  const mtlsAgent = createMtlsAgent(pfxPath, passphrase);
  const client = createHttpClient(jar, mtlsAgent);

  const authUrl =
    `${AUTH_BASE}/auth?` +
    new URLSearchParams({
      protocol: "oauth2",
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: "openid profile email",
      state,
      code_challenge_method: "plain",
      code_challenge: codeVerifier,
    }).toString();

  // Passo 1 — GET da página de login Keycloak (usa mTLS via agent)
  const loginPageRes = await client.fetch(authUrl, {
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "upgrade-insecure-requests": "1",
    },
    redirect: "follow",
  });

  if (!loginPageRes.ok) {
    throw new Error(`GET auth falhou: ${loginPageRes.status} ${loginPageRes.statusText}`);
  }

  const loginHtml = await loginPageRes.text();
  const formAction = extractFormAction(loginHtml);

  // Passo 2 — POST com mTLS (corpo vazio, cert autentica na camada TLS)
  const authenticateRes = await client.fetch(formAction, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "origin": `https://${CERT_HOST}`,
      "referer": authUrl,
    },
    body: "",
    redirect: "manual",
  });

  if (authenticateRes.status !== 302) {
    throw new Error(
      `POST login-actions/authenticate esperava 302, recebeu ${authenticateRes.status}`,
    );
  }

  const location = authenticateRes.headers.get("location") ?? "";
  const codeMatch = location.match(/[?&]code=([^&]+)/);
  if (!codeMatch) {
    throw new Error(`Não encontrou ?code= no header Location: ${location}`);
  }
  const authCode = codeMatch[1]!;

  // Passo 3 — POST token endpoint com code + code_verifier
  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    client_secret: resolveOidcClientSecret(),
    code: authCode,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  }).toString();

  const tokenRes = await client.fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "origin": `https://${SIATWEB_HOST}`,
    },
    body: tokenBody,
    redirect: "follow",
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text().catch(() => "");
    throw new Error(`POST token falhou: ${tokenRes.status} ${errBody}`);
  }

  const tokenData = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    refresh_expires_in: number;
  };

  const now = Date.now();
  const expiresAt = now + tokenData.expires_in * 1000;
  const refreshExpiresAt = now + tokenData.refresh_expires_in * 1000;

  // Montar cookies que o portal SIATWEB espera (baseado no trace)
  const encodedToken = `Bearer%20${encodeURIComponent(tokenData.access_token).replace(/%20/g, " ")}`;
  jar.set("auth._token.local", "false");
  jar.set("auth._token_expiration.local", "false");
  jar.set("auth.strategy", "keycloak");
  jar.set("auth.keycloak.pkce_state", codeVerifier);
  jar.set("testParam", "false");
  jar.set("auth._token.keycloak", `Bearer%20${encodeURIComponent(tokenData.access_token)}`);
  jar.set("auth._token_expiration.keycloak", String(expiresAt));
  jar.set("auth._refresh_token.keycloak", encodeURIComponent(tokenData.refresh_token));
  jar.set("auth._refresh_token_expiration.keycloak", String(refreshExpiresAt));

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt,
    refreshExpiresAt,
    codeVerifier,
    client,
  };
}
