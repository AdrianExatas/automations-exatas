import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import {
  ClienteResumo,
  DiagnosticoHttpEmpresa,
  DivergenciaResponsavel,
  LinkResumo,
  PendenciaConfiguracao,
  ProgressoLogEvento,
  ResultadoTarefa,
  ResponsavelResolvidoResumo,
} from "./types";

const PASTA_RELATORIOS = "relatorios";
const ARQUIVO_INDICE = "indice.json";
const MAX_ENTRADAS_INDICE = 50;
const MAX_CELL_TEXT_LENGTH = 32000;

export interface MetadadosExecucao {
  inicio: string;
  fim: string;
  planilha: string;
  dryRun: boolean;
  totalTarefas: number;
  sucesso: number;
  falha: number;
}

export interface RelatorioExecucao {
  execucao: MetadadosExecucao;
  resultados: ResultadoTarefa[];
}

export interface EntradaIndice {
  arquivo: string;
  inicio: string;
  planilha: string;
  dryRun: boolean;
  totalTarefas: number;
  sucesso: number;
  falha: number;
}

function getRelatoriosDir(): string {
  return path.join(process.cwd(), PASTA_RELATORIOS);
}

function truncateCellText(value: string): string {
  if (value.length <= MAX_CELL_TEXT_LENGTH) return value;
  return `${value.slice(0, MAX_CELL_TEXT_LENGTH - 15)}...[truncado]`;
}

function formatLinks(items: LinkResumo[] | undefined): string {
  return truncateCellText(
    (items ?? [])
    .map((item) => `${item.customerName} (${item.customerId}${item.cnpj ? ` / ${item.cnpj}` : ""})`)
    .join(" | "),
  );
}

function formatClientes(items: ClienteResumo[] | undefined): string {
  return truncateCellText(
    (items ?? [])
    .map((item) => `${item.customerName} (${item.customerId}${item.cnpj ? ` / ${item.cnpj}` : ""})`)
    .join(" | "),
  );
}

function formatPendencias(items: PendenciaConfiguracao[] | undefined): string {
  return truncateCellText(
    (items ?? [])
      .map((item) => `${item.customerName} (${item.customerId}${item.cnpj ? ` / ${item.cnpj}` : ""})`)
      .join(" | "),
  );
}

function formatDivergencias(items: DivergenciaResponsavel[] | undefined): string {
  return truncateCellText(
    (items ?? [])
      .map(
        (item) =>
          `${item.customerName}: esperado ${item.expectedUserName} (${item.expectedUserId}), ` +
          `obtido ${item.currentUserName ?? "sem responsavel"} (${item.currentUserId ?? ""})`,
      )
      .join(" | "),
  );
}

function formatResponsaveis(items: ResponsavelResolvidoResumo[] | undefined): string {
  return truncateCellText(
    (items ?? [])
      .map((item) => `${item.responsavel} -> ${item.userId} [${item.origem}]`)
      .join(" | "),
  );
}

function formatFalhasHttp(items: DiagnosticoHttpEmpresa[] | undefined): string {
  return truncateCellText(
    (items ?? [])
      .map(
        (item) =>
          `${item.customerName} (${item.customerId}${item.cnpj ? ` / ${item.cnpj}` : ""}) ` +
          `[${item.etapa}] apos ${item.tentativas} tentativa(s): ${item.ultimoErro}`,
      )
      .join(" | "),
  );
}

function createSheetWithHeaders<T extends Record<string, unknown>>(
  rows: T[],
  headers: string[],
): XLSX.WorkSheet {
  if (rows.length > 0) {
    return XLSX.utils.json_to_sheet(rows);
  }

  return XLSX.utils.aoa_to_sheet([headers]);
}

export function gerarRelatorioExecucao(
  planilhaPath: string,
  dryRun: boolean,
  resultados: ResultadoTarefa[],
  inicioExecucao: string,
): RelatorioExecucao {
  const sucesso = resultados.filter((item) => item.sucesso).length;
  const falha = resultados.length - sucesso;

  return {
    execucao: {
      inicio: inicioExecucao,
      fim: new Date().toISOString(),
      planilha: planilhaPath,
      dryRun,
      totalTarefas: resultados.length,
      sucesso,
      falha,
    },
    resultados,
  };
}

export function salvarRelatorio(relatorio: RelatorioExecucao): string | null {
  try {
    const dir = getRelatoriosDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const now = new Date();
    const fileName =
      `execucao_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-` +
      `${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-` +
      `${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}.json`;

    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(relatorio, null, 2), "utf8");
    return filePath;
  } catch (error) {
    console.error("[relatorio] Erro ao salvar JSON:", error instanceof Error ? error.message : error);
    return null;
  }
}

