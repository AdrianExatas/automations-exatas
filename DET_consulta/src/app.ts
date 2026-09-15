import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Page } from "playwright";

import { closeBrowserSession, launchBrowserSession, type BrowserSession } from "./browser.js";
import { loadConfig } from "./config.js";
import { fetchActiveDominioCompanies, normalizeDocument, type DominioQueryResult } from "./dominio.js";
import { authenticateDte, DteTokenStore } from "./dte-auth.js";
import { DteClient, DteRequestError, PlaywrightDteTransport } from "./dte-client.js";
import { SafeLogger, sanitizeText } from "./logger.js";
import { analyzeMessages } from "./message-analysis.js";
import { writeReports, type WrittenReports } from "./report.js";
import { authenticateSpe, fetchAllSpeProcurations } from "./spe.js";
import type {
  ActiveWithoutProcurationRecord,
  CompanyResult,
  DominioCompany,
  DteMessage,
  FailureRecord,
  FailureStage,
  ProcurationTarget,
  RunReport,
} from "./types.js";
import { formatRunTimestamp, sleep } from "./utils.js";

const COLLECTOR_VERSION = "1.2.0";

export interface RunAutomationOptions {
  maxCompanies?: number;
}

export interface RunOutcome {
  exitCode: 0 | 1 | 2;
  runDir: string;
  report: RunReport;
  files: WrittenReports;
}

export async function runAutomation(options: RunAutomationOptions = {}): Promise<RunOutcome> {
  const startedAt = new Date();
  const config = await loadConfig();
  const runDir = path.join(config.outputDir, formatRunTimestamp(startedAt));
  const logger = new SafeLogger(runDir, [config.certificatePassword]);
  await logger.initialize();

  const companies: CompanyResult[] = [];
  const messages: DteMessage[] = [];
  const failures: FailureRecord[] = [];
  let targets: ProcurationTarget[] = [];
  let session: Partial<BrowserSession> = {};
  let fatal = false;

  let dominioResult: DominioQueryResult | null = null;
  if (config.filterDominioActive) {
    try {
      await logger.log("info", "Consultando empresas ativas no banco de dados Domínio...");
      dominioResult = await fetchActiveDominioCompanies(config);
      await logger.log(
        "info",
        `Domínio: ${dominioResult.companies.length} empresa(s) ativa(s) carregada(s) (${dominioResult.activeCnpjs.size} CNPJs únicos).`,
      );
    } catch (error) {
      await logger.log(
        "warn",
        `Aviso: Falha ao consultar o banco Domínio (${sanitizeText(error)}). Prosseguindo com todas as procurações do SPE.`,
      );
    }
  }

  try {
    try {
      session = await launchBrowserSession(config);
    } catch (error) {
      fatal = true;
      failures.push(toFailure(error, "spe_auth"));
      await logger.log("error", error);
    }

    if (!fatal) {
      try {
        await authenticateSpe(session.page!, config.procuratorCnpj, config.captchaTimeoutMs, logger);
      } catch (error) {
        fatal = true;
        failures.push(toFailure(error, "spe_auth"));
        await logger.log("error", error);
        await saveAuthDiagnostic(session.page, runDir, "spe-auth-error.png");
      }
    }

    if (!fatal) {
      try {
        targets = await fetchAllSpeProcurations(session.page!, config.procuratorCnpj, logger);
        if (options.maxCompanies !== undefined) targets = targets.slice(0, options.maxCompanies);
        await logger.log("info", `${targets.length} empresa(s) unica(s) carregada(s) do SPE.`);
      } catch (error) {
        fatal = true;
        failures.push(toFailure(error, "spe_list"));
        await logger.log("error", error);
      }
    }

    const candidates = targets.filter((target) => {
      const doc = normalizeDocument(target.cnpj);
      const domCompany = dominioResult?.byCnpj.get(doc);
      const dominioCode = domCompany ? domCompany.codiEmp : null;
      const dominioStatus = domCompany ? "A" : (dominioResult ? "I" : null);

      if (dominioResult && !domCompany) {
        companies.push({
          cnpj: target.cnpj,
          corporateName: target.corporateName,
          dominioCode: null,
          dominioStatus: "I",
          procurationStatus: target.rawStatus,
          authorizedDet: false,
          totalMessages: 0,
          unreadMessages: null,
          status: "skipped_dominio_inactive",
          error: "Empresa inativa ou nao cadastrada na Domínio.",
        });
        return false;
      }

      if (target.status !== "inactive") return true;
      companies.push({
        cnpj: target.cnpj,
        corporateName: target.corporateName,
        dominioCode,
        dominioStatus,
        procurationStatus: target.rawStatus,
        authorizedDet: false,
        totalMessages: 0,
        unreadMessages: null,
        status: "skipped_inactive",
        error: "Procuracao inativa no SPE.",
      });
      return false;
    });

    if (dominioResult) {
      const skippedCount = companies.filter((c) => c.status === "skipped_dominio_inactive").length;
      await logger.log(
        "info",
        `Filtro Domínio: ${candidates.length} empresa(s) ativa(s) apta(s) para consulta no DTE (${skippedCount} inativa(s) ignorada(s)).`,
      );
    }

    if (!fatal && candidates.length > 0) {
      const dtePage = await session.context!.newPage();
      const tokenStore = new DteTokenStore();
      tokenStore.attach(dtePage);

      try {
        await authenticateDte(dtePage, tokenStore, config.captchaTimeoutMs, logger);
      } catch (error) {
        fatal = true;
        failures.push(toFailure(error, "dte_auth"));
        await logger.log("error", error);
        await saveAuthDiagnostic(dtePage, runDir, "dte-auth-error.png");
      }

      if (!fatal) {
        const client = new DteClient({
          transport: new PlaywrightDteTransport(session.context!.request),
          tokenStore,
          procuratorCnpj: config.procuratorCnpj,
          reauthenticate: () => authenticateDte(dtePage, tokenStore, config.captchaTimeoutMs, logger),
        });

        for (const [index, target] of candidates.entries()) {
          if (index > 0 && config.requestDelayMs > 0) await sleep(config.requestDelayMs);
          await logger.log("info", `[${index + 1}/${candidates.length}] Consultando ${target.cnpj}.`);
          const domCompany = dominioResult?.byCnpj.get(normalizeDocument(target.cnpj));
          await processCompany(client, target, companies, messages, failures, logger, domCompany);
        }
      } else {
        for (const target of candidates) {
          const domCompany = dominioResult?.byCnpj.get(normalizeDocument(target.cnpj));
          companies.push(failedCompany(target, "Falha fatal na autenticacao do DTE.", null, domCompany));
        }
      }
    }
  } finally {
    await closeBrowserSession(session);
  }

  // Identificar empresas ativas na Domínio sem procuração
  const activeWithoutProcuration: ActiveWithoutProcurationRecord[] = [];
  if (dominioResult) {
    const speCnpjs = new Set(targets.map((t) => normalizeDocument(t.cnpj)));
    for (const dom of dominioResult.companies) {
      if (!speCnpjs.has(dom.cnpj)) {
        activeWithoutProcuration.push({
          codiEmp: dom.codiEmp,
          cnpj: dom.cnpj,
          corporateName: dom.corporateName,
        });
      }
    }
    activeWithoutProcuration.sort((a, b) => a.codiEmp - b.codiEmp);
    await logger.log("info", `Levantamento: ${activeWithoutProcuration.length} empresa(s) ativa(s) na Domínio sem procuração no SPE.`);
  }

  companies.sort((a, b) => a.corporateName.localeCompare(b.corporateName, "pt-BR"));
  messages.sort((a, b) => a.cnpj.localeCompare(b.cnpj) || b.createdAt.localeCompare(a.createdAt));
  const report = buildRunReport(
    startedAt,
    companies,
    messages,
    failures,
    activeWithoutProcuration,
    dominioResult?.companies.length,
  );
  const files = await writeReports(runDir, report);
  const exitCode: 0 | 1 | 2 = fatal ? 1 : companies.some((item) => item.status !== "processed") || failures.length ? 2 : 0;
  await logger.log("info", `Execucao finalizada com codigo ${exitCode}; relatorios em ${runDir}.`);
  return { exitCode, runDir, report, files };
}

