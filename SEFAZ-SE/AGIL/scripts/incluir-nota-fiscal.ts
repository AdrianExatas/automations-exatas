import { chromium } from 'playwright';
import {
  incluirNotasFiscaisAgil,
  incluirNotaFiscalAgil,
  type AgilAuthOptions,
  type DanfeProgressEvent,
} from '../src/agil-flow';
import { booleanEnv, loadDotEnv, optionalPositiveIntEnv, requiredEnv } from '../src/env';
import { extractDanfeKeysFromFile, extractDanfeKeysFromText } from '../src/invoice-keys';

loadDotEnv();

const authModeValue = process.env.AUTH_MODE?.trim().toLowerCase();
const authMode =
  authModeValue === 'certificate' || authModeValue === 'certificado'
    ? 'certificate'
    : 'credentials';
const danfeFile = process.env.SEFAZ_DANFE_FILE?.trim();
const danfe = process.env.SEFAZ_DANFE?.trim();
const dryRun = booleanEnv('DRY_RUN', false);
const headless = booleanEnv('HEADLESS', authMode === 'certificate' || dryRun ? false : true);
const keepOpen = booleanEnv('KEEP_OPEN', false);
const slowMo = Number(process.env.SLOW_MO ?? (dryRun ? 1200 : 0));
const pdfDownloadDir = process.env.PDF_DOWNLOAD_DIR?.trim() || undefined;
const browserChannel = process.env.BROWSER_CHANNEL?.trim() || undefined;
const inserirOutcomeTimeoutMs = optionalPositiveIntEnv('AGIL_INSERIR_OUTCOME_TIMEOUT_MS');
const insertGridConfirmTimeoutMs = optionalPositiveIntEnv('AGIL_INSERT_GRID_CONFIRM_TIMEOUT_MS');
const agilTimeouts =
  inserirOutcomeTimeoutMs !== undefined || insertGridConfirmTimeoutMs !== undefined
    ? {
        ...(inserirOutcomeTimeoutMs !== undefined ? { inserirOutcomeTimeoutMs } : {}),
        ...(insertGridConfirmTimeoutMs !== undefined ? { insertGridConfirmTimeoutMs } : {}),
      }
    : {};
const auth: AgilAuthOptions =
  authMode === 'certificate'
    ? { authMode }
    : {
        authMode,
        username: requiredEnv('SEFAZ_USERNAME'),
        password: requiredEnv('SEFAZ_PASSWORD'),
      };

const launchOptions: Parameters<typeof chromium.launch>[0] = {
  headless,
  slowMo,
  args: ['--start-maximized'],
};

if (browserChannel) {
  launchOptions.channel = browserChannel;
}

const danfes = danfeFile
  ? extractDanfeKeysFromFile(danfeFile)
  : danfe
    ? extractDanfeKeysFromText(danfe)
    : [];

if (danfeFile && danfes.length === 0) {
  throw new Error(`Nenhuma chave DANFE de 44 digitos encontrada em: ${danfeFile}`);
}

if (danfeFile) {
  console.log(`Chaves extraidas do arquivo: ${danfes.length}`);
}

console.log(
  `Abrindo navegador: headless=${headless}, slowMo=${slowMo}, channel=${browserChannel ?? 'chromium'}.`,
);

const browser = await chromium.launch(launchOptions);

console.log('Navegador aberto. Criando contexto e pagina.');

const context = await browser.newContext({ acceptDownloads: true, viewport: null });
const page = await context.newPage();

console.log('Pagina criada. Iniciando fluxo AGIL.');

try {
  if (danfes.length > 1) {
    await incluirNotasFiscaisAgil(page, {
      ...auth,
      ...agilTimeouts,
      danfes,
      dryRun,
      pdfDownloadDir,
      onProgress: ({ danfe: key, status, message }: DanfeProgressEvent) => {
        console.log(`${key}: ${status}${message ? ` - ${message}` : ''}`);
      },
    });
  } else {
    await incluirNotaFiscalAgil(page, {
      ...auth,
      ...agilTimeouts,
      danfe: danfes[0] ?? danfe,
      dryRun,
      pdfDownloadDir,
    });
  }

  console.log('Fluxo de inclusao de nota fiscal no AGIL finalizado.');
} finally {
  if (!keepOpen) {
    await browser.close();
  }
}
