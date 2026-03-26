import type { BrowserContext, Page, Request } from "playwright";
import { DEFAULT_GESTTA_API_BASE_URL, DEFAULT_GESTTA_URL } from "./constants";
import { writeAuthArtifacts } from "./artifacts";
import { withAuthenticatedOnvioContext, createAuthSession, resolveLoginOptions } from "./onvio-login";
import { resolveDefaultArtifactPath, resolveDefaultStorageStatePath } from "./runtime-paths";
import { extractUdsLongTokenFromCookies, parseJwtFromAuthorizationHeader } from "./token-utils";
import type { AuthArtifacts, CaptureOnvioAndGesttaTokensOptions } from "./types";

interface ResolvedCaptureOptions {
  gesttaUrl: string;
  gesttaApiBaseUrl: string;
  artifactPath: string;
  writeArtifact: boolean;
  storageStatePath: string;
}

function normalizeUrlPrefix(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function resolveCaptureOptions(
  rawOptions: CaptureOnvioAndGesttaTokensOptions,
): ResolvedCaptureOptions {
  return {
    gesttaUrl: rawOptions.gesttaUrl ?? DEFAULT_GESTTA_URL,
    gesttaApiBaseUrl: normalizeUrlPrefix(rawOptions.gesttaApiBaseUrl ?? DEFAULT_GESTTA_API_BASE_URL),
    artifactPath: rawOptions.artifactPath ?? resolveDefaultArtifactPath(),
    writeArtifact: rawOptions.writeArtifact ?? Boolean(rawOptions.artifactPath),
    storageStatePath: rawOptions.storageStatePath ?? resolveDefaultStorageStatePath(),
  };
}

export async function waitForGesttaJwtRequest(
  context: Pick<BrowserContext, "on" | "off">,
  gesttaApiBaseUrl: string,
  timeoutMs: number,
): Promise<{ jwt: string; requestUrl: string }> {
  return new Promise((resolve, reject) => {
    const normalizedBaseUrl = normalizeUrlPrefix(gesttaApiBaseUrl);
    const timeout = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          `Nenhuma requisicao autenticada para ${normalizedBaseUrl} foi capturada dentro de ${timeoutMs}ms.`,
        ),
      );
    }, timeoutMs);

    const listener = (request: Request) => {
      const url = request.url();
      if (!url.startsWith(normalizedBaseUrl)) return;

      const headers = request.headers();
      const jwt = parseJwtFromAuthorizationHeader(headers.authorization ?? headers.Authorization);
      if (!jwt) return;

      cleanup();
      resolve({ jwt, requestUrl: url });
    };

    const cleanup = () => {
      clearTimeout(timeout);
      context.off("request", listener);
    };

    context.on("request", listener);
  });
}

async function waitForNewPage(
  context: Pick<BrowserContext, "on" | "off">,
  timeoutMs: number,
): Promise<Page> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Nenhuma nova aba do Gestta foi aberta dentro de ${timeoutMs}ms.`));
    }, timeoutMs);

    const listener = (page: Page) => {
      cleanup();
      resolve(page);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      context.off("page", listener);
    };

    context.on("page", listener);
  });
}

async function closeUnexpectedPopup(
  context: Pick<BrowserContext, "on" | "off">,
  timeoutMs: number,
): Promise<void> {
  const popup = await waitForNewPage(context, timeoutMs).catch(() => null);
  if (!popup) return;
  await popup.close().catch(() => {});
}

async function openGesttaViaOnvioSso(
  context: Pick<BrowserContext, "on" | "off">,
  onvioPage: Pick<Page, "goto" | "locator" | "waitForURL">,
  baseUrl: string,
  timeoutMs: number,
): Promise<void> {
  await onvioPage.goto(`${baseUrl}/staff/#/dashboard-core-center`, {
    waitUntil: "domcontentloaded",
  });

  const processLink = onvioPage.locator('a[href*="api.gestta.com.br/dominio/auth/redirect"]').first();
  await processLink.waitFor({ state: "attached", timeout: timeoutMs });

  const popupMonitor = closeUnexpectedPopup(context, Math.min(timeoutMs, 1_000));
  await processLink.evaluate((element: HTMLAnchorElement) => {
    element.target = "_self";
    element.click();
  });
  await onvioPage.waitForURL((url) => url.toString().includes("gestta.com.br"), {
    timeout: timeoutMs,
  });
  await popupMonitor;
}

export async function collectAuthArtifactsFromContext(
  context: Pick<BrowserContext, "newPage" | "storageState" | "cookies" | "on" | "off">,
  onvioPage: Pick<Page, "goto" | "locator" | "waitForURL">,
  rawOptions: CaptureOnvioAndGesttaTokensOptions,
): Promise<AuthArtifacts> {
  const loginOptions = resolveLoginOptions(rawOptions);
  const captureOptions = resolveCaptureOptions(rawOptions);

  const gesttaRequestPromise = waitForGesttaJwtRequest(
    context,
    captureOptions.gesttaApiBaseUrl,
    loginOptions.mfa.timeoutMs,
  ).then(
    (value) => ({ status: "fulfilled" as const, value }),
    (reason) => ({ status: "rejected" as const, reason }),
  );

  if (rawOptions.gesttaUrl?.trim()) {
    const gesttaPage = await context.newPage();
    await gesttaPage.goto(captureOptions.gesttaUrl, { waitUntil: "domcontentloaded" });
  } else {
    await openGesttaViaOnvioSso(context, onvioPage, loginOptions.baseUrl, loginOptions.timeouts.longMs);
  }

  const gesttaResult = await gesttaRequestPromise;
  if (gesttaResult.status === "rejected") {
    throw gesttaResult.reason;
  }
  const gestta = gesttaResult.value;
  const session = await createAuthSession(
    context,
    loginOptions.baseUrl,
    captureOptions.storageStatePath,
  );
  const onvio = extractUdsLongTokenFromCookies(session.cookies);
  if (!onvio) {
    throw new Error("UDSLongToken nao encontrado nos cookies da sessao autenticada do Onvio.");
  }

  const artifacts: AuthArtifacts = {
    capturedAt: new Date().toISOString(),
    artifactPath: captureOptions.writeArtifact ? captureOptions.artifactPath : undefined,
    storageStatePath: session.storageStatePath,
    session,
    onvio: {
      udsLongToken: onvio.value,
      cookieExpiresAt: onvio.expiresAt,
    },
    gestta,
  };

  if (captureOptions.writeArtifact) {
    writeAuthArtifacts(captureOptions.artifactPath, artifacts);
  }

  return artifacts;
}

export async function captureOnvioAndGesttaTokens(
  options: CaptureOnvioAndGesttaTokensOptions,
): Promise<AuthArtifacts> {
  const captureOptions = resolveCaptureOptions(options);

  return withAuthenticatedOnvioContext(
    {
      ...options,
      storageStatePath: captureOptions.storageStatePath,
    },
    async ({ context, page }) => collectAuthArtifactsFromContext(context, page, options),
  );
}
