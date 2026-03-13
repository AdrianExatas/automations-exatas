const logger = require('./logger');
const { getMetrics } = require('./metrics');

// Verificar se node-notifier está disponível (opcional)
let notifier = null;
try {
  notifier = require('node-notifier');
} catch (error) {
  // node-notifier não instalado, usar notificações básicas
  logger.debug('node-notifier não disponível, usando notificações básicas');
}

/**
 * Envia notificação desktop
 */
function sendDesktopNotification(title, message, options = {}) {
  const {
    type = 'info', // info, success, warning, error
    sound = true,
    wait = false
  } = options;

  if (notifier) {
    try {
      notifier.notify({
        title: title,
        message: message,
        sound: sound,
        wait: wait,
        icon: getNotificationIcon(type),
        timeout: 5
      });
      logger.debug('Notificação desktop enviada', { title, type });
    } catch (error) {
      logger.warn('Erro ao enviar notificação desktop', { error: error.message });
    }
  } else {
    // Fallback: apenas log
    logger.info(`[NOTIFICAÇÃO] ${title}: ${message}`, { type });
  }
}

/**
 * Obtém ícone baseado no tipo
 */
function getNotificationIcon(type) {
  // Em produção, você pode usar ícones reais
  // Por enquanto, retornar null (usa ícone padrão do sistema)
  return null;
}

/**
 * Notifica conclusão de automação
 */
function notifyAutomationComplete(usersProcessed, success = true, error = null) {
  const metrics = getMetrics();
  const summary = metrics.summary || {};
  
  if (success) {
    const title = '✅ Automação Concluída';
    const message = `${usersProcessed} usuário(s) processado(s) com sucesso!\n` +
                   `Taxa de sucesso: ${summary.successRate || 'N/A'}\n` +
                   `Tempo médio: ${summary.averageTime || 'N/A'}`;
    
    sendDesktopNotification(title, message, { type: 'success' });
  } else {
    const title = '❌ Erro na Automação';
    const message = error 
      ? `Erro: ${error.message || error}`
      : 'A automação falhou. Verifique os logs para mais detalhes.';
    
    sendDesktopNotification(title, message, { type: 'error' });
  }
}

/**
 * Notifica progresso
 */
function notifyProgress(current, total, message = '') {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const title = `📊 Progresso: ${percentage}%`;
  const msg = message || `Processando usuário ${current} de ${total}`;
  
  // Apenas notificar em marcos (25%, 50%, 75%, 100%)
  if (percentage === 25 || percentage === 50 || percentage === 75 || percentage === 100) {
    sendDesktopNotification(title, msg, { type: 'info', sound: false });
  }
}

/**
 * Notifica erro crítico
 */
function notifyCriticalError(error, context = {}) {
  const title = '🚨 Erro Crítico';
  const message = `Erro crítico detectado: ${error.message || 'Erro desconhecido'}\n` +
                 `Função: ${context.function || 'Desconhecida'}`;
  
  sendDesktopNotification(title, message, { type: 'error', sound: true });
}

/**
 * Notifica aviso
 */
function notifyWarning(message, context = {}) {
  const title = '⚠️ Aviso';
  sendDesktopNotification(title, message, { type: 'warning', sound: false });
}

/**
 * Gera resumo de execução para notificação
 */
function generateExecutionSummary(usersData, metrics) {
  const summary = metrics?.summary || {};
  const total = Array.isArray(usersData) ? usersData.length : (usersData ? 1 : 0);
  
  let message = `📊 Resumo da Execução\n\n`;
  message += `Usuários processados: ${total}\n`;
  message += `Taxa de sucesso: ${summary.successRate || 'N/A'}\n`;
  message += `Tempo médio: ${summary.averageTime || 'N/A'}\n`;
  
  if (summary.totalErrors > 0) {
    message += `\n⚠️ ${summary.totalErrors} erro(s) encontrado(s)`;
  }
  
  if (summary.cacheHitRate) {
    message += `\n💾 Cache Hit Rate: ${summary.cacheHitRate}`;
  }
  
  return message;
}

/**
 * Envia resumo por e-mail (opcional, requer configuração SMTP)
 */
async function sendEmailNotification(subject, message, options = {}) {
  // Esta função requer configuração de SMTP
  // Por enquanto, apenas log
  logger.info('Notificação por e-mail (não implementado)', {
    subject,
    message: message.substring(0, 100) + '...',
    note: 'Requer configuração SMTP para funcionar'
  });
  
  // TODO: Implementar com nodemailer ou similar
  // const nodemailer = require('nodemailer');
  // const transporter = nodemailer.createTransport({...});
  // await transporter.sendMail({...});
}

module.exports = {
  sendDesktopNotification,
  notifyAutomationComplete,
  notifyProgress,
  notifyCriticalError,
  notifyWarning,
  generateExecutionSummary,
  sendEmailNotification
};
