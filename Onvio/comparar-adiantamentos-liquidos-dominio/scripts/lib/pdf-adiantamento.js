/**
 * Extração de texto e parsing de blocos por competência
 * para relatórios de Líquidos Adiantamento (PDFs consolidado e mensais).
 */
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Extrai texto de um PDF (buffer).
 * @param {string} filePath - Caminho absoluto ou relativo ao cwd do processo
 * @returns {Promise<string>}
 */
export async function extractTextFromPdf(filePath) {
  const dataBuffer = await readFile(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

/**
 * Converte string de valor BR (ex: "7.533,82" ou "896,28") para número.
 * @param {string} str
 * @returns {number}
 */
export function parseValorBR(str) {
  if (typeof str !== 'string') return NaN;
  const normalized = str.replace(/\./g, '').replace(',', '.');
  return Number(normalized);
}

/**
 * Normaliza o rótulo de cálculo para chave consistente (ex.: "13o. Adiantamento" vs "13º Adiantamento").
 * @param {string} str
 * @returns {string}
 */
function normalizarCalculo(str) {
  if (!str || typeof str !== 'string') return 'Adiantamento';
  const t = str.trim();
  if (/13[oº°]?\s*\.?\s*Adiantamento/i.test(t)) return '13o. Adiantamento';
  if (/Adiantamento/i.test(t)) return 'Adiantamento';
  return t || 'Adiantamento';
}

/**
 * Parseia um bloco de texto correspondente a uma competência (uma página/mês).
 * Espera: "Cálculo: ...", "Competência: MM/YYYY", linhas de empregados, "Total da Empresa: X.XXX,XX".
 * @param {string} text
 * @returns {{ competencia: string, calculo: string, linhas: Array<{ codigo: string, nome: string, valor: number }>, total: number }}
 */
export function parseCompetenciaBlock(text) {
  const result = {
    competencia: '',
    calculo: 'Adiantamento',
    linhas: [],
    total: NaN,
  };

  const calculoMatch = text.match(/Cálculo:\s*([^\n]+)/i);
  if (calculoMatch) {
    result.calculo = normalizarCalculo(calculoMatch[1]);
  }

  const competenciaMatch = text.match(/Competência:\s*(\d{2}\/\d{4})/i);
  if (competenciaMatch) {
    result.competencia = competenciaMatch[1];
  }

  const totalMatch = text.match(/([\d.,]+)\s*Total da Empresa/i);
  if (totalMatch) {
    result.total = parseValorBR(totalMatch[1].trim());
  }

  const empregadosIdx = text.indexOf('Empregados');
  const contribuintesIdx = text.indexOf('Contribuintes:');
  const slice =
    empregadosIdx >= 0 && contribuintesIdx > empregadosIdx
      ? text.slice(empregadosIdx + 'Empregados'.length, contribuintesIdx)
      : '';

  const lineRegex = /^(\d+)\s+(.+?)\s+([\d.,]+)\s*$/gm;
  let m;
  while ((m = lineRegex.exec(slice)) !== null) {
    const valor = parseValorBR(m[3]);
    if (!Number.isNaN(valor)) {
      result.linhas.push({
        codigo: m[1],
        nome: m[2].trim(),
        valor,
      });
    }
  }

  return result;
}

/**
 * Divide o texto do consolidado em blocos por competência e parseia cada um.
 * Divisão por "Competência: MM/YYYY" ou "-- N of M --".
 * @param {string} fullText
 * @returns {Array<{ competencia: string, calculo: string, linhas: Array<{ codigo: string, nome: string, valor: number }>, total: number }>}
 */
export function parseConsolidadoFull(fullText) {
  const blocks = [];
  const competenciaRegex = /Competência:\s*(\d{2}\/\d{4})/gi;
  let lastIndex = 0;
  let match;
  const starts = [];

  while ((match = competenciaRegex.exec(fullText)) !== null) {
    starts.push({ index: match.index, competencia: match[1] });
  }

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i].index;
    const end = i + 1 < starts.length ? starts[i + 1].index : fullText.length;
    const blockText = fullText.slice(start, end);
    const parsed = parseCompetenciaBlock(blockText);
    if (parsed.competencia) {
      blocks.push(parsed);
    }
  }

  return blocks;
}

/**
 * Inferência de competência a partir do nome do arquivo.
 * Ex.: "Relatorio_Liquido_Adiantamento_-_01_2025.pdf" -> "01/2025"
 * @param {string} fileName
 * @returns {string|null} "MM/YYYY" ou null
 */
export function competenciaFromFileName(fileName) {
  const match = fileName.match(/(\d{1,2})[_\-\s]*(\d{4})/);
  if (!match) return null;
  const mes = match[1].padStart(2, '0');
  return `${mes}/${match[2]}`;
}

/**
 * Inferência do tipo de cálculo a partir do nome do arquivo (fallback quando o PDF não tem "Cálculo:").
 * Ex.: "Líquido_13°_Adiantamento_-_11_2025.pdf" -> "13o. Adiantamento"
 * @param {string} fileName
 * @returns {string} "Adiantamento" ou "13o. Adiantamento"
 */
export function calculoFromFileName(fileName) {
  if (/13[oº°]|decimo|13_/i.test(fileName)) return '13o. Adiantamento';
  return 'Adiantamento';
}