export function atualizarIndice(caminhoRelatorio: string, relatorio: RelatorioExecucao): void {
  try {
    const dir = getRelatoriosDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const indicePath = path.join(dir, ARQUIVO_INDICE);
    let ultimasExecucoes: EntradaIndice[] = [];

    if (fs.existsSync(indicePath)) {
      try {
        const raw = fs.readFileSync(indicePath, "utf8");
        const parsed = JSON.parse(raw) as { ultimasExecucoes?: EntradaIndice[] };
        ultimasExecucoes = Array.isArray(parsed.ultimasExecucoes) ? parsed.ultimasExecucoes : [];
      } catch {
        ultimasExecucoes = [];
      }
    }

    ultimasExecucoes.unshift({
      arquivo: path.basename(caminhoRelatorio),
      inicio: relatorio.execucao.inicio,
      planilha: relatorio.execucao.planilha,
      dryRun: relatorio.execucao.dryRun,
      totalTarefas: relatorio.execucao.totalTarefas,
      sucesso: relatorio.execucao.sucesso,
      falha: relatorio.execucao.falha,
    });

    if (ultimasExecucoes.length > MAX_ENTRADAS_INDICE) {
      ultimasExecucoes = ultimasExecucoes.slice(0, MAX_ENTRADAS_INDICE);
    }

    fs.writeFileSync(indicePath, JSON.stringify({ ultimasExecucoes }, null, 2), "utf8");
  } catch (error) {
    console.error("[relatorio] Erro ao atualizar indice:", error instanceof Error ? error.message : error);
  }
}