async function processCompany(
  client: DteClient,
  target: ProcurationTarget,
  companies: CompanyResult[],
  messages: DteMessage[],
  failures: FailureRecord[],
  logger: SafeLogger,
  domCompany?: DominioCompany,
): Promise<void> {
  const dominioCode = domCompany?.codiEmp ?? null;
  const dominioStatus = domCompany ? "A" : null;

  let authorized: boolean;
  try {
    authorized = await client.checkDetPermission(target.cnpj);
  } catch (error) {
    const failure = toFailure(error, "dte_permission", target);
    failures.push(failure);
    companies.push(failedCompany(target, failure.message, null, domCompany));
    await logger.log("error", `${target.cnpj}: ${failure.message}`);
    return;
  }

  if (!authorized) {
    companies.push({
      cnpj: target.cnpj,
      corporateName: target.corporateName,
      dominioCode,
      dominioStatus,
      procurationStatus: target.rawStatus,
      authorizedDet: false,
      totalMessages: 0,
      unreadMessages: null,
      status: "unauthorized",
      error: "Servico DET0003 nao autorizado.",
    });
    failures.push({
      cnpj: target.cnpj,
      corporateName: target.corporateName,
      stage: "dte_permission",
      category: "authorization",
      httpStatus: null,
      message: "Servico DET0003 nao autorizado.",
      retryable: false,
    });
    await logger.log("warn", `${target.cnpj}: servico DET0003 nao autorizado.`);
    return;
  }

  try {
    const mailbox = await client.getMailbox(target);
    companies.push({
      cnpj: target.cnpj,
      corporateName: target.corporateName,
      dominioCode,
      dominioStatus,
      procurationStatus: target.rawStatus,
      authorizedDet: true,
      totalMessages: mailbox.messages.length,
      unreadMessages: mailbox.unreadMessages,
      status: "processed",
      error: "",
    });
    messages.push(...mailbox.messages);
    await logger.log(
      "info",
      `${target.cnpj}: ${mailbox.messages.length} mensagem(ns), ${mailbox.unreadMessages} nao lida(s).`,
    );
  } catch (error) {
    const failure = toFailure(error, "dte_mailbox", target);
    failures.push(failure);
    companies.push(failedCompany(target, failure.message, true, domCompany));
    await logger.log("error", `${target.cnpj}: ${failure.message}`);
  }
}

