const logger = require('./logger');
const { getModuleConfig } = require('../config');
const fs = require('fs');
const path = require('path');

const config = getModuleConfig('automation');
const retryConfig = config.retry || { maxRetries: 3, initialDelay: 500, backoffMultiplier: 2 };

/**
 * Tipos de erro
 */
const ErrorTypes = {
  CRITICAL: 'critical',      // Erro que impede continuação
  RECOVERABLE: 'recoverable', // Erro que pode ser recuperado
  WARNING: 'warning'          // Aviso que não impede execução
};

/**
 * Categoriza um erro
 */
function categorizeError(error, context = {}) {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorName = error?.name || '';

  // Erros críticos
  if (
    errorMessage.includes('authentication') ||
    errorMessage.includes('login failed') ||
    errorMessage.includes('credentials') ||
    errorName === 'AuthenticationError'
  ) {
    return ErrorTypes.CRITICAL;
  }

  // Erros recuperáveis
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('element not found') ||
    errorMessage.includes('selector') ||
    errorMessage.includes('network') ||
    errorName === 'TimeoutError' ||
    errorName === 'ElementNotFoundError'
  ) {
    return ErrorTypes.RECOVERABLE;
  }

  // Avisos
  if (
    errorMessage.includes('optional') ||
    errorMessage.includes('fallback') ||
    errorName === 'Warning'
  ) {
    return ErrorTypes.WARNING;
  }

  // Padrão: recuperável
  return ErrorTypes.RECOVERABLE;
}

/**
 * Estratégias de recovery
 */
const RecoveryStrategies = {
  /**
   * Retry simples com backoff exponencial
   */
  async retryWithBackoff(fn, maxRetries = retryConfig.maxRetries, context = {}) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Tentativa ${attempt}/${maxRetries}`, { ...context, attempt, maxRetries });
        const result = await fn();
        if (attempt > 1) {
          logger.info(`Operação bem-sucedida após ${attempt} tentativas`, { ...context, attempt });
        }
        return result;
      } catch (error) {
        lastError = error;
        const errorType = categorizeError(error, context);
        
        if (errorType === ErrorTypes.CRITICAL) {
          logger.error('Erro crítico detectado, não tentando novamente', error, { ...context, attempt });
          throw error;
        }
        
        if (attempt < maxRetries) {
          const delay = retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1);
          logger.warn(`Tentativa ${attempt} falhou, aguardando ${delay}ms antes de tentar novamente`, {
            ...context,
            attempt,
            error: error.message,
            delay
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    logger.error(`Operação falhou após ${maxRetries} tentativas`, lastError, { ...context, maxRetries });
    throw lastError;
  },

  /**
   * Retry com estratégias alternativas
   */
  async retryWithAlternatives(fn, alternatives = [], context = {}) {
    // Tentar função principal
    try {
      return await this.retryWithBackoff(fn, retryConfig.maxRetries, context);
    } catch (error) {
      logger.warn('Função principal falhou, tentando alternativas', { ...context, error: error.message });
    }

    // Tentar alternativas
    for (let i = 0; i < alternatives.length; i++) {
      try {
        logger.info(`Tentando estratégia alternativa ${i + 1}/${alternatives.length}`, { ...context, alternative: i + 1 });
        return await this.retryWithBackoff(alternatives[i], Math.max(2, retryConfig.maxRetries - 1), {
          ...context,
          strategy: `alternative_${i + 1}`
        });
      } catch (altError) {
        logger.warn(`Estratégia alternativa ${i + 1} falhou`, { ...context, alternative: i + 1, error: altError.message });
        if (i === alternatives.length - 1) {
          throw altError;
        }
      }
    }
  },

  /**
   * Fallback para valor padrão
   */
  async withFallback(fn, fallbackValue, context = {}) {
    try {
      return await this.retryWithBackoff(fn, retryConfig.maxRetries, context);
    } catch (error) {
      logger.warn('Usando valor de fallback', { ...context, error: error.message, fallback: fallbackValue });
      return fallbackValue;
    }
  }
};

/**
 * Salva estado em caso de falha
 */
const stateDir = path.join(__dirname, '../../state');
if (!fs.existsSync(stateDir)) {
  fs.mkdirSync(stateDir, { recursive: true });
}

function saveState(state, filename = 'last-state.json') {
  try {
    const statePath = path.join(stateDir, filename);
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
    logger.debug('Estado salvo', { path: statePath });
  } catch (error) {
    logger.error('Erro ao salvar estado', error, { function: 'saveState' });
  }
}

function loadState(filename = 'last-state.json') {
  try {
    const statePath = path.join(stateDir, filename);
    if (fs.existsSync(statePath)) {
      const content = fs.readFileSync(statePath, 'utf8');
      const state = JSON.parse(content);
      logger.debug('Estado carregado', { path: statePath });
      return state;
    }
  } catch (error) {
    logger.warn('Erro ao carregar estado', { error: error.message, function: 'loadState' });
  }
  return null;
}

/**
 * Wrapper para funções com tratamento de erro automático
 */
function withErrorHandling(fn, options = {}) {
  return async (...args) => {
    const {
      context = {},
      recoveryStrategy = 'retry',
      maxRetries = retryConfig.maxRetries,
      fallbackValue = null,
      alternatives = [],
      saveStateOnError = false,
      stateKey = null
    } = options;

    try {
      let result;
      
      switch (recoveryStrategy) {
        case 'retry':
          result = await RecoveryStrategies.retryWithBackoff(
            () => fn(...args),
            maxRetries,
            { ...context, function: fn.name }
          );
          break;
          
        case 'alternatives':
          result = await RecoveryStrategies.retryWithAlternatives(
            () => fn(...args),
            alternatives,
            { ...context, function: fn.name }
          );
          break;
          
        case 'fallback':
          result = await RecoveryStrategies.withFallback(
            () => fn(...args),
            fallbackValue,
            { ...context, function: fn.name }
          );
          break;
          
        default:
          result = await fn(...args);
      }
      
      return result;
      
    } catch (error) {
      const errorType = categorizeError(error, context);
      
      // Salvar estado se necessário
      if (saveStateOnError && stateKey) {
        saveState({
          key: stateKey,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          context,
          timestamp: new Date().toISOString()
        }, `${stateKey}-error.json`);
      }
      
      // Log baseado no tipo
      if (errorType === ErrorTypes.CRITICAL) {
        logger.error('Erro crítico não recuperável', error, { ...context, function: fn.name, errorType });
        throw error;
      } else if (errorType === ErrorTypes.RECOVERABLE) {
        logger.warn('Erro recuperável', { ...context, function: fn.name, error: error.message, errorType });
        if (fallbackValue !== null) {
          return fallbackValue;
        }
        throw error;
      } else {
        logger.info('Aviso (não crítico)', { ...context, function: fn.name, error: error.message, errorType });
        if (fallbackValue !== null) {
          return fallbackValue;
        }
        return null;
      }
    }
  };
}

/**
 * Gera relatório de erros
 */
function generateErrorReport(errors) {
  const report = {
    timestamp: new Date().toISOString(),
    total: errors.length,
    byType: {},
    byFunction: {},
    recent: errors.slice(-10)
  };

  errors.forEach(error => {
    const type = error.type || 'unknown';
    const func = error.function || 'unknown';
    
    report.byType[type] = (report.byType[type] || 0) + 1;
    report.byFunction[func] = (report.byFunction[func] || 0) + 1;
  });

  return report;
}

module.exports = {
  ErrorTypes,
  categorizeError,
  RecoveryStrategies,
  withErrorHandling,
  saveState,
  loadState,
  generateErrorReport
};
