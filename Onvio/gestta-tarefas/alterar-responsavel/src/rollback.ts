import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import type { AxiosInstance } from "axios";
import { createGesttaClient, isGesttaAuthFatalError } from "./api/client";
import { getGroupCustomerItems, patchResponsavel, type CompanyTaskItem } from "./api/endpoints";
import { resolveGesttaRuntimeAuth } from "./auth/runtime-auth";
import type { RelatorioExecucao } from "./relatorio";
import type { RollbackResponsavelItem } from "./types";

export interface ResultadoRollbackItem extends RollbackResponsavelItem {
  sucesso: boolean;
  mensagem: string;
}

export interface RelatorioRollback {
  reversao: {
    inicio: string;
    fim: string;
    origemRelatorio: string;
    total: number;
    sucesso: number;
    falha: number;
  };
  resultados: ResultadoRollbackItem[];
}

function getRelatoriosDir(): string {
  return path.join(process.cwd(), "relatorios");
}

function getCompanyUserId(companyUser: CompanyTaskItem["company_user"]): string | undefined {
  if (typeof companyUser === "string") return companyUser;
  if (companyUser && typeof companyUser === "object") return companyUser._id;
  return undefined;
}

export function carregarRollbackItemsDoRelatorio(caminhoRelatorio: string): RollbackResponsavelItem[] {
  const raw = fs.readFileSync(caminhoRelatorio, "utf8");
  const relatorio = JSON.parse(raw) as RelatorioExecucao;

  const items = relatorio.resultados.flatMap((resultado) =>
    resultado.sucesso && Array.isArray(resultado.rollbackItems)
      ? resultado.rollbackItems
      : []
  );

  if (items.length === 0) {
    throw new Error(
      "Relatorio nao possui dados de rollback; somente execucoes novas poderao ser revertidas."
    );
  }

  return items;
}

async function carregarVinculosCliente(
  client: AxiosInstance,
  customerId: string,
  cache: Map<string, CompanyTaskItem[]>
): Promise<CompanyTaskItem[]> {
  const cached = cache.get(customerId);
  if (cached) return cached;
  const items = await getGroupCustomerItems(client, customerId);
  cache.set(customerId, items);
  return items;
}

