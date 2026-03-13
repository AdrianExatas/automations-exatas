const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { getModuleConfig } = require('../config');

const config = getModuleConfig('automation');
const metricsConfig = config.metrics || { enabled: true, exportPath: path.join(__dirname, '../../metrics') };

// Diretório de métricas
if (!fs.existsSync(metricsConfig.exportPath)) {
  fs.mkdirSync(metricsConfig.exportPath, { recursive: true });
}

// Armazenamento de métricas em memória
const metrics = {
  extraction: {
    total: 0,
    successful: 0,
    failed: 0,
    totalTime: 0,
    averageTime: 0,
    byField: {},
    byFunction: {}
  },
  performance: {
    fieldExtractionTimes: {},
    cacheHits: 0,
    cacheMisses: 0,
    retries: 0
  },
  errors: {
    total: 0,
    byType: {},
    byFunction: {}
  },
  startTime: null,
  endTime: null
};

/**
 * Inicia coleta de métricas
 */
function startMetrics() {
  metrics.startTime = Date.now();
  logger.debug('Coleta de métricas iniciada', { timestamp: new Date().toISOString() });
}

/**
 * Finaliza coleta de métricas
 */
function endMetrics() {
  metrics.endTime = Date.now();
  const totalTime = metrics.endTime - metrics.startTime;
  metrics.extraction.totalTime = totalTime;
  metrics.extraction.averageTime = metrics.extraction.total > 0 
    ? metrics.extraction.totalTime / metrics.extraction.total 
    : 0;
  
  logger.debug('Coleta de métricas finalizada', { 
    totalTime, 
    totalExtractions: metrics.extraction.total 
  });
}

/**
 * Registra início de extração de campo
 */
function startFieldExtraction(fieldName) {
  if (!metricsConfig.enabled) return;
  
  const key = `start_${fieldName}_${Date.now()}`;
  metrics.performance.fieldExtractionTimes[fieldName] = {
    start: Date.now(),
    key
  };
}

/**
 * Registra fim de extração de campo
 */
function endFieldExtraction(fieldName, success = true) {
  if (!metricsConfig.enabled) return;
  
  const fieldMetrics = metrics.performance.fieldExtractionTimes[fieldName];
  if (!fieldMetrics) return;
  
  const duration = Date.now() - fieldMetrics.start;
  
  // Atualizar estatísticas do campo
  if (!metrics.extraction.byField[fieldName]) {
    metrics.extraction.byField[fieldName] = {
      total: 0,
      successful: 0,
      failed: 0,
      totalTime: 0,
      averageTime: 0,
      minTime: Infinity,
      maxTime: 0
    };
  }
  
  const fieldStats = metrics.extraction.byField[fieldName];
  fieldStats.total++;
  fieldStats.totalTime += duration;
  fieldStats.averageTime = fieldStats.totalTime / fieldStats.total;
  fieldStats.minTime = Math.min(fieldStats.minTime, duration);
  fieldStats.maxTime = Math.max(fieldStats.maxTime, duration);
  
  if (success) {
    fieldStats.successful++;
  } else {
    fieldStats.failed++;
  }
  
  delete metrics.performance.fieldExtractionTimes[fieldName];
}

/**
 * Registra extração de função
 */
function recordFunctionExtraction(functionName, duration, success = true) {
  if (!metricsConfig.enabled) return;
  
  metrics.extraction.total++;
  
  if (success) {
    metrics.extraction.successful++;
  } else {
    metrics.extraction.failed++;
  }
  
  if (!metrics.extraction.byFunction[functionName]) {
    metrics.extraction.byFunction[functionName] = {
      total: 0,
      successful: 0,
      failed: 0,
      totalTime: 0,
      averageTime: 0
    };
  }
  
  const funcStats = metrics.extraction.byFunction[functionName];
  funcStats.total++;
  funcStats.totalTime += duration;
  funcStats.averageTime = funcStats.totalTime / funcStats.total;
  
  if (success) {
    funcStats.successful++;
  } else {
    funcStats.failed++;
  }
}

/**
 * Registra erro
 */
function recordError(error, functionName = 'unknown', errorType = 'unknown') {
  if (!metricsConfig.enabled) return;
  
  metrics.errors.total++;
  
  if (!metrics.errors.byType[errorType]) {
    metrics.errors.byType[errorType] = 0;
  }
  metrics.errors.byType[errorType]++;
  
  if (!metrics.errors.byFunction[functionName]) {
    metrics.errors.byFunction[functionName] = 0;
  }
  metrics.errors.byFunction[functionName]++;
}

/**
 * Registra cache hit
 */
function recordCacheHit() {
  if (!metricsConfig.enabled) return;
  metrics.performance.cacheHits++;
}

/**
 * Registra cache miss
 */
function recordCacheMiss() {
  if (!metricsConfig.enabled) return;
  metrics.performance.cacheMisses++;
}

/**
 * Registra retry
 */
