import XLSX from 'xlsx';

export type ExecutionReportItem = {
  key: string;
  status: string;
  message?: string;
  pdfPath?: string;
  updatedAt?: string;
};

export type ExecutionReportEvent = {
  timestamp: string;
  type: string;
  danfe?: string;
  status?: string;
  message?: string;
  pdfPath?: string;
};

export type ExecutionReportPayload = {
  generatedAt?: string;
  items: ExecutionReportItem[];
  events: ExecutionReportEvent[];
};

function autoFitColumns(rows: Record<string, unknown>[]) {
  const widths = new Map<string, number>();

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      const length = String(value ?? '').length;
      widths.set(key, Math.min(Math.max(widths.get(key) ?? key.length, length), 90));
    }
  }

  return [...widths.values()].map((wch) => ({ wch: Math.max(wch + 2, 12) }));
}

export function createExecutionReportWorkbook(payload: ExecutionReportPayload) {
  const workbook = XLSX.utils.book_new();
  const generatedAt = payload.generatedAt ?? new Date().toISOString();
  const summaryRows = payload.items.map((item) => ({
    Chave: item.key,
    Status: item.status,
    Mensagem: item.message ?? '',
    'Caminho do PDF': item.pdfPath ?? '',
    'Ultima atualizacao': item.updatedAt ?? '',
    'Relatorio gerado em': generatedAt,
  }));
  const eventRows = payload.events.map((event) => ({
    'Data/Hora': event.timestamp,
    Evento: event.type,
    Chave: event.danfe ?? '',
    Status: event.status ?? '',
    Mensagem: event.message ?? '',
    'Caminho do PDF': event.pdfPath ?? '',
  }));

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  const eventsSheet = XLSX.utils.json_to_sheet(eventRows);

  summarySheet['!cols'] = autoFitColumns(summaryRows);
  eventsSheet['!cols'] = autoFitColumns(eventRows);

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
  XLSX.utils.book_append_sheet(workbook, eventsSheet, 'Eventos');

  return workbook;
}

export function writeExecutionReport(filePath: string, payload: ExecutionReportPayload) {
  const workbook = createExecutionReportWorkbook(payload);

  XLSX.writeFile(workbook, filePath);
}
