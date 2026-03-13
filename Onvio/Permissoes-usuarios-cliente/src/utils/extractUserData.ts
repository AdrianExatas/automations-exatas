import * as XLSX from 'xlsx';
import { Page, Locator } from '@playwright/test';
import { logger } from './logger';
import { getModuleConfig } from '../config';
import { getOrderedSelectors, setCached, getCached } from './selectorCache';
import { getFieldStrategies } from './selectorConfig';
import { startFieldExtraction, endFieldExtraction, recordFunctionExtraction, recordError, recordCacheHit, recordCacheMiss } from './metrics';
import { withBackup } from './backup';
import { validateBeforeSave } from './dataIntegrity';
import { t } from '../i18n';
import { UserData, SelectorStrategy, TimeoutConfig, RetryConfig } from '../types';

// ========== CONSTANTES ==========
const moduleConfig = getModuleConfig('extractUserData');
const TIMEOUTS: TimeoutConfig = (moduleConfig.timeouts as TimeoutConfig) || {
  SHORT: 1000,
  MEDIUM: 2000,
  LONG: 10000
};

const DEFAULT_USER_DATA: UserData = {
  nome: '',
  cpf: '',
  telefone: '',
  emailContato: '',
  emailLogin: '',
  situacao: 'Ativo',
  departamentos: [],
  acessoPastas: [],
  empresas: [],
  permissoes: []
};

const PERMISSION_KEYWORDS: string[] = [
  'Manifestação',
  'Visualiza',
  'Portal do Cliente',
  'solicitações'
];

// Configuração de retry
const RETRY_CONFIG: RetryConfig = (moduleConfig.retry as RetryConfig) || {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 500,
  BACKOFF_MULTIPLIER: 2
};

// ========== FUNÇÕES AUXILIARES ==========

/**
 * Tenta encontrar um campo de input usando múltiplas estratégias com retry
 */
async function findFieldValue(
  page: Page,
  strategies: SelectorStrategy[],
  timeout: number = TIMEOUTS.MEDIUM,
  maxRetries: number = RETRY_CONFIG.MAX_RETRIES,
  fieldName: string = 'unknown'
): Promise<string> {
  // Ordenar estratégias por prioridade do cache
  const orderedStrategies = getOrderedSelectors(fieldName, strategies);
  
  // Verificar se temos cache hit
  const firstSelector = strategies[0]?.selector;
  const selectorKey = typeof firstSelector === 'string' ? firstSelector : 'function';
  const cached = getCached(fieldName, selectorKey);
  if (cached && cached.success) {
    recordCacheHit();
  } else {
    recordCacheMiss();
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const strategy of orderedStrategies) {
      try {
        const locator = typeof strategy.selector === 'function' 
          ? strategy.selector(page) 
          : page.locator(strategy.selector).first();
        
        if (await locator.isVisible({ timeout }).catch(() => false)) {
          const value = await locator.inputValue();
          if (value && value.trim()) {
            const trimmedValue = value.trim();
            // Registrar sucesso no cache
            const selectorKey = typeof strategy.selector === 'string' ? strategy.selector : 'function';
            setCached(fieldName, selectorKey, true, { description: strategy.description });
            recordCacheHit();
            return trimmedValue;
          }
        }
        // Registrar falha no cache
        const selectorKey = typeof strategy.selector === 'string' ? strategy.selector : 'function';
        setCached(fieldName, selectorKey, false, { description: strategy.description });
        recordCacheMiss();
      } catch (e: any) {
        // Registrar falha no cache
        const selectorKey = typeof strategy.selector === 'string' ? strategy.selector : 'function';
        setCached(fieldName, selectorKey, false, { description: strategy.description, error: e?.message || 'Unknown error' });
        recordCacheMiss();
        // Continuar para próxima estratégia
        continue;
      }
    }
    
    // Se não encontrou e ainda há tentativas, aguardar antes de tentar novamente
    if (attempt < maxRetries) {
      const delay = RETRY_CONFIG.INITIAL_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt - 1);
      await page.waitForTimeout(delay).catch(() => {});
    }
  }
  return '';
}

