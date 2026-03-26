import path from 'node:path';

import { writeDomainSefazComparisonReport } from '../app/domainSefazComparison';

async function main(): Promise<void> {
  const cwd = process.cwd();
  const outputPath = await writeDomainSefazComparisonReport({
    domainWorkbookPath: path.resolve(cwd, 'data', 'Relação de Empresas.xlsx'),
    sefazWorkbookPath: path.resolve(
      cwd,
      'output',
      'caixa-postal',
      'caixa-postal-2026-03-24_11-05-32.xlsx',
    ),
    outputDir: path.resolve(cwd, 'output', 'caixa-postal'),
  });

  console.log(outputPath);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Falha ao gerar relatorio de divergencia: ${message}`);
  process.exitCode = 1;
});
