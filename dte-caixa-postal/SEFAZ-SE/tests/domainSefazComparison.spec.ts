import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';
import ExcelJS from 'exceljs';

import {
  buildDomainSefazComparison,
  isSergipeStateRegistration,
  normalizeDigits,
  writeDomainSefazComparisonReport,
} from '../src/app/domainSefazComparison';

test('normalizeDigits remove mascara e isSergipeStateRegistration identifica IE de SE', () => {
  expect(normalizeDigits('27.201.609-8')).toBe('272016098');
  expect(normalizeDigits('16.806.229/0001-58')).toBe('16806229000158');
  expect(isSergipeStateRegistration('27.201.609-8')).toBe(true);
  expect(isSergipeStateRegistration('233426127')).toBe(false);
  expect(isSergipeStateRegistration('')).toBe(false);
});

test('buildDomainSefazComparison separa correspondencias e divergencias', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'dte-caixa-postal-compare-'));
  const domainPath = path.join(tempRoot, 'Relação de Empresas.xlsx');
  const sefazPath = path.join(tempRoot, 'caixa-postal.xlsx');

  try {
    await createDomainWorkbook(domainPath);
    await createSefazWorkbook(sefazPath);

    const comparison = await buildDomainSefazComparison({
      domainWorkbookPath: domainPath,
      sefazWorkbookPath: sefazPath,
    });

    expect(comparison.resumo).toEqual({
      dominioTotal: 3,
      sefazTotal: 2,
      correspondencias: 1,
      soDominioSE: 1,
      soSefaz: 1,
      dominioNaoSE: 1,
    });
    expect(comparison.correspondencias[0]?.cnpj).toBe('11111111000111');
    expect(comparison.soDominioSE[0]?.cnpj).toBe('22222222000122');
    expect(comparison.soSefaz[0]?.cnpj).toBe('44444444000144');
    expect(comparison.dominioNaoSE[0]?.cnpj).toBe('33333333000133');
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('writeDomainSefazComparisonReport gera workbook com abas esperadas', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'dte-caixa-postal-compare-report-'));
  const domainPath = path.join(tempRoot, 'Relação de Empresas.xlsx');
  const sefazPath = path.join(tempRoot, 'caixa-postal.xlsx');

  try {
    await createDomainWorkbook(domainPath);
    await createSefazWorkbook(sefazPath);

    const outputPath = await writeDomainSefazComparisonReport({
      domainWorkbookPath: domainPath,
      sefazWorkbookPath: sefazPath,
      outputDir: tempRoot,
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(outputPath);

    expect(workbook.getWorksheet('Correspondencias')?.getCell('A2').value).toBe('11111111000111');
    expect(workbook.getWorksheet('So_Dominio_SE')?.getCell('H2').value).toBe('so_dominio_se');
    expect(workbook.getWorksheet('So_SEFAZ')?.getCell('C2').value).toBe('Empresa Sefaz');
    expect(workbook.getWorksheet('Dominio_Nao_SE')?.getCell('D2').value).toBe('233426127');
    expect(workbook.getWorksheet('Resumo')?.getCell('A2').value).toBe('dominio_total');
    expect(workbook.getWorksheet('Resumo')?.getCell('B5').value).toBe(1);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

async function createDomainWorkbook(filePath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Relação de Empresas');

  worksheet.addRow([
    '',
    'Cód.',
    '',
    'Empresa',
    'Empresa',
    'CNPJ',
    'Regime Enquadramento',
    'Inscrição Estadual',
    'Inscrição Municipal',
    'Municipio',
    'Status/Situação',
    'Status/Situação',
    'Data de Cadastro',
    'Data de Cadastro',
    'Data de Cadastro',
  ]);
  worksheet.addRow([
    '',
    '1',
    '',
    'Empresa Match',
    'Empresa Match',
    '11.111.111/0001-11',
    'Simples Nacional',
    '27.123.456-7',
    '',
    'ARACAJU',
    'Ativa',
    'Ativa',
    '2026-01-01',
    '2026-01-01',
    '2026-01-01',
  ]);
  worksheet.addRow([
    '',
    '2',
    '',
    'Empresa Dominio SE',
    'Empresa Dominio SE',
    '22.222.222/0001-22',
    'Simples Nacional',
    '272345678',
    '',
    'ITABAIANA',
    'Ativa',
    'Ativa',
    '2026-01-01',
    '2026-01-01',
    '2026-01-01',
  ]);
  worksheet.addRow([
    '',
    '3',
    '',
    'Empresa Fora SE',
    'Empresa Fora SE',
    '33.333.333/0001-33',
    'Simples Nacional',
    '233426127',
    '',
    'ITAPICURU',
    'Ativa',
    'Ativa',
    '2026-01-01',
    '2026-01-01',
    '2026-01-01',
  ]);

  await workbook.xlsx.writeFile(filePath);
}

async function createSefazWorkbook(filePath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const empresas = workbook.addWorksheet('Empresas');
  const falhas = workbook.addWorksheet('Falhas');

  empresas.addRow([
    'identificacao',
    'razao_social',
    'msg_nao_lidas_lista',
    'ultima_geral_origem',
    'ultima_geral_numero',
    'ultima_geral_orgao',
    'ultima_geral_unidade',
    'ultima_geral_assunto',
    'ultima_geral_data_publicacao',
    'ultima_geral_data_ciencia',
    'ultima_geral_responsavel_ciencia',
    'ultima_geral_link',
    'ultima_nao_lida_numero',
    'ultima_nao_lida_orgao',
    'ultima_nao_lida_unidade',
    'ultima_nao_lida_assunto',
    'ultima_nao_lida_data_publicacao',
    'ultima_nao_lida_data_ciencia',
    'ultima_nao_lida_responsavel_ciencia',
    'ultima_nao_lida_link',
    'status',
    'erro',
  ]);
  empresas.addRow([
    '11.111.111/0001-11',
    'Empresa Match SEFAZ',
    0,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'ok',
    '',
  ]);
  empresas.addRow([
    '44.444.444/0001-44',
    'Empresa Sefaz',
    0,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'ok',
    '',
  ]);
  falhas.addRow(['identificacao', 'razao_social', 'erro']);

  await workbook.xlsx.writeFile(filePath);
}
