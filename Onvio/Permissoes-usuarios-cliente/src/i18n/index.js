const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

let translations = {};
let currentLocale = 'pt-BR';

const i18nDir = path.join(__dirname, 'locales');

/**
 * Carrega traduções de um locale
 */
function loadTranslations(locale = 'pt-BR') {
  const localeFile = path.join(i18nDir, `${locale}.json`);
  
  try {
    if (fs.existsSync(localeFile)) {
      const content = fs.readFileSync(localeFile, 'utf8');
      translations[locale] = JSON.parse(content);
      logger.debug(`Traduções carregadas para locale: ${locale}`, { locale, file: localeFile });
      return translations[locale];
    } else {
      logger.warn(`Arquivo de tradução não encontrado: ${localeFile}`, { locale });
      return loadDefaultTranslations();
    }
  } catch (error) {
    logger.error('Erro ao carregar traduções', error, { locale, file: localeFile });
    return loadDefaultTranslations();
  }
}

/**
 * Carrega traduções padrão (pt-BR hardcoded)
 */
function loadDefaultTranslations() {
  return {
    'field.nome': 'Nome',
    'field.cpf': 'CPF',
    'field.telefone': 'Telefone',
    'field.email': 'E-mail',
    'field.emailContato': 'E-mail de Contato',
    'field.emailLogin': 'E-mail de Login',
    'field.situacao': 'Situação',
    'field.departamentos': 'Departamentos',
    'field.empresas': 'Empresas',
    'field.permissoes': 'Permissões',
    'status.ativo': 'Ativo',
    'status.inativo': 'Inativo',
    'message.extracting': 'Extraindo dados...',
    'message.success': 'Dados extraídos com sucesso',
    'message.error': 'Erro ao extrair dados',
    'message.validating': 'Validando dados...',
    'message.saving': 'Salvando dados...',
    'message.saved': 'Dados salvos com sucesso',
    'validation.required': 'Campo obrigatório',
    'validation.invalid': 'Formato inválido',
    'validation.cpf.invalid': 'CPF inválido',
    'validation.email.invalid': 'E-mail inválido',
    'validation.phone.invalid': 'Telefone inválido'
  };
}

/**
 * Define o locale atual
 */
function setLocale(locale) {
  currentLocale = locale;
  if (!translations[locale]) {
    loadTranslations(locale);
  }
  logger.debug(`Locale definido: ${locale}`, { locale });
}

/**
 * Obtém o locale atual
 */
function getLocale() {
  return currentLocale;
}

/**
 * Traduz uma chave
 */
function t(key, params = {}) {
  const localeTranslations = translations[currentLocale] || loadTranslations(currentLocale);
  let translation = localeTranslations[key] || key;

  // Substituir parâmetros
  Object.entries(params).forEach(([paramKey, paramValue]) => {
    translation = translation.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), paramValue);
  });

  return translation;
}

/**
 * Traduz com fallback para múltiplas chaves
 */
function tOr(key, fallbackKey, params = {}) {
  const result = t(key, params);
  if (result === key) {
    return t(fallbackKey, params);
  }
  return result;
}

// Carregar traduções padrão na inicialização
loadTranslations('pt-BR');

module.exports = {
  setLocale,
  getLocale,
  t,
  tOr,
  loadTranslations
};
