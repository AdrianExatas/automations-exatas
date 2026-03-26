import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';
import { getModuleConfig } from '../config';

const config = getModuleConfig('automation');

interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'unhealthy' | 'warning';
  message: string;
  details?: any;
}

interface HealthCheckReport {
  overall: 'healthy' | 'unhealthy' | 'warning';
  timestamp: string;
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    warnings: number;
  };
}

/**
 * Verifica se Playwright está instalado e acessível
 */
async function checkPlaywright(): Promise<HealthCheckResult> {
  try {
    const playwright = require('@playwright/test');
    if (playwright && playwright.chromium) {
      return {
        name: 'Playwright',
        status: 'healthy',
        message: 'Playwright está instalado e acessível',
        details: { version: require('@playwright/test/package.json').version }
      };
    }
    return {
      name: 'Playwright',
      status: 'unhealthy',
      message: 'Playwright não está corretamente instalado'
    };
  } catch (error) {
    return {
      name: 'Playwright',
      status: 'unhealthy',
      message: `Erro ao verificar Playwright: ${(error as Error).message}`
    };
  }
}

/**
 * Verifica se Electron está disponível
 */
function checkElectron(): HealthCheckResult {
  try {
    const electron = require('electron');
    if (electron && electron.app) {
      return {
        name: 'Electron',
        status: 'healthy',
        message: 'Electron está disponível',
        details: { version: process.versions.electron || 'N/A' }
      };
    }
    return {
      name: 'Electron',
      status: 'warning',
      message: 'Electron pode não estar disponível (normal em ambiente Node.js puro)'
    };
  } catch (error) {
    return {
      name: 'Electron',
      status: 'warning',
      message: 'Electron não está disponível (normal em ambiente Node.js puro)'
    };
  }
}

/**
 * Verifica permissões de escrita nos diretórios necessários
 */
function checkFilePermissions(): HealthCheckResult {
  const requiredDirs = [
    config.directories?.testResults || path.join(__dirname, '../../test-results'),
    config.directories?.logs || path.join(__dirname, '../../logs'),
    config.directories?.backups || path.join(__dirname, '../../backups')
  ];

  const issues: string[] = [];
  const accessible: string[] = [];

  requiredDirs.forEach(dir => {
    try {
      // Criar diretório se não existir
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Testar escrita
      const testFile = path.join(dir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      accessible.push(dir);
    } catch (error) {
      issues.push(`${dir}: ${(error as Error).message}`);
    }
  });

  if (issues.length === 0) {
    return {
      name: 'Permissões de Arquivo',
      status: 'healthy',
      message: 'Todos os diretórios são acessíveis',
      details: { accessible: accessible.length, total: requiredDirs.length }
    };
  }

  return {
    name: 'Permissões de Arquivo',
    status: 'unhealthy',
    message: `Problemas de acesso em ${issues.length} diretório(s)`,
    details: { issues, accessible: accessible.length }
  };
}

/**
 * Verifica conectividade de rede básica
 */
async function checkNetworkConnectivity(): Promise<HealthCheckResult> {
  try {
    // Verificar se podemos resolver DNS
    const dns = require('dns').promises;
    await dns.lookup('google.com');
    
    return {
      name: 'Conectividade de Rede',
      status: 'healthy',
      message: 'Conectividade de rede OK'
    };
  } catch (error) {
    return {
      name: 'Conectividade de Rede',
      status: 'warning',
      message: `Problemas de conectividade: ${(error as Error).message}`,
      details: { note: 'A automação pode falhar se não houver internet' }
    };
  }
}

/**
 * Verifica se as variáveis de ambiente necessárias estão configuradas
 * Verifica primeiro o arquivo .env, depois process.env como fallback
 */
function checkEnvironmentVariables(): HealthCheckResult {
  const required = ['ONVIO_EMAIL', 'ONVIO_PASSWORD', 'ONVIO_CLIENT_ID'];
  const missing: string[] = [];
  const present: string[] = [];
  let envFileExists = false;
  let envFileLoaded = false;

  // Tentar carregar do arquivo .env primeiro
  const envPath = path.join(__dirname, '../..', '.env');
  if (fs.existsSync(envPath)) {
    envFileExists = true;
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      
      envLines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const equalIndex = trimmedLine.indexOf('=');
          if (equalIndex > 0) {
            const key = trimmedLine.substring(0, equalIndex).trim();
            const value = trimmedLine.substring(equalIndex + 1).trim();
            
            // Carregar no process.env se ainda não estiver definido
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      });
      envFileLoaded = true;
    } catch (error) {
      logger.warn(`Erro ao ler arquivo .env: ${(error as Error).message}`);
    }
  }

  // Verificar se as variáveis estão disponíveis (agora em process.env após carregar .env)
  required.forEach(key => {
    if (process.env[key]) {
      present.push(key);
    } else {
      missing.push(key);
    }
  });

  if (missing.length === 0) {
    const source = envFileLoaded ? 'arquivo .env' : 'variáveis de ambiente do sistema';
    return {
      name: 'Variáveis de Ambiente',
      status: 'healthy',
      message: `Todas as variáveis de ambiente necessárias estão configuradas (${source})`,
      details: { 
        configured: present.length,
        source: envFileLoaded ? '.env file' : 'system environment',
        envFileExists
      }
    };
  }

  // Se faltam variáveis, verificar se o arquivo .env existe mas está incompleto
  if (envFileExists && missing.length > 0) {
    return {
      name: 'Variáveis de Ambiente',
      status: 'unhealthy',
      message: `${missing.length} variável(is) de ambiente faltando no arquivo .env`,
      details: { 
        missing, 
        present: present.length,
        envFileExists: true,
        note: 'Arquivo .env encontrado, mas está incompleto. Verifique se ONVIO_EMAIL, ONVIO_PASSWORD e ONVIO_CLIENT_ID estão definidos.'
      }
    };
  }

  return {
    name: 'Variáveis de Ambiente',
    status: 'unhealthy',
    message: `${missing.length} variável(is) de ambiente faltando`,
    details: { 
      missing, 
      present: present.length,
      envFileExists: false,
      note: 'Configure as variáveis no arquivo .env ou como variáveis de ambiente do sistema'
    }
  };
}

