import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';
import ExcelJS from 'exceljs';

import { writeCaixaPostalReport } from '../src/app/caixaPostalReport';

test('writeCaixaPostalReport gera workbook com abas de empresas e falhas', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'dte-caixa-postal-report-'));

  try {
    const outputPath = await writeCaixaPostalReport({
      outputDir: tempRoot,
      rows: [
        {
          identificacao: '12345678000199',
          razao_social: 'Empresa Exemplo LTDA',
          msg_nao_lidas_lista: 2,
          ultima_geral_origem: 'nao_lidos',
          ultima_geral_numero: '001',
          ultima_geral_orgao: 'SEFAZ',
          ultima_geral_unidade: 'Unidade A',
          ultima_geral_assunto: 'Pendencia',
          ultima_geral_data_publicacao: '24/03/2026 10:00:00',
          ultima_geral_data_ciencia: '24/03/2026 10:05:00',
          ultima_geral_responsavel_ciencia: 'Analista',
          ultima_geral_link: 'https://exemplo.local/geral',
          ultima_nao_lida_numero: '001',
          ultima_nao_lida_orgao: 'SEFAZ',
          ultima_nao_lida_unidade: 'Unidade A',
          ultima_nao_lida_assunto: 'Pendencia',
          ultima_nao_lida_data_publicacao: '24/03/2026 10:00:00',
          ultima_nao_lida_data_ciencia: '24/03/2026 10:05:00',
          ultima_nao_lida_responsavel_ciencia: 'Analista',
          ultima_nao_lida_link: 'https://exemplo.local/nao-lido',
          status: 'ok',
          erro: '',
        },
      ],
      failures: [
        {
          identificacao: '12345678000199',
          razao_social: 'Empresa Exemplo LTDA',
          erro: 'Falha de teste',
        },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(outputPath);

    const empresas = workbook.getWorksheet('Empresas');
    const falhas = workbook.getWorksheet('Falhas');

    expect(path.dirname(outputPath)).toBe(tempRoot);
    expect(empresas?.getCell('A1').value).toBe('identificacao');
    expect(empresas?.getCell('B2').value).toBe('Empresa Exemplo LTDA');
    expect(falhas?.getCell('C2').value).toBe('Falha de teste');
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