/**
 * Busca campo por label e retorna o input associado
 */
async function findFieldByLabel(page: Page, labelText: RegExp | string): Promise<string> {
  try {
    const labels = await page.locator('label, text')
      .filter({ hasText: typeof labelText === 'string' ? new RegExp(labelText, 'i') : labelText })
      .all();
    
    for (const label of labels) {
      if (await label.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
        const input = label.locator('..').locator('input[type="text"], input[type="email"]').first();
        if (await input.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
          const value = await input.inputValue();
          if (value && value.trim()) {
            return value.trim();
          }
        }
      }
    }
  } catch (e) {
    // Retornar vazio em caso de erro
  }
  return '';
}

/**
 * Valida e limpa um valor de campo
 */
function sanitizeValue(value: any): string {
  if (!value || typeof value !== 'string') return '';
  return value.trim();
}

/**
 * Valida formato de CPF
 */
function validateCPF(cpf: string | null | undefined): boolean {
  if (!cpf) return false;
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Deve ter 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verificar se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validar dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCPF.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
}

/**
 * Valida formato de e-mail
 */
function validateEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Valida formato de telefone
 */
function validatePhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const cleanPhone = phone.replace(/\D/g, '');
  // Aceita telefones com 10 ou 11 dígitos (fixo ou celular)
  return cleanPhone.length >= 10 && cleanPhone.length <= 11;
}

/**
 * Formata CPF para exibição (XXX.XXX.XXX-XX)
 */
function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return '';
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) return cpf;
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata telefone para exibição
 */
function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

/**
 * Cria objeto de dados do usuário inicializado
 */
function createUserDataObject(existingData: UserData | null = null): UserData {
  const userData: UserData = existingData ? { ...existingData } : { ...DEFAULT_USER_DATA };
  
  // Garantir que todas as propriedades existam
  Object.keys(DEFAULT_USER_DATA).forEach(key => {
    const typedKey = key as keyof UserData;
    if (!(typedKey in userData)) {
      (userData as any)[typedKey] = Array.isArray(DEFAULT_USER_DATA[typedKey]) 
        ? [] 
        : DEFAULT_USER_DATA[typedKey];
    }
  });
  
  return userData;
}

// ========== FUNÇÕES DE EXTRAÇÃO DE CAMPOS ESPECÍFICOS ==========

/**
 * Extrai o nome do usuário
 */
async function extractNome(page: Page, userData: UserData, nomeFallback: string): Promise<void> {
  const startTime = Date.now();
  startFieldExtraction('nome');
  
  try {
    // Usar configuração externa de seletores se disponível
    const strategies = getFieldStrategies('nome') || [
      { selector: 'input[formcontrolname="name"]', description: 'formcontrolname' },
      { 
        selector: (p: Page) => p.getByTestId('name').first(),
        description: 'data-testid (primeiro input)'
      },
      { selector: '#name[type="text"]', description: 'id' }
    ];
    
    userData.nome = await findFieldValue(page, strategies, TIMEOUTS.MEDIUM, RETRY_CONFIG.MAX_RETRIES, 'nome') ||
                    await findFieldByLabel(page, /^Nome\s*\*/i) ||
                    sanitizeValue(nomeFallback) ||
                    userData.nome;
    
    const success = !!userData.nome;
    endFieldExtraction('nome', success);
    
    if (userData.nome) {
      logger.success(`${t('field.nome')} capturado: ${userData.nome}`, { field: 'nome' });
    }
    
    recordFunctionExtraction('extractNome', Date.now() - startTime, success);
  } catch (error: any) {
    endFieldExtraction('nome', false);
    recordError(error, 'extractNome', 'extraction');
    throw error;
  }
}

/**
 * Extrai o CPF do usuário com validação
 */
