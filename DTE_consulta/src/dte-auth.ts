import type { Page, Response } from "playwright";

import { clickFirstVisible } from "./browser.js";
import type { SafeLogger } from "./logger.js";
import { sleep } from "./utils.js";

export const DTE_ORIGIN = "https://det.sit.trabalho.gov.br";
export const DTE_AUTH_PATH = "/services/v1/auth/token/acessogov";

export class DteTokenStore {
  private token = "";

  attach(page: Page): void {
    page.on("response", (response) => {
      void this.captureResponse(response);
    });
  }

  get(): string {
    return this.token;
  }

  set(token: string): void {
    const normalized = token.trim().replace(/^"|"$/g, "");
    if (isJwt(normalized)) this.token = normalized;
  }

  reset(): void {
    this.token = "";
  }

  private async captureResponse(response: Response): Promise<void> {
    const refreshed = response.headers()["set-token"];
    if (refreshed) this.set(refreshed);

    const url = new URL(response.url());
    if (url.hostname !== "det.sit.trabalho.gov.br" || url.pathname !== DTE_AUTH_PATH || !response.ok()) return;
    const text = await response.text().catch(() => "");
    this.set(extractToken(text));
  }
}

export async function authenticateDte(
  page: Page,
  tokenStore: DteTokenStore,
  timeoutMs: number,
  logger: SafeLogger,
): Promise<string> {
  tokenStore.reset();
  await logger.log("info", "Abrindo o DTE para autenticacao com certificado digital.");
  await page.goto(DTE_ORIGIN, { waitUntil: "domcontentloaded", timeout: timeoutMs });

  let clickedGovBr = false;
  let clickedCertificate = false;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const captured = tokenStore.get() || (await readJwtFromSessionStorage(page));
    if (captured) {
      tokenStore.set(captured);
      await logger.log("info", "DTE autenticado; token mantido somente em memoria.");
      return tokenStore.get();
    }

    const url = new URL(page.url());
    if (url.hostname === "det.sit.trabalho.gov.br" && !clickedGovBr) {
      clickedGovBr = await clickFirstVisible(page, [/entrar com gov\.?br/i, /acessar gov\.?br/i]);
    }
    if (url.hostname === "sso.acesso.gov.br" && !clickedCertificate) {
      clickedCertificate = await clickFirstVisible(page, [
        /certificado digital/i,
        /seu certificado digital/i,
      ]);
      if (clickedCertificate) {
        await logger.log(
          "info",
          "Certificado enviado ao Gov.br. Resolva o hCaptcha na janela, caso seja solicitado.",
        );
      }
    }
    await sleep(500);
  }

  throw new Error(`Tempo limite de ${timeoutMs} ms excedido durante a autenticacao no DTE.`);
}

async function readJwtFromSessionStorage(page: Page): Promise<string> {
  if (new URL(page.url()).hostname !== "det.sit.trabalho.gov.br") return "";
  return page
    .evaluate(() => {
      for (const value of Object.values(window.sessionStorage)) {
        if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) return value;
      }
      return "";
    })
    .catch(() => "");
}

export function extractToken(body: string): string {
  try {
    const parsed = JSON.parse(body) as unknown;
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      for (const key of ["token", "accessToken", "access_token"]) {
        if (typeof record[key] === "string") return record[key];
      }
    }
  } catch {
    return body.trim();
  }
  return "";
}

function isJwt(value: string): boolean {
  return /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}