export function salvarRelatorioXlsx(
  relatorio: RelatorioExecucao,
  caminhoJson: string | null,
): string | null {
  try {
    const dir = getRelatoriosDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const fileName = caminhoJson
      ? path.basename(caminhoJson).replace(/\.json$/i, ".xlsx")
      : `execucao_${Date.now()}.xlsx`;

    const filePath = path.join(dir, fileName);
    const workbook = XLSX.utils.book_new();

    const resumo = XLSX.utils.aoa_to_sheet([
      ["Campo", "Valor"],
      ["Inicio", relatorio.execucao.inicio],
      ["Fim", relatorio.execucao.fim],
      ["Planilha", relatorio.execucao.planilha],
      ["Dry run", relatorio.execucao.dryRun ? "Sim" : "Nao"],
      ["Total tarefas", relatorio.execucao.totalTarefas],
      ["Sucesso", relatorio.execucao.sucesso],
      ["Falha", relatorio.execucao.falha],
    ]);
    XLSX.utils.book_append_sheet(workbook, resumo, "Resumo");

    const resultados = createSheetWithHeaders(
      relatorio.resultados.map((item) => ({
        tarefaPlanilha: truncateCellText(item.tarefaPlanilha),
        tarefaGestta: truncateCellText(item.tarefaGestta ?? ""),
        taskId: truncateCellText(item.taskId ?? ""),
        dryRun: item.dryRun ? "Sim" : "Nao",
        sucesso: item.sucesso ? "Sim" : "Nao",
        totalEmpresasPlanilha: item.totalEmpresasPlanilha,
        vinculosAtuais: item.vinculosAtuais,
        vinculosFinais: item.vinculosFinais ?? "",
        extras: item.extras,
        inclusoes: item.inclusoes,
        patchLinks: item.patchLinks,
        patchGrupos: item.patchGrupos,
        etapaFalha: truncateCellText(item.etapaFalha ?? ""),
        mensagem: truncateCellText(item.mensagem),
        responsaveisResolvidos: formatResponsaveis(item.responsaveisResolvidos),
        vinculosAtuaisDetalhes: formatLinks(item.vinculosAtuaisDetalhes),
        extrasPlanejados: formatLinks(item.extrasPlanejados),
        inclusoesSolicitadas: formatClientes(item.inclusoesSolicitadas),
        vinculosEncontradosNaTarefa: formatClientes(item.vinculosEncontradosNaTarefa),
        clientesAusentesNaTarefa: formatClientes(item.clientesAusentesNaTarefa),
        pendenciasConfiguracao: formatPendencias(item.pendenciasConfiguracao),
        pendenciasValidacaoResponsavel: formatClientes(item.pendenciasValidacaoResponsavel),
        divergenciasResponsavel: formatDivergencias(item.divergenciasResponsavel),
        extrasRemovidos: formatLinks(item.extrasRemovidos),
        falhasHttp: formatFalhasHttp(item.falhasHttp),
        falhasHttpContagem: item.falhasHttp?.length ?? 0,
        inclusoesSolicitadasContagem: item.progressoEtapas?.inclusoesSolicitadas ?? 0,
        vinculosEncontradosNaTarefaContagem: item.vinculosEncontradosNaTarefa?.length ?? 0,
        clientesAusentesNaTarefaContagem: item.clientesAusentesNaTarefa?.length ?? 0,
        configuracoesConfirmadas: item.progressoEtapas?.configuracoesConfirmadas ?? 0,
        pendenciasValidacaoResponsavelContagem: item.pendenciasValidacaoResponsavel?.length ?? 0,
        responsaveisValidados: item.progressoEtapas?.responsaveisValidados ?? 0,
        empresasComErro: item.progressoEtapas?.empresasComErro ?? 0,
        detalhes: truncateCellText(item.detalhes.join(" | ")),
      })),
      [
        "tarefaPlanilha",
        "tarefaGestta",
        "taskId",
        "dryRun",
        "sucesso",
        "totalEmpresasPlanilha",
        "vinculosAtuais",
        "vinculosFinais",
        "extras",
        "inclusoes",
        "patchLinks",
        "patchGrupos",
        "etapaFalha",
        "mensagem",
        "responsaveisResolvidos",
        "vinculosAtuaisDetalhes",
        "extrasPlanejados",
        "inclusoesSolicitadas",
        "vinculosEncontradosNaTarefa",
        "clientesAusentesNaTarefa",
        "pendenciasConfiguracao",
        "pendenciasValidacaoResponsavel",
        "divergenciasResponsavel",
        "extrasRemovidos",
        "falhasHttp",
        "falhasHttpContagem",
        "inclusoesSolicitadasContagem",
        "vinculosEncontradosNaTarefaContagem",
        "clientesAusentesNaTarefaContagem",
        "configuracoesConfirmadas",
        "pendenciasValidacaoResponsavelContagem",
        "responsaveisValidados",
        "empresasComErro",
        "detalhes",
      ],
    );
    XLSX.utils.book_append_sheet(workbook, resultados, "Resultados");

    const eventos = createSheetWithHeaders(
      relatorio.resultados.flatMap((resultado) =>
        (resultado.timeline ?? []).map((item) => ({
          tarefaPlanilha: truncateCellText(resultado.tarefaPlanilha),
          tarefaGestta: truncateCellText(resultado.tarefaGestta ?? ""),
          taskId: truncateCellText(resultado.taskId ?? ""),
          timestamp: truncateCellText(item.timestamp),
          nivel: item.nivel,
          etapa: item.etapa,
          taskIndex: item.taskIndex ?? "",
          taskTotal: item.taskTotal ?? "",
          companyIndex: item.companyIndex ?? "",
          companyTotal: item.companyTotal ?? "",
          customerId: truncateCellText(item.customerId ?? ""),
          customerName: truncateCellText(item.customerName ?? ""),
          cnpj: truncateCellText(item.cnpj ?? ""),
          mensagem: truncateCellText(item.mensagem),
        })),
      ),
      [
        "tarefaPlanilha",
        "tarefaGestta",
        "taskId",
        "timestamp",
        "nivel",
        "etapa",
        "taskIndex",
        "taskTotal",
        "companyIndex",
        "companyTotal",
        "customerId",
        "customerName",
        "cnpj",
        "mensagem",
      ],
    );
    XLSX.utils.book_append_sheet(workbook, eventos, "Eventos");

    const falhasHttp = relatorio.resultados.flatMap((resultado) =>
      (resultado.falhasHttp ?? []).map((item) => ({
        tarefaPlanilha: truncateCellText(resultado.tarefaPlanilha),
        tarefaGestta: truncateCellText(resultado.tarefaGestta ?? ""),
        taskId: truncateCellText(resultado.taskId ?? ""),
        customerId: truncateCellText(item.customerId),
        customerName: truncateCellText(item.customerName),
        cnpj: truncateCellText(item.cnpj ?? ""),
        etapa: item.etapa,
        tentativas: item.tentativas,
        ultimoErro: truncateCellText(item.ultimoErro),
      })),
    );

    if (falhasHttp.length > 0) {
      const falhasHttpSheet = createSheetWithHeaders(falhasHttp, [
        "tarefaPlanilha",
        "tarefaGestta",
        "taskId",
        "customerId",
        "customerName",
        "cnpj",
        "etapa",
        "tentativas",
        "ultimoErro",
      ]);
      XLSX.utils.book_append_sheet(workbook, falhasHttpSheet, "FalhasHTTP");
    }

    XLSX.writeFile(workbook, filePath);
    return filePath;
  } catch (error) {
    console.error("[relatorio] Erro ao salvar XLSX:", error instanceof Error ? error.message : error);
    return null;
  }
}