async function extractCPF(page: Page, userData: UserData): Promise<void> {
  // Usar configuração externa de seletores se disponível
  const strategies = getFieldStrategies('cpf') || [
    { selector: (p: Page) => p.getByTestId('cpf').first(), description: 'data-testid' },
    { selector: 'input[formcontrolname*="cpf" i], input[id*="cpf" i]', description: 'formcontrolname/id' }
  ];
  
  const rawCPF = await findFieldValue(page, strategies, TIMEOUTS.MEDIUM, RETRY_CONFIG.MAX_RETRIES, 'cpf');
  
  if (rawCPF) {
    // Validar CPF
    if (validateCPF(rawCPF)) {
      userData.cpf = formatCPF(rawCPF);
      logger.success(`CPF capturado e validado: ${userData.cpf}`, { field: 'cpf' });
    } else {
      userData.cpf = rawCPF; // Manter valor mesmo se inválido, mas avisar
      logger.warn(`CPF capturado mas formato inválido: ${rawCPF}`, { field: 'cpf', value: rawCPF });
    }
  }
}

/**
 * Extrai o telefone do usuário com validação
 */
async function extractTelefone(page: Page, userData: UserData): Promise<void> {
  // Usar configuração externa de seletores se disponível
  const strategies = getFieldStrategies('telefone') || [
    { selector: (p: Page) => p.getByTestId('phone').first(), description: 'data-testid' },
    { 
      selector: 'input[formcontrolname*="phone" i], input[id*="phone" i], input[formcontrolname*="telefone" i]',
      description: 'formcontrolname/id'
    }
  ];
  
  const rawTelefone = await findFieldValue(page, strategies, TIMEOUTS.MEDIUM, RETRY_CONFIG.MAX_RETRIES, 'telefone');
  
  if (rawTelefone) {
    // Validar telefone
    if (validatePhone(rawTelefone)) {
      userData.telefone = formatPhone(rawTelefone);
      logger.success(`Telefone capturado e validado: ${userData.telefone}`, { field: 'telefone' });
    } else {
      userData.telefone = rawTelefone; // Manter valor mesmo se inválido
      logger.warn(`Telefone capturado mas formato pode estar inválido: ${rawTelefone}`, { field: 'telefone', value: rawTelefone });
    }
  }
}

/**
 * Extrai o e-mail de contato com validação
 */
async function extractEmailContato(page: Page, userData: UserData, emailFallback: string): Promise<void> {
  // Buscar por formcontrolname que contenha "email" mas não "login"
  try {
    const emailFields = await page.locator('input[formcontrolname*="email" i], input[formcontrolname*="contact" i]').all();
    for (const field of emailFields) {
      const formControlName = await field.getAttribute('formcontrolname').catch(() => '');
      if (formControlName && !formControlName.toLowerCase().includes('login')) {
        if (await field.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false)) {
          const rawEmail = sanitizeValue(await field.inputValue());
          if (rawEmail) {
            if (validateEmail(rawEmail)) {
              userData.emailContato = rawEmail;
              logger.success(`E-mail de contato capturado e validado: ${userData.emailContato}`, { field: 'emailContato' });
            } else {
              userData.emailContato = rawEmail; // Manter mesmo se inválido
              logger.warn(`E-mail de contato capturado mas formato inválido: ${rawEmail}`, { field: 'emailContato', value: rawEmail });
            }
            return;
          }
        }
      }
    }
  } catch (e) {
    // Continuar para outros métodos
  }
  
  // Tentar por label
  const labelEmail = await findFieldByLabel(page, /E-mail de contato/i);
  if (labelEmail) {
    userData.emailContato = labelEmail;
  }
  
  // Tentar por role
  if (!userData.emailContato) {
    try {
      const field = page.getByRole('textbox', { name: /E-mail de contato/i }).first();
      if (await field.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false)) {
        userData.emailContato = sanitizeValue(await field.inputValue());
      }
    } catch (e) {
      // Ignorar erro
    }
  }
  
  // Usar fallback se ainda estiver vazio
  if (!userData.emailContato && emailFallback) {
    const fallbackEmail = sanitizeValue(emailFallback);
    if (fallbackEmail) {
      if (validateEmail(fallbackEmail)) {
        userData.emailContato = fallbackEmail;
        logger.success(`E-mail de contato aplicado do fallback e validado: ${userData.emailContato}`, { field: 'emailContato', source: 'fallback' });
      } else {
        userData.emailContato = fallbackEmail;
        logger.warn(`E-mail de contato do fallback com formato inválido: ${fallbackEmail}`, { field: 'emailContato', value: fallbackEmail, source: 'fallback' });
      }
    }
  }
}

