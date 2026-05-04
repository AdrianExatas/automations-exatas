import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const distDir = join(root, 'dist', 'electron');
const rendererDistDir = join(distDir, 'renderer');

rmSync(distDir, { force: true, recursive: true });
mkdirSync(rendererDistDir, { recursive: true });

const result = await Bun.build({
  entrypoints: [join(root, 'src', 'electron', 'main.ts')],
  external: ['electron', 'playwright'],
  format: 'esm',
  outdir: distDir,
  target: 'node',
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }

  process.exit(1);
}

const mainOutput = join(distDir, 'main.js');
const mainModuleOutput = join(distDir, 'main.mjs');

copyFileSync(mainOutput, mainModuleOutput);
copyFileSync(join(root, 'src', 'electron', 'preload.cjs'), join(distDir, 'preload.cjs'));

for (const fileName of ['index.html', 'renderer.js', 'styles.css']) {
  const source = join(root, 'src', 'electron', 'renderer', fileName);
  const target = join(rendererDistDir, fileName);

  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}
