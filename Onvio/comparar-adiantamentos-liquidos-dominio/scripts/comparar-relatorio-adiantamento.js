/**
 * Compara o relatório consolidado de Líquidos Adiantamento com os PDFs mensais
 * e gera relatório de divergências (total diferente, linhas só em um, valor diferente).
 *
 * Uso: node scripts/comparar-relatorio-adiantamento.js
 * Env opcional: CONSOLIDADO_PATH, MENSAIS_DIR (default: relatorio-dominio/..., downloads/)
 * Saída: console + comparacao-adiantamento.md (e opcionalmente comparacao-adiantamento.json)
 */
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  extractTextFromPdf,
  parseCompetenciaBlock,
  parseConsolidadoFull,
  competenciaFromFileName,
  calculoFromFileName,
} from './lib/pdf-adiantamento.js';

/** Chave no mapa de mensais: competência + tipo de cálculo (Adiantamento vs 13o. Adiantamento). */
function chaveMensal(competencia, calculo) {
  return `${competencia}|${calculo}`;
}

const TOLERANCIA_CENTAVOS = 0.01;
const CONSOLIDADO_DEFAULT = 'relatorio-dominio/Relatório de Líquidos Adiantamento Litoral (1).pdf';
const MENSAIS_DIR_DEFAULT = 'downloads';
const OUTPUT_MD = 'comparacao-adiantamento.md';
const OUTPUT_JSON = 'comparacao-adiantamento.json';

function valorIgual(a, b, tol = TOLERANCIA_CENTAVOS) {
  return Math.abs((a || 0) - (b || 0)) <= tol;
}

/**
 * Compara dois conjuntos de linhas por código e retorna divergências.
 * @param {Array<{ codigo: string, nome: string, valor: number }>} linhasConsolidado
 * @param {Array<{ codigo: string, nome: string, valor: number }>} linhasMensal
 * @returns {{ totalDiferente: boolean, soNoConsolidado: Array, soNoMensal: Array, valorDiferente: Array }}
 */
function compararLinhas(linhasConsolidado, linhasMensal, totalConsolidado, totalMensal) {
  const byCodigoConsolidado = new Map(linhasConsolidado.map((l) => [l.codigo, l]));
  const byCodigoMensal = new Map(linhasMensal.map((l) => [l.codigo, l]));

  const soNoConsolidado = [];
  const soNoMensal = [];
  const valorDiferente = [];

  for (const [codigo, rowC] of byCodigoConsolidado) {
    const rowM = byCodigoMensal.get(codigo);
    if (!rowM) {
      soNoConsolidado.push({ codigo, nome: rowC.nome, valor: rowC.valor });
    } else if (!valorIgual(rowC.valor, rowM.valor)) {
      valorDiferente.push({
        codigo,
        nome: rowC.nome,
        valorConsolidado: rowC.valor,
        valorMensal: rowM.valor,
      });
    }
  }

  for (const [codigo, rowM] of byCodigoMensal) {
    if (!byCodigoConsolidado.has(codigo)) {
      soNoMensal.push({ codigo, nome: rowM.nome, valor: rowM.valor });
    }
  }

  const totalDiferente = !valorIgual(totalConsolidado, totalMensal);

  return {
    totalDiferente,
    soNoConsolidado,
    soNoMensal,
    valorDiferente,
  };
}