/**
 * Extrai o e-mail de login com validação
 */
async function extractEmailLogin(page: Page, userData: UserData): Promise<void> {
  // Usar configuração externa de seletores se disponível
  const strategies = getFieldStrategies('emailLogin') || [
    { selector: 'input[formcontrolname*="login" i]', description: 'formcontrolname' }
  ];
  
  userData.emailLogin = await findFieldValue(page, strategies, TIMEOUTS.MEDIUM, RETRY_CONFIG.MAX_RETRIES, 'emailLogin') ||
                        await findFieldByLabel(page, /E-mail de login/i) ||
                        userData.emailLogin;
  
  if (!userData.emailLogin) {
    try {
      const field = page.getByRole('textbox', { name: /E-mail de login/i }).first();
      if (await field.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false)) {
        const rawEmail = sanitizeValue(await field.inputValue());
        if (rawEmail) {
          if (validateEmail(rawEmail)) {
            userData.emailLogin = rawEmail;
            logger.success(`E-mail de login capturado e validado: ${userData.emailLogin}`, { field: 'emailLogin' });
          } else {
            userData.emailLogin = rawEmail;
            logger.warn(`E-mail de login capturado mas formato inválido: ${rawEmail}`, { field: 'emailLogin', value: rawEmail });
          }
        }
      }
    } catch (e) {
      // Ignorar erro
    }
  }
  
  if (userData.emailLogin && !validateEmail(userData.emailLogin)) {
    logger.warn(`E-mail de login pode estar inválido: ${userData.emailLogin}`, { field: 'emailLogin', value: userData.emailLogin });
  }
}

/**
 * Extrai a situação (Ativo/Inativo)
 */
async function extractSituacao(page: Page, userData: UserData): Promise<void> {
  try {
    const inativarRadio = page.getByRole('radio', { name: /Inativar/i }).first();
    const ativarRadio = page.getByRole('radio', { name: /Ativar/i }).first();
    
    if (await inativarRadio.isChecked({ timeout: TIMEOUTS.MEDIUM }).catch(() => false)) {
      userData.situacao = 'Inativo';
    } else if (await ativarRadio.isChecked({ timeout: TIMEOUTS.MEDIUM }).catch(() => false)) {
      userData.situacao = 'Ativo';
    }
  } catch (e) {
    logger.warn('Radio de situação não encontrado, usando padrão Ativo', { field: 'situacao', default: 'Ativo' });
  }
}

// ========== FUNÇÃO PRINCIPAL DE EXTRAÇÃO ==========

/**
 * Extrai informações do usuário de cliente da página atual
 */
