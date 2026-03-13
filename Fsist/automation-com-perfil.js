/**
 * Automação Playwright usando um perfil do Chrome com extensões e dados.
 * Lê chaves NFe de uma planilha .xlsx (regex: 44 dígitos) e para cada chave:
 * acessa fsist.com.br, consulta nota e baixa XML com certificado.
 *
 * Uso (recomendado – um clique):
 *   Execute baixar-notas-fsist.bat
 *   → Fecha o Chrome, abre em modo depuração, inicia a automação e abre
 *     a janela para você selecionar a planilha .xlsx.
 *
 * Uso manual:
 *   node automation-com-perfil.js
 *     → Abre janela para selecionar a planilha .xlsx
 *   node automation-com-perfil.js [caminho/planilha-chaves.xlsx]
 *   ou: set PLANILHA_CHAVES=caminho.xlsx && node automation-com-perfil.js
 *
 * Modo "conectar ao Chrome" (recomendado para usar extensão da Chrome Web Store):
 * 1. Feche todos os Chromes. Abra o Chrome com depuração remota:
 *    (use o script abrir-chrome-debug.bat do projeto)
 *    Ou manualmente (Chrome 136+ exige --user-data-dir separado):
 *    chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\caminho\perfil-debug"
 * 2. Nesse Chrome, instale "Gerar DANFe/DACTe" na Chrome Web Store.
 * 3. Rode: set CHROME_DEBUG_URL=http://localhost:9222 && npm run automation
 *    O script conecta a esse Chrome e usa a extensão já instalada.
 *
 * Modo extensão descompactada (sem depender da loja):
 * - Baixe o .crx da extensão (ex.: crx4chrome.com, ID fnalonmlenogoaknbeikifdbaokkhmjj),
 *   descompacte o .crx (é um zip) em uma pasta.
 * - set EXTENSION_PATH=C:\caminho\pasta\da\extensao && npm run automation
 *
 * Perfil do Chrome (quando não usa CHROME_DEBUG_URL):
 * - Usar perfil real: feche o Chrome. set USE_REAL_CHROME_PROFILE=1 && npm run automation
 * - Copiar perfil: copie o CONTEÚDO de User Data (Default, Local State, etc.)
 *   para DENTRO de chrome-perfil-automacao. Origem: ...\Google\Chrome\User Data
 *
 * Downloads: os XMLs baixados (DOWNLOAD XML COM CERTIFICADO) são salvos em
 *   downloads-xml/ na pasta do projeto (definido via CDP Page.setDownloadBehavior).
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { execSync } = require('child_process');
const XLSX = require('xlsx');

const CHAVE_NFE_REGEX = /\b\d{44}\b/g;
const URL_FSIST = 'https://www.fsist.com.br/';

/**
 * Abre o diálogo nativo do sistema para selecionar um arquivo .xlsx.
 * @returns {string|null} Caminho do arquivo selecionado ou null se cancelar
 */
