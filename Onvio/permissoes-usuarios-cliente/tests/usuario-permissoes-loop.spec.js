import { test, expect } from '@playwright/test';
const { extractUserData, extractDepartments, extractCompanies, extractPermissions, saveToExcel } = require('../src/utils/extractUserData');
const { listAllUsers } = require('../src/utils/listUsers');

/**
 * Teste automatizado para extrair dados de TODOS os usuários de cliente
 * 
 * Variáveis de ambiente necessárias:
 * - ONVIO_EMAIL: Email para login
 * - ONVIO_PASSWORD: Senha para login
 * - ONVIO_CLIENT_ID: ID do cliente para filtrar usuários (opcional)
 * - ONVIO_MFA_METHOD: Método de MFA preferido - 'E-mail' ou 'SMS/Telefonema' (padrão: 'E-mail')
 * - ONVIO_MFA_CODE: Código MFA para automação completa (opcional)
 */
test('Extrair dados de todos os usuários de cliente', async ({ page, context }) => {
  test.setTimeout(600000); // 10 minutos para processar múltiplos usuários
  
  // Obter credenciais das variáveis de ambiente (obrigatórias)
  const email = process.env.ONVIO_EMAIL;
  const password = process.env.ONVIO_PASSWORD;
  const clientId = process.env.ONVIO_CLIENT_ID || '467';
  const mfaMethod = process.env.ONVIO_MFA_METHOD || 'E-mail';
  const mfaCode = process.env.ONVIO_MFA_CODE;

  if (!email || !password) {
    throw new Error('ONVIO_EMAIL e ONVIO_PASSWORD são obrigatórios. Configure no arquivo .env');
  }

  // Array para armazenar dados de todos os usuários
  const allUsersData = [];

  // ========== ETAPA 1: LOGIN (OTIMIZADO) ==========
  await page.goto('https://auth.thomsonreuters.com/u/login/identifier?state=hKFo2SB2QmluYXlOb0lSVDhtdVRsa2s0dWhTOWQzWUE3V0pzdqFur3VuaXZlcnNhbC1sb2dpbqN0aWTZIEpNLVR6R21vbGVma256N2xVQUw4OGNjRGMwQ3hEWHVKo2NpZNkgR0JVcFBwT1V3QmY0cGhTdjllSXFGMnhpOExTUHNrdEs&ui_locales=pt-BR', { waitUntil: 'domcontentloaded' });
  
  // PRIMEIRO: Clicar no botão "Entrar" inicial da primeira página
  try {
    const enterBtn = page.locator('#trauth-continue-signin-btn');
    await enterBtn.waitFor({ state: 'visible', timeout: 5000 });
    await enterBtn.click();
    // Aguardar campo de email aparecer (espera dinâmica mais rápida)
    await page.getByRole('textbox', { name: 'E-mail' }).waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ Botão Entrar inicial clicado');
  } catch (error) {
    // Tentar alternativas
    try {
      await page.getByRole('button', { name: 'Entrar' }).first().click({ timeout: 3000 });
      await page.getByRole('textbox', { name: 'E-mail' }).waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ Botão Entrar inicial clicado (método alternativo)');
    } catch (error2) {
      console.warn('⚠️ Botão Entrar inicial não encontrado, continuando...');
    }
  }
  
  // Preencher email e avançar
  const emailField = page.getByRole('textbox', { name: 'E-mail' });
  await emailField.fill(email);
  
  // Usar submit ao invés de clicar no botão (mais rápido)
  await emailField.press('Enter');
  // Aguardar campo de senha aparecer (espera dinâmica)
  await page.getByRole('textbox', { name: 'Senha' }).waitFor({ state: 'visible', timeout: 5000 });
  
  // Preencher senha e avançar
  const passwordField = page.getByRole('textbox', { name: 'Senha' });
  await passwordField.fill(password);
  
  // Usar submit ao invés de clicar no botão (mais rápido)
  await passwordField.press('Enter');

  // Tratamento de MFA (otimizado)
  try {
    // Aguardar mudança de URL ou elemento MFA aparecer (timeout curto)
    await Promise.race([
      page.waitForURL(url => url.toString().includes('mfa') || url.toString().includes('login-options'), { timeout: 3000 }),
      page.waitForTimeout(3000) // Timeout máximo para verificar
    ]).catch(() => {});
    
    const currentUrl = page.url();
    const mfaPage = currentUrl.includes('mfa-login-options') || currentUrl.includes('mfa') || currentUrl.includes('mfa-login');
    
    if (mfaPage) {
      console.log('🔐 Detectada tela de MFA');
      
      // Selecionar método MFA
      try {
        if (mfaMethod === 'E-mail') {
          await page.getByRole('button', { name: /E-mail|Email/i }).click({ timeout: 3000 });
        } else {
          await page.getByRole('button', { name: /SMS|Telefonema/i }).click({ timeout: 3000 });
        }
        // Aguardar campo de código aparecer (espera dinâmica)
        await page.getByRole('textbox').first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
      } catch (e) {
        console.log('ℹ️ Método MFA pode já estar selecionado ou não disponível');
      }
      
      // Se código MFA fornecido, preencher automaticamente
      if (mfaCode) {
        try {
          const codeInput = page.getByRole('textbox').first();
          await codeInput.waitFor({ state: 'visible', timeout: 3000 });
          await codeInput.fill(mfaCode);
          await page.getByRole('button', { name: /Verificar|Confirmar|Continuar/i }).click();
          // Aguardar sair da tela MFA (espera dinâmica)
          await page.waitForURL(url => !url.toString().includes('mfa'), { timeout: 10000 });
        } catch (e) {
          console.warn('⚠️ Não foi possível preencher código MFA automaticamente');
        }
      } else {
        console.log('⏳ Aguardando inserção manual do código MFA... (máximo 2 minutos)');
        await page.waitForURL(url => !url.toString().includes('mfa'), { timeout: 120000 });
      }
    }
  } catch (e) {
    console.log('ℹ️ MFA não detectado ou já autenticado');
  }

  // Aguardar apenas o elemento essencial aparecer (Menu) em vez de networkidle
  await page.getByRole('link', { name: 'Menu' }).waitFor({ state: 'visible', timeout: 15000 });

  // ========== ETAPA 2: NAVEGAR PARA PORTAL DO CLIENTE (OTIMIZADO) ==========
  await page.getByRole('link', { name: 'Menu' }).click();
  
  // Preparar popup antes de clicar
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('link', { name: /Portal do Cliente/i }).click();
  const page1 = await page1Promise;
  // Aguardar apenas o elemento essencial aparecer (settings) em vez de networkidle
  await page1.getByTestId('settings').waitFor({ state: 'visible', timeout: 15000 });

  // Definir viewport grande para capturar todos os itens
  await page1.setViewportSize({ width: 1920, height: 1080 });
  console.log('🔍 Viewport definido para 1920x1080 para capturar todos os itens');

  // ========== ETAPA 3: ACESSAR USUÁRIOS DE CLIENTE (OTIMIZADO) ==========
  await page1.getByTestId('settings').click();
  // Aguardar settings-clients-users aparecer (espera dinâmica)
  await page1.getByTestId('settings-clients-users').waitFor({ state: 'visible', timeout: 10000 });
  await page1.getByTestId('settings-clients-users').click();
  // Aguardar campo de busca de cliente aparecer (espera dinâmica)
  await page1.locator('input[id^="client-"][id$="-input"][type="text"]').first().waitFor({ state: 'visible', timeout: 10000 });

  // ========== ETAPA 4: SELECIONAR CLIENTE E LISTAR USUÁRIOS ==========
  console.log('📋 Selecionando cliente e listando usuários...');
  
  // O cliente padrão é 467 se não fornecido
  const targetClientId = clientId || '467';
  console.log(`🔍 Buscando cliente ID: ${targetClientId}`);
  
  // Função auxiliar para selecionar o cliente com retry (OTIMIZADA)
  async function selectClient(clientId, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Tentativa ${attempt}/${maxRetries} de selecionar cliente ${clientId}...`);
        
        // Usar seletor genérico que funciona independente do ID dinâmico
        // O campo tem padrão: id="client-X-input-X-input" onde X muda
        const searchField = page1.locator('input[id^="client-"][id$="-input"][type="text"]').first();
        await searchField.waitFor({ state: 'visible', timeout: 5000 });
        
        // Limpar e preencher campo de busca
        await searchField.clear();
        await searchField.fill(clientId);
        
        // Aguardar gridcell com o ID aparecer (espera dinâmica - mais rápido que networkidle)
        const clientCell = page1.getByRole('gridcell', { name: clientId });
        await clientCell.waitFor({ state: 'visible', timeout: 5000 });
        
        // Clicar no cliente
        await clientCell.click();
        
        // Verificar se o cliente foi selecionado (aguardar grid de usuários aparecer - espera dinâmica)
        await page1.locator('.bento-icon-edit').first().waitFor({ state: 'visible', timeout: 5000 });
        
        console.log(`✅ Cliente ${clientId} selecionado com sucesso`);
        return true;
      } catch (error) {
        console.warn(`⚠️ Tentativa ${attempt} falhou: ${error.message}`);
        if (attempt < maxRetries) {
          // Pequena espera antes de tentar novamente
          await page1.waitForTimeout(1000);
          continue;
        } else {
          throw new Error(`Não foi possível selecionar cliente ${clientId} após ${maxRetries} tentativas`);
        }
      }
    }
  }
  
  // Selecionar o cliente
  await selectClient(targetClientId);
  
  // Configurar paginação da lista de usuários para 50 itens
  try {
    const paginationSelect = page1.getByRole('navigation', { name: 'Pagination' })
      .getByTestId('grid-pagination-page-selection');
    await paginationSelect.waitFor({ state: 'visible', timeout: 5000 });
    await paginationSelect.selectOption('50');
    // Aguardar grid atualizar (espera dinâmica)
    await page1.locator('.bento-icon-edit').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    console.log('✅ Paginação da lista de usuários configurada para 50 itens');
  } catch (e) {
    console.warn('⚠️ Não foi possível configurar paginação da lista de usuários, continuando...');
  }
  
  // Agora listar todos os usuários do cliente selecionado
  console.log('📋 Listando usuários do cliente selecionado...');
  const users = await listAllUsers(page1);
  
  if (users.length === 0) {
    console.warn('⚠️ Nenhum usuário encontrado para o cliente selecionado');
    return;
  }
  
  console.log(`\n🚀 Iniciando processamento de ${users.length} usuário(s) do cliente ${targetClientId}...\n`);

  // Função para voltar para a lista de usuários do cliente (OTIMIZADA) - definida antes do loop
  async function returnToUserList() {
    try {
      // Método 1: Tentar clicar em "Lista de usuários de cliente" ou "Voltar"
      const backButton = page1.getByRole('button', { name: /Lista de usuários de cliente|Voltar/i }).first();
      if (await backButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await backButton.click();
        // Aguardar campo de busca aparecer (espera dinâmica)
        await page1.locator('input[id^="client-"][id$="-input"][type="text"]').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        console.log('✅ Voltou para lista usando botão "Lista de usuários"');
        return true;
      }
    } catch (e) {
      // Continuar para próximo método
    }
    
    try {
      // Método 2: Tentar clicar em "Sair" se estiver na tela de edição
      const sairButton = page1.getByRole('button', { name: /Sair/i }).first();
      if (await sairButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sairButton.click();
        // Aguardar campo de busca aparecer (espera dinâmica)
        await page1.locator('input[id^="client-"][id$="-input"][type="text"]').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        console.log('✅ Voltou para lista usando botão "Sair"');
        return true;
      }
    } catch (e) {
      // Continuar para próximo método
    }
    
    try {
      // Método 3: Navegar diretamente para settings-clients-users
      await page1.getByTestId('settings-clients-users').waitFor({ state: 'visible', timeout: 5000 });
      await page1.getByTestId('settings-clients-users').click();
      // Aguardar campo de busca aparecer (espera dinâmica)
      await page1.locator('input[id^="client-"][id$="-input"][type="text"]').first().waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ Voltou para lista usando settings-clients-users');
      return true;
    } catch (e) {
      console.warn('⚠️ Não foi possível voltar para lista usando métodos padrão');
      return false;
    }
  }

  // ========== ETAPA 5: LOOP PARA PROCESSAR CADA USUÁRIO ==========
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📌 Processando usuário ${i + 1}/${users.length}: ${user.nome || user.email || 'ID: ' + user.id || 'Usuário ' + (i + 1)}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    try {
      // Se não for o primeiro usuário, voltar para lista e re-selecionar cliente
      if (i > 0) {
        // Voltar para a lista de usuários
        const returnedToList = await returnToUserList();
        
        // Se conseguiu voltar, re-selecionar o cliente
        if (returnedToList) {
          try {
            await selectClient(targetClientId, 3); // 3 tentativas
            // Configurar paginação da lista de usuários para 50 itens
            try {
              const paginationSelect = page1.getByRole('navigation', { name: 'Pagination' })
                .getByTestId('grid-pagination-page-selection');
              await paginationSelect.waitFor({ state: 'visible', timeout: 5000 });
              await paginationSelect.selectOption('50');
              await page1.locator('.bento-icon-edit').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
            } catch (e) {
              // Continuar sem alterar paginação
            }
            console.log('✅ Cliente re-selecionado com sucesso');
          } catch (e) {
            console.warn('⚠️ Não foi possível re-selecionar cliente, mas continuando...');
          }
        } else {
          // Se não conseguiu voltar, tentar re-selecionar mesmo assim
          console.warn('⚠️ Tentando re-selecionar cliente mesmo sem voltar para lista...');
          try {
            await selectClient(targetClientId, 2);
            // Configurar paginação da lista de usuários para 50 itens
            try {
              const paginationSelect = page1.getByRole('navigation', { name: 'Pagination' })
                .getByTestId('grid-pagination-page-selection');
              await paginationSelect.waitFor({ state: 'visible', timeout: 5000 });
              await paginationSelect.selectOption('50');
              await page1.locator('.bento-icon-edit').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
            } catch (e) {
              // Continuar sem alterar paginação
            }
          } catch (e) {
            console.warn('⚠️ Não foi possível re-selecionar cliente');
          }
        }
        
      }
      
      // Re-listar usuários para obter botões atualizados
      const currentUsers = await listAllUsers(page1);
      if (currentUsers.length === 0) {
        console.warn(`⚠️ Nenhum usuário encontrado na lista, tentando re-selecionar cliente...`);
        await selectClient(targetClientId, 3);
        // Configurar paginação da lista de usuários para 50 itens
        try {
          const paginationSelect = page1.getByRole('navigation', { name: 'Pagination' })
            .getByTestId('grid-pagination-page-selection');
          await paginationSelect.waitFor({ state: 'visible', timeout: 5000 });
          await paginationSelect.selectOption('50');
          await page1.locator('.bento-icon-edit').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        } catch (e) {
          // Continuar sem alterar paginação
        }
        const retryUsers = await listAllUsers(page1);
        if (retryUsers.length === 0) {
          console.error(`❌ Não foi possível encontrar usuários após re-selecionar cliente, pulando usuário ${i + 1}`);
          continue;
        }
      }
      
      // Encontrar o botão de editar do usuário atual na lista atualizada
      let editButton = null;
      if (i < currentUsers.length) {
        editButton = currentUsers[i].editButton;
      } else {
        // Tentar encontrar pelo índice ou nome
        const editButtons = await page1.locator('.bento-icon-edit').all();
        if (i < editButtons.length) {
          editButton = editButtons[i];
        }
      }
      
      if (!editButton) {
        // Última tentativa: buscar todos os botões de editar e usar o índice
        const allEditButtons = await page1.locator('.bento-icon-edit').all();
        if (i < allEditButtons.length) {
          editButton = allEditButtons[i];
        }
      }
      
      if (editButton) {
        await editButton.waitFor({ state: 'visible', timeout: 10000 });
        await editButton.click();
        await page1.waitForLoadState('networkidle');
        await page1.waitForLoadState('domcontentloaded');
        console.log(`✅ Botão de editar clicado para usuário ${i + 1}`);
      } else {
        console.warn(`⚠️ Não foi possível encontrar botão de editar para usuário ${i + 1}, pulando...`);
        continue;
      }
      
      // Inicializar dados do usuário
      // Passar o nome e email da lista como fallback caso não consiga extrair do formulário
      // Tentar pegar o nome e email do usuário atual da lista (pode ser 'name' ou 'nome')
      let nomeDaLista = '';
      let emailDaLista = '';
      if (users[i]) {
        nomeDaLista = users[i].name || users[i].nome || '';
        emailDaLista = users[i].email || '';
      } else if (currentUsers[i]) {
        nomeDaLista = currentUsers[i].name || currentUsers[i].nome || '';
        emailDaLista = currentUsers[i].email || '';
      }
      
      if (nomeDaLista) {
        console.log(`  📝 Nome da lista para fallback: "${nomeDaLista}"`);
      } else {
        console.warn(`  ⚠️ Nome da lista não encontrado para usuário ${i + 1}`);
      }
      
      if (emailDaLista) {
        console.log(`  📧 E-mail da lista para fallback: "${emailDaLista}"`);
      }
      
      const userData = await extractUserData(page1, null, nomeDaLista, emailDaLista);
      
      // Navegar pelas abas e extrair dados
      // ABA GERAL já foi processada em extractUserData
      
      // Avançar para ABA DEPARTAMENTOS (OTIMIZADO)
      try {
        const avancarButton = page1.getByRole('button', { name: /Avançar/i });
        await avancarButton.waitFor({ state: 'visible', timeout: 5000 });
        await avancarButton.click();
        // Aguardar grid de departamentos aparecer (espera dinâmica)
        await page1.getByTestId('gridClientDepartment').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        
        // Configurar paginação para 50 itens
        try {
          const paginationSelect = page1.getByRole('navigation', { name: 'Pagination' })
            .getByTestId('grid-pagination-page-selection');
          await paginationSelect.waitFor({ state: 'visible', timeout: 3000 });
          await paginationSelect.selectOption('50');
          // Aguardar grid atualizar (espera dinâmica)
          await page1.getByTestId('gridClientDepartment').waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
        } catch (e) {
          // Continuar sem alterar paginação
        }
        
        // Extrair departamentos
        await extractDepartments(page1, userData);
        
        // Avançar para ABA CLIENTES
        const avancarButton2 = page1.getByRole('button', { name: /Avançar/i });
        await avancarButton2.waitFor({ state: 'visible', timeout: 5000 });
        await avancarButton2.click();
        // Aguardar grid de clientes aparecer (espera dinâmica)
        await page1.getByTestId('gridClient').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        
        // Configurar paginação para 50 itens
        try {
          const paginationSelect = page1.getByRole('navigation', { name: 'Pagination' })
            .getByTestId('grid-pagination-page-selection');
          await paginationSelect.waitFor({ state: 'visible', timeout: 3000 });
          await paginationSelect.selectOption('50');
          // Aguardar grid atualizar (espera dinâmica)
          await page1.getByTestId('gridClient').waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
        } catch (e) {
          // Continuar
        }
        
        // Extrair empresas
        await extractCompanies(page1, userData);
        
        // Avançar para ABA PERMISSÕES
        const avancarButton3 = page1.getByRole('button', { name: /Avançar/i });
        await avancarButton3.waitFor({ state: 'visible', timeout: 5000 });
        await avancarButton3.click();
        // Aguardar toggles de permissões aparecerem (espera dinâmica)
        await page1.getByRole('switch').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        
        // Extrair permissões
        await extractPermissions(page1, userData);
        
        // Adicionar dados do usuário ao array
        allUsersData.push(userData);
        
        console.log(`✅ Usuário ${i + 1}/${users.length} processado com sucesso`);
        
        // Salvar planilha em tempo real após cada usuário
        try {
          const excelPath = await saveToExcel(allUsersData, 'test-results/todos-usuarios-extraidos.xlsx');
          console.log(`💾 Planilha atualizada: ${allUsersData.length} usuário(s) salvo(s) até agora`);
        } catch (error) {
          console.warn('⚠️ Erro ao salvar planilha em tempo real:', error.message);
        }
        
      } catch (error) {
        console.error(`❌ Erro ao processar usuário ${i + 1}:`, error.message);
        // Adicionar dados parciais mesmo assim
        if (userData) {
          allUsersData.push(userData);
          // Tentar salvar mesmo com dados parciais
          try {
            await saveToExcel(allUsersData, 'test-results/todos-usuarios-extraidos.xlsx');
          } catch (e) {
            console.warn('⚠️ Erro ao salvar planilha com dados parciais');
          }
        }
      }
      
      // Voltar para lista após processar o usuário (exceto no último)
      if (i < users.length - 1) {
        // Voltar para a lista de usuários (reutilizar função otimizada)
        const returnedToList = await returnToUserList();
        
        // Se conseguiu voltar, re-selecionar o cliente
        if (returnedToList) {
          try {
            await selectClient(targetClientId, 3); // 3 tentativas
            // Configurar paginação da lista de usuários para 50 itens
            try {
              const paginationSelect = page1.getByRole('navigation', { name: 'Pagination' })
                .getByTestId('grid-pagination-page-selection');
              await paginationSelect.waitFor({ state: 'visible', timeout: 5000 });
              await paginationSelect.selectOption('50');
              await page1.locator('.bento-icon-edit').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
            } catch (e) {
              // Continuar sem alterar paginação
            }
            console.log('✅ Cliente re-selecionado com sucesso após processar usuário');
          } catch (e) {
            console.warn('⚠️ Não foi possível re-selecionar cliente após processar usuário');
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Erro crítico ao processar usuário ${i + 1}:`, error.message);
      // Continuar com próximo usuário
      continue;
    }
  }

  // ========== ETAPA 6: SALVAR DADOS FINAIS EM EXCEL ==========
  // A planilha já foi atualizada em tempo real, mas vamos garantir que está salva no final
  if (allUsersData.length > 0) {
    console.log(`\n💾 Salvando dados finais de ${allUsersData.length} usuário(s) em planilha Excel...`);
    try {
      const excelPath = await saveToExcel(allUsersData, 'test-results/todos-usuarios-extraidos.xlsx');
      console.log(`✅ Dados finais de todos os usuários salvos em: ${excelPath}`);
    } catch (error) {
      console.error('❌ Erro ao salvar planilha Excel final:', error.message);
    }
  } else {
    console.warn('⚠️ Nenhum dado foi extraído para salvar');
  }

  console.log('\n✅ Processamento concluído!');
});
