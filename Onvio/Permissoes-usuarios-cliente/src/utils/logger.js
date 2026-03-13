const fs = require('fs');
const path = require('path');

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
const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const LEVEL_COLORS = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m'  // Red
};

const RESET_COLOR = '\x1b[0m';

/**
 * Formata mensagem de log
 */
function formatMessage(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const contextStr = Object.keys(context).length > 0 
    ? ` ${JSON.stringify(context)}` 
    : '';
  
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
function writeToFile(logEntry) {
  if (!LOG_TO_FILE) return;
  
  try {
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(LOG_FILE, logLine, 'utf8');
  } catch (error) {
    // Fallback para console se não conseguir escrever no arquivo
    console.error('Erro ao escrever log no arquivo:', error.message);
  }
}

/**
 * Escreve log no console
 */
function writeToConsole(logEntry) {
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
    const context = {};
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
function shouldLog(level) {
  return LEVELS[level] >= LEVELS[LOG_LEVEL];
}

/**
 * Logger principal
 */
const logger = {
  /**
   * Log de debug (informações detalhadas)
   */
  debug(message, context = {}) {
    if (!shouldLog('debug')) return;
    const logEntry = formatMessage('debug', message, context);
    writeToConsole(logEntry);
    writeToFile(logEntry);
  },

  /**
   * Log de informação (eventos normais)
   */
  info(message, context = {}) {
    if (!shouldLog('info')) return;
    const logEntry = formatMessage('info', message, context);
    writeToConsole(logEntry);
    writeToFile(logEntry);
  },

  /**
   * Log de aviso (situações que requerem atenção)
   */
  warn(message, context = {}) {
    if (!shouldLog('warn')) return;
    const logEntry = formatMessage('warn', message, context);
    writeToConsole(logEntry);
    writeToFile(logEntry);
  },

  /**
   * Log de erro (erros que precisam ser corrigidos)
   */
  error(message, error = null, context = {}) {
    if (!shouldLog('error')) return;
    
    const errorContext = {
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
  log(message, context = {}) {
    this.info(message, context);
  },

  /**
   * Log de sucesso (alias para info com contexto de sucesso)
   */
  success(message, context = {}) {
    this.info(`✅ ${message}`, { ...context, type: 'success' });
  },

  /**
   * Log de progresso (alias para info com contexto de progresso)
   */
  progress(message, context = {}) {
    this.info(`📋 ${message}`, { ...context, type: 'progress' });
  }
};

module.exports = logger;