export async function extractUserData(
  page: Page,
  userData: UserData | null = null,
  nomeFallback: string = '',
  emailFallback: string = ''
): Promise<UserData> {
  const startTime = Date.now();
  const finalUserData = createUserDataObject(userData);
  
  // Aplicar fallbacks iniciais se não houver valor
  if (nomeFallback && !finalUserData.nome) {
    finalUserData.nome = sanitizeValue(nomeFallback);
  }
  if (emailFallback && !finalUserData.emailContato && !finalUserData.emailLogin) {
    finalUserData.emailContato = sanitizeValue(emailFallback);
  }

  try {
    logger.progress('Extraindo dados da aba Geral...');
    
    await extractNome(page, finalUserData, nomeFallback);
    await extractCPF(page, finalUserData);
    await extractTelefone(page, finalUserData);
    await extractEmailContato(page, finalUserData, emailFallback);
    await extractEmailLogin(page, finalUserData);
    await extractSituacao(page, finalUserData);
    
    recordFunctionExtraction('extractUserData', Date.now() - startTime, true);
    
    // Garantir fallbacks finais
    if (!finalUserData.nome && nomeFallback) {
      finalUserData.nome = sanitizeValue(nomeFallback);
      logger.success(`Nome aplicado do fallback: ${finalUserData.nome}`, { field: 'nome', source: 'fallback' });
    }
    if (!finalUserData.emailContato && emailFallback) {
      finalUserData.emailContato = sanitizeValue(emailFallback);
      logger.success(`E-mail aplicado do fallback: ${finalUserData.emailContato}`, { field: 'emailContato', source: 'fallback' });
    }
    
    logger.success('Dados básicos extraídos', {
      nome: finalUserData.nome || '(vazio)',
      email: finalUserData.emailContato || finalUserData.emailLogin || '(vazio)',
      situacao: finalUserData.situacao
    });
    
    // Validar dados obrigatórios
    const validation = validateRequiredFields(finalUserData);
    if (!validation.isValid) {
      logger.warn('Avisos de validação', { errors: validation.errors });
    }

  } catch (error: any) {
    recordFunctionExtraction('extractUserData', Date.now() - startTime, false);
    recordError(error, 'extractUserData', 'extraction');
    logger.error('Erro ao extrair dados da aba Geral', error, { function: 'extractUserData' });
  }

  return finalUserData;
}

/**
 * Valida se os dados obrigatórios foram extraídos
 */
