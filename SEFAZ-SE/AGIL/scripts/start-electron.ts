import { join } from 'node:path';

await import('./build-electron');

const electronProcess = Bun.spawn({
  cmd: [process.execPath, 'x', 'electron', join(process.cwd(), 'dist', 'electron', 'main.mjs')],
  stderr: 'inherit',
  stdin: 'inherit',
  stdout: 'inherit',
});

process.exit(await electronProcess.exited);