/**
 * Verifica se os módulos principais estão carregáveis
 */
function checkModuleImports(): HealthCheckResult {
  const modules = [
    { name: 'logger', path: './logger' },
    { name: 'config', path: '../config' },
    { name: 'metrics', path: './metrics' },
    { name: 'backup', path: './backup' }
  ];

  const loaded: string[] = [];
  const failed: Array<{ name: string; error: string }> = [];

  modules.forEach(module => {
    try {
      require(module.path);
      loaded.push(module.name);
    } catch (error) {
      failed.push({ name: module.name, error: (error as Error).message });
    }
  });

  if (failed.length === 0) {
    return {
      name: 'Módulos',
      status: 'healthy',
      message: 'Todos os módulos principais estão carregáveis',
      details: { loaded: loaded.length }
    };
  }

  return {
    name: 'Módulos',
    status: 'unhealthy',
    message: `${failed.length} módulo(s) com problemas`,
    details: { failed, loaded: loaded.length }
  };
}

/**
 * Executa todos os health checks
 */
export async function runHealthChecks(): Promise<HealthCheckReport> {
  logger.info('Executando health checks...');

  const checks: HealthCheckResult[] = [];

  // Executar checks síncronos
  checks.push(checkElectron());
  checks.push(checkFilePermissions());
  checks.push(checkEnvironmentVariables());
  checks.push(checkModuleImports());

  // Executar checks assíncronos
  checks.push(await checkPlaywright());
  checks.push(await checkNetworkConnectivity());

  // Calcular resumo
  const summary = {
    total: checks.length,
    healthy: checks.filter(c => c.status === 'healthy').length,
    unhealthy: checks.filter(c => c.status === 'unhealthy').length,
    warnings: checks.filter(c => c.status === 'warning').length
  };

  // Determinar status geral
  let overall: 'healthy' | 'unhealthy' | 'warning' = 'healthy';
  if (summary.unhealthy > 0) {
    overall = 'unhealthy';
  } else if (summary.warnings > 0) {
    overall = 'warning';
  }

  const report: HealthCheckReport = {
    overall,
    timestamp: new Date().toISOString(),
    checks,
    summary
  };

  // Log do resultado
  if (overall === 'healthy') {
    logger.success('Health checks: Todos os sistemas operacionais', { summary });
  } else if (overall === 'warning') {
    logger.warn('Health checks: Alguns avisos detectados', { summary, checks: checks.filter(c => c.status === 'warning') });
  } else {
    logger.error('Health checks: Problemas críticos detectados', new Error('Health check failed'), { summary, checks: checks.filter(c => c.status === 'unhealthy') });
  }

  return report;
}

/**
 * Verifica saúde rápida (apenas checks críticos)
 */
export async function quickHealthCheck(): Promise<boolean> {
  const criticalChecks = [
    checkPlaywright(),
    checkFilePermissions(),
    checkEnvironmentVariables()
  ];

  const results = await Promise.all(criticalChecks);
  return results.every(r => r.status === 'healthy');
}
