import type { Page } from "playwright";

import { clickFirstVisible } from "./browser.js";
import type { SafeLogger } from "./logger.js";
import type { ProcurationStatus, ProcurationTarget } from "./types.js";
import { digitsOnly, isValidCnpj, sleep, stringValue } from "./utils.js";

export const SPE_ORIGIN = "https://spe.sistema.gov.br";
export const SPE_LOGIN_URL = `${SPE_ORIGIN}/login`;
export const SPE_PROCURATIONS_URL = `${SPE_ORIGIN}/procuracao`;
export const SPE_PAGE_SIZE = 100;

const STATUS_LABELS: Record<number, string> = {
  0: "ATIVA",
  1: "PENDENTE_ASSINATURA",
  2: "REVOGADA",
  3: "EXPIRADA",
  4: "RENUNCIADA",
  5: "INVALIDA",
  6: "INATIVADA_OBITO",
};

export interface SpeProcurationRecord {
  uid?: unknown;
  status?: unknown;
  niOutorgante?: unknown;
  nomeOutorgante?: unknown;
  niOutorgado?: unknown;
  [key: string]: unknown;
}

export interface SpePageMetadata {
  pageSize?: unknown;
  pageLength?: unknown;
  pageNumber?: unknown;
  totalItems?: unknown;
}

export interface SpeSearchResponse {
  content: SpeProcurationRecord[];
  pageMetadata: SpePageMetadata;
}

interface BrowserFetchResult {
  status: number;
  ok: boolean;
  text: string;
}

export async function authenticateSpe(
  page: Page,
  procuratorCnpj: string,
  timeoutMs: number,
  logger: SafeLogger,
): Promise<void> {
  await logger.log("info", "Abrindo o SPE para autenticacao com certificado digital.");
  await page.goto(SPE_LOGIN_URL, { waitUntil: "domcontentloaded", timeout: timeoutMs });

  let clickedGovBr = false;
  let clickedCertificate = false;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const url = new URL(page.url());

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
): Promise<ProcurationTarget[]> {
  const records: SpeProcurationRecord[] = [];
  const seenRecordKeys = new Set<string>();
  let pageNumber = 1;
  let expectedTotal: number | null = null;

  while (pageNumber <= 1_000) {
    const payload = await fetchSpePage(page, pageNumber);
    const pageRecords = payload.content;
    const totalItems = numberOrNull(payload.pageMetadata.totalItems);
    if (totalItems !== null) expectedTotal = totalItems;

    let newRecords = 0;
    for (const record of pageRecords) {
      const key = stringValue(record.uid) || `${stringValue(record.niOutorgante)}:${stringValue(record.status)}`;
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

  if (pageNumber > 1_000) throw new Error("SPE excedeu o limite defensivo de 1000 paginas.");
  return mapSpeRecordsToTargets(records, procuratorCnpj);
}

async function fetchSpePage(page: Page, pageNumber: number): Promise<SpeSearchResponse> {
  const result = await page.evaluate(async ({ page: currentPage, pageSize }) => {
    const query = new URLSearchParams({
      niParte: "",
      nomeParte: "",
      data: "",
      status: "",
      tipoParte: "outorgado",
      itensPorPagina: String(pageSize),
      paginaAtual: String(currentPage),
    });
    const response = await fetch(`/api/v1/procuracoes/pesquisa?${query.toString()}`, {
      credentials: "include",
      headers: { accept: "application/json, text/plain, */*" },
    });
    return { status: response.status, ok: response.ok, text: await response.text() };
  }, { page: pageNumber, pageSize: SPE_PAGE_SIZE }) as BrowserFetchResult;

  if (!result.ok) throw new Error(`Consulta de procuracoes no SPE falhou com HTTP ${result.status}.`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.text);
  } catch {
    throw new Error("SPE retornou JSON malformado na consulta de procuracoes.");
  }
  return parseSpeSearchResponse(parsed);
}

export function parseSpeSearchResponse(value: unknown): SpeSearchResponse {
  if (!value || typeof value !== "object") throw new Error("Resposta do SPE nao e um objeto.");
  const object = value as Record<string, unknown>;
  if (!Array.isArray(object.content)) throw new Error("Resposta do SPE nao possui o array content.");
  return {
    content: object.content.filter(isRecord) as SpeProcurationRecord[],
    pageMetadata: isRecord(object.pageMetadata) ? object.pageMetadata : {},
  };
}

export function mapSpeRecordsToTargets(
  records: SpeProcurationRecord[],
  procuratorCnpj: string,
): ProcurationTarget[] {
  const byCnpj = new Map<string, ProcurationTarget>();

  for (const record of records) {
    const cnpj = digitsOnly(record.niOutorgante);
    if (!isValidCnpj(cnpj) || cnpj === procuratorCnpj) continue;

    const outorgado = digitsOnly(record.niOutorgado);
    if (outorgado && outorgado !== procuratorCnpj) continue;

    const statusCode = numberOrNull(record.status);
    const rawStatus = statusCode === null ? stringValue(record.status) || "DESCONHECIDO" : STATUS_LABELS[statusCode] ?? String(statusCode);
    const status: ProcurationStatus = statusCode === 0 ? "active" : statusCode === null ? "unknown" : "inactive";
    const candidate: ProcurationTarget = {
      cnpj,
      corporateName: stringValue(record.nomeOutorgante),
      rawStatus,
      status,
    };
    const current = byCnpj.get(cnpj);
    if (!current || statusPriority(candidate.status) > statusPriority(current.status)) {
      byCnpj.set(cnpj, candidate);
    }
  }

  return [...byCnpj.values()].sort((a, b) => a.corporateName.localeCompare(b.corporateName, "pt-BR"));
}

function statusPriority(status: ProcurationStatus): number {
  return status === "active" ? 3 : status === "unknown" ? 2 : 1;
}

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
