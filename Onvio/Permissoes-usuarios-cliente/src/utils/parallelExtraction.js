const logger = require('./logger');
const { getModuleConfig } = require('../config');

const config = getModuleConfig('automation');
const maxConcurrent = parseInt(process.env.MAX_CONCURRENT_EXTRACTIONS) || 3;

/**
 * Processa múltiplos usuários em paralelo (com limite)
 */
async function processUsersInParallel(users, processFn, options = {}) {
  const {
    maxConcurrent: max = maxConcurrent,
    onProgress = null,
    onError = null
  } = options;

  const results = [];
  const errors = [];
  let completed = 0;
  const total = users.length;

  // Criar fila de processamento
  const queue = [...users];
  const inProgress = new Set();
  const promises = [];

  logger.info(`Iniciando processamento paralelo de ${total} usuário(s) (máximo ${max} simultâneos)`, {
    total,
    maxConcurrent: max
  });

  // Processar enquanto houver itens na fila ou processamentos em andamento
  while (queue.length > 0 || inProgress.size > 0) {
    // Iniciar novos processamentos até o limite
    while (inProgress.size < max && queue.length > 0) {
      const user = queue.shift();
      const index = total - queue.length - inProgress.size - 1;

      const promise = (async () => {
        inProgress.add(user);
        try {
          logger.debug(`Processando usuário ${index + 1}/${total}`, { index: index + 1, total });
          const result = await processFn(user, index);
          results.push({ user, result, index });
          completed++;

          if (onProgress) {
            onProgress(completed, total, result);
          }

          return { success: true, user, result, index };
        } catch (error) {
          errors.push({ user, error, index });
          logger.error(`Erro ao processar usuário ${index + 1}`, error, { index: index + 1, total });

          if (onError) {
            onError(error, user, index);
          }

          return { success: false, user, error, index };
        } finally {
          inProgress.delete(user);
        }
      })();

      promises.push(promise);
    }

    // Aguardar pelo menos um processamento completar antes de continuar
    if (inProgress.size >= max && promises.length > 0) {
      await Promise.race(promises.filter(p => !p._resolved));
    }
  }

  // Aguardar todos os processamentos restantes
  await Promise.all(promises);

  logger.info(`Processamento paralelo concluído: ${completed}/${total} bem-sucedidos, ${errors.length} erros`, {
    completed,
    total,
    errors: errors.length
  });

  return {
    results,
    errors,
    total,
    completed,
    failed: errors.length,
    successRate: total > 0 ? ((completed / total) * 100).toFixed(2) + '%' : '0%'
  };
}

/**
 * Processa em lotes (batch processing)
 */
async function processInBatches(items, processFn, batchSize = maxConcurrent) {
  const results = [];
  const errors = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(items.length / batchSize);

    logger.info(`Processando lote ${batchNumber}/${totalBatches} (${batch.length} item(s))`, {
      batch: batchNumber,
      totalBatches,
      batchSize: batch.length
    });

    const batchPromises = batch.map((item, batchIndex) => {
      const globalIndex = i + batchIndex;
      return processFn(item, globalIndex).catch(error => {
        errors.push({ item, error, index: globalIndex });
        logger.error(`Erro no lote ${batchNumber}, item ${batchIndex + 1}`, error);
        return null;
      });
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(r => r !== null));

    // Pequena pausa entre lotes para não sobrecarregar
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return {
    results,
    errors,
    total: items.length,
    completed: results.length,
    failed: errors.length
  };
}

module.exports = {
  processUsersInParallel,
  processInBatches
};
