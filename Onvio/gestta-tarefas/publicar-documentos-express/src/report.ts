import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import type { BatchExecutionReport } from "./types";

export interface ReportPaths {
  jsonPath: string;
  xlsxPath: string;
}

function safeStamp(value: string): string {
  return value.replace(/[:.]/g, "-");
}

export function saveExecutionReport(report: BatchExecutionReport, reportsDir: string): ReportPaths {
  fs.mkdirSync(reportsDir, { recursive: true });
  const baseName = `publicacao_${safeStamp(report.startedAt)}`;
  const jsonPath = path.join(reportsDir, `${baseName}.json`);
  const xlsxPath = path.join(reportsDir, `${baseName}.xlsx`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");

  const rows = report.items.map((item) => ({
    Arquivo: item.fileName,
    SHA256: item.sha256,
    Empresa: item.company?.name || "",
    EmpresaGesttaId: item.company?.id || "",
    EmpresaOnvioId: item.company?.onvioId || "",
    CNPJ: item.company?.cnpj || "",
    Tarefa: item.task?.name || "",
    TarefaId: item.task?.id || "",
    Competencia: item.task?.competence || "",
    Vencimento: item.confirmedDueDate || "",
    Status: item.status,
    Anexo: item.attachmentId || "",
    CorrelacaoPublicacao: item.publicationCorrelationId || "",
    DocumentoPortal: item.portalDocumentId || "",
    PastaPortal: item.portalFolderId || "",
    ResultadoCalendario: item.calendarResult ? (item.calendarResult.shownInTaxCalendar ? "Exibido" : "Nao exibido") : "",
    Mensagem: item.message,
    Inicio: item.startedAt,
    Fim: item.finishedAt,
  }));
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = [
    { wch: 34 }, { wch: 66 }, { wch: 32 }, { wch: 28 }, { wch: 34 }, { wch: 20 },
    { wch: 34 }, { wch: 28 }, { wch: 13 }, { wch: 13 }, { wch: 18 }, { wch: 26 },
    { wch: 30 }, { wch: 26 }, { wch: 24 }, { wch: 22 }, { wch: 54 }, { wch: 22 }, { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet, "Resultado");
  XLSX.writeFile(workbook, xlsxPath);
  return { jsonPath, xlsxPath };
}
