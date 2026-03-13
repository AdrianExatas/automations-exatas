import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';
import { getModuleConfig } from '../config';
import { SelectorStrategy } from '../types';

const config = getModuleConfig('automation');
const cacheConfig: { enabled: boolean; ttl: number; maxSize: number } = config.cache || { enabled: true, ttl: 3600000, maxSize: 1000 };

// Cache em memória
const memoryCache = new Map<string, any>();

// Diretório para cache persistente
const cacheDir = path.join(__dirname, '../../cache');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

const cacheFile = path.join(cacheDir, 'selector-cache.json');

interface CacheEntry {
  field: string;
  selector: string | ((page: any) => any);
  success: boolean;
  priority: number;
  stats: {
    hits: number;
    misses: number;
    lastUsed: number;
  };
  metadata: Record<string, any>;
  createdAt: number;
  expiresAt: number;
}

/**
 * Carrega cache do arquivo
 */
function loadCache(): void {
  if (!cacheConfig.enabled) return;
  
  try {
    if (fs.existsSync(cacheFile)) {
      const content = fs.readFileSync(cacheFile, 'utf8');
      const cacheData: Record<string, CacheEntry> = JSON.parse(content);
      
      // Carregar apenas entradas válidas (não expiradas)
      const now = Date.now();
      Object.entries(cacheData).forEach(([key, entry]) => {
        if (entry.expiresAt > now) {
          memoryCache.set(key, entry);
        }
      });
      
      logger.debug(`Cache carregado: ${memoryCache.size} entradas válidas`, { cacheFile });
    }
  } catch (error) {
    logger.warn('Erro ao carregar cache', { error: (error as Error).message, cacheFile });
  }
}

/**
 * Salva cache no arquivo
 */
function saveCache(): void {
  if (!cacheConfig.enabled) return;
  
  try {
    const cacheData: Record<string, CacheEntry> = {};
    memoryCache.forEach((entry, key) => {
      cacheData[key] = entry;
    });
    
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2), 'utf8');
    logger.debug(`Cache salvo: ${memoryCache.size} entradas`, { cacheFile });
  } catch (error) {
    logger.warn('Erro ao salvar cache', { error: (error as Error).message, cacheFile });
  }
}

/**
 * Gera chave de cache para um seletor
 */
function generateCacheKey(field: string, selector: string | ((page: any) => any)): string {
  const selectorStr = typeof selector === 'function' ? 'function' : selector;
  return `${field}:${selectorStr}`;
}

/**
 * Obtém entrada do cache
 */
export function getCached(field: string, selector: string | ((page: any) => any)): CacheEntry | null {
  if (!cacheConfig.enabled) return null;
  
  const key = generateCacheKey(field, selector);
  const entry = memoryCache.get(key);
  
  if (!entry) return null;
  
  // Verificar se expirou
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  
  return entry;
}

/**
 * Adiciona entrada ao cache
 */
export function setCached(
  field: string,
  selector: string | ((page: any) => any),
  success: boolean,
  metadata: Record<string, any> = {}
): void {
  if (!cacheConfig.enabled) return;
  
  const key = generateCacheKey(field, selector);
  const now = Date.now();
  
  // Atualizar estatísticas
  const existing = memoryCache.get(key);
  const stats = existing?.stats || { hits: 0, misses: 0, lastUsed: now };
  
  if (success) {
    stats.hits++;
  } else {
    stats.misses++;
  }
  stats.lastUsed = now;
  
  // Calcular prioridade (mais hits = maior prioridade)
  const priority = stats.hits / (stats.hits + stats.misses + 1);
  
  const entry: CacheEntry = {
    field,
    selector: typeof selector === 'function' ? 'function' : selector,
    success,
    priority,
    stats,
    metadata,
    createdAt: existing?.createdAt || now,
    expiresAt: now + cacheConfig.ttl
  };
  
  memoryCache.set(key, entry);
  
  // Limitar tamanho do cache
  if (memoryCache.size > cacheConfig.maxSize) {
    // Remover entradas menos usadas
    const entries = Array.from(memoryCache.entries());
    entries.sort((a, b) => {
      const priorityA = a[1].priority || 0;
      const priorityB = b[1].priority || 0;
      const lastUsedA = a[1].stats?.lastUsed || 0;
      const lastUsedB = b[1].stats?.lastUsed || 0;
      
      // Ordenar por prioridade, depois por último uso
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return lastUsedA - lastUsedB;
    });
    
    // Remover 10% das entradas menos prioritárias
    const toRemove = Math.floor(cacheConfig.maxSize * 0.1);
    for (let i = 0; i < toRemove; i++) {
      memoryCache.delete(entries[i][0]);
    }
  }
  
  // Salvar periodicamente (a cada 10 entradas)
  if (memoryCache.size % 10 === 0) {
    saveCache();
  }
}

