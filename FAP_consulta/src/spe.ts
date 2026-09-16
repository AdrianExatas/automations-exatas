import type { Page } from "playwright";

import {
  attachSafePageDiagnostics,
  clickFirstVisible,
  isCaptchaInvalid,
  isHcaptchaReady,
} from "./browser.js";
import type { SafeLogger } from "./logger.js";
import { digitsOnly, isValidCnpj, numberOrNull, sleep, stringValue } from "./utils.js";

export const SPE_ORIGIN = "https://spe.sistema.gov.br";
export const SPE_PROCURATIONS_URL = "https://spe.sistema.gov.br/gestao-procuracao/pesquisar";
export const SPE_PAGE_SIZE = 50;

export interface SpeProcurationRecord {
  uid?: unknown;
  niOutorgante?: unknown;
  nomeOutorgante?: unknown;
  niOutorgado?: unknown;
  status?: unknown;
  [key: string]: unknown;
}

export interface SpePageMetadata {
  totalItems?: unknown;
  [key: string]: unknown;
}

export interface SpeSearchResponse {
  content: SpeProcurationRecord[];
  pageMetadata: SpePageMetadata;
}

export interface SpeTarget {
  cnpj: string;
  corporateName: string;
}

export async function authenticateSpe(
  page: Page,
  procuratorCnpj: string,
  timeoutMs: number,
  logger: SafeLogger,
): Promise<void> {
  attachSafePageDiagnostics(page, logger);
  await logger.log("info", "Abrindo o SPE para autenticacao com certificado digital.");
  await page.goto(SPE_ORIGIN, { waitUntil: "domcontentloaded", timeout: timeoutMs });

  let clickedGovBr = false;
  let clickedCertificate = false;
  let announcedHcaptchaWait = false;
  let ssoReadyStartedAt = 0;
  let reloadedSso = false;
  let manualCaptchaFallback = false;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const url = new URL(page.url());

    if (clickedCertificate && !manualCaptchaFallback && (await isCaptchaInvalid(page))) {
      manualCaptchaFallback = true;
      await logger.log(
        "warn",
        "Gov.br rejeitou o hCaptcha invisivel. Clique manualmente em 'Seu certificado digital' para continuar.",
      );
    }

    if (url.hostname === "spe.sistema.gov.br") {
      const profileReady = await trySelectLegalEntityProfile(page, procuratorCnpj);
      if (profileReady) {
        await page.goto(SPE_PROCURATIONS_URL, {
          waitUntil: "domcontentloaded",
          timeout: Math.min(timeoutMs, 60_000),
        });
        await logger.log("info", "SPE autenticado e perfil PJ selecionado.");
        return;
      }

      if (!clickedGovBr) {
        clickedGovBr = await clickFirstVisible(page, [/entrar com gov\.?br/i, /acessar gov\.?br/i]);
      }
    }

    if (url.hostname === "sso.acesso.gov.br" && !clickedCertificate && !manualCaptchaFallback) {
      if (ssoReadyStartedAt === 0) ssoReadyStartedAt = Date.now();
      if (!announcedHcaptchaWait) {
        announcedHcaptchaWait = true;
        await logger.log("info", "Aguardando a inicializacao do hCaptcha invisivel do Gov.br.");
      }

      if (await isHcaptchaReady(page)) {
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
      } else if (!reloadedSso && Date.now() - ssoReadyStartedAt >= 15_000) {
        reloadedSso = true;
        ssoReadyStartedAt = Date.now();
        await logger.log("warn", "hCaptcha nao inicializou em 15 segundos; recarregando a pagina do Gov.br uma vez.");
        await page.reload({ waitUntil: "domcontentloaded", timeout: Math.min(timeoutMs, 60_000) });
      }
    }

    await sleep(500);
  }

  throw new Error(`Tempo limite de ${timeoutMs} ms excedido durante a autenticacao no SPE.`);
}

async function trySelectLegalEntityProfile(page: Page, procuratorCnpj: string): Promise<boolean> {
  const result = await page
    .evaluate(async ({ cnpj }) => {
      const userInfo = await fetch("/api/v1/cookie-auth/user-info", {
        credentials: "include",
        headers: { accept: "application/json, text/plain, */*" },
      });
      if (!userInfo.ok) return { ready: false, status: userInfo.status };

      const update = await fetch("/api/v1/cookie-auth/update-info-perfil", {
        method: "POST",
        credentials: "include",
        headers: {
          accept: "application/json, text/plain, */*",
          "content-type": "application/json",
        },
        body: JSON.stringify({ niPerfil: cnpj, tipoPerfil: 1 }),
      });
      return { ready: update.ok, status: update.status };
    }, { cnpj: procuratorCnpj })
    .catch(() => ({ ready: false, status: 0 }));

  return result.ready;
}

export async function fetchAllSpeProcurations(
  page: Page,
  procuratorCnpj: string,
  logger: SafeLogger,
): Promise<SpeTarget[]> {
  const records: SpeProcurationRecord[] = [];
  const seenRecordKeys = new Set<string>();
  let pageNumber = 1;
  let expectedTotal: number | null = null;

  while (pageNumber <= 1_000) {
    const result = await page.evaluate(async ({ page: currentPage, pageSize }) => {
      const query = new URLSearchParams({
        niParte: "",
        nomeParte: "",
        data: "",
        status: "0", // 0 = Ativa
        tipoParte: "outorgado",
        itensPorPagina: String(pageSize),
        paginaAtual: String(currentPage),
      });
      const response = await fetch(`/api/v1/procuracoes/pesquisa?${query.toString()}`, {
        credentials: "include",
        headers: { accept: "application/json, text/plain, */*" },
      });
      return { status: response.status, ok: response.ok, text: await response.text() };
    }, { page: pageNumber, pageSize: SPE_PAGE_SIZE });

    if (!result.ok) throw new Error(`Consulta de procuracoes no SPE falhou com HTTP ${result.status}.`);

    const payload = JSON.parse(result.text) as SpeSearchResponse;
    const pageRecords = Array.isArray(payload.content) ? payload.content : [];
    const totalItems = numberOrNull(payload.pageMetadata?.totalItems);
    if (totalItems !== null) expectedTotal = totalItems;

    let newRecords = 0;
    for (const record of pageRecords) {
      const key = stringValue(record.uid) || `${stringValue(record.niOutorgante)}`;
      if (seenRecordKeys.has(key)) continue;
      seenRecordKeys.add(key);
      records.push(record);
      newRecords += 1;
    }

    await logger.log(
      "info",
      `SPE pagina ${pageNumber}: ${pageRecords.length} procuracoes (${records.length}/${expectedTotal ?? "?"}).`,
    );

    if (
      pageRecords.length === 0 ||
      pageRecords.length < SPE_PAGE_SIZE ||
      newRecords === 0 ||
      (expectedTotal !== null && records.length >= expectedTotal)
    ) {
      break;
    }
    pageNumber += 1;
  }

  const byCnpj = new Map<string, SpeTarget>();
  for (const record of records) {
    const cnpj = digitsOnly(record.niOutorgante);
    if (!isValidCnpj(cnpj) || cnpj === procuratorCnpj) continue;
    byCnpj.set(cnpj, {
      cnpj,
      corporateName: stringValue(record.nomeOutorgante),
    });
  }

  return [...byCnpj.values()].sort((a, b) => a.corporateName.localeCompare(b.corporateName, "pt-BR"));
}
