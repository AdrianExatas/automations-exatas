import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Company, ReportEntry, ReportFormat, RunConfig } from "./types";

export function buildOutputPath(config: RunConfig, company: Company, format: ReportFormat): string {
  const companyLabel = buildCompanyLabel(company);
  return path.resolve(
    config.outDir,
    config.competencia.value,
    companyLabel,
    `${companyLabel}_${config.competencia.value}_dia.${format}`,
  );
}

export function buildCompanyLabel(company: Company): string {
  const name = sanitizePathPart(company.nome);
  return name ? `${company.inscricao} - ${name}` : company.inscricao;
}

export function sanitizePathPart(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|]/g, " - ")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "")
    .slice(0, 120);
}

export async function saveFile(filePath: string, bytes: Uint8Array): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);
}

export function buildJsonReportPath(config: RunConfig): string {
  return path.resolve(config.outDir, config.competencia.value, "relatorio-execucao.json");
}

export async function saveReport(config: RunConfig, entries: ReportEntry[]): Promise<string> {
  const filePath = buildJsonReportPath(config);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
  return filePath;
}
