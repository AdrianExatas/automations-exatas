import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';
import { generateMetricsReport } from './metrics';
import { getBackupStats } from './backup';
import { getCacheStats } from './selectorCache';
import { generateIntegrityReport } from './dataIntegrity';
import { UserData } from '../types';

interface ReportOptions {
  outputPath?: string;
  title?: string;
  includeMetrics?: boolean;
  includeIntegrity?: boolean;
  includeBackupStats?: boolean;
  includeCacheStats?: boolean;
}

interface FullReportResult {
  html: string;
  text: string;
}

/**
 * Gera relatório HTML completo
 */
export function generateHTMLReport(
  usersData: UserData | UserData[] | null,
  options: ReportOptions = {}
): string {
  const {
    outputPath = path.join(__dirname, '../../reports'),
    title = 'Relatório de Extração de Dados',
    includeMetrics = true,
    includeIntegrity = true,
    includeBackupStats = true,
    includeCacheStats = true
  } = options;

  // Criar diretório se não existir
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `relatorio-${timestamp}.html`;
  const filepath = path.join(outputPath, filename);

  // Coletar dados
  const metricsReport = includeMetrics ? generateMetricsReport() : null;
  const integrityReport = includeIntegrity && usersData ? generateIntegrityReport(Array.isArray(usersData) ? usersData : [usersData]) : null;
  const backupStats = includeBackupStats ? getBackupStats() : null;
  const cacheStats = includeCacheStats ? getCacheStats() : null;
  
  // Usar variáveis para evitar warnings (podem ser usadas no template HTML futuro)
  void backupStats;
  void cacheStats;

  // Gerar HTML (mantendo o template original)
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #667eea;
      margin-bottom: 10px;
    }
    .timestamp {
      color: #999;
      font-size: 14px;
      margin-bottom: 30px;
    }
    .section {
      margin-bottom: 40px;
    }
    .section h2 {
      color: #333;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #667eea;
    }
    .stat-label {
      font-size: 12px;
      color: #999;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 600;
      color: #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #667eea;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-success {
      background: #d4edda;
      color: #155724;
    }
    .badge-warning {
      background: #fff3cd;
      color: #856404;
    }
    .badge-error {
      background: #f8d7da;
      color: #721c24;
    }
    .recommendation {
      background: #e7f3ff;
      border-left: 4px solid #2196F3;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .recommendation.high {
      border-left-color: #f44336;
      background: #ffebee;
    }
    .recommendation.medium {
      border-left-color: #ff9800;
      background: #fff3e0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <div class="timestamp">Gerado em: ${new Date().toLocaleString('pt-BR')}</div>

    ${metricsReport ? `
    <div class="section">
      <h2>📊 Resumo Executivo</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total de Extrações</div>
          <div class="stat-value">${(metricsReport as any).summary?.totalExtractions || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Taxa de Sucesso</div>
          <div class="stat-value">${(metricsReport as any).summary?.successRate || '0%'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Tempo Médio</div>
          <div class="stat-value">${(metricsReport as any).summary?.averageTime || '0ms'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Cache Hit Rate</div>
          <div class="stat-value">${(metricsReport as any).summary?.cacheHitRate || '0%'}</div>
        </div>
      </div>
    </div>
    ` : ''}

    ${integrityReport ? `
    <div class="section">
      <h2>🔍 Validação de Integridade</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total de Usuários</div>
          <div class="stat-value">${(integrityReport as any).summary?.total || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Válidos</div>
          <div class="stat-value">${(integrityReport as any).summary?.valid || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Inválidos</div>
          <div class="stat-value">${(integrityReport as any).summary?.invalid || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Taxa de Validade</div>
          <div class="stat-value">${(integrityReport as any).summary?.validityRate || '0%'}</div>
        </div>
      </div>
    </div>
    ` : ''}

    <div class="section">
      <h2>📝 Informações do Sistema</h2>
      <table>
        <tr>
          <th>Item</th>
          <th>Valor</th>
        </tr>
        <tr>
          <td>Data/Hora de Geração</td>
          <td>${new Date().toLocaleString('pt-BR')}</td>
        </tr>
        <tr>
          <td>Versão do Node.js</td>
          <td>${process.version}</td>
        </tr>
        <tr>
          <td>Plataforma</td>
          <td>${process.platform}</td>
        </tr>
        ${usersData ? `
        <tr>
          <td>Total de Usuários Processados</td>
          <td>${Array.isArray(usersData) ? usersData.length : 1}</td>
        </tr>
        ` : ''}
      </table>
    </div>
  </div>
</body>
</html>
  `;

  try {
    fs.writeFileSync(filepath, html, 'utf8');
    logger.success(`Relatório HTML gerado: ${filepath}`, { filepath });
    return filepath;
  } catch (error) {
    logger.error('Erro ao gerar relatório HTML', error as Error, { filepath });
    throw error;
  }
}

/**
 * Gera relatório em formato texto simples
 */
export function generateTextReport(
  usersData: UserData | UserData[] | null,
  options: ReportOptions = {}
): string {
  const {
    outputPath = path.join(__dirname, '../../reports'),
    title = 'Relatório de Extração de Dados'
  } = options;

  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `relatorio-${timestamp}.txt`;
  const filepath = path.join(outputPath, filename);

  const metricsReport = generateMetricsReport();
  const integrityReport = usersData ? generateIntegrityReport(Array.isArray(usersData) ? usersData : [usersData]) : null;

  let report = `${title}\n`;
  report += `${'='.repeat(60)}\n\n`;
  report += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n\n`;

  if (metricsReport) {
    report += `RESUMO EXECUTIVO\n`;
    report += `${'-'.repeat(60)}\n`;
    report += `Total de Extrações: ${(metricsReport as any).summary?.totalExtractions || 0}\n`;
    report += `Taxa de Sucesso: ${(metricsReport as any).summary?.successRate || '0%'}\n`;
    report += `Tempo Médio: ${(metricsReport as any).summary?.averageTime || '0ms'}\n`;
    report += `Cache Hit Rate: ${(metricsReport as any).summary?.cacheHitRate || '0%'}\n`;
    report += `Total de Erros: ${(metricsReport as any).summary?.totalErrors || 0}\n\n`;
  }

  if (integrityReport) {
    report += `VALIDAÇÃO DE INTEGRIDADE\n`;
    report += `${'-'.repeat(60)}\n`;
    report += `Total: ${(integrityReport as any).summary?.total || 0}\n`;
    report += `Válidos: ${(integrityReport as any).summary?.valid || 0}\n`;
    report += `Inválidos: ${(integrityReport as any).summary?.invalid || 0}\n`;
    report += `Taxa de Validade: ${(integrityReport as any).summary?.validityRate || '0%'}\n\n`;
  }

  try {
    fs.writeFileSync(filepath, report, 'utf8');
    logger.success(`Relatório de texto gerado: ${filepath}`, { filepath });
    return filepath;
  } catch (error) {
    logger.error('Erro ao gerar relatório de texto', error as Error, { filepath });
    throw error;
  }
}

/**
 * Gera relatório completo (HTML + Texto)
 */
export function generateFullReport(
  usersData: UserData | UserData[] | null,
  options: ReportOptions = {}
): FullReportResult {
  const htmlPath = generateHTMLReport(usersData, options);
  const textPath = generateTextReport(usersData, options);
  
  return {
    html: htmlPath,
    text: textPath
  };
}
