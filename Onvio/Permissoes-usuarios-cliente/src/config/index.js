/**
 * Sistema de configuração centralizada
 * Suporta variáveis de ambiente e valores padrão
 */

const path = require('path');

// Determinar ambiente
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isDevelopment = NODE_ENV === 'development';

/**
 * Configuração principal
 */
const config = {
  // Ambiente
  env: NODE_ENV,
  isProduction,
  isDevelopment,

  // Timeouts (em milissegundos)
  timeouts: {
    short: parseInt(process.env.TIMEOUT_SHORT) || 1000,
    medium: parseInt(process.env.TIMEOUT_MEDIUM) || 2000,
    long: parseInt(process.env.TIMEOUT_LONG) || 10000,
    mfa: parseInt(process.env.TIMEOUT_MFA) || 120000
  },

  // Configuração de retry
  retry: {
    maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
    initialDelay: parseInt(process.env.RETRY_DELAY) || 500,
    backoffMultiplier: parseFloat(process.env.RETRY_BACKOFF_MULTIPLIER) || 2
  },

  // Configuração de extração
  extraction: {
    validateFields: process.env.VALIDATE_FIELDS !== 'false',
    formatData: process.env.FORMAT_DATA !== 'false',
    strictMode: process.env.STRICT_MODE === 'true'
  },

  // Configuração de logging
  logging: {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    toFile: process.env.LOG_TO_FILE !== 'false',
    filePath: process.env.LOG_FILE || path.join(__dirname, '../../logs')
  },

  // Configuração de Playwright
  playwright: {
    headless: process.env.HEADLESS === 'true',
    viewport: {
      width: parseInt(process.env.VIEWPORT_WIDTH) || 1920,
      height: parseInt(process.env.VIEWPORT_HEIGHT) || 1080
    },
    timeout: parseInt(process.env.PLAYWRIGHT_TIMEOUT) || 30000
  },

  // Configuração de paginação
  pagination: {
    size: process.env.PAGINATION_SIZE || '50'
  },

  // URLs
  urls: {
    login: process.env.LOGIN_URL || 'https://auth.thomsonreuters.com/u/login/identifier?state=hKFo2SB2QmluYXlOb0lSVDhtdVRsa2s0dWhTOWQzWUE3V0pzdqFur3VuaXZlcnNhbC1sb2dpbqN0aWTZIEpNLVR6R21vbGVma256N2xVQUw4OGNjRGMwQ3hEWHVKo2NpZNkgR0JVcFBwT1V3QmY0cGhTdjllSXFGMnhpOExTUHNrdEs&ui_locales=pt-BR'
  },

  // Diretórios
  directories: {
    testResults: process.env.TEST_RESULTS_DIR || path.join(__dirname, '../../test-results'),
    logs: process.env.LOGS_DIR || path.join(__dirname, '../../logs'),
    backups: process.env.BACKUPS_DIR || path.join(__dirname, '../../backups')
  },

  // Configuração de backup
  backup: {
    enabled: process.env.BACKUP_ENABLED !== 'false',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
    maxBackups: parseInt(process.env.MAX_BACKUPS) || 100
  },

  // Configuração de cache
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    ttl: parseInt(process.env.CACHE_TTL) || 3600000, // 1 hora em ms
    maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1000
  },

  // Configuração de métricas
  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    exportPath: process.env.METRICS_EXPORT_PATH || path.join(__dirname, '../../metrics')
  },

  // Configuração de paralelização
  parallel: {
    enabled: process.env.PARALLEL_ENABLED === 'true',
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_EXTRACTIONS) || 3,
    batchSize: parseInt(process.env.BATCH_SIZE) || 3
  },

  // Configuração de i18n
  i18n: {
    defaultLocale: process.env.DEFAULT_LOCALE || 'pt-BR',
    supportedLocales: ['pt-BR', 'en']
  }
};

/**
 * Valida configuração
 */
function validateConfig() {
  const errors = [];

  // Validar timeouts
  if (config.timeouts.short <= 0 || config.timeouts.medium <= 0 || config.timeouts.long <= 0) {
    errors.push('Timeouts devem ser valores positivos');
  }

  if (config.timeouts.short >= config.timeouts.medium || config.timeouts.medium >= config.timeouts.long) {
    errors.push('Timeouts devem estar em ordem crescente: short < medium < long');
  }

  // Validar retry
  if (config.retry.maxRetries < 1) {
    errors.push('maxRetries deve ser pelo menos 1');
  }

  if (config.retry.initialDelay <= 0) {
    errors.push('initialDelay deve ser positivo');
  }

  // Validar viewport
  if (config.playwright.viewport.width <= 0 || config.playwright.viewport.height <= 0) {
    errors.push('Viewport dimensions devem ser positivas');
  }

  if (errors.length > 0) {
    throw new Error(`Erros de configuração:\n${errors.join('\n')}`);
  }
}

// Validar na inicialização
try {
  validateConfig();
} catch (error) {
  console.error('Erro ao validar configuração:', error.message);
  // Em desenvolvimento, continuar com valores padrão
  if (isProduction) {
    throw error;
  }
}

/**
 * Obtém configuração para um módulo específico
 */
function getModuleConfig(moduleName) {
  const moduleConfigs = {
    extractUserData: {
      timeouts: config.timeouts,
      retry: config.retry,
      extraction: config.extraction
    },
    automation: {
      timeouts: config.timeouts,
      retry: config.retry,
      playwright: config.playwright,
      pagination: config.pagination,
      urls: config.urls,
      directories: config.directories
    },
    logger: {
      logging: config.logging,
      directories: config.directories
    }
  };

  return moduleConfigs[moduleName] || {};
}

/**
 * Atualiza configuração dinamicamente (útil para testes)
 */
function updateConfig(updates) {
  Object.keys(updates).forEach(key => {
    if (config.hasOwnProperty(key)) {
      if (typeof config[key] === 'object' && !Array.isArray(config[key])) {
        Object.assign(config[key], updates[key]);
      } else {
        config[key] = updates[key];
      }
    }
  });
  validateConfig();
}

module.exports = {
  config,
  getModuleConfig,
  updateConfig,
  validateConfig
};
