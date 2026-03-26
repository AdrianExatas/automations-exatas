import * as fs from 'fs';
import * as path from 'path';

/**
 * Sistema de logging estruturado
 * Suporta múltiplos níveis e saída para arquivo e console
 */

// Criar diretório de logs se não existir
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configuração do logger
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_TO_FILE = process.env.LOG_TO_FILE !== 'false';
const LOG_FILE = path.join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`);

// Níveis de log
const LEVELS: Record<string, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const LEVEL_COLORS: Record<string, string> = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m'  // Red
};

const RESET_COLOR = '\x1b[0m';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  [key: string]: any;
}

/**
 * Formata mensagem de log
 */
function formatMessage(level: string, message: string, context: Record<string, any> = {}): LogEntry {
  const timestamp = new Date().toISOString();
  
  return {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...context
  };
}

/**
 * Escreve log no arquivo
 */
function writeToFile(logEntry: LogEntry): void {
  if (!LOG_TO_FILE) return;
  
  try {
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(LOG_FILE, logLine, 'utf8');
  } catch (error) {
    // Fallback para console se não conseguir escrever no arquivo
    console.error('Erro ao escrever log no arquivo:', (error as Error).message);
  }
}

/**
 * Escreve log no console
 */
function writeToConsole(logEntry: LogEntry): void {
  const color = LEVEL_COLORS[logEntry.level.toLowerCase()] || '';
  const reset = RESET_COLOR;
  const levelStr = `${color}[${logEntry.level}]${reset}`;
  const timeStr = logEntry.timestamp.split('T')[1].split('.')[0];
  
  let output = `${timeStr} ${levelStr} ${logEntry.message}`;
  
  // Adicionar contexto se existir
  const contextKeys = Object.keys(logEntry).filter(k => 
    !['timestamp', 'level', 'message'].includes(k)
  );
  
  if (contextKeys.length > 0) {
    const context: Record<string, any> = {};
    contextKeys.forEach(key => {
      context[key] = logEntry[key];
    });
    output += ` ${JSON.stringify(context)}`;
  }
  
  // Usar console apropriado baseado no nível
  if (logEntry.level === 'ERROR') {
    console.error(output);
  } else if (logEntry.level === 'WARN') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

/**
 * Verifica se o nível de log deve ser processado
 */
function shouldLog(level: string): boolean {
  return LEVELS[level] >= LEVELS[LOG_LEVEL];
}

/**
 * Logger principal
 */
export const logger = {
  /**
   * Log de debug (informações detalhadas)
   */
  debug(message: string, context: Record<string, any> = {}): void {
    if (!shouldLog('debug')) return;
    const logEntry = formatMessage('debug', message, context);
    writeToConsole(logEntry);
    writeToFile(logEntry);
  },

  /**
   * Log de informação (eventos normais)
   */
  info(message: string, context: Record<string, any> = {}): void {
    if (!shouldLog('info')) return;
    const logEntry = formatMessage('info', message, context);
    writeToConsole(logEntry);
    writeToFile(logEntry);
  },

  /**
   * Log de aviso (situações que requerem atenção)
   */
  warn(message: string, context: Record<string, any> = {}): void {
    if (!shouldLog('warn')) return;
    const logEntry = formatMessage('warn', message, context);
    writeToConsole(logEntry);
    writeToFile(logEntry);
  },

  /**
   * Log de erro (erros que precisam ser corrigidos)
   */
  error(message: string, error: Error | null = null, context: Record<string, any> = {}): void {
    if (!shouldLog('error')) return;
    
    const errorContext: Record<string, any> = {
      ...context
    };
    
    if (error) {
      errorContext.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    }
    
    const logEntry = formatMessage('error', message, errorContext);
    writeToConsole(logEntry);
    writeToFile(logEntry);
  },

  /**
   * Log com emoji (para compatibilidade com código existente)
   */
  log(message: string, context: Record<string, any> = {}): void {
    this.info(message, context);
  },

  /**
   * Log de sucesso (alias para info com contexto de sucesso)
   */
  success(message: string, context: Record<string, any> = {}): void {
    this.info(`✅ ${message}`, { ...context, type: 'success' });
  },

  /**
   * Log de progresso (alias para info com contexto de progresso)
   */
  progress(message: string, context: Record<string, any> = {}): void {
    this.info(`📋 ${message}`, { ...context, type: 'progress' });
  }
};