async function main() {
  const baseDir = process.cwd();
  const consolidadoPath = resolve(
    baseDir,
    process.env.CONSOLIDADO_PATH || CONSOLIDADO_DEFAULT
  );
  const mensaisDir = resolve(baseDir, process.env.MENSAIS_DIR || MENSAIS_DIR_DEFAULT);

  console.log('Consolidado:', consolidadoPath);
  console.log('Pasta mensais:', mensaisDir);
  console.log('');

  const consolidadoText = await extractTextFromPdf(consolidadoPath);
  const blocosConsolidado = parseConsolidadoFull(consolidadoText);
  console.log(`Consolidado: ${blocosConsolidado.length} competências encontradas.`);

  let arquivosPdf = [];
  try {
    const entries = await readdir(mensaisDir, { withFileTypes: true });
    arquivosPdf = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.pdf'));
  } catch (err) {
    console.warn('Aviso: não foi possível listar a pasta de mensais:', err.message);
  }

  const mapaMensais = new Map();
  for (const ent of arquivosPdf) {
    const filePath = join(mensaisDir, ent.name);
    try {
      const text = await extractTextFromPdf(filePath);
      const block = parseCompetenciaBlock(text);
      const competencia = block.competencia || competenciaFromFileName(ent.name);
      const calculo = block.calculo || calculoFromFileName(ent.name);
      if (competencia) {
        mapaMensais.set(chaveMensal(competencia, calculo), {
          linhas: block.linhas,
          total: block.total,
          calculo,
        });
      }
    } catch (err) {
      console.warn(`Aviso: erro ao processar ${ent.name}:`, err.message);
    }
  }
  console.log(`Mensais: ${mapaMensais.size} PDFs associados (competência + cálculo).`);
  console.log('');

  const resumo = [];
  const linhasMd = [
    '# Comparação: Relatório Consolidado x PDFs Mensais',
    '',
    `Consolidado: \`${CONSOLIDADO_DEFAULT}\`  \nMensais: \`${MENSAIS_DIR_DEFAULT}/\``,
    '',
    'Comparação por **competência** e **tipo de cálculo** (Adiantamento vs 13º Adiantamento).',
    '',
    '| Competência | Cálculo | Status | Detalhes |',
    '|-------------|---------|--------|----------|',
  ];

  for (const bloco of blocosConsolidado) {
    const { competencia, calculo, linhas: linhasC, total: totalC } = bloco;
    const mensal = mapaMensais.get(chaveMensal(competencia, calculo));

    const item = {
      competencia,
      calculo,
      status: 'OK',
      totalConsolidado: totalC,
      totalMensal: mensal ? mensal.total : null,
      semArquivoMensal: !mensal,
      divergencias: [],
    };

    if (!mensal) {
      item.status = 'SEM_ARQUIVO';
      item.divergencias.push(`Sem arquivo mensal para este cálculo (${calculo}).`);
      resumo.push(item);
      linhasMd.push(`| ${competencia} | ${calculo} | ⚠ Sem arquivo mensal | - |`);
      continue;
    }

    const { linhas: linhasM, total: totalM } = mensal;
    const diff = compararLinhas(linhasC, linhasM, totalC, totalM);

    if (diff.totalDiferente) {
      item.divergencias.push(
        `Total diferente: consolidado ${totalC.toFixed(2)} x mensal ${totalM.toFixed(2)}`
      );
    }
    if (diff.soNoConsolidado.length) {
      item.divergencias.push(
        `Linha(s) só no consolidado: ${diff.soNoConsolidado.map((l) => `${l.codigo} ${l.nome}`).join('; ')}`
      );
    }
    if (diff.soNoMensal.length) {
      item.divergencias.push(
        `Linha(s) só no mensal: ${diff.soNoMensal.map((l) => `${l.codigo} ${l.nome}`).join('; ')}`
      );
    }
    if (diff.valorDiferente.length) {
      item.divergencias.push(
        `Valor diferente: ${diff.valorDiferente
          .map(
            (v) =>
              `${v.codigo} ${v.nome} (consolidado ${v.valorConsolidado.toFixed(2)} x mensal ${v.valorMensal.toFixed(2)})`
          )
          .join('; ')}`
      );
    }

    if (item.divergencias.length > 0) {
      item.status = 'DIVERGENTE';
      linhasMd.push(`| ${competencia} | ${calculo} | ❌ Divergente | ${item.divergencias.join(' ') || '-'} |`);
    } else {
      linhasMd.push(`| ${competencia} | ${calculo} | ✅ OK | - |`);
    }

    item.totalMensal = totalM;
    resumo.push(item);
  }

  for (const r of resumo) {
    const etiqueta = r.calculo ? `${r.competencia} (${r.calculo})` : r.competencia;
    if (r.status === 'OK') {
      console.log(`${etiqueta}: OK`);
    } else if (r.status === 'SEM_ARQUIVO') {
      console.log(`${etiqueta}: SEM ARQUIVO MENSAL`);
    } else {
      console.log(`${etiqueta}: DIVERGENTE`);
      r.divergencias.forEach((d) => console.log('  -', d));
    }
  }

  const { writeFile } = await import('node:fs/promises');
  await writeFile(join(baseDir, OUTPUT_MD), linhasMd.join('\n'), 'utf8');
  console.log('');
  console.log(`Relatório gravado em ${OUTPUT_MD}`);

  await writeFile(
    join(baseDir, OUTPUT_JSON),
    JSON.stringify({ resumo }, null, 2),
    'utf8'
  );
  console.log(`Resumo JSON gravado em ${OUTPUT_JSON}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
