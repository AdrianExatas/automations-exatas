import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import XLSX from 'xlsx';
import { extractDanfeKeysFromFile, extractDanfeKeysFromText } from '../src/invoice-keys';

const keyA = '12345678901234567890123456789012345678901234';
const keyB = '98765432109876543210987654321098765432109876';

test('extrai chaves de 44 digitos de texto e remove duplicadas', () => {
  expect(extractDanfeKeysFromText(`abc ${keyA}\n${keyA}\n000`)).toEqual([keyA]);
});

test('extrai chaves de csv e txt', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agil-keys-'));

  try {
    const csvPath = join(dir, 'notas.csv');
    const txtPath = join(dir, 'notas.txt');

    writeFileSync(csvPath, `cliente;chave\nA;${keyA}\nB;sem-chave`, 'utf8');
    writeFileSync(txtPath, `linha ${keyB}`, 'utf8');

    expect(extractDanfeKeysFromFile(csvPath)).toEqual([keyA]);
    expect(extractDanfeKeysFromFile(txtPath)).toEqual([keyB]);
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
});

test('extrai chaves de xlsx em qualquer celula', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agil-keys-'));

  try {
    const xlsxPath = join(dir, 'notas.xlsx');
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['cliente', 'observacao'],
      ['A', `nota ${keyA}`],
      ['B', keyB],
    ]);

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Notas');
    XLSX.writeFile(workbook, xlsxPath);

    expect(extractDanfeKeysFromFile(xlsxPath)).toEqual([keyA, keyB]);
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
});
