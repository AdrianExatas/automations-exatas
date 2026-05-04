import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import XLSX from 'xlsx';
import { writeExecutionReport } from '../src/execution-report';

test('gera relatorio XLSX com abas Resumo e Eventos', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agil-report-'));
  const filePath = join(dir, 'relatorio.xlsx');

  try {
    writeExecutionReport(filePath, {
      generatedAt: '2026-04-28T14:00:00.000Z',
      items: [
        {
          key: '35260343648971000155550090001065091392607031',
          message: 'PDF salvo.',
          pdfPath: 'output/agil-pdfs/empresa/35260343648971000155550090001065091392607031.pdf',
          status: 'success',
          updatedAt: '2026-04-28T14:01:00.000Z',
        },
      ],
      events: [
        {
          danfe: '35260343648971000155550090001065091392607031',
          message: 'Processando nota.',
          status: 'processing',
          timestamp: '2026-04-28T14:00:30.000Z',
          type: 'progresso',
        },
      ],
    });

    const workbook = XLSX.readFile(filePath);
    const summary = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets.Resumo);
    const events = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets.Eventos);

    expect(workbook.SheetNames).toEqual(['Resumo', 'Eventos']);
    expect(summary[0]).toMatchObject({
      Chave: '35260343648971000155550090001065091392607031',
      Mensagem: 'PDF salvo.',
      Status: 'success',
    });
    expect(events[0]).toMatchObject({
      Chave: '35260343648971000155550090001065091392607031',
      Evento: 'progresso',
      Mensagem: 'Processando nota.',
      Status: 'processing',
    });
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
});
