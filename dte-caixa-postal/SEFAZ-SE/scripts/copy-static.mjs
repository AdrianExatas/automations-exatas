import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const sourceDir = path.resolve(rootDir, 'electron');
const targetDir = path.resolve(rootDir, 'dist', 'electron');

await mkdir(targetDir, { recursive: true });

for (const fileName of ['index.html', 'styles.css', 'renderer.js']) {
  await cp(path.resolve(sourceDir, fileName), path.resolve(targetDir, fileName));
}
