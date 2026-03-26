import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';
import { getModuleConfig } from '../config';

const config = getModuleConfig('automation');
const backupConfig: { enabled: boolean; retentionDays: number; maxBackups: number } = config.backup || { enabled: true, retentionDays: 30, maxBackups: 100 };

// Diretório de backups
const backupDir: string = config.directories?.backups || path.join(__dirname, '../../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

interface BackupOptions {
  customPath?: string;
  suffix?: string;
}

interface BackupInfo {
  name: string;
  path: string;
  size: number;
  created: Date;
  modified: Date;
}

/**
 * Gera nome de arquivo de backup com timestamp
 */
function generateBackupFilename(originalPath: string, suffix: string = ''): string {
  const ext = path.extname(originalPath);
  const basename = path.basename(originalPath, ext);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                    new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  const suffixStr = suffix ? `_${suffix}` : '';
  return path.join(backupDir, `${basename}${suffixStr}_${timestamp}${ext}`);
}

/**
 * Cria backup de um arquivo
 */
export function createBackup(filePath: string, options: BackupOptions = {}): string | null {
  if (!backupConfig.enabled) {
    logger.debug('Backup desabilitado, pulando...', { filePath });
    return null;
  }

  try {
    if (!fs.existsSync(filePath)) {
      logger.warn('Arquivo não existe para backup', { filePath });
      return null;
    }

    const backupPath = options.customPath || generateBackupFilename(filePath, options.suffix);
    
    // Criar diretório se não existir
    const backupDirPath = path.dirname(backupPath);
    if (!fs.existsSync(backupDirPath)) {
      fs.mkdirSync(backupDirPath, { recursive: true });
    }

    // Copiar arquivo
    fs.copyFileSync(filePath, backupPath);
    
    const stats = fs.statSync(backupPath);
    logger.info(`Backup criado: ${backupPath}`, { 
      original: filePath, 
      backup: backupPath, 
      size: stats.size 
    });

    // Limpar backups antigos
    cleanupOldBackups(path.basename(filePath));

    return backupPath;
  } catch (error) {
    logger.error('Erro ao criar backup', error as Error, { filePath, function: 'createBackup' });
    return null;
  }
}

/**
 * Limpa backups antigos
 */
export function cleanupOldBackups(fileBasename: string): void {
  try {
    const files = fs.readdirSync(backupDir);
    const backups = files
      .filter(file => file.includes(fileBasename) && file.includes('_'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          mtime: stats.mtime,
          age: Date.now() - stats.mtime.getTime()
        };
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // Mais recentes primeiro

    // Remover backups que excedem retenção
    const retentionMs = backupConfig.retentionDays * 24 * 60 * 60 * 1000;
    let removedCount = 0;
    
    backups.forEach(backup => {
      if (backup.age > retentionMs) {
        try {
          fs.unlinkSync(backup.path);
          removedCount++;
          logger.debug(`Backup antigo removido: ${backup.name}`, { 
            age: Math.floor(backup.age / (24 * 60 * 60 * 1000)) + ' dias' 
          });
        } catch (error) {
          logger.warn('Erro ao remover backup antigo', { error: (error as Error).message, file: backup.name });
        }
      }
    });

    // Remover backups que excedem limite máximo (manter os mais recentes)
    if (backups.length - removedCount > backupConfig.maxBackups) {
      const toRemove = backups.slice(backupConfig.maxBackups);
      toRemove.forEach(backup => {
        try {
          if (fs.existsSync(backup.path)) {
            fs.unlinkSync(backup.path);
            removedCount++;
            logger.debug(`Backup removido (limite máximo): ${backup.name}`);
          }
        } catch (error) {
          logger.warn('Erro ao remover backup (limite)', { error: (error as Error).message, file: backup.name });
        }
      });
    }

    if (removedCount > 0) {
      logger.info(`${removedCount} backup(s) antigo(s) removido(s)`, { 
        retentionDays: backupConfig.retentionDays, 
        maxBackups: backupConfig.maxBackups 
      });
    }
  } catch (error) {
    logger.warn('Erro ao limpar backups antigos', { error: (error as Error).message });
  }
}

/**
 * Lista backups disponíveis para um arquivo
 */
export function listBackups(fileBasename: string): BackupInfo[] {
  try {
    const files = fs.readdirSync(backupDir);
    const backups = files
      .filter(file => file.includes(fileBasename) && file.includes('_'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.modified.getTime() - a.modified.getTime()); // Mais recentes primeiro

    return backups;
  } catch (error) {
    logger.error('Erro ao listar backups', error as Error, { fileBasename });
    return [];
  }
}

/**
 * Restaura arquivo de um backup
 */
export function restoreFromBackup(backupPath: string, targetPath: string): string {
  try {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup não encontrado: ${backupPath}`);
    }

    // Criar backup do arquivo atual antes de restaurar
    if (fs.existsSync(targetPath)) {
      createBackup(targetPath, { suffix: 'pre-restore' });
    }

    // Criar diretório se não existir
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Copiar backup para destino
    fs.copyFileSync(backupPath, targetPath);
    
    logger.success(`Arquivo restaurado de backup: ${targetPath}`, { 
      backup: backupPath, 
      target: targetPath 
    });

    return targetPath;
  } catch (error) {
    logger.error('Erro ao restaurar backup', error as Error, { backupPath, targetPath });
    throw error;
  }
}

/**
 * Obtém o backup mais recente de um arquivo
 */
export function getLatestBackup(fileBasename: string): BackupInfo | null {
  const backups = listBackups(fileBasename);
  return backups.length > 0 ? backups[0] : null;
}

/**
 * Cria backup antes de salvar (wrapper para saveToExcel)
 */
export async function withBackup<T>(
  saveFunction: (filePath: string, ...args: any[]) => Promise<T>,
  filePath: string,
  ...args: any[]
): Promise<T> {
  // Criar backup do arquivo existente se houver
  if (fs.existsSync(filePath)) {
    createBackup(filePath, { suffix: 'pre-save' });
  }

  try {
    // Executar função de salvamento
    const result = await saveFunction(filePath, ...args);
    
    // Criar backup do arquivo salvo
    if (fs.existsSync(filePath)) {
      createBackup(filePath, { suffix: 'post-save' });
    }

    return result;
  } catch (error) {
    // Em caso de erro, tentar restaurar backup anterior
    const latestBackup = getLatestBackup(path.basename(filePath));
    if (latestBackup) {
      logger.warn('Erro ao salvar, tentando restaurar backup anterior', { 
        error: (error as Error).message, 
        backup: latestBackup.path 
      });
      try {
        restoreFromBackup(latestBackup.path, filePath);
      } catch (restoreError) {
        logger.error('Erro ao restaurar backup após falha', restoreError as Error);
      }
    }
    throw error;
  }
}

/**
 * Obtém estatísticas de backups
 */
export function getBackupStats(): {
  totalBackups: number;
  totalSize: number;
  totalSizeMB: string;
  backupDir: string;
  retentionDays?: number;
  maxBackups?: number;
  enabled: boolean;
} {
  try {
    const files = fs.readdirSync(backupDir);
    const totalSize = files.reduce((total, file) => {
      try {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return total + stats.size;
      } catch {
        return total;
      }
    }, 0);

    return {
      totalBackups: files.length,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      backupDir,
      retentionDays: backupConfig.retentionDays,
      maxBackups: backupConfig.maxBackups,
      enabled: backupConfig.enabled
    };
  } catch (error) {
    logger.error('Erro ao obter estatísticas de backup', error as Error);
    return {
      totalBackups: 0,
      totalSize: 0,
      totalSizeMB: '0',
      backupDir,
      enabled: backupConfig.enabled
    };
  }
}
