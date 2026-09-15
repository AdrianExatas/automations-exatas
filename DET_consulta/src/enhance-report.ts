import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { analyzeMessages } from "./message-analysis.js";
import { writeReports } from "./report.js";
import type { CompanyResult, DteMessage, FailureRecord, RunReport } from "./types.js";

interface LegacyReport {
  startedAt: string;
  finishedAt: string;
  companies: CompanyResult[];
  messages: DteMessage[];
  failures: FailureRecord[];
}

export function enhanceLegacyReport(raw: LegacyReport): RunReport {
  const asOf = validDate(raw.finishedAt) ?? new Date();
  const messages = analyzeMessages(raw.messages, asOf);
  const companiesWithAction = new Set(messages.filter((message) => message.requiresAction).map((message) => message.cnpj)).size;
  return {
    schemaVersion: "2.0",
    collectorVersion: "1.1.0",
    startedAt: raw.startedAt,
    finishedAt: raw.finishedAt,
    timezone: "America/Sao_Paulo",
    summary: {
      procurationsFound: raw.companies.length,
      processed: raw.companies.filter((company) => company.status === "processed").length,
      skippedInactive: raw.companies.filter((company) => company.status === "skipped_inactive").length,
      unauthorized: raw.companies.filter((company) => company.status === "unauthorized").length,
      failed: raw.companies.filter((company) => company.status === "failed").length,
      messages: messages.length,
      unreadMessages: messages.filter((message) => message.isUnread).length,
      actionableMessages: messages.filter((message) => message.requiresAction).length,
      criticalMessages: messages.filter((message) => message.priority === "critica").length,
      highPriorityMessages: messages.filter((message) => message.priority === "alta").length,
      informationalMessages: messages.filter((message) => message.priority === "informativa").length,
      tacitScienceMessages: messages.filter((message) => message.scienceStatus === "ciencia_por_decurso").length,
      awaitingScienceMessages: messages.filter((message) => message.scienceStatus === "aguardando_ciencia").length,
      companiesWithAction,
    },
    companies: raw.companies,
    messages,
    failures: raw.failures,
  };
}

async function main(): Promise<void> {
  const sourceDir = path.resolve(process.argv[2] ?? "");
  if (!process.argv[2]) throw new Error("Informe a pasta da execução que contém execucao.json.");
  const targetDir = path.resolve(process.argv[3] ?? `${sourceDir}_melhorado`);
  if (sourceDir === targetDir) throw new Error("A pasta de destino deve ser diferente da coleta original.");
  const raw = JSON.parse(await readFile(path.join(sourceDir, "execucao.json"), "utf8")) as LegacyReport;
  if (!Array.isArray(raw.companies) || !Array.isArray(raw.messages) || !Array.isArray(raw.failures)) {
    throw new Error("execucao.json não contém o formato esperado.");
  }
  const report = enhanceLegacyReport(raw);
  await mkdir(targetDir, { recursive: true });
  await writeReports(targetDir, report);
  await copyFile(path.join(sourceDir, "run.log"), path.join(targetDir, "run.log")).catch(() => undefined);
  console.log(`Relatório melhorado criado em ${targetDir}`);
}

function validDate(value: string): Date | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
