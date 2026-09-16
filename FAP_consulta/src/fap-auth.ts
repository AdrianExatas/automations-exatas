import type { Page } from "playwright";

import {
  attachSafePageDiagnostics,
  clickFirstVisible,
  isCaptchaInvalid,
  isHcaptchaReady,
} from "./browser.js";
import type { SafeLogger } from "./logger.js";
import { sleep } from "./utils.js";

export const FAP_ENTRY_URL = "https://fap-mps.dataprev.gov.br/consultar-fap";
export const FAP_HOME_URL = "https://fap-mps.dataprev.gov.br/";

export interface FapAuthResult {
  authenticated: boolean;
  xsrfToken?: string;
  userData?: Record<string, unknown>;
}

export async function authenticateFap(
  page: Page,
  timeoutMs: number,
  logger: SafeLogger,
): Promise<FapAuthResult> {
  attachSafePageDiagnostics(page, logger);
  await logger.log("info", "Abrindo o portal FAP Dataprev para autenticacao com certificado digital.");
  await page.goto(FAP_ENTRY_URL, { waitUntil: "domcontentloaded", timeout: timeoutMs });

  let clickedGovBr = false;
  let clickedCertificate = false;
  let announcedHcaptchaWait = false;
  let ssoReadyStartedAt = 0;
  let reloadedSso = false;
  let manualCaptchaFallback = false;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const url = new URL(page.url());

    // Se retornou ao portal FAP, verifica se a sessao ja responde com dados de usuario
    if (url.hostname === "fap-mps.dataprev.gov.br") {
      const checkSession = await page
        .evaluate(async () => {
          try {
            const resp = await fetch("/gateway/oauth2/token", {
              credentials: "include",
              headers: { accept: "application/json" },
            });
            if (resp.ok) {
              const data = await resp.json();
              return { ready: true, data };
            }
          } catch {
            // no-op
          }
          return { ready: false, data: null };
        })
        .catch(() => ({ ready: false, data: null }));

      if (checkSession.ready) {
        await logger.log("info", "FAP Dataprev autenticado com sucesso via Gov.br!");
        return {
          authenticated: true,
          userData: checkSession.data as Record<string, unknown>,
        };
      }

      // Se ainda esta na tela inicial com botao de login
      if (!clickedGovBr) {
        clickedGovBr = await clickFirstVisible(page, [
          /entrar com gov\.?br/i,
          /consultar fap/i,
          /acessar com gov\.?br/i,
          /login/i,
        ]);
      }
    }

    // Se estiver no SSO do Gov.br
    if (url.hostname === "sso.acesso.gov.br" || url.hostname === "certificado.sso.acesso.gov.br") {
      if (clickedCertificate && !manualCaptchaFallback && (await isCaptchaInvalid(page))) {
        manualCaptchaFallback = true;
        await logger.log(
          "warn",
          "Gov.br rejeitou o hCaptcha invisivel. Clique manualmente em 'Seu certificado digital' para continuar.",
        );
      }

      if (!clickedCertificate && !manualCaptchaFallback) {
        if (ssoReadyStartedAt === 0) ssoReadyStartedAt = Date.now();
        if (!announcedHcaptchaWait) {
          announcedHcaptchaWait = true;
          await logger.log("info", "Aguardando inicializacao do Gov.br / hCaptcha.");
        }

        if (await isHcaptchaReady(page)) {
          clickedCertificate = await clickFirstVisible(page, [
            /certificado digital/i,
            /seu certificado digital/i,
          ]);
          if (clickedCertificate) {
            await logger.log(
              "info",
              "Certificado digital acionado no Gov.br. Resolva o hCaptcha na janela se solicitado.",
            );
          }
        } else if (!reloadedSso && Date.now() - ssoReadyStartedAt >= 15_000) {
          reloadedSso = true;
          ssoReadyStartedAt = Date.now();
          await logger.log("warn", "hCaptcha demorou para inicializar; recarregando o Gov.br uma vez.");
          await page.reload({ waitUntil: "domcontentloaded", timeout: Math.min(timeoutMs, 60_000) });
        }
      }
    }

    await sleep(500);
  }

  throw new Error(`Tempo limite de ${timeoutMs} ms excedido durante a autenticacao no FAP Dataprev.`);
}