export async function validarRollbackItems(
  client: AxiosInstance,
  items: RollbackResponsavelItem[]
): Promise<{ reversiveis: RollbackResponsavelItem[]; resultados: ResultadoRollbackItem[] }> {
  const cache = new Map<string, CompanyTaskItem[]>();
  const reversiveis: RollbackResponsavelItem[] = [];
  const resultados: ResultadoRollbackItem[] = [];

  for (const item of items) {
    if (!item.previousCompanyUserId) {
      resultados.push({
        ...item,
        sucesso: false,
        mensagem: "Sem responsavel anterior registrado; item nao pode ser revertido automaticamente.",
      });
      continue;
    }

    let vinculo: CompanyTaskItem | undefined;
    try {
      const vinculos = await carregarVinculosCliente(client, item.customerId, cache);
      vinculo = vinculos.find((candidate) => candidate._id === item.groupCustomerId);
    } catch (error) {
      if (isGesttaAuthFatalError(error)) throw error;
      resultados.push({
        ...item,
        sucesso: false,
        mensagem: `Erro ao validar estado atual: ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }

    if (!vinculo) {
      resultados.push({
        ...item,
        sucesso: false,
        mensagem: "Vinculo group_customer nao encontrado no Gestta.",
      });
      continue;
    }

    const currentUserId = getCompanyUserId(vinculo.company_user);
    if (currentUserId !== item.appliedCompanyUserId) {
      resultados.push({
        ...item,
        sucesso: false,
        mensagem: `Responsavel atual diverge do aplicado originalmente (${currentUserId ?? "sem responsavel"}).`,
      });
      continue;
    }

    reversiveis.push(item);
  }

  return { reversiveis, resultados };
}

function agruparPorResponsavelAnterior(
  items: RollbackResponsavelItem[]
): Map<string, RollbackResponsavelItem[]> {
  const groups = new Map<string, RollbackResponsavelItem[]>();
  for (const item of items) {
    if (!item.previousCompanyUserId) continue;
    const current = groups.get(item.previousCompanyUserId) ?? [];
    current.push(item);
    groups.set(item.previousCompanyUserId, current);
  }
  return groups;
}

function salvarRelatorioRollback(relatorio: RelatorioRollback): string {
  const dir = getRelatoriosDir();
  fs.mkdirSync(dir, { recursive: true });
  const now = new Date();
  const nomeArquivo = `reversao_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}.json`;
  const caminhoJson = path.join(dir, nomeArquivo);
  fs.writeFileSync(caminhoJson, JSON.stringify(relatorio, null, 2), "utf8");

  const workbook = XLSX.utils.book_new();
  const resumo = XLSX.utils.aoa_to_sheet([
    ["Campo", "Valor"],
    ["Inicio", relatorio.reversao.inicio],
    ["Fim", relatorio.reversao.fim],
    ["Origem", relatorio.reversao.origemRelatorio],
    ["Total", relatorio.reversao.total],
    ["Sucesso", relatorio.reversao.sucesso],
    ["Falha", relatorio.reversao.falha],
  ]);
  XLSX.utils.book_append_sheet(workbook, resumo, "Resumo");

  const resultados = XLSX.utils.aoa_to_sheet([
    [
      "CNPJ",
      "Empresa",
      "Customer ID",
      "Group Customer ID",
      "Tarefa",
      "Departamento",
      "Responsavel Aplicado",
      "Responsavel Anterior",
      "Sucesso",
      "Mensagem",
    ],
    ...relatorio.resultados.map((item) => [
      item.cnpj,
      item.empresa ?? "",
      item.customerId,
      item.groupCustomerId,
      item.taskName ?? "",
      item.departmentName ?? "",
      item.appliedCompanyUserName,
      item.previousCompanyUserName ?? item.previousCompanyUserId ?? "",
      item.sucesso ? "Sim" : "Nao",
      item.mensagem,
    ]),
  ]);
  XLSX.utils.book_append_sheet(workbook, resultados, "Resultados");
  XLSX.writeFile(workbook, caminhoJson.replace(/\.json$/i, ".xlsx"));

  return caminhoJson;
}

export async function executarReversaoRelatorio(
  caminhoRelatorio: string,
  client?: AxiosInstance
): Promise<RelatorioRollback> {
  const origemRelatorio = path.resolve(process.cwd(), caminhoRelatorio);
  const inicio = new Date().toISOString();
  const items = carregarRollbackItemsDoRelatorio(origemRelatorio);
  const gesttaClient = client ?? createGesttaClient(await resolveGesttaRuntimeAuth());

  if (!client) {
    await gesttaClient.get("/admin/company/user", { params: { active: true } });
  }

  console.log(`Itens com snapshot de rollback: ${items.length}`);
  const { reversiveis, resultados } = await validarRollbackItems(gesttaClient, items);
  const grupos = agruparPorResponsavelAnterior(reversiveis);

  for (const [previousCompanyUserId, groupItems] of grupos) {
    const ids = groupItems.map((item) => item.groupCustomerId);
    try {
      await patchResponsavel(gesttaClient, { ids, company_user: previousCompanyUserId });
      for (const item of groupItems) {
        resultados.push({
          ...item,
          sucesso: true,
          mensagem: `Responsavel revertido para ${item.previousCompanyUserName ?? previousCompanyUserId}.`,
        });
      }
    } catch (error) {
      if (isGesttaAuthFatalError(error)) throw error;
      for (const item of groupItems) {
        resultados.push({
          ...item,
          sucesso: false,
          mensagem: `Erro ao aplicar reversao: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }
  }

  const sucesso = resultados.filter((item) => item.sucesso).length;
  const falha = resultados.length - sucesso;
  const relatorio: RelatorioRollback = {
    reversao: {
      inicio,
      fim: new Date().toISOString(),
      origemRelatorio,
      total: resultados.length,
      sucesso,
      falha,
    },
    resultados,
  };

  const caminhoSalvo = salvarRelatorioRollback(relatorio);
  console.log(`Reversao concluida. Sucesso: ${sucesso}. Falha: ${falha}.`);
  console.log(`Relatorio de reversao salvo: ${caminhoSalvo}`);

  return relatorio;
}
