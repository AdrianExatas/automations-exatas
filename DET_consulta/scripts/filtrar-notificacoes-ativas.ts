import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../src/config.js";
import { fetchActiveDominioCompanies, normalizeDocument } from "../src/dominio.js";
import { writeReports } from "../src/report.js";
import type {
  ActiveWithoutProcurationRecord,
  CompanyResult,
  RunReport,
} from "../src/types.js";

async function main() {
  console.log("=== GERANDO PASTA FILTRADA: APENAS EMPRESAS ATIVAS NA DOMÍNIO ===");

  const config = await loadConfig();
  console.log("Consultando empresas ativas no Domínio...");
  const dominioResult = await fetchActiveDominioCompanies(config);
  const activeSet = dominioResult.activeCnpjs;
  console.log(`Domínio: ${activeSet.size} CNPJs ativos encontrados.`);

  // Carregar última execução com mensagens completas
  const sourceDir = path.resolve("output/2026-09-15_09-48-25_melhorado");
  const rawData: RunReport = JSON.parse(await Bun.file(path.join(sourceDir, "execucao.json")).text());

  // Filtrar empresas
  const activeCompanies: CompanyResult[] = [];
  const skippedInactiveCompanies: CompanyResult[] = [];

  for (const comp of rawData.companies) {
    const doc = normalizeDocument(comp.cnpj);
    const domInfo = dominioResult.byCnpj.get(doc);

    if (domInfo) {
      activeCompanies.push({
        ...comp,
        dominioCode: domInfo.codiEmp,
        dominioStatus: "A",
      });
    } else {
      skippedInactiveCompanies.push({
        ...comp,
        dominioStatus: "I",
        status: "skipped_dominio_inactive",
        error: "Empresa inativa ou nao cadastrada na Domínio.",
      });
    }
  }

  // Identificar empresas ativas na Domínio sem procuração
  const speCnpjs = new Set(rawData.companies.map((c) => normalizeDocument(c.cnpj)));
  const activeWithoutProcuration: ActiveWithoutProcurationRecord[] = [];

  for (const dom of dominioResult.companies) {
    if (!speCnpjs.has(dom.cnpj)) {
      activeWithoutProcuration.push({
        codiEmp: dom.codiEmp,
        cnpj: dom.cnpj,
        corporateName: dom.corporateName,
      });
    }
  }

  // Filtrar mensagens: SOMENTE das empresas ativas na Domínio
  const filteredMessages = rawData.messages.filter((m) => activeSet.has(normalizeDocument(m.cnpj)));

  // Atualizar contadores do RunReport
  const actionMessages = filteredMessages.filter((m) => m.requiresAction);
  const companiesWithAction = new Set(actionMessages.map((m) => m.cnpj)).size;

  const filteredReport: RunReport = {
    ...rawData,
    summary: {
      procurationsFound: rawData.companies.length,
      dominioActiveCompanies: dominioResult.companies.length,
      activeWithoutProcuration: activeWithoutProcuration.length,
      skippedDominioInactive: skippedInactiveCompanies.length,
      processed: activeCompanies.filter((c) => c.status === "processed").length,
      skippedInactive: activeCompanies.filter((c) => c.status === "skipped_inactive").length,
      unauthorized: activeCompanies.filter((c) => c.status === "unauthorized").length,
      failed: activeCompanies.filter((c) => c.status === "failed").length,
      messages: filteredMessages.length,
      unreadMessages: activeCompanies.reduce((acc, c) => acc + (c.unreadMessages ?? 0), 0),
      actionableMessages: actionMessages.length,
      criticalMessages: filteredMessages.filter((m) => m.priority === "critica").length,
      highPriorityMessages: filteredMessages.filter((m) => m.priority === "alta").length,
      informationalMessages: filteredMessages.filter((m) => m.priority === "informativa").length,
      tacitScienceMessages: filteredMessages.filter((m) => m.scienceStatus === "ciencia_por_decurso").length,
      awaitingScienceMessages: filteredMessages.filter((m) => m.scienceStatus === "aguardando_ciencia").length,
      companiesWithAction,
    },
    companies: activeCompanies,
    messages: filteredMessages,
    failures: rawData.failures.filter((f) => activeSet.has(normalizeDocument(f.cnpj))),
    activeWithoutProcuration,
  };

  const targetDir = path.resolve("output/2026-09-15_notificacoes_ativas_dominio");
  await mkdir(targetDir, { recursive: true });

  console.log(`Escrevendo relatórios filtrados em: ${targetDir}`);
  const files = await writeReports(targetDir, filteredReport);

  console.log("=== FILTRO CONCLUÍDO COM SUCESSO ===");
  console.log(`Empresas ativas com procuração mantidas: ${activeCompanies.length}`);
  console.log(`Empresas inativas removidas: ${skippedInactiveCompanies.length}`);
  console.log(`Mensagens das empresas ativas: ${filteredMessages.length} (antes: ${rawData.messages.length})`);
  console.log(`Mensagens não lidas das ativas: ${filteredReport.summary.unreadMessages}`);
  console.log(`Empresas ativas sem procuração: ${activeWithoutProcuration.length}`);
  console.log(`Arquivo Excel: ${files.workbookPath}`);
}

main().catch(console.error);
