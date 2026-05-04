import {
  BrowserWindow,
  app,
  dialog,
  ipcMain,
  type OpenDialogOptions,
  type SaveDialogOptions,
} from 'electron';
import { createWriteStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
  incluirNotasFiscaisAgil,
  type AgilAuthOptions,
  type DanfeProgressEvent,
} from '../agil-flow';
import { loadDotEnv, optionalPositiveIntEnv } from '../env';
import { writeExecutionReport, type ExecutionReportPayload } from '../execution-report';
import { extractDanfeKeysFromFile } from '../invoice-keys';
import archiver from 'archiver';

loadDotEnv();

type StartBatchPayload = {
  auth: AgilAuthOptions;
  danfes: string[];
  dryRun?: boolean;
};

type ExportReportPayload = ExecutionReportPayload;

type ExportPdfsZipPayload = {
  paths: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let running = false;

function chromiumLaunchOptionsForAgilBatch(dryRun: boolean) {
  const slowMo = Number(process.env.SLOW_MO ?? (dryRun ? 1200 : 0));
  const browserChannel =
    process.env.BROWSER_CHANNEL?.trim() || (app.isPackaged ? 'msedge' : undefined);
  const launchOptions: Parameters<typeof chromium.launch>[0] = {
    headless: false,
    slowMo,
    args: ['--start-maximized'],
  };

  if (browserChannel) {
    launchOptions.channel = browserChannel;
  }

  return launchOptions;
}

function timestampForFileName(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/** Diretorio base onde os PDFs do AGIL sao gravados (subpastas por empresa abaixo dele). */
function resolveAgilPdfDownloadBaseDir(): string {
  const fromEnv = process.env.PDF_DOWNLOAD_DIR?.trim();

  if (fromEnv) {
    return resolve(fromEnv);
  }

  return join(app.getPath('documents'), 'SEFAZ-SE-AGIL', 'agil-pdfs');
}

function isPdfPathAllowedForZip(filePath: string, allowedRoot: string): boolean {
  const resolvedFile = resolve(filePath);
  const resolvedRoot = resolve(allowedRoot);

  if (!resolvedFile.toLowerCase().endsWith('.pdf')) {
    return false;
  }

  const rel = relative(resolvedRoot, resolvedFile);

  return Boolean(rel && !rel.startsWith('..') && !isAbsolute(rel));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 920,
    minHeight: 640,
    title: 'SEFAZ-SE AGIL',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow.loadFile(join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('agil:import-files', async () => {
  const openOptions: OpenDialogOptions = {
    title: 'Importar chaves de notas fiscais',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Planilhas e textos', extensions: ['xls', 'xlsx', 'csv', 'txt'] },
      { name: 'Todos os arquivos', extensions: ['*'] },
    ],
  };

  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, openOptions)
    : await dialog.showOpenDialog(openOptions);

  if (result.canceled) {
    return { filePaths: [], keys: [] };
  }

  const keys = new Set<string>();

  for (const filePath of result.filePaths) {
    for (const key of extractDanfeKeysFromFile(filePath)) {
      keys.add(key);
    }
  }

  return {
    filePaths: result.filePaths,
    keys: [...keys],
  };
});

ipcMain.handle('agil:export-report', async (_event, payload: ExportReportPayload) => {
  if (payload.items.length === 0 && payload.events.length === 0) {
    throw new Error('Nao ha dados para exportar.');
  }

  const saveOptions: SaveDialogOptions = {
    title: 'Baixar relatorio de execucao',
    defaultPath: `relatorio-agil-${timestampForFileName()}.xlsx`,
    filters: [{ name: 'Planilha Excel', extensions: ['xlsx'] }],
  };

  const result = mainWindow
    ? await dialog.showSaveDialog(mainWindow, saveOptions)
    : await dialog.showSaveDialog(saveOptions);

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  writeExecutionReport(result.filePath, payload);

  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle('agil:export-pdfs-zip', async (_event, payload: ExportPdfsZipPayload) => {
  const rawPaths = [...new Set((payload.paths ?? []).map((p) => p.trim()).filter(Boolean))];

  if (rawPaths.length === 0) {
    throw new Error('Nenhum PDF para exportar.');
  }

  const allowedRoot = resolveAgilPdfDownloadBaseDir();
  const entries: { abs: string; nameInZip: string }[] = [];
  const usedNames = new Set<string>();

  for (const p of rawPaths) {
    if (!isPdfPathAllowedForZip(p, allowedRoot)) {
      throw new Error(`Caminho nao permitido ou nao e PDF: ${p}`);
    }

    const abs = resolve(p);

    try {
      const st = await stat(abs);

      if (!st.isFile()) {
        throw new Error(`Nao e arquivo: ${p}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Nao e arquivo')) {
        throw error;
      }

      throw new Error(`Arquivo nao encontrado: ${p}`);
    }

    let nameInZip = basename(abs);

    if (usedNames.has(nameInZip)) {
      const parent = basename(dirname(abs));
      nameInZip = `${parent}_${nameInZip}`;
    }

    let candidate = nameInZip;
    let suffix = 0;

    while (usedNames.has(candidate)) {
      suffix += 1;
      candidate = `${suffix}_${nameInZip}`;
    }

    usedNames.add(candidate);
    entries.push({ abs, nameInZip: candidate });
  }

  const saveOptions: SaveDialogOptions = {
    title: 'Salvar comprovantes em ZIP',
    defaultPath: `comprovantes-agil-${timestampForFileName()}.zip`,
    filters: [{ name: 'Arquivo ZIP', extensions: ['zip'] }],
  };

  const result = mainWindow
    ? await dialog.showSaveDialog(mainWindow, saveOptions)
    : await dialog.showSaveDialog(saveOptions);

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  const output = createWriteStream(result.filePath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  const outputClosed = new Promise<void>((resolvePromise, rejectPromise) => {
    output.once('error', rejectPromise);
    output.once('close', () => {
      resolvePromise();
    });
    archive.once('error', rejectPromise);
  });

  archive.pipe(output);

  for (const { abs, nameInZip } of entries) {
    archive.file(abs, { name: nameInZip });
  }

  await archive.finalize();
  await outputClosed;

  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle('agil:start-batch', async (event, payload: StartBatchPayload) => {
  if (running) {
    throw new Error('Ja existe uma execucao em andamento.');
  }

  const danfes = [...new Set(payload.danfes.map((danfe) => danfe.trim()).filter(Boolean))];

  if (danfes.length === 0) {
    throw new Error('Informe ao menos uma chave de nota fiscal.');
  }

  if (payload.auth.authMode === 'credentials') {
    if (!payload.auth.username.trim() || !payload.auth.password.trim()) {
      throw new Error('Informe login e senha para acessar o AGIL.');
    }
  }

  running = true;
  const dryRun = Boolean(payload.dryRun);
  const browser = await chromium.launch(chromiumLaunchOptionsForAgilBatch(dryRun));

  try {
    const context = await browser.newContext({ acceptDownloads: true, viewport: null });
    const page = await context.newPage();

    const pdfDownloadDir = resolveAgilPdfDownloadBaseDir();
    const inserirOutcomeTimeoutMs = optionalPositiveIntEnv('AGIL_INSERIR_OUTCOME_TIMEOUT_MS');
    const insertGridConfirmTimeoutMs = optionalPositiveIntEnv('AGIL_INSERT_GRID_CONFIRM_TIMEOUT_MS');
    const agilTimeouts =
      inserirOutcomeTimeoutMs !== undefined || insertGridConfirmTimeoutMs !== undefined
        ? {
            ...(inserirOutcomeTimeoutMs !== undefined ? { inserirOutcomeTimeoutMs } : {}),
            ...(insertGridConfirmTimeoutMs !== undefined ? { insertGridConfirmTimeoutMs } : {}),
          }
        : {};

    return await incluirNotasFiscaisAgil(page, {
      ...payload.auth,
      ...agilTimeouts,
      danfes,
      dryRun: payload.dryRun,
      pdfDownloadDir,
      onProgress: (progress: DanfeProgressEvent) => {
        event.sender.send('agil:progress', progress);
      },
    });
  } finally {
    running = false;
    await browser.close();
  }
});
