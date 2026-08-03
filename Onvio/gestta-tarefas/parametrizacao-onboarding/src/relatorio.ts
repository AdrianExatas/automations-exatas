import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { RelatorioExecucao } from "./types";

const MAX_CELL_TEXT_LENGTH = 32000;

function getRelatoriosDir(outputDir?: string): string {
  const configured = outputDir?.trim() || process.env.GESTTA_RELATORIOS_DIR?.trim();
  return configured ? path.resolve(configured) : path.join(process.cwd(), "relatorios");
}

function timestampFileName(): string {
  const now = new Date();
  return (
    `execucao_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-` +
    `${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-` +
    `${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`
  );
}

function truncate(value: unknown): string {
  const text = String(value ?? "");
  if (text.length <= MAX_CELL_TEXT_LENGTH) return text;
  return `${text.slice(0, MAX_CELL_TEXT_LENGTH - 15)}...[truncado]`;
}

export function salvarRelatorioJson(relatorio: RelatorioExecucao, outputDir?: string): string {
  const dir = getRelatoriosDir(outputDir);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${timestampFileName()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(relatorio, null, 2), "utf8");
  return filePath;
}

export function salvarRelatorioXlsx(
  relatorio: RelatorioExecucao,
  jsonPath: string,
  outputDir?: string,
): string {
  const dir = getRelatoriosDir(outputDir);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, path.basename(jsonPath).replace(/\.json$/i, ".xlsx"));
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["Campo", "Valor"],
      ["Inicio", relatorio.execucao.inicio],
      ["Fim", relatorio.execucao.fim],
      ["Modo", relatorio.execucao.dryRun ? "Dry-run" : "Apply"],
      ["CNPJ", relatorio.execucao.cnpj],
      ["Cliente", relatorio.execucao.customerName ?? ""],
      ["Customer ID", relatorio.execucao.customerId ?? ""],
      ["Regime", relatorio.execucao.regimeFiscal],
      ["Areas", relatorio.execucao.areas.join(", ")],
      ["Total tarefas", relatorio.execucao.totalTarefasCalculadas],
      ["Sucesso", relatorio.execucao.sucesso],
      ["Falha", relatorio.execucao.falha],
      ["Avisos", relatorio.execucao.avisos.join(" | ")],
    ]),
    "Resumo",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      relatorio.resultados.map((item) => ({
        area: item.area,
        aba: item.aba,
        tarefaPlanilha: truncate(item.tarefaPlanilha),
        tarefaGestta: truncate(item.tarefaGestta),
        taskId: item.taskId ?? "",
        responsavelPlanilha: truncate(item.responsavelPlanilha),
        responsavelGestta: truncate(item.responsavelGestta),
        userId: item.userId ?? "",
        dryRun: item.dryRun ? "Sim" : "Nao",
        sucesso: item.sucesso ? "Sim" : "Nao",
        jaVinculada: item.jaVinculada ? "Sim" : "Nao",
        inclusaoSolicitada: item.inclusaoSolicitada ? "Sim" : "Nao",
        patchResponsavel: item.patchResponsavel ? "Sim" : "Nao",
        mensagem: truncate(item.mensagem),
        detalhes: truncate(item.detalhes.join(" | ")),
      })),
    ),
    "Resultados",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      relatorio.timeline.map((item) => ({
        timestamp: item.timestamp,
        nivel: item.nivel,
        etapa: item.etapa,
        tarefa: truncate(item.tarefa),
        mensagem: truncate(item.mensagem),
      })),
    ),
    "Eventos",
  );

  XLSX.writeFile(workbook, filePath);
  return filePath;
}

export function salvarRelatorios(
  relatorio: RelatorioExecucao,
  outputDir?: string,
): { jsonPath: string; xlsxPath: string } {
  const jsonPath = salvarRelatorioJson(relatorio, outputDir);
  const xlsxPath = salvarRelatorioXlsx(relatorio, jsonPath, outputDir);
  return { jsonPath, xlsxPath };
}