function validateRequiredFields(userData: UserData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!userData.nome || !userData.nome.trim()) {
    errors.push('Nome é obrigatório');
  }
  
  if (!userData.emailContato && !userData.emailLogin) {
    errors.push('Pelo menos um e-mail (contato ou login) é obrigatório');
  }
  
  // Validar formatos se os campos existirem
  if (userData.cpf && !validateCPF(userData.cpf)) {
    errors.push('CPF está em formato inválido');
  }
  
  if (userData.emailContato && !validateEmail(userData.emailContato)) {
    errors.push('E-mail de contato está em formato inválido');
  }
  
  if (userData.emailLogin && !validateEmail(userData.emailLogin)) {
    errors.push('E-mail de login está em formato inválido');
  }
  
  if (userData.telefone && !validatePhone(userData.telefone)) {
    errors.push('Telefone está em formato inválido');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Extrai departamentos habilitados da aba Departamentos
 */
export async function extractDepartments(page: Page, userData: UserData): Promise<void> {
  try {
    logger.progress('Extraindo departamentos e acessos às pastas...');
    
    const gridElement = page.getByTestId('gridClientDepartment');
    await gridElement.waitFor({ state: 'visible', timeout: TIMEOUTS.LONG });

    const rows = await gridElement.getByRole('row').all();
    
    for (const row of rows) {
      try {
        // Pular cabeçalho
        const header = await row.locator('[role="columnheader"]').count();
        if (header > 0) continue;
        
        const switchElement = row.getByRole('switch').first();
        const isChecked = await switchElement.isChecked({ timeout: TIMEOUTS.SHORT }).catch(() => false);
        
        const cells = await row.getByRole('gridcell').all();
        
        if (cells.length >= 3) {
          const code = sanitizeValue(await cells[1].textContent().catch(() => ''));
          const name = sanitizeValue(await cells[2].textContent().catch(() => ''));
          
          const temFlagSistema = await row.locator('.default-badge')
            .filter({ hasText: /Departamento do Sistema/i })
            .count()
            .catch(() => 0) > 0;
          
          if (code || name) {
            const departamento = {
              codigo: code,
              nome: name,
              nivel: 'Revisor', // Padrão
              habilitado: isChecked
            };
            
            // Determinar se é departamento ou acesso à pasta
            if (temFlagSistema) {
              userData.acessoPastas.push(departamento);
              logger.success(`Acesso à pasta: ${code} - ${name} [${isChecked ? 'Habilitado' : 'Desabilitado'}]`, { 
                type: 'acessoPasta', 
                codigo: code, 
                nome: name, 
                habilitado: isChecked 
              });
            } else {
              // Verificar se código está todo em maiúsculas
              const codigoSemEspacos = code.replace(/\s/g, '');
              const temMinusculas = /[a-z]/.test(codigoSemEspacos);
              
              if (!temMinusculas && codigoSemEspacos.length > 0) {
                // Todo em maiúsculas = Departamento
                if (isChecked) {
                  userData.departamentos.push(departamento);
                  logger.success(`Departamento: ${code} - ${name}`, { type: 'departamento', codigo: code, nome: name });
                }
              } else {
                // Tem minúsculas = Acesso às pastas
                userData.acessoPastas.push(departamento);
                logger.success(`Acesso à pasta: ${code} - ${name} [${isChecked ? 'Habilitado' : 'Desabilitado'}]`, { 
                  type: 'acessoPasta', 
                  codigo: code, 
                  nome: name, 
                  habilitado: isChecked 
                });
              }
            }
          }
        }
      } catch (e) {
        continue;
      }
    }

    logger.success(`${userData.departamentos.length} departamento(s) encontrado(s)`, { 
      count: userData.departamentos.length, 
      type: 'departamentos' 
    });
    logger.success(`${userData.acessoPastas.length} acesso(s) à(s) pasta(s) encontrado(s)`, { 
      count: userData.acessoPastas.length, 
      type: 'acessoPastas' 
    });

  } catch (error: any) {
    logger.error('Erro ao extrair departamentos', error, { function: 'extractDepartments' });
  }
}

/**
 * Extrai empresas e inscrições da aba Clientes
 */
export async function extractCompanies(page: Page, userData: UserData): Promise<void> {
  try {
    logger.progress('Extraindo empresas e inscrições...');
    
    const grid = page.getByRole('grid')
      .filter({ hasText: /Código|Empresa|Inscrição/i })
      .first();
    await grid.waitFor({ state: 'visible', timeout: TIMEOUTS.LONG });

    const rows = await grid.getByRole('row').all();
    
    for (const row of rows) {
      try {
        // Pular cabeçalho
        const header = await row.locator('[role="columnheader"]').count();
        if (header > 0) continue;
        
        const switchElement = row.getByRole('switch').first();
        const isChecked = await switchElement.isChecked({ timeout: TIMEOUTS.SHORT }).catch(() => false);
        
        if (isChecked) {
          let cells = await row.getByRole('gridcell').all();
          
          // Fallback: tentar método alternativo se não encontrar células
          if (cells.length === 0) {
            cells = await row.locator('td, [role="gridcell"]').all();
          }
          
          if (cells.length >= 4) {
            const code = sanitizeValue(await cells[1]?.textContent().catch(() => '') || '');
            const company = sanitizeValue(await cells[2]?.textContent().catch(() => '') || '');
            const inscricao = sanitizeValue(await cells[3]?.textContent().catch(() => '') || '');
            const situacao = cells.length >= 5 
              ? sanitizeValue(await cells[4]?.textContent().catch(() => 'Ativo') || 'Ativo')
              : 'Ativo';
            
            if (company || code) {
              userData.empresas.push({
                codigo: code,
                empresa: company,
                inscricao: inscricao,
                situacao: situacao
              });
              
              if (company && inscricao) {
                logger.success(`Empresa: "${company}" | Inscrição: "${inscricao}"`, { 
                  type: 'empresa', 
                  empresa: company, 
                  inscricao: inscricao, 
                  codigo: code 
                });
              } else if (company) {
                logger.success(`Empresa: "${company}" (sem inscrição)`, { type: 'empresa', empresa: company, codigo: code });
              } else if (code) {
                logger.success(`Código: "${code}"`, { type: 'empresa', codigo: code });
              }
            }
          }
        }
      } catch (e) {
        continue;
      }
    }

    logger.success(`${userData.empresas.length} empresa(s) encontrada(s)`, { 
      count: userData.empresas.length, 
      type: 'empresas' 
    });

  } catch (error: any) {
    logger.error('Erro ao extrair empresas', error, { function: 'extractCompanies' });
  }
}

/**
 * Extrai permissões da aba Permissões
 */
export async function extractPermissions(page: Page, userData: UserData): Promise<void> {
  try {
    logger.progress('Extraindo permissões...');
    
    // Lista de permissões conhecidas por data-testid
    const knownPermissions = [
      { testId: 'toggle-enable-nfe-processing', name: 'Habilitar a Manifestação de NF-e' },
      { testId: 'toggle-view-service-request', name: 'Visualiza solicitações de serviços de outros usuários' }
    ];
    
    // Método 1: Buscar por data-testid conhecidos
    for (const permission of knownPermissions) {
      try {
        const toggleElement = page.getByTestId(permission.testId).first();
        if (await toggleElement.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false)) {
          const ariaChecked = await toggleElement.getAttribute('aria-checked').catch(() => null);
          const isChecked = ariaChecked === 'true' || 
                          await toggleElement.isChecked({ timeout: 500 }).catch(() => false);
          
          let permissionText = permission.name;
          
          // Tentar extrair texto do container
          try {
            const container = toggleElement.locator('..').locator('..');
            const text = sanitizeValue(await container.textContent().catch(() => ''));
            if (text && PERMISSION_KEYWORDS.some(keyword => text.includes(keyword))) {
              permissionText = text.replace(/\s+/g, ' ').trim();
            }
          } catch (e) {
            // Usar nome padrão
          }
          
          const permissionEntry = isChecked ? permissionText : `${permissionText} (Inativo)`;
          if (!userData.permissoes.includes(permissionEntry)) {
            userData.permissoes.push(permissionEntry);
            logger.success(`Permissão: ${permissionText} - ${isChecked ? 'Ativo' : 'Inativo'}`, { 
              type: 'permissao', 
              nome: permissionText, 
              ativo: isChecked 
            });
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    // Método 2: Buscar por switches genéricos
    try {
      const switches = await page.getByRole('switch').all();
      
      for (const switchElement of switches) {
        try {
          const ariaChecked = await switchElement.getAttribute('aria-checked').catch(() => null);
          const isChecked = await switchElement.isChecked({ timeout: 500 }).catch(() => false);
          const checked = ariaChecked === 'true' || isChecked;
          
          const container = switchElement.locator('..').locator('..');
          const text = sanitizeValue(await container.textContent().catch(() => ''));
          
          if (text && PERMISSION_KEYWORDS.some(keyword => text.includes(keyword))) {
            const cleanText = text.replace(/\s+/g, ' ').trim();
            const alreadyAdded = userData.permissoes.some(p => p.includes(cleanText));
            
            if (cleanText && !alreadyAdded) {
              const permissionEntry = checked ? cleanText : `${cleanText} (Inativo)`;
              userData.permissoes.push(permissionEntry);
              logger.success(`Permissão: ${cleanText} - ${checked ? 'Ativo' : 'Inativo'}`, { 
                type: 'permissao', 
                nome: cleanText, 
                ativo: checked 
              });
            }
          }
        } catch (e) {
          continue;
        }
      }
    } catch (e: any) {
      logger.warn('Erro ao buscar switches', { error: (e as Error).message, function: 'extractPermissions' });
    }

    logger.success(`${userData.permissoes.length} permissão(ões) encontrada(s)`, { 
      count: userData.permissoes.length, 
      type: 'permissoes' 
    });

  } catch (error: any) {
    logger.error('Erro ao extrair permissões', error, { function: 'extractPermissions' });
  }
}

/**
 * Salva os dados extraídos em uma planilha Excel
 */
export async function saveToExcel(
  userData: UserData | UserData[],
  outputPath: string = 'test-results/usuarios-extraidos.xlsx'
): Promise<string> {
  const usersArray = Array.isArray(userData) ? userData : [userData];
  
  // Validar integridade antes de salvar
  const integrityCheck = validateBeforeSave(usersArray);
  if (!integrityCheck.canSave) {
    logger.warn('Muitos problemas de integridade detectados', {
      invalid: integrityCheck.validation.invalid,
      total: integrityCheck.validation.total
    });
  }

  // Usar withBackup para criar backup automático
  return withBackup(async (filePath: string) => {
    try {
      logger.progress('Salvando dados em planilha Excel...');

      const worksheetData: any[][] = [];

      // Cabeçalho
      worksheetData.push([
        'Nome',
        'CPF',
        'Telefone',
        'E-mail de Contato',
        'E-mail de Login',
        'Situação',
        'Departamentos Habilitados',
        'Acesso às pastas',
        'Empresas',
        'Inscrições',
        'Permissões'
      ]);

      // Dados
      for (const user of usersArray) {
        const departamentosStr = user.departamentos
          .filter(d => d.habilitado === true)
          .map(d => `${d.codigo} - ${d.nome}`)
          .join('; ');

        const acessoPastasStr = (user.acessoPastas || [])
          .filter(d => d.habilitado === true)
          .map(d => {
            const nomeLimpo = (d.nome || '').replace(/\s*Departamento do Sistema\s*/gi, '').trim();
            return `${d.codigo} - ${nomeLimpo}`;
          })
          .filter(s => s && s.trim())
          .join('; ');

        const empresasStr = user.empresas
          .map(e => {
            if (e.empresa && e.inscricao) {
              return `${e.empresa} (${e.inscricao})`;
            } else if (e.empresa) {
              return e.empresa;
            } else if (e.inscricao) {
              return `Inscrição: ${e.inscricao}`;
            }
            return '';
          })
          .filter(e => e)
          .join('; ');

        const inscricoesStr = user.empresas
          .map(e => e.inscricao || '')
          .filter(i => i)
          .join('; ');

        const permissoesAtivas = user.permissoes.filter(p => {
          const pLower = p.toLowerCase();
          return !pLower.includes('inativo') && 
                 !pLower.includes('desativado') && 
                 !pLower.includes('desabilitado');
        });
        const permissoesStr = permissoesAtivas.join('; ');

        worksheetData.push([
          user.nome || '',
          user.cpf || '',
          user.telefone || '',
          user.emailContato || '',
          user.emailLogin || '',
          user.situacao || 'Ativo',
          departamentosStr,
          acessoPastasStr,
          empresasStr,
          inscricoesStr,
          permissoesStr
        ]);
      }

      // Criar workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);

      // Ajustar largura das colunas
      ws['!cols'] = [
        { wch: 30 }, // Nome
        { wch: 15 }, // CPF
        { wch: 15 }, // Telefone
        { wch: 30 }, // E-mail de Contato
        { wch: 30 }, // E-mail de Login
        { wch: 10 }, // Situação
        { wch: 50 }, // Departamentos Habilitados
        { wch: 50 }, // Acesso às pastas
        { wch: 50 }, // Empresas
        { wch: 30 }, // Inscrições
        { wch: 50 }  // Permissões
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Usuários');
      XLSX.writeFile(wb, filePath);
      
      logger.success(`Dados salvos em: ${filePath}`, { 
        path: filePath, 
        usersCount: usersArray.length 
      });
      return filePath;

    } catch (error: any) {
      logger.error('Erro ao salvar planilha Excel', error, { function: 'saveToExcel', path: filePath });
      throw error;
    }
  }, outputPath);
}

/**
 * Função principal que extrai todos os dados do usuário
 */
export async function extractAllUserData(
  page: Page,
  outputPath: string = 'test-results/usuarios-extraidos.xlsx'
): Promise<UserData> {
  logger.info('Iniciando extração de dados do usuário...', { function: 'extractAllUserData' });
  
  const userData = await extractUserData(page);
  
  // Nota: As funções de extração de departamentos, empresas e permissões
  // devem ser chamadas quando estiver na aba correspondente
  // Por isso, essas funções são exportadas separadamente para serem
  // chamadas no momento apropriado do teste
  
  return userData;
}

// Funções auxiliares exportadas para testes
export {
  validateCPF,
  validateEmail,
  validatePhone,
  validateRequiredFields,
  sanitizeValue,
  formatCPF,
  formatPhone,
  findFieldValue
};
