/**
 * Script para executar a automação do Playwright
 * Este script é chamado pelo Electron e executa o teste de automação
 */

const { chromium } = require('@playwright/test');
const { extractUserData, extractDepartments, extractCompanies, extractPermissions, saveToExcel } = require('../utils/extractUserData');
const { listAllUsers } = require('../utils/listUsers');
const logger = require('../utils/logger');
const { getModuleConfig } = require('../config');
const { startMetrics, endMetrics, exportMetrics, generateMetricsReport } = require('../utils/metrics');
const { generateFullReport } = require('../utils/reportGenerator');
const { notifyAutomationComplete, notifyProgress, notifyCriticalError } = require('../utils/notifications');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente do arquivo .env se existir
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    }
  });
}

// Garantir que os diretórios necessários existem
const testResultsDir = automationConfig.directories?.testResults || path.join(__dirname, '../../test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

const logsDir = automationConfig.directories?.logs || path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Configurações da automação
 */
const CONFIG = {
  LOGIN_URL: 'https://auth.thomsonreuters.com/u/login/identifier?state=hKFo2SB2QmluYXlOb0lSVDhtdVRsa2s0dWhTOWQzWUE3V0pzdqFur3VuaXZlcnNhbC1sb2dpbqN0aWTZIEpNLVR6R21vbGVma256N2xVQUw4OGNjRGMwQ3hEWHVKo2NpZNkgR0JVcFBwT1V3QmY0cGhTdjllSXFGMnhpOExTUHNrdEs&ui_locales=pt-BR',
  VIEWPORT_SIZE: { width: 1920, height: 1080 },
  PAGINATION_SIZE: '50',
  TIMEOUTS: {
    SHORT: 3000,
    MEDIUM: 5000,
    LONG: 10000,
    MFA: 120000
  }
};

/**
 * Executa a automação completa
 */
async function runAutomation() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Obter credenciais das variáveis de ambiente
    const email = process.env.ONVIO_EMAIL;
    const password = process.env.ONVIO_PASSWORD;
    const clientId = process.env.ONVIO_CLIENT_ID || '467';
    const mfaMethod = process.env.ONVIO_MFA_METHOD || 'E-mail';
    const mfaCode = process.env.ONVIO_MFA_CODE;

    if (!email || !password) {
      throw new Error('E-mail e senha são obrigatórios. Configure no arquivo .env');
    }

    logger.info('Iniciando automação...', { email, clientId, mfaMethod });

    // Iniciar coleta de métricas
    startMetrics();

    const allUsersData = [];

    // ETAPA 1: LOGIN
    await performLogin(page, email, password, mfaMethod, mfaCode);

    // ETAPA 2: NAVEGAR PARA PORTAL DO CLIENTE
    const portalPage = await navigateToClientPortal(page);

    // ETAPA 3: ACESSAR USUÁRIOS DE CLIENTE
    await navigateToClientUsers(portalPage);

    // ETAPA 4: SELECIONAR CLIENTE E LISTAR USUÁRIOS
    await selectClient(portalPage, clientId);
    await configurePagination(portalPage);
    const users = await listAllUsers(portalPage);

    if (users.length === 0) {
      throw new Error('Nenhum usuário encontrado para o cliente selecionado');
    }

    logger.info(`Iniciando processamento de ${users.length} usuário(s)...`, { usersCount: users.length });

    // ETAPA 5: PROCESSAR CADA USUÁRIO
    for (let i = 0; i < users.length; i++) {
      await processUser(portalPage, users, i, clientId, allUsersData);
    }

    // ETAPA 6: SALVAR DADOS FINAIS
    await saveFinalData(allUsersData);

    logger.success('Processamento concluído!', { usersProcessed: allUsersData.length });
    
    // Finalizar métricas e exportar
    endMetrics();
    const metricsPath = exportMetrics('json');
    const report = generateMetricsReport();
    logger.info('Relatório de métricas gerado', { 
      metricsPath, 
      summary: report.summary 
    });

    // Gerar relatório completo
    try {
      const reportPaths = generateFullReport(allUsersData, {
        title: 'Relatório de Extração - ONVIO',
        includeMetrics: true,
        includeIntegrity: true,
        includeBackupStats: true,
        includeCacheStats: true
      });
      logger.success('Relatórios gerados', { 
        html: reportPaths.html, 
        text: reportPaths.text 
      });
    } catch (error) {
      logger.warn('Erro ao gerar relatórios', { error: error.message });
    }
    
    await browser.close();
    process.exit(0);
    
  } catch (error) {
    logger.error('Erro na automação', error, { function: 'runAutomation' });
    await browser.close();
    process.exit(1);
  }
}

/**
 * Realiza o login no sistema
 */