function recordRetry(functionName) {
  if (!metricsConfig.enabled) return;
  metrics.performance.retries++;
  
  if (!metrics.extraction.byFunction[functionName]) {
    metrics.extraction.byFunction[functionName] = { retries: 0 };
  }
  if (!metrics.extraction.byFunction[functionName].retries) {
    metrics.extraction.byFunction[functionName].retries = 0;
  }
  metrics.extraction.byFunction[functionName].retries++;
}

/**
 * Obtém métricas atuais
 */
function getMetrics() {
  return {
    ...metrics,
    summary: {
      totalExtractions: metrics.extraction.total,
      successRate: metrics.extraction.total > 0 
        ? (metrics.extraction.successful / metrics.extraction.total * 100).toFixed(2) + '%'
        : '0%',
      averageTime: metrics.extraction.averageTime.toFixed(2) + 'ms',
      cacheHitRate: (metrics.performance.cacheHits + metrics.performance.cacheMisses) > 0
        ? (metrics.performance.cacheHits / (metrics.performance.cacheHits + metrics.performance.cacheMisses) * 100).toFixed(2) + '%'
        : '0%',
      totalErrors: metrics.errors.total,
      totalRetries: metrics.performance.retries
    }
  };
}

/**
 * Exporta métricas para JSON
 */
function exportMetrics(format = 'json') {
  if (!metricsConfig.enabled) return null;
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `metrics-${timestamp}.${format}`;
  const filepath = path.join(metricsConfig.exportPath, filename);
  
  try {
    const data = getMetrics();
    
    if (format === 'json') {
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    } else if (format === 'csv') {
      // Converter para CSV básico
      const csvLines = [
        'Metric,Value',
        `Total Extractions,${data.extraction.total}`,
        `Successful,${data.extraction.successful}`,
        `Failed,${data.extraction.failed}`,
        `Success Rate,${data.summary.successRate}`,
        `Average Time (ms),${data.extraction.averageTime}`,
        `Total Errors,${data.errors.total}`,
        `Cache Hits,${data.performance.cacheHits}`,
        `Cache Misses,${data.performance.cacheMisses}`,
        `Cache Hit Rate,${data.summary.cacheHitRate}`,
        `Total Retries,${data.performance.retries}`
      ];
      fs.writeFileSync(filepath, csvLines.join('\n'), 'utf8');
    }
    
    logger.info(`Métricas exportadas para ${filepath}`, { format, filepath });
    return filepath;
  } catch (error) {
    logger.error('Erro ao exportar métricas', error, { format, filepath });
    return null;
  }
}

/**
 * Reseta métricas
 */
function resetMetrics() {
  Object.keys(metrics).forEach(key => {
    if (key === 'startTime' || key === 'endTime') {
      metrics[key] = null;
    } else if (typeof metrics[key] === 'object') {
      if (Array.isArray(metrics[key])) {
        metrics[key] = [];
      } else {
        Object.keys(metrics[key]).forEach(subKey => {
          if (typeof metrics[key][subKey] === 'object' && !Array.isArray(metrics[key][subKey])) {
            Object.keys(metrics[key][subKey]).forEach(innerKey => {
              if (typeof metrics[key][subKey][innerKey] === 'number') {
                metrics[key][subKey][innerKey] = 0;
              } else if (Array.isArray(metrics[key][subKey][innerKey])) {
                metrics[key][subKey][innerKey] = [];
              } else if (typeof metrics[key][subKey][innerKey] === 'object') {
                metrics[key][subKey][innerKey] = {};
              }
            });
          } else {
            metrics[key][subKey] = Array.isArray(metrics[key][subKey]) ? [] : 0;
          }
        });
      }
    } else {
      metrics[key] = 0;
    }
  });
  logger.debug('Métricas resetadas');
}

/**
 * Gera relatório de métricas
 */
function generateMetricsReport() {
  const data = getMetrics();
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: data.summary,
    topFields: Object.entries(data.extraction.byField)
      .map(([field, stats]) => ({
        field,
        ...stats,
        successRate: stats.total > 0 ? (stats.successful / stats.total * 100).toFixed(2) + '%' : '0%'
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
    topFunctions: Object.entries(data.extraction.byFunction)
      .map(([func, stats]) => ({
        function: func,
        ...stats,
        successRate: stats.total > 0 ? (stats.successful / stats.total * 100).toFixed(2) + '%' : '0%'
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
    errorBreakdown: data.errors.byType,
    performance: {
      cacheHitRate: data.summary.cacheHitRate,
      totalRetries: data.performance.retries
    }
  };
  
  return report;
}

module.exports = {
  startMetrics,
  endMetrics,
  startFieldExtraction,
  endFieldExtraction,
  recordFunctionExtraction,
  recordError,
  recordCacheHit,
  recordCacheMiss,
  recordRetry,
  getMetrics,
  exportMetrics,
  resetMetrics,
  generateMetricsReport
};
