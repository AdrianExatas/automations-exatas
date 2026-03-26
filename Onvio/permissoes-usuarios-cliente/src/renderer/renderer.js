// Estado da aplicação
let isRunning = false;
let startTime = null;
let logInterval = null;
let metricsInterval = null;
let currentMetrics = {
  usersProcessed: 0,
  successRate: 0,
  avgTime: 0,
  cacheHitRate: 0
};

// Elementos DOM
const configForm = document.getElementById('configForm');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const loadEnvBtn = document.getElementById('loadEnvBtn');
const logsContent = document.getElementById('logsContent');
const clearLogsBtn = document.getElementById('clearLogsBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const statusTime = document.getElementById('statusTime');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const fileList = document.getElementById('fileList');
const metricUsersProcessed = document.getElementById('metricUsersProcessed');
const metricSuccessRate = document.getElementById('metricSuccessRate');
const metricAvgTime = document.getElementById('metricAvgTime');
const metricCacheHitRate = document.getElementById('metricCacheHitRate');
const historySection = document.getElementById('historySection');
const historyList = document.getElementById('historyList');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  loadExcelFiles();
  setupEventListeners();
  setupElectronListeners();
});

// Configurar listeners de eventos
function setupEventListeners() {
  configForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await startAutomation();
  });

  stopBtn.addEventListener('click', async () => {
    await stopAutomation();
  });

  loadEnvBtn.addEventListener('click', async () => {
    await loadEnvCredentials();
  });

  const healthCheckBtn = document.getElementById('healthCheckBtn');
  if (healthCheckBtn) {
    healthCheckBtn.addEventListener('click', async () => {
      await runHealthCheck();
    });
  }

  clearLogsBtn.addEventListener('click', () => {
    logsContent.innerHTML = '';
    addLog('Logs limpos', 'info');
  });
}

// Configurar listeners do Electron
function setupElectronListeners() {
  window.electronAPI.onAutomationLog((data) => {
    addLog(data, 'info');
  });

  window.electronAPI.onAutomationComplete((data) => {
    if (data.success) {
      updateStatus('success', 'Automação concluída com sucesso!');
      addLog('\n✅ Automação concluída com sucesso!', 'success');
      
      // Atualizar métricas finais
      if (data.metrics) {
        updateMetrics(data.metrics);
        addToHistory(data.metrics);
      }
      
      loadExcelFiles();
    } else {
      updateStatus('error', 'Erro na automação');
      addLog(`\n❌ Erro: ${data.error || 'Erro desconhecido'}`, 'error');
    }
    stopAutomation();
  });

  // Listener para métricas em tempo real (se disponível)
  if (window.electronAPI.onMetricsUpdate) {
    window.electronAPI.onMetricsUpdate((metrics) => {
      updateMetrics(metrics);
    });
  }
}

// Iniciar automação
async function startAutomation() {
  if (isRunning) return;

  const formData = new FormData(configForm);
  const config = {
    email: formData.get('email'),
    password: formData.get('password'),
    clientId: formData.get('clientId'),
    mfaMethod: formData.get('mfaMethod'),
    mfaCode: formData.get('mfaCode')
  };

  if (!config.email || !config.password || !config.clientId) {
    addLog('❌ Por favor, preencha todos os campos obrigatórios', 'error');
    return;
  }

  try {
    isRunning = true;
    startTime = Date.now();
    updateStatus('running', 'Executando...');
    startBtn.disabled = true;
    stopBtn.disabled = false;
    progressBar.classList.add('active');
    
    addLog('🚀 Iniciando automação...', 'info');
    addLog(`📧 E-mail: ${config.email}`, 'info');
    addLog(`🆔 Cliente ID: ${config.clientId}`, 'info');
    addLog(`🔐 Método MFA: ${config.mfaMethod}`, 'info');
    addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');

    await window.electronAPI.startAutomation(config);
    
    // Resetar métricas
    currentMetrics = {
      usersProcessed: 0,
      successRate: 0,
      avgTime: 0,
      cacheHitRate: 0
    };
    updateMetricsDisplay();
    
    logInterval = setInterval(updateElapsedTime, 1000);
    metricsInterval = setInterval(updateMetricsFromAPI, 2000); // Atualizar métricas a cada 2s
    
  } catch (error) {
    addLog(`❌ Erro ao iniciar automação: ${error.message}`, 'error');
    stopAutomation();
  }
}

// Parar automação
async function stopAutomation() {
  if (!isRunning) return;

  try {
    await window.electronAPI.stopAutomation();
    addLog('\n⏹ Automação interrompida pelo usuário', 'warning');
  } catch (error) {
    addLog(`❌ Erro ao parar automação: ${error.message}`, 'error');
  } finally {
    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    progressBar.classList.remove('active');
    progressFill.style.width = '0%';
    
    if (logInterval) {
      clearInterval(logInterval);
      logInterval = null;
    }
    
    if (metricsInterval) {
      clearInterval(metricsInterval);
      metricsInterval = null;
    }
    
    updateStatus('idle', 'Pronto');
    startTime = null;
    statusTime.textContent = '';
  }
}

