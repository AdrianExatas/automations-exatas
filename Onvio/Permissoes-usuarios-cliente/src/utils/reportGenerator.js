const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { getMetrics, generateMetricsReport } = require('./metrics');
const { getBackupStats } = require('./backup');
const { getCacheStats } = require('./selectorCache');
const { generateIntegrityReport } = require('./dataIntegrity');

/**
 * Gera relatório HTML completo
 */
function generateHTMLReport(usersData, options = {}) {
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
  const metrics = includeMetrics ? getMetrics() : null;
  const metricsReport = includeMetrics ? generateMetricsReport() : null;
  const integrityReport = includeIntegrity && usersData ? generateIntegrityReport(usersData) : null;
  const backupStats = includeBackupStats ? getBackupStats() : null;
  const cacheStats = includeCacheStats ? getCacheStats() : null;

  // Gerar HTML
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
    .chart-container {
      margin: 20px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 6px;
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
          <div class="stat-value">${metricsReport.summary.totalExtractions || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Taxa de Sucesso</div>
          <div class="stat-value">${metricsReport.summary.successRate || '0%'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Tempo Médio</div>
          <div class="stat-value">${metricsReport.summary.averageTime || '0ms'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Cache Hit Rate</div>
          <div class="stat-value">${metricsReport.summary.cacheHitRate || '0%'}</div>
        </div>
      </div>
    </div>
    ` : ''}

    ${metricsReport && metricsReport.topFields.length > 0 ? `
    <div class="section">
      <h2>📋 Campos Mais Extraídos</h2>
      <table>
        <thead>
          <tr>
            <th>Campo</th>
            <th>Total</th>
            <th>Sucesso</th>
            <th>Falhas</th>
            <th>Taxa de Sucesso</th>
            <th>Tempo Médio</th>
          </tr>
        </thead>
        <tbody>
          ${metricsReport.topFields.map(field => `
            <tr>
              <td><strong>${field.field}</strong></td>
              <td>${field.total}</td>
              <td>${field.successful}</td>
              <td>${field.failed}</td>
              <td><span class="badge ${parseFloat(field.successRate) >= 80 ? 'badge-success' : parseFloat(field.successRate) >= 50 ? 'badge-warning' : 'badge-error'}">${field.successRate}</span></td>
              <td>${field.averageTime}ms</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${metricsReport && metricsReport.topFunctions.length > 0 ? `
    <div class="section">
      <h2>⚙️ Funções Mais Utilizadas</h2>
      <table>
        <thead>
          <tr>
            <th>Função</th>
            <th>Total</th>
            <th>Sucesso</th>
            <th>Falhas</th>
            <th>Taxa de Sucesso</th>
            <th>Tempo Médio</th>
          </tr>
        </thead>
        <tbody>
          ${metricsReport.topFunctions.map(func => `
            <tr>
              <td><code>${func.function}</code></td>
              <td>${func.total}</td>
              <td>${func.successful}</td>
              <td>${func.failed}</td>
              <td><span class="badge ${parseFloat(func.successRate) >= 80 ? 'badge-success' : parseFloat(func.successRate) >= 50 ? 'badge-warning' : 'badge-error'}">${func.successRate}</span></td>
              <td>${func.averageTime}ms</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${integrityReport ? `
    <div class="section">
      <h2>🔍 Validação de Integridade</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total de Usuários</div>
          <div class="stat-value">${integrityReport.summary.total || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Válidos</div>
          <div class="stat-value">${integrityReport.summary.valid || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Inválidos</div>
          <div class="stat-value">${integrityReport.summary.invalid || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Taxa de Validade</div>
          <div class="stat-value">${integrityReport.summary.validityRate || '0%'}</div>
        </div>
      </div>
      
      ${integrityReport.recommendations.length > 0 ? `
      <h3 style="margin-top: 20px; margin-bottom: 10px;">Recomendações</h3>
      ${integrityReport.recommendations.map(rec => `
        <div class="recommendation ${rec.priority}">
          <strong>${rec.type === 'validation' ? 'Validação' : rec.type === 'inconsistency' ? 'Inconsistência' : 'Duplicata'}</strong> (${rec.priority}): ${rec.message}
        </div>
      `).join('')}
      ` : ''}
    </div>
    ` : ''}

    ${metricsReport && metricsReport.errorBreakdown ? `
    <div class="section">
      <h2>❌ Análise de Erros</h2>
      <table>
        <thead>
          <tr>
            <th>Tipo de Erro</th>
            <th>Quantidade</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(metricsReport.errorBreakdown).map(([type, count]) => `
            <tr>
              <td>${type}</td>
              <td>${count}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${cacheStats && cacheStats.totalEntries > 0 ? `
    <div class="section">
      <h2>💾 Estatísticas de Cache</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total de Entradas</div>
          <div class="stat-value">${cacheStats.totalEntries}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Top Performers</div>
          <div class="stat-value">${cacheStats.topPerformers.length}</div>
        </div>
      </div>
    </div>
    ` : ''}

    ${backupStats && backupStats.enabled ? `
    <div class="section">
      <h2>💾 Estatísticas de Backup</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total de Backups</div>
          <div class="stat-value">${backupStats.totalBackups}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Tamanho Total</div>
          <div class="stat-value">${backupStats.totalSizeMB} MB</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Retenção</div>
          <div class="stat-value">${backupStats.retentionDays} dias</div>
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
    logger.error('Erro ao gerar relatório HTML', error, { filepath });
    throw error;
  }
}

/**
 * Gera relatório em formato texto simples
 */
function generateTextReport(usersData, options = {}) {
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

  const metrics = getMetrics();
  const metricsReport = generateMetricsReport();
  const integrityReport = usersData ? generateIntegrityReport(usersData) : null;

  let report = `${title}\n`;
  report += `${'='.repeat(60)}\n\n`;
  report += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n\n`;

  if (metricsReport) {
    report += `RESUMO EXECUTIVO\n`;
    report += `${'-'.repeat(60)}\n`;
    report += `Total de Extrações: ${metricsReport.summary.totalExtractions || 0}\n`;
    report += `Taxa de Sucesso: ${metricsReport.summary.successRate || '0%'}\n`;
    report += `Tempo Médio: ${metricsReport.summary.averageTime || '0ms'}\n`;
    report += `Cache Hit Rate: ${metricsReport.summary.cacheHitRate || '0%'}\n`;
    report += `Total de Erros: ${metricsReport.summary.totalErrors || 0}\n\n`;
  }

  if (integrityReport) {
    report += `VALIDAÇÃO DE INTEGRIDADE\n`;
    report += `${'-'.repeat(60)}\n`;
    report += `Total: ${integrityReport.summary.total || 0}\n`;
    report += `Válidos: ${integrityReport.summary.valid || 0}\n`;
    report += `Inválidos: ${integrityReport.summary.invalid || 0}\n`;
    report += `Taxa de Validade: ${integrityReport.summary.validityRate || '0%'}\n\n`;
  }

  if (metricsReport && metricsReport.topFields.length > 0) {
    report += `CAMPOS MAIS EXTRAÍDOS\n`;
    report += `${'-'.repeat(60)}\n`;
    metricsReport.topFields.forEach(field => {
      report += `${field.field}: ${field.total} extrações, ${field.successRate} sucesso\n`;
    });
    report += `\n`;
  }

  try {
    fs.writeFileSync(filepath, report, 'utf8');
    logger.success(`Relatório de texto gerado: ${filepath}`, { filepath });
    return filepath;
  } catch (error) {
    logger.error('Erro ao gerar relatório de texto', error, { filepath });
    throw error;
  }
}

/**
 * Gera relatório completo (HTML + Texto)
 */
function generateFullReport(usersData, options = {}) {
  const htmlPath = generateHTMLReport(usersData, options);
  const textPath = generateTextReport(usersData, options);
  
  return {
    html: htmlPath,
    text: textPath
  };
}

module.exports = {
  generateHTMLReport,
  generateTextReport,
  generateFullReport
};