async function performLogin(page, email, password, mfaMethod, mfaCode) {
  logger.progress('ETAPA 1: Realizando login...', { step: 1 });
  
  await page.goto(CONFIG.LOGIN_URL, { waitUntil: 'domcontentloaded' });
  
  // Clicar no botão "Entrar" inicial
  try {
    const enterBtn = page.locator('#trauth-continue-signin-btn');
    await enterBtn.waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.MEDIUM });
    await enterBtn.click();
    await page.getByRole('textbox', { name: 'E-mail' }).waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.MEDIUM });
    logger.success('Botão Entrar inicial clicado', { step: 'login', method: 'primary' });
  } catch (error) {
    try {
      await page.getByRole('button', { name: 'Entrar' }).first().click({ timeout: CONFIG.TIMEOUTS.SHORT });
      await page.getByRole('textbox', { name: 'E-mail' }).waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.MEDIUM });
      logger.success('Botão Entrar inicial clicado (método alternativo)', { step: 'login', method: 'alternative' });
    } catch (error2) {
      logger.warn('Botão Entrar inicial não encontrado, continuando...', { step: 'login' });
    }
  }
  
  // Preencher email
  const emailField = page.getByRole('textbox', { name: 'E-mail' });
  await emailField.fill(email);
  await emailField.press('Enter');
  await page.getByRole('textbox', { name: 'Senha' }).waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.MEDIUM });
  logger.success('E-mail preenchido', { step: 'login' });
  
  // Preencher senha
  const passwordField = page.getByRole('textbox', { name: 'Senha' });
  await passwordField.fill(password);
  await passwordField.press('Enter');
  logger.success('Senha preenchida', { step: 'login' });

  // Tratamento de MFA
  await handleMFA(page, mfaMethod, mfaCode);

  await page.getByRole('link', { name: 'Menu' }).waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.LONG });
  logger.success('Login realizado com sucesso', { step: 'login' });
}

/**
 * Trata o processo de MFA
 */
async function handleMFA(page, mfaMethod, mfaCode) {
  try {
    await Promise.race([
      page.waitForURL(url => url.toString().includes('mfa') || url.toString().includes('login-options'), { timeout: CONFIG.TIMEOUTS.SHORT }),
      page.waitForTimeout(CONFIG.TIMEOUTS.SHORT)
    ]).catch(() => {});
    
    const currentUrl = page.url();
    const mfaPage = currentUrl.includes('mfa-login-options') || currentUrl.includes('mfa') || currentUrl.includes('mfa-login');
    
    if (mfaPage) {
      logger.info('Detectada tela de MFA', { step: 'mfa', method: mfaMethod });
      
      try {
        if (mfaMethod === 'E-mail') {
          await page.getByRole('button', { name: /E-mail|Email/i }).click({ timeout: CONFIG.TIMEOUTS.SHORT });
        } else {
          await page.getByRole('button', { name: /SMS|Telefonema/i }).click({ timeout: CONFIG.TIMEOUTS.SHORT });
        }
        await page.getByRole('textbox').first().waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.SHORT }).catch(() => {});
      } catch (e) {
        logger.info('Método MFA pode já estar selecionado ou não disponível', { step: 'mfa' });
      }
      
      if (mfaCode) {
        try {
          const codeInput = page.getByRole('textbox').first();
          await codeInput.waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.SHORT });
          await codeInput.fill(mfaCode);
          await page.getByRole('button', { name: /Verificar|Confirmar|Continuar/i }).click();
          await page.waitForURL(url => !url.toString().includes('mfa'), { timeout: CONFIG.TIMEOUTS.LONG });
          logger.success('Código MFA preenchido automaticamente', { step: 'mfa' });
        } catch (e) {
          logger.warn('Não foi possível preencher código MFA automaticamente', { step: 'mfa', error: e.message });
        }
      } else {
        logger.info('Aguardando inserção manual do código MFA... (máximo 2 minutos)', { step: 'mfa' });
        await page.waitForURL(url => !url.toString().includes('mfa'), { timeout: CONFIG.TIMEOUTS.MFA });
      }
    }
  } catch (e) {
    logger.info('MFA não detectado ou já autenticado', { step: 'mfa' });
  }
}

/**
 * Navega para o Portal do Cliente
 */
async function navigateToClientPortal(page) {
  logger.progress('ETAPA 2: Navegando para Portal do Cliente...', { step: 2 });
  
  await page.getByRole('link', { name: 'Menu' }).click();
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('link', { name: /Portal do Cliente/i }).click();
  const page1 = await page1Promise;
  await page1.getByTestId('settings').waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.LONG });
  await page1.setViewportSize(CONFIG.VIEWPORT_SIZE);
  logger.success('Portal do Cliente acessado', { step: 2 });
  return page1;
}

/**
 * Navega para a seção de usuários de cliente
 */
