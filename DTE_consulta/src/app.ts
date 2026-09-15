import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Page } from "playwright";

import { closeBrowserSession, launchBrowserSession, type BrowserSession } from "./browser.js";
import { loadConfig } from "./config.js";
import { authenticateDte, DteTokenStore } from "./dte-auth.js";
import { DteClient, DteRequestError, PlaywrightDteTransport } from "./dte-client.js";
import { SafeLogger, sanitizeText } from "./logger.js";
import { writeReports, type WrittenReports } from "./report.js";
import { authenticateSpe, fetchAllSpeProcurations } from "./spe.js";
import type {
  AppConfig,
  CompanyResult,
  DteMessage,
  FailureRecord,
  FailureStage,
  ProcurationTarget,
  RunReport,
} from "./types.js";
import { formatRunTimestamp, sleep } from "./utils.js";

const COLLECTOR_VERSION = "1.0.0";

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
      if (target.status !== "inactive") return true;
      companies.push({
        cnpj: target.cnpj,
        corporateName: target.corporateName,
        procurationStatus: target.rawStatus,
        authorizedDet: false,
        totalMessages: 0,
        unreadMessages: null,
        status: "skipped_inactive",
        error: "Procuracao inativa no SPE.",
      });
      return false;
    });

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
          await processCompany(client, target, companies, messages, failures, logger);
        }
      } else {
        for (const target of candidates) {
          companies.push(failedCompany(target, "Falha fatal na autenticacao do DTE."));
        }
      }
    }
  } finally {
    await closeBrowserSession(session);
  }

  companies.sort((a, b) => a.corporateName.localeCompare(b.corporateName, "pt-BR"));
  messages.sort((a, b) => a.cnpj.localeCompare(b.cnpj) || b.createdAt.localeCompare(a.createdAt));
  const report = buildRunReport(startedAt, companies, messages, failures);
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
): Promise<void> {
  let authorized: boolean;
  try {
    authorized = await client.checkDetPermission(target.cnpj);
  } catch (error) {
    const failure = toFailure(error, "dte_permission", target);
    failures.push(failure);
    companies.push(failedCompany(target, failure.message));
    await logger.log("error", `${target.cnpj}: ${failure.message}`);
    return;
  }

  if (!authorized) {
    companies.push({
      cnpj: target.cnpj,
      corporateName: target.corporateName,
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
    companies.push(failedCompany(target, failure.message));
    await logger.log("error", `${target.cnpj}: ${failure.message}`);
  }
}

function failedCompany(target: ProcurationTarget, error: string): CompanyResult {
  return {
    cnpj: target.cnpj,
    corporateName: target.corporateName,
    procurationStatus: target.rawStatus,
    authorizedDet: null,
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
  await page.screenshot({ path: path.join(diagnosticDir, fileName), fullPage: true }).catch(() => undefined);
}

export function buildRunReport(
  startedAt: Date,
  companies: CompanyResult[],
  messages: DteMessage[],
  failures: FailureRecord[],
): RunReport {
  return {
    schemaVersion: "1.0",
    collectorVersion: COLLECTOR_VERSION,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    timezone: "America/Sao_Paulo",
    summary: {
      procurationsFound: companies.length,
      processed: companies.filter((item) => item.status === "processed").length,
      skippedInactive: companies.filter((item) => item.status === "skipped_inactive").length,
      unauthorized: companies.filter((item) => item.status === "unauthorized").length,
      failed: companies.filter((item) => item.status === "failed").length,
      messages: messages.length,
      unreadMessages: companies.reduce((total, item) => total + (item.unreadMessages ?? 0), 0),
    },
    companies,
    messages,
    failures,
  };
}