function selecionarPlanilha() {
  const platform = os.platform();
  const tmpDir = os.tmpdir();

  if (platform === 'win32') {
    const psScript = path.join(tmpDir, 'fsist-selecionar-planilha.ps1');
    const resultFile = path.join(tmpDir, 'fsist-planilha-selecionada.txt');
    fs.writeFileSync(
      psScript,
      `$resultFile = $args[0]
Add-Type -AssemblyName System.Windows.Forms
$d = New-Object System.Windows.Forms.OpenFileDialog
$d.Filter = "Excel (*.xlsx)|*.xlsx|Todos (*.*)|*.*"
$d.Title = "Selecionar planilha de chaves NFe"
if ($d.ShowDialog() -eq 'OK') {
  [System.IO.File]::WriteAllText($resultFile, $d.FileName, [System.Text.UTF8Encoding]::new($false))
}`,
      'utf8'
    );
    try {
      execSync(`powershell -ExecutionPolicy Bypass -File "${psScript}" "${resultFile}"`, {
        stdio: ['inherit', 'pipe', 'pipe'],
      });
      if (fs.existsSync(resultFile)) {
        const planilhaPath = fs.readFileSync(resultFile, 'utf8').trim();
        fs.unlinkSync(resultFile);
        fs.unlinkSync(psScript);
        return planilhaPath || null;
      }
      fs.unlinkSync(psScript);
      return null;
    } catch {
      try { fs.unlinkSync(psScript); } catch {}
      try { if (fs.existsSync(resultFile)) fs.unlinkSync(resultFile); } catch {}
      return null;
    }
  }

  if (platform === 'darwin') {
    try {
      const out = execSync(
        'osascript -e \'return POSIX path of (choose file of type {"com.microsoft.excel.xlsx", "public.data"} with prompt "Selecionar planilha de chaves NFe")\'',
        { encoding: 'utf-8' }
      ).trim();
      return out || null;
    } catch {
      return null;
    }
  }

  if (platform === 'linux') {
    try {
      const out = execSync(
        'zenity --file-selection --title="Selecionar planilha de chaves NFe" --file-filter="Planilha Excel (*.xlsx) | *.xlsx" --file-filter="Todos | *" 2>/dev/null',
        { encoding: 'utf-8' }
      ).trim();
      return out || null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Extrai chaves NFe (44 dígitos) de um arquivo .xlsx.
 * Percorre todas as abas e células, concatena o texto e aplica o regex.
 * @param {string} caminhoArquivo - Caminho para o .xlsx
 * @returns {string[]} Array de chaves únicas
 */
function extrairChavesDaPlanilha(caminhoArquivo) {
  const workbook = XLSX.readFile(caminhoArquivo);
  let text = '';

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet['!ref']) continue;
    for (const key of Object.keys(sheet)) {
      if (key[0] === '!') continue;
      const cell = sheet[key];
      if (cell && cell.v != null) text += String(cell.v) + ' ';
    }
  }

  const matches = text.match(CHAVE_NFE_REGEX) || [];
  return [...new Set(matches)];
}

function isPerfilValido(pasta) {
  if (!fs.existsSync(pasta) || !fs.statSync(pasta).isDirectory()) return false;
  const temDefault = fs.existsSync(path.join(pasta, 'Default')) && fs.statSync(path.join(pasta, 'Default')).isDirectory();
  const temLocalState = fs.existsSync(path.join(pasta, 'Local State')) && fs.statSync(path.join(pasta, 'Local State')).isFile();
  return temDefault || temLocalState;
}

/**
 * Verifica se o Chrome está aceitando conexões CDP na URL (GET /json/version).
 * @param {string} cdpUrl - Ex.: http://127.0.0.1:9222
 * @param {number} timeoutMs - Timeout em ms (default 3000)
 * @returns {Promise<boolean>}
 */
function verificarPortaCDP(cdpUrl, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const url = new URL(cdpUrl);
    const opts = {
      hostname: url.hostname,
      port: url.port || 9222,
      path: '/json/version',
      method: 'GET',
    };
    const req = http.request(opts, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

function logInstrucoesConexaoCDP() {
  console.error('');
  console.error('Não foi possível conectar ao Chrome na porta 9222.');
  console.error('');
  console.error('A partir do Chrome 136, --remote-debugging-port só funciona com --user-data-dir');
  console.error('apontando para uma pasta diferente da padrão.');
  console.error('');
  console.error('Certifique-se de:');
  console.error('  1. Fechar TODOS os Chromes (incluindo em segundo plano; confira no Gerenciador de Tarefas).');
  console.error('  2. Abrir o Chrome somente com o script abrir-chrome-debug.bat ou com o comando:');
  console.error('     "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\\caminho\\perfil-debug"');
  console.error('  3. Rodar este script de novo.');
  console.error('');
}

async function main() {
  let planilhaPath = process.env.PLANILHA_CHAVES || process.argv[2];

  if (!planilhaPath) {
    console.log('Abrindo janela para selecionar a planilha...');
    planilhaPath = selecionarPlanilha();
    if (!planilhaPath) {
      console.log('Nenhum arquivo selecionado. Encerrando.');
      process.exit(0);
    }
  }

  if (!fs.existsSync(planilhaPath)) {
    console.error('Erro: planilha não encontrada:', planilhaPath);
    process.exit(1);
  }

  const chaves = extrairChavesDaPlanilha(planilhaPath);
  if (chaves.length === 0) {
    console.error('Erro: nenhuma chave NFe (44 dígitos) encontrada na planilha.');
    process.exit(1);
  }

  console.log(`Encontradas ${chaves.length} chave(s) na planilha.`);

  const modoCDP = process.env.CHROME_DEBUG_URL;
  let page;
  let closeContext = false;
  let context;

  if (modoCDP) {
    const cdpUrl = process.env.CHROME_DEBUG_URL.replace(/localhost/gi, '127.0.0.1');
    const cdpOk = await verificarPortaCDP(cdpUrl, 3000);
    if (!cdpOk) {
      logInstrucoesConexaoCDP();
      process.exit(1);
    }
    console.log('Conectando ao Chrome em', cdpUrl, '...');
    let browser;
    try {
      browser = await chromium.connectOverCDP(cdpUrl, { timeout: 10_000 });
    } catch (err) {
      const msg = (err && err.message) ? String(err.message) : '';
      if (/ECONNREFUSED|connect|EADDRNOTAVAIL|timeout/i.test(msg)) {
        logInstrucoesConexaoCDP();
        process.exit(1);
      }
      throw err;
    }
    context = browser.contexts()[0] || await browser.newContext();
    // Usar uma aba já aberta do perfil (tem extensões); nova aba via CDP pode não carregá-las
    const existingPages = context.pages();
    page = existingPages.length > 0 ? existingPages[0] : await context.newPage();
    await page.bringToFront();
  } else {
    const useRealProfile = /^1|true$/i.test(process.env.USE_REAL_CHROME_PROFILE || '') && os.platform() === 'win32' && process.env.LOCALAPPDATA;
    const chromeUserData = useRealProfile
      ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data')
      : (process.env.CHROME_USER_DATA || path.join(__dirname, 'chrome-perfil-automacao'));

    if (useRealProfile) {
      console.log('Feche o Chrome completamente antes de continuar. O script usará seu perfil real.');
      await new Promise((r) => setTimeout(r, 5000));
    }

    if (!isPerfilValido(chromeUserData)) {
      console.error('Erro: a pasta de perfil do Chrome não é válida:', chromeUserData);
      console.error('');
      console.error('A pasta deve ser a RAIZ do perfil (onde estão "Default" e "Local State").');
      console.error('');
      console.error('Opção A: Copie o CONTEÚDO de');
      console.error('  C:\\Users\\SEU_USUARIO\\AppData\\Local\\Google\\Chrome\\User Data');
      console.error('  (tudo que está DENTRO dessa pasta: Default, Local State, etc.)');
      console.error('  para dentro de chrome-perfil-automacao do projeto.');
      console.error('  Resultado: chrome-perfil-automacao/Default, chrome-perfil-automacao/Local State');
      console.error('');
      console.error('Opção B: Use o perfil real. Feche o Chrome e rode:');
      console.error('  set USE_REAL_CHROME_PROFILE=1 && npm run automation');
      console.error('');
      console.error('Opção C: Conecte ao Chrome já aberto (permite instalar extensão na loja):');
      console.error('  Abra Chrome com --remote-debugging-port=9222, instale a extensão, depois:');
      console.error('  set CHROME_DEBUG_URL=http://localhost:9222 && npm run automation');
      process.exit(1);
    }

    const launchOptions = {
      channel: 'chrome',
      headless: false,
      viewport: null,
      ignoreDefaultArgs: ['--enable-automation', '--no-sandbox'],
    };
    const extensionPath = process.env.EXTENSION_PATH;
    if (extensionPath && fs.existsSync(extensionPath)) {
      launchOptions.args = ['--load-extension=' + path.resolve(extensionPath)];
    }
    context = await chromium.launchPersistentContext(chromeUserData, launchOptions);
    page = await context.newPage();
    closeContext = true;
  }

  // Definir pasta de download (CDP): os XMLs serão salvos em downloads-xml/ no projeto
  const downloadsDir = path.resolve(__dirname, 'downloads-xml');
  fs.mkdirSync(downloadsDir, { recursive: true });
  try {
    const cdpSession = await context.newCDPSession(page);
    await cdpSession.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadsDir });
    console.log('Downloads serão salvos em:', downloadsDir);
  } catch (e) {
    console.warn('Aviso: não foi possível definir pasta de download via CDP. Os XMLs podem ir para a pasta padrão do Chrome:', e.message);
  }

  /** Aguarda o arquivo de download aparecer em downloadsDir e estabilizar (até timeoutMs). */
  async function aguardarDownloadConcluir(chave, arquivosAntes, timeoutMs = 25000) {
    const inicio = Date.now();
    let tamanhoAnterior = -1;
    let estabilizado = 0;
    const conjuntoAntes = new Set(arquivosAntes);
    while (Date.now() - inicio < timeoutMs) {
      const atuais = fs.readdirSync(downloadsDir).filter((f) => f.endsWith('.xml'));
      const novo = atuais.find((f) => !conjuntoAntes.has(f));
      const arquivo = novo
        ? path.join(downloadsDir, novo)
        : path.join(downloadsDir, `${chave}.xml`);
      if (fs.existsSync(arquivo)) {
        const stat = fs.statSync(arquivo);
        if (stat.size > 0 && stat.size === tamanhoAnterior) {
          estabilizado += 200;
          if (estabilizado >= 800) return;
        } else {
          tamanhoAnterior = stat.size;
          estabilizado = 0;
        }
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    console.warn(`Aviso: download do XML da chave ${chave} não concluído em ${timeoutMs / 1000}s. Verifique em ${downloadsDir}.`);
  }

  let sucesso = 0;
  let falhas = 0;

  for (let i = 0; i < chaves.length; i++) {
    const chave = chaves[i];
    try {
      if (i > 0) {
        await page.getByRole('link', { name: 'NOVA CONSULTA' }).click();
        await page.waitForLoadState('domcontentloaded');
      } else {
        await page.bringToFront();
        console.log('Abrindo fsist.com.br...');
        await page.goto(URL_FSIST, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      }

      await page.locator('#chave').click();
      await page.locator('#chave').fill(chave);
      await page.getByRole('link', { name: 'CONSULTA NOTA' }).click();
      await page.waitForLoadState('domcontentloaded');

      const arquivosAntes = fs.readdirSync(downloadsDir).filter((f) => f.endsWith('.xml'));
      await page.getByRole('link', { name: 'DOWNLOAD XML COM CERTIFICADO' }).click();
      await page.waitForLoadState('domcontentloaded');
      await aguardarDownloadConcluir(chave, arquivosAntes);

      sucesso++;
      console.log(`[${i + 1}/${chaves.length}] OK: ${chave}`);
    } catch (err) {
      falhas++;
      console.error(`[${i + 1}/${chaves.length}] Falha (${chave}):`, err.message);
    }
  }

  if (closeContext && context) await context.close();
  console.log(`\nResumo: ${sucesso} processada(s), ${falhas} falha(s).`);
  if (falhas > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