async function navigateToClientUsers(page) {
  logger.progress('ETAPA 3: Acessando usuários de cliente...', { step: 3 });
  
  await page.getByTestId('settings').click();
  await page.getByTestId('settings-clients-users').waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.LONG });
  await page.getByTestId('settings-clients-users').click();
  await page.locator('input[id^="client-"][id$="-input"][type="text"]').first().waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.LONG });
  logger.success('Seção de usuários de cliente acessada', { step: 3 });
}

/**
 * Seleciona um cliente
 */
async function selectClient(page, clientId, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Tentativa ${attempt}/${maxRetries} de selecionar cliente ${clientId}...`, { attempt, maxRetries, clientId });
      const searchField = page.locator('input[id^="client-"][id$="-input"][type="text"]').first();
      await searchField.waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.MEDIUM });
      await searchField.clear();
      await searchField.fill(clientId);
      const clientCell = page.getByRole('gridcell', { name: clientId });
      await clientCell.waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.MEDIUM });
      await clientCell.click();
      await page.locator('.bento-icon-edit').first().waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.MEDIUM });
      logger.success(`Cliente ${clientId} selecionado com sucesso`, { clientId, attempt });
      return true;
    } catch (error) {
      logger.warn(`Tentativa ${attempt} falhou: ${error.message}`, { attempt, maxRetries, clientId, error: error.message });
      if (attempt < maxRetries) {
        await page.waitForTimeout(1000);
        continue;
      } else {
        throw new Error(`Não foi possível selecionar cliente ${clientId} após ${maxRetries} tentativas`);
      }
    }
  }
}

/**
 * Configura a paginação
 */
async function configurePagination(page) {
  try {
    const paginationSelect = page.getByRole('navigation', { name: 'Pagination' })
      .getByTestId('grid-pagination-page-selection');
    await paginationSelect.waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.MEDIUM });
    await paginationSelect.selectOption(CONFIG.PAGINATION_SIZE);
    await page.locator('.bento-icon-edit').first().waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.MEDIUM }).catch(() => {});
    logger.success('Paginação configurada para 50 itens', { paginationSize: CONFIG.PAGINATION_SIZE });
  } catch (e) {
    logger.warn('Não foi possível configurar paginação, continuando...', { error: e.message });
  }
}

/**
 * Retorna para a lista de usuários
 */
async function returnToUserList(page) {
  try {
    const backButton = page.getByRole('button', { name: /Lista de usuários de cliente|Voltar/i }).first();
    if (await backButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backButton.click();
      await page.locator('input[id^="client-"][id$="-input"][type="text"]').first().waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.MEDIUM }).catch(() => {});
      return true;
    }
  } catch (e) {}
  
  try {
    const sairButton = page.getByRole('button', { name: /Sair/i }).first();
    if (await sairButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sairButton.click();
      await page.locator('input[id^="client-"][id$="-input"][type="text"]').first().waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.MEDIUM }).catch(() => {});
      return true;
    }
  } catch (e) {}
  
  try {
    await page.getByTestId('settings-clients-users').waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.MEDIUM });
    await page.getByTestId('settings-clients-users').click();
    await page.locator('input[id^="client-"][id$="-input"][type="text"]').first().waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.MEDIUM });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Processa um usuário individual
 */
async function processUser(page, users, index, clientId, allUsersData) {
  const user = users[index];
  
  const userIdentifier = user.nome || user.email || (user.id ? `ID: ${user.id}` : `Usuário ${index + 1}`);
  logger.info(`Processando usuário ${index + 1}/${users.length}: ${userIdentifier}`, { 
    index: index + 1, 
    total: users.length, 
    user: userIdentifier 
  });
  
  try {
    if (index > 0) {
      const returnedToList = await returnToUserList(page);
      if (returnedToList) {
        await selectClient(page, clientId, 3);
        await configurePagination(page);
      }
    }
    
    const currentUsers = await listAllUsers(page);
    if (currentUsers.length === 0) {
      await selectClient(page, clientId, 3);
      await configurePagination(page);
      const retryUsers = await listAllUsers(page);
      if (retryUsers.length === 0) {
        logger.error(`Não foi possível encontrar usuários, pulando usuário ${index + 1}`, null, { 
          index: index + 1, 
          function: 'processUser' 
        });
        return;
      }
    }
    
    let editButton = null;
    if (index < currentUsers.length) {
      editButton = currentUsers[index].editButton;
    } else {
      const editButtons = await page.locator('.bento-icon-edit').all();
      if (index < editButtons.length) {
        editButton = editButtons[index];
      }
    }
    
    if (!editButton) {
      const allEditButtons = await page.locator('.bento-icon-edit').all();
      if (index < allEditButtons.length) {
        editButton = allEditButtons[index];
      }
    }
    
    if (editButton) {
      await editButton.waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.LONG });
      await editButton.click();
      await page.waitForLoadState('networkidle');
      await page.waitForLoadState('domcontentloaded');
      logger.success(`Botão de editar clicado para usuário ${index + 1}`, { index: index + 1 });
    } else {
      logger.warn(`Não foi possível encontrar botão de editar para usuário ${index + 1}, pulando...`, { index: index + 1 });
      return;
    }
    
    let nomeDaLista = '';
    let emailDaLista = '';
    if (users[index]) {
      nomeDaLista = users[index].name || users[index].nome || '';
      emailDaLista = users[index].email || '';
    } else if (currentUsers[index]) {
      nomeDaLista = currentUsers[index].name || currentUsers[index].nome || '';
      emailDaLista = currentUsers[index].email || '';
    }
    
    const userData = await extractUserData(page, null, nomeDaLista, emailDaLista);
    
    // Navegar pelas abas
    try {
      await navigateThroughTabs(page, userData);
      allUsersData.push(userData);
      logger.success(`Usuário ${index + 1}/${users.length} processado com sucesso`, { 
        index: index + 1, 
        total: users.length 
      });
      
      // Notificar progresso
      notifyProgress(index + 1, users.length);
      
      // Salvar em tempo real
      try {
        await saveToExcel(allUsersData, path.join(testResultsDir, 'todos-usuarios-extraidos.xlsx'));
        logger.info(`Planilha atualizada: ${allUsersData.length} usuário(s) salvo(s)`, { 
          savedCount: allUsersData.length 
        });
      } catch (error) {
        logger.warn('Erro ao salvar planilha em tempo real', { error: error.message });
      }
      
    } catch (error) {
      logger.error(`Erro ao processar usuário ${index + 1}`, error, { 
        index: index + 1, 
        function: 'processUser' 
      });
      if (userData) {
        allUsersData.push(userData);
        try {
          await saveToExcel(allUsersData, path.join(testResultsDir, 'todos-usuarios-extraidos.xlsx'));
        } catch (e) {}
      }
    }
    
    if (index < users.length - 1) {
      const returnedToList = await returnToUserList(page);
      if (returnedToList) {
        await selectClient(page, clientId, 3);
        await configurePagination(page);
      }
    }
    
  } catch (error) {
    logger.error(`Erro crítico ao processar usuário ${index + 1}`, error, { 
      index: index + 1, 
      function: 'processUser', 
      severity: 'critical' 
    });
    
    // Notificar erro crítico se for realmente crítico
    if (error.message && (error.message.includes('authentication') || error.message.includes('login'))) {
      notifyCriticalError(error, { function: 'processUser', index: index + 1 });
    }
  }
}

/**
 * Navega pelas abas do formulário de usuário
 */
async function navigateThroughTabs(page, userData) {
  // Aba Departamentos
  const avancarButton = page.getByRole('button', { name: /Avançar/i });
  await avancarButton.waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.MEDIUM });
  await avancarButton.click();
  await page.getByTestId('gridClientDepartment').waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.MEDIUM }).catch(() => {});
  
  await configurePagination(page);
  await extractDepartments(page, userData);
  
  // Aba Clientes
  const avancarButton2 = page.getByRole('button', { name: /Avançar/i });
  await avancarButton2.waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.MEDIUM });
  await avancarButton2.click();
  await page.getByTestId('gridClient').waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.MEDIUM }).catch(() => {});
  
  await configurePagination(page);
  await extractCompanies(page, userData);
  
  // Aba Permissões
  const avancarButton3 = page.getByRole('button', { name: /Avançar/i });
  await avancarButton3.waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.MEDIUM });
  await avancarButton3.click();
  await page.getByRole('switch').first().waitFor({ state: 'visible', timeout: CONFIG.TIMEOUTS.MEDIUM }).catch(() => {});
  
  await extractPermissions(page, userData);
}

/**
 * Salva os dados finais
 */
async function saveFinalData(allUsersData) {
  if (allUsersData.length > 0) {
    logger.progress(`Salvando dados finais de ${allUsersData.length} usuário(s)...`, { 
      usersCount: allUsersData.length 
    });
    try {
      const excelPath = await saveToExcel(allUsersData, path.join(testResultsDir, 'todos-usuarios-extraidos.xlsx'));
      logger.success(`Dados finais salvos em: ${excelPath}`, { path: excelPath, usersCount: allUsersData.length });
    } catch (error) {
      logger.error('Erro ao salvar planilha Excel final', error, { function: 'saveFinalData' });
    }
  } else {
    logger.warn('Nenhum dado foi extraído para salvar', { function: 'saveFinalData' });
  }
}

// Executar automação
runAutomation().catch(error => {
  logger.error('Erro fatal', error, { function: 'runAutomation', severity: 'fatal' });
  process.exit(1);
});