function failedCompany(
  target: ProcurationTarget,
  error: string,
  authorizedDet: boolean | null = null,
  domCompany?: DominioCompany,
): CompanyResult {
  return {
    cnpj: target.cnpj,
    corporateName: target.corporateName,
    dominioCode: domCompany?.codiEmp ?? null,
    dominioStatus: domCompany ? "A" : null,
    procurationStatus: target.rawStatus,
    authorizedDet,
    totalMessages: 0,
    unreadMessages: null,
    status: "failed",
    error: sanitizeText(error),
  };
}

function toFailure(
  error: unknown,
  stage: FailureStage,
  target?: ProcurationTarget,
): FailureRecord {
  const requestError = error instanceof DteRequestError ? error : null;
  return {
    cnpj: target?.cnpj ?? "",
    corporateName: target?.corporateName ?? "",
    stage,
    category: requestError?.category ?? inferCategory(error),
    httpStatus: requestError?.httpStatus ?? inferHttpStatus(error),
    message: sanitizeText(error),
    retryable: requestError?.retryable ?? false,
  };
}

function inferCategory(error: unknown): FailureRecord["category"] {
  const text = sanitizeText(error).toLowerCase();
  if (text.includes("autentic")) return "authentication";
  if (text.includes("http 429")) return "rate_limit";
  if (/http 5\d\d/.test(text)) return "server";
  if (text.includes("json") || text.includes("formato")) return "invalid_response";
  if (text.includes("net::") || text.includes("timeout") || text.includes("tempo limite")) return "network";
  return "unknown";
}

function inferHttpStatus(error: unknown): number | null {
  const match = sanitizeText(error).match(/HTTP\s+(\d{3})/i);
  return match?.[1] ? Number(match[1]) : null;
}

async function saveAuthDiagnostic(page: Page | undefined, runDir: string, fileName: string): Promise<void> {
  if (!page) return;
  const diagnosticDir = path.join(runDir, "diagnostics");
  await mkdir(diagnosticDir, { recursive: true });
  await page
    .screenshot({
      path: path.join(diagnosticDir, fileName),
      fullPage: true,
      animations: "disabled",
      style:
        "body *:not(iframe):not(img):not(svg) { color: transparent !important; text-shadow: 0 0 8px #111 !important; } input { visibility: hidden !important; }",
    })
    .catch(() => undefined);
}

export function buildRunReport(
  startedAt: Date,
  companies: CompanyResult[],
  messages: DteMessage[],
  failures: FailureRecord[],
  activeWithoutProcuration?: ActiveWithoutProcurationRecord[],
  dominioActiveCompanies?: number,
): RunReport {
  const finishedAt = new Date();
  const analyzedMessages = analyzeMessages(messages, finishedAt);
  const companiesWithAction = new Set(
    analyzedMessages.filter((message) => message.requiresAction).map((message) => message.cnpj),
  ).size;
  return {
    schemaVersion: "2.0",
    collectorVersion: COLLECTOR_VERSION,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    timezone: "America/Sao_Paulo",
    summary: {
      procurationsFound: companies.length,
      ...(dominioActiveCompanies !== undefined ? { dominioActiveCompanies } : {}),
      ...(activeWithoutProcuration !== undefined ? { activeWithoutProcuration: activeWithoutProcuration.length } : {}),
      skippedDominioInactive: companies.filter((item) => item.status === "skipped_dominio_inactive").length,
      processed: companies.filter((item) => item.status === "processed").length,
      skippedInactive: companies.filter((item) => item.status === "skipped_inactive").length,
      unauthorized: companies.filter((item) => item.status === "unauthorized").length,
      failed: companies.filter((item) => item.status === "failed").length,
      messages: messages.length,
      unreadMessages: companies.reduce((total, item) => total + (item.unreadMessages ?? 0), 0),
      actionableMessages: analyzedMessages.filter((message) => message.requiresAction).length,
      criticalMessages: analyzedMessages.filter((message) => message.priority === "critica").length,
      highPriorityMessages: analyzedMessages.filter((message) => message.priority === "alta").length,
      informationalMessages: analyzedMessages.filter((message) => message.priority === "informativa").length,
      tacitScienceMessages: analyzedMessages.filter((message) => message.scienceStatus === "ciencia_por_decurso").length,
      awaitingScienceMessages: analyzedMessages.filter((message) => message.scienceStatus === "aguardando_ciencia").length,
      companiesWithAction,
    },
    companies,
    messages: analyzedMessages,
    failures,
    ...(activeWithoutProcuration !== undefined ? { activeWithoutProcuration } : {}),
  };
}