/**
 * Obtém seletores ordenados por prioridade (cache)
 */
export function getOrderedSelectors(field: string, selectors: SelectorStrategy[]): SelectorStrategy[] {
  if (!cacheConfig.enabled || !selectors || selectors.length === 0) {
    return selectors;
  }
  
  // Mapear seletores com suas prioridades
  const withPriority = selectors.map(selector => {
    const cached = getCached(field, selector.selector);
    const priority = cached?.priority || 0;
    return {
      selector,
      priority,
      cached
    };
  });
  
  // Ordenar por prioridade (maior primeiro)
  withPriority.sort((a, b) => b.priority - a.priority);
  
  // Retornar apenas os seletores
  return withPriority.map(item => item.selector);
}

/**
 * Invalida cache para um campo específico
 */
export function invalidateCache(field: string | null = null): void {
  if (field) {
    const keysToDelete: string[] = [];
    memoryCache.forEach((_entry, key) => {
      if (key.startsWith(`${field}:`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => memoryCache.delete(key));
    logger.debug(`Cache invalidado para campo: ${field}`, { field, removed: keysToDelete.length });
  } else {
    memoryCache.clear();
    logger.debug('Cache completamente invalidado');
  }
  saveCache();
}

/**
 * Obtém estatísticas do cache
 */
export function getCacheStats(): {
  totalEntries: number;
  byField: Record<string, any>;
  topPerformers: Array<{ key: string; field: string; selector: string; successRate: number; hits: number; misses: number }>;
  worstPerformers: Array<{ key: string; field: string; selector: string; successRate: number; hits: number; misses: number }>;
} {
  const stats: {
    totalEntries: number;
    byField: Record<string, any>;
    topPerformers: Array<{ key: string; field: string; selector: string; successRate: number; hits: number; misses: number }>;
    worstPerformers: Array<{ key: string; field: string; selector: string; successRate: number; hits: number; misses: number }>;
  } = {
    totalEntries: memoryCache.size,
    byField: {},
    topPerformers: [],
    worstPerformers: []
  };
  
  memoryCache.forEach((entry, key) => {
    const field = entry.field;
    if (!stats.byField[field]) {
      stats.byField[field] = {
        count: 0,
        totalHits: 0,
        totalMisses: 0
      };
    }
    
    stats.byField[field].count++;
    stats.byField[field].totalHits += entry.stats.hits;
    stats.byField[field].totalMisses += entry.stats.misses;
    
    const successRate = entry.stats.hits / (entry.stats.hits + entry.stats.misses + 1);
    stats.topPerformers.push({
      key,
      field,
      selector: entry.selector as string,
      successRate,
      hits: entry.stats.hits,
      misses: entry.stats.misses
    });
  });
  
  // Ordenar por taxa de sucesso
  stats.topPerformers.sort((a, b) => b.successRate - a.successRate);
  stats.worstPerformers = [...stats.topPerformers].reverse();
  
  // Limitar a top 10
  stats.topPerformers = stats.topPerformers.slice(0, 10);
  stats.worstPerformers = stats.worstPerformers.slice(0, 10);
  
  return stats;
}

// Carregar cache na inicialização
loadCache();

// Salvar cache ao sair
process.on('exit', () => {
  saveCache();
});

process.on('SIGINT', () => {
  saveCache();
  process.exit();
});
