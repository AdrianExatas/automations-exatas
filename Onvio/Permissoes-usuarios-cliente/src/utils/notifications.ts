import { logger } from './logger';
import { getMetrics } from './metrics';
import { UserData } from '../types';

// Verificar se node-notifier está disponível (opcional)
let notifier: any = null;
try {
  notifier = require('node-notifier');
} catch (error) {
  // node-notifier não instalado, usar notificações básicas
  logger.debug('node-notifier não disponível, usando notificações básicas');
}

interface NotificationOptions {
  type?: 'info' | 'success' | 'warning' | 'error';
  sound?: boolean;
  wait?: boolean;
}

/**
 * Envia notificação desktop
 */
export function sendDesktopNotification(
  title: string,
  message: string,
  options: NotificationOptions = {}
): void {
  const {
    type = 'info',
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
      logger.warn('Erro ao enviar notificação desktop', { error: (error as Error).message });
    }
  } else {
    // Fallback: apenas log
    logger.info(`[NOTIFICAÇÃO] ${title}: ${message}`, { type });
  }
}

/**
 * Obtém ícone baseado no tipo
 */
function getNotificationIcon(_type: string): string | null {
  // Em produção, você pode usar ícones reais
  // Por enquanto, retornar null (usa ícone padrão do sistema)
  return null;
}

/**
 * Notifica conclusão de automação
 */
export function notifyAutomationComplete(
  usersProcessed: number,
  success: boolean = true,
  error: Error | null = null
): void {
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
      ? `Erro: ${error.message || 'Erro desconhecido'}`
      : 'A automação falhou. Verifique os logs para mais detalhes.';
    
    sendDesktopNotification(title, message, { type: 'error' });
  }
}

/**
 * Notifica progresso
 */
export function notifyProgress(
  current: number,
  total: number,
  message: string = ''
): void {
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
export function notifyCriticalError(
  error: Error,
  context: Record<string, any> = {}
): void {
  const title = '🚨 Erro Crítico';
  const message = `Erro crítico detectado: ${error.message || 'Erro desconhecido'}\n` +
                 `Função: ${context.function || 'Desconhecida'}`;
  
  sendDesktopNotification(title, message, { type: 'error', sound: true });
}

/**
 * Notifica aviso
 */
export function notifyWarning(
  message: string,
  _context: Record<string, any> = {}
): void {
  const title = '⚠️ Aviso';
  sendDesktopNotification(title, message, { type: 'warning', sound: false });
}

/**
 * Gera resumo de execução para notificação
 */
export function generateExecutionSummary(
  usersData: UserData | UserData[] | null,
  metrics: any
): string {
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

interface EmailOptions {
  to?: string;
  from?: string;
  [key: string]: any;
}

/**
 * Envia resumo por e-mail (opcional, requer configuração SMTP)
 */
export async function sendEmailNotification(
  subject: string,
  message: string,
  _options: EmailOptions = {}
): Promise<void> {
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