/**
 * Remove códigos ANSI de escape de uma string
 */
function stripAnsiCodes(text) {
  // Remove códigos ANSI (ex: \x1b[32m, [0m, etc.)
  return text
    .replace(/\x1b\[[0-9;]*m/g, '') // Remove códigos de cor ANSI
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '') // Remove outros códigos de escape ANSI
    .replace(/\[32m|\[33m|\[31m|\[36m|\[0m/g, ''); // Remove códigos específicos comuns
}

// Adicionar log
function addLog(message, type = 'info') {
  const logLine = document.createElement('div');
  logLine.className = `log-line ${type}`;
  
  // Remover códigos ANSI primeiro
  let cleanMessage = stripAnsiCodes(message);
  
  // Processar emojis e formatação
  const processedMessage = cleanMessage
    .replace(/\n/g, '<br>')
    .replace(/✅/g, '<span style="color: #4ec9b0;">✅</span>')
    .replace(/❌/g, '<span style="color: #f48771;">❌</span>')
    .replace(/⚠️/g, '<span style="color: #dcdcaa;">⚠️</span>')
    .replace(/📋/g, '<span style="color: #4ec9b0;">📋</span>')
    .replace(/🚀/g, '<span style="color: #4ec9b0;">🚀</span>')
    .replace(/⏹/g, '<span style="color: #dcdcaa;">⏹</span>');
  
  logLine.innerHTML = processedMessage;
  logsContent.appendChild(logLine);
  
  logsContent.scrollTop = logsContent.scrollHeight;
}

// Atualizar status
function updateStatus(status, text) {
  statusDot.className = `status-dot ${status}`;
  statusText.textContent = text;
}

// Atualizar tempo decorrido
function updateElapsedTime() {
  if (!startTime) return;
  
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  
  statusTime.textContent = `⏱ ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  if (isRunning) {
    const progress = Math.min(95, (elapsed / 600) * 100);
    progressFill.style.width = `${progress}%`;
  }
}

// Carregar lista de arquivos Excel
async function loadExcelFiles() {
  try {
    const files = await window.electronAPI.getExcelFiles();
    renderFileList(files);
  } catch (error) {
    console.error('Erro ao carregar arquivos:', error);
  }
}

// Renderizar lista de arquivos
function renderFileList(files) {
  if (files.length === 0) {
    fileList.innerHTML = `
      <li class="empty-state">
        <div class="empty-state-icon">📄</div>
        <div>Nenhum arquivo ainda</div>
      </li>
    `;
    return;
  }

  fileList.innerHTML = files.map(file => {
    const date = new Date(file.modified);
    const dateStr = date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const sizeKB = (file.size / 1024).toFixed(2);
    
    return `
      <li class="file-item" onclick="openFile('${file.path.replace(/\\/g, '\\\\')}')">
        <div>
          <div class="file-name">📊 ${file.name}</div>
          <div class="file-date">${dateStr} • ${sizeKB} KB</div>
        </div>
      </li>
    `;
  }).join('');
}

// Abrir arquivo
async function openFile(filePath) {
  try {
    await window.electronAPI.openFile(filePath);
  } catch (error) {
    addLog(`❌ Erro ao abrir arquivo: ${error.message}`, 'error');
  }
}

// Executar health check
async function runHealthCheck() {
  try {
    const healthCheckBtn = document.getElementById('healthCheckBtn');
    if (healthCheckBtn) {
      healthCheckBtn.disabled = true;
      healthCheckBtn.textContent = '⏳ Verificando...';
    }
    
    addLog('🏥 Executando verificação de saúde do sistema...', 'info');
    const report = await window.electronAPI.runHealthChecks();
    
    if (report.overall === 'healthy') {
      addLog('✅ Sistema saudável! Todos os checks passaram.', 'success');
      addLog(`📊 Resumo: ${report.summary.healthy}/${report.summary.total} checks saudáveis`, 'info');
    } else if (report.overall === 'warning') {
      addLog('⚠️ Sistema com avisos. Alguns checks falharam.', 'warning');
      addLog(`📊 Resumo: ${report.summary.healthy} saudáveis, ${report.summary.warnings} avisos`, 'warning');
      
      report.checks.filter(c => c.status === 'warning').forEach(check => {
        addLog(`  ⚠️ ${check.name}: ${check.message}`, 'warning');
      });
    } else {
      addLog('❌ Sistema com problemas críticos!', 'error');
      addLog(`📊 Resumo: ${report.summary.healthy} saudáveis, ${report.summary.unhealthy} problemas`, 'error');
      
      report.checks.filter(c => c.status === 'unhealthy').forEach(check => {
        addLog(`  ❌ ${check.name}: ${check.message}`, 'error');
      });
    }
    
    if (healthCheckBtn) {
      healthCheckBtn.disabled = false;
      healthCheckBtn.textContent = '🏥 Verificar Saúde do Sistema';
    }
  } catch (error) {
    addLog(`❌ Erro ao executar health check: ${error.message}`, 'error');
    const healthCheckBtn = document.getElementById('healthCheckBtn');
    if (healthCheckBtn) {
      healthCheckBtn.disabled = false;
      healthCheckBtn.textContent = '🏥 Verificar Saúde do Sistema';
    }
  }
}

// Carregar credenciais do arquivo .env
async function loadEnvCredentials() {
  try {
    loadEnvBtn.disabled = true;
    loadEnvBtn.textContent = '⏳ Carregando...';
    
    addLog('📥 Carregando credenciais do arquivo .env...', 'info');
    
    const result = await window.electronAPI.loadEnvCredentials();
    
    if (result.success) {
      const { credentials } = result;
      
      // Preencher campos do formulário
      document.getElementById('email').value = credentials.email || '';
      document.getElementById('password').value = credentials.password || '';
      document.getElementById('clientId').value = credentials.clientId || '';
      document.getElementById('mfaMethod').value = credentials.mfaMethod || 'E-mail';
      document.getElementById('mfaCode').value = credentials.mfaCode || '';
      
      addLog('✅ Credenciais carregadas com sucesso!', 'success');
      addLog(`📧 E-mail: ${credentials.email}`, 'info');
      addLog(`🆔 Cliente ID: ${credentials.clientId}`, 'info');
      addLog(`🔐 Método MFA: ${credentials.mfaMethod}`, 'info');
    } else {
      addLog(`❌ Erro ao carregar credenciais: ${result.error}`, 'error');
    }
  } catch (error) {
    addLog(`❌ Erro ao carregar credenciais: ${error.message}`, 'error');
  } finally {
    loadEnvBtn.disabled = false;
    loadEnvBtn.textContent = '📥 Carregar do .env';
  }
}

// Expor função globalmente para onclick
window.openFile = openFile;

// Atualizar métricas
function updateMetrics(metrics) {
  if (metrics) {
    currentMetrics = {
      usersProcessed: metrics.extraction?.total || currentMetrics.usersProcessed,
      successRate: metrics.summary?.successRate || currentMetrics.successRate,
      avgTime: metrics.summary?.averageTime || currentMetrics.avgTime,
      cacheHitRate: metrics.summary?.cacheHitRate || currentMetrics.cacheHitRate
    };
    updateMetricsDisplay();
  }
}

// Atualizar métricas da API
async function updateMetricsFromAPI() {
  try {
    if (window.electronAPI.getMetrics) {
      const metrics = await window.electronAPI.getMetrics();
      if (metrics) {
        updateMetrics(metrics);
      }
    }
  } catch (error) {
    // Silenciosamente falhar se métricas não estiverem disponíveis
  }
}

// Atualizar display de métricas
function updateMetricsDisplay() {
  if (metricUsersProcessed) {
    metricUsersProcessed.textContent = currentMetrics.usersProcessed;
  }
  if (metricSuccessRate) {
    metricSuccessRate.textContent = currentMetrics.successRate || '0%';
  }
  if (metricAvgTime) {
    metricAvgTime.textContent = currentMetrics.avgTime || '0ms';
  }
  if (metricCacheHitRate) {
    metricCacheHitRate.textContent = currentMetrics.cacheHitRate || '0%';
  }
}

// Adicionar ao histórico
function addToHistory(metrics) {
  if (!metrics || !historyList) return;
  
  const historyItem = document.createElement('div');
  historyItem.className = 'history-item';
  
  const timestamp = new Date().toLocaleString('pt-BR');
  const summary = metrics.summary || {};
  
  historyItem.innerHTML = `
    <div class="history-header">
      <span class="history-time">${timestamp}</span>
      <span class="history-status success">✅ Concluído</span>
    </div>
    <div class="history-metrics">
      <span>Usuários: ${summary.totalExtractions || 0}</span>
      <span>Sucesso: ${summary.successRate || '0%'}</span>
      <span>Tempo: ${summary.averageTime || '0ms'}</span>
    </div>
  `;
  
  historyList.insertBefore(historyItem, historyList.firstChild);
  
  // Mostrar seção de histórico
  if (historySection) {
    historySection.style.display = 'block';
  }
  
  // Limitar a 10 itens
  while (historyList.children.length > 10) {
    historyList.removeChild(historyList.lastChild);
  }
}

// Recarregar arquivos periodicamente
setInterval(loadExcelFiles, 30000);
