import { logger } from './logger';
import { getModuleConfig } from '../config';
import * as fs from 'fs';
import * as path from 'path';

const config = getModuleConfig('automation');
const retryConfig: { maxRetries: number; initialDelay: number; backoffMultiplier: number } = config.retry || { maxRetries: 3, initialDelay: 500, backoffMultiplier: 2 };

/**
 * Tipos de erro
 */
export const ErrorTypes = {
  CRITICAL: 'critical' as const,      // Erro que impede continuação
  RECOVERABLE: 'recoverable' as const, // Erro que pode ser recuperado
  WARNING: 'warning' as const          // Aviso que não impede execução
};

export type ErrorType = typeof ErrorTypes[keyof typeof ErrorTypes];

/**
 * Categoriza um erro
 */
export function categorizeError(error: Error | null, _context: Record<string, any> = {}): ErrorType {
  if (!error) return ErrorTypes.RECOVERABLE;
  
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
export const RecoveryStrategies = {
  /**
   * Retry simples com backoff exponencial
   */
  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = retryConfig.maxRetries,
    context: Record<string, any> = {}
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Tentativa ${attempt}/${maxRetries}`, { ...context, attempt, maxRetries });
        const result = await fn();
        if (attempt > 1) {
          logger.info(`Operação bem-sucedida após ${attempt} tentativas`, { ...context, attempt });
        }
        return result;
      } catch (error) {
        lastError = error as Error;
        const errorType = categorizeError(error as Error, context);
        
        if (errorType === ErrorTypes.CRITICAL) {
          logger.error('Erro crítico detectado, não tentando novamente', error as Error, { ...context, attempt });
          throw error;
        }
        
        if (attempt < maxRetries) {
          const delay = retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1);
          logger.warn(`Tentativa ${attempt} falhou, aguardando ${delay}ms antes de tentar novamente`, {
            ...context,
            attempt,
            error: (error as Error).message,
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
  async retryWithAlternatives<T>(
    fn: () => Promise<T>,
    alternatives: Array<() => Promise<T>> = [],
    context: Record<string, any> = {}
  ): Promise<T> {
    // Tentar função principal
    try {
      return await this.retryWithBackoff(fn, retryConfig.maxRetries, context);
    } catch (error) {
      logger.warn('Função principal falhou, tentando alternativas', { ...context, error: (error as Error).message });
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
        logger.warn(`Estratégia alternativa ${i + 1} falhou`, { ...context, alternative: i + 1, error: (altError as Error).message });
        if (i === alternatives.length - 1) {
          throw altError;
        }
      }
    }
    
    throw new Error('Todas as estratégias falharam');
  },

  /**
   * Fallback para valor padrão
   */
  async withFallback<T>(
    fn: () => Promise<T>,
    fallbackValue: T,
    context: Record<string, any> = {}
  ): Promise<T> {
    try {
      return await this.retryWithBackoff(fn, retryConfig.maxRetries, context);
    } catch (error) {
      logger.warn('Usando valor de fallback', { ...context, error: (error as Error).message, fallback: fallbackValue });
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

export function saveState(state: any, filename: string = 'last-state.json'): void {
  try {
    const statePath = path.join(stateDir, filename);
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
    logger.debug('Estado salvo', { path: statePath });
  } catch (error) {
    logger.error('Erro ao salvar estado', error as Error, { function: 'saveState' });
  }
}

export function loadState(filename: string = 'last-state.json'): any {
  try {
    const statePath = path.join(stateDir, filename);
    if (fs.existsSync(statePath)) {
      const content = fs.readFileSync(statePath, 'utf8');
      const state = JSON.parse(content);
      logger.debug('Estado carregado', { path: statePath });
      return state;
    }
  } catch (error) {
    logger.warn('Erro ao carregar estado', { error: (error as Error).message, function: 'loadState' });
  }
  return null;
}

interface ErrorHandlingOptions {
  context?: Record<string, any>;
  recoveryStrategy?: 'retry' | 'alternatives' | 'fallback';
  maxRetries?: number;
  fallbackValue?: any;
  alternatives?: Array<() => Promise<any>>;
  saveStateOnError?: boolean;
  stateKey?: string;
}

/**
 * Wrapper para funções com tratamento de erro automático
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: ErrorHandlingOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
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
      let result: any;
      
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
      const errorType = categorizeError(error as Error, context);
      
      // Salvar estado se necessário
      if (saveStateOnError && stateKey) {
        saveState({
          key: stateKey,
          error: {
            message: (error as Error).message,
            stack: (error as Error).stack,
            name: (error as Error).name
          },
          context,
          timestamp: new Date().toISOString()
        }, `${stateKey}-error.json`);
      }
      
      // Log baseado no tipo
      if (errorType === ErrorTypes.CRITICAL) {
        logger.error('Erro crítico não recuperável', error as Error, { ...context, function: fn.name, errorType });
        throw error;
      } else if (errorType === ErrorTypes.RECOVERABLE) {
        logger.warn('Erro recuperável', { ...context, function: fn.name, error: (error as Error).message, errorType });
        if (fallbackValue !== null) {
          return fallbackValue;
        }
        throw error;
      } else {
        logger.info('Aviso (não crítico)', { ...context, function: fn.name, error: (error as Error).message, errorType });
        if (fallbackValue !== null) {
          return fallbackValue;
        }
        return null;
      }
    }
  }) as T;
}

interface ErrorReport {
  timestamp: string;
  total: number;
  byType: Record<string, number>;
  byFunction: Record<string, number>;
  recent: any[];
}

/**
 * Gera relatório de erros
 */
export function generateErrorReport(errors: Array<{ type?: string; function?: string; [key: string]: any }>): ErrorReport {
  const report: ErrorReport = {
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
