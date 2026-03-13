/**
 * Script principal da aplicação web
 */

// Variáveis globais
let currentExtractedChaves = [];

// Tokens de cancelamento
let downloadCancelToken = null;
let uploadCancelToken = null;
let extractCancelToken = null;

// Armazenar XMLs baixados para download posterior
let downloadedXMLs = [];

// Armazenar job_id ativo de cada aba para isolar progresso
let activeJobs = {
    upload: null,
    download: null,
    extract: null
};

// Armazenar checkpoints das operações
let currentCheckpoint = {
    upload: null,
    download: null
};

// Funções de checkpoint
function saveCheckpoint(tabName, data) {
    try {
        const checkpoint = {
            timestamp: new Date().toISOString(),
            type: tabName,
            data: data
        };
        currentCheckpoint[tabName] = checkpoint;
        localStorage.setItem(`checkpoint_${tabName}`, JSON.stringify(checkpoint));
        return checkpoint;
    } catch (error) {
        console.error('Erro ao salvar checkpoint:', error);
        return null;
    }
}

function loadCheckpoint(tabName) {
    try {
        const stored = localStorage.getItem(`checkpoint_${tabName}`);
        if (stored) {
            const checkpoint = JSON.parse(stored);
            currentCheckpoint[tabName] = checkpoint;
            return checkpoint;
        }
        return null;
    } catch (error) {
        console.error('Erro ao carregar checkpoint:', error);
        return null;
    }
}

function clearCheckpoint(tabName) {
    try {
        localStorage.removeItem(`checkpoint_${tabName}`);
        currentCheckpoint[tabName] = null;
    } catch (error) {
        console.error('Erro ao limpar checkpoint:', error);
    }
}

function hasErrors(checkpoint) {
    if (!checkpoint || !checkpoint.data) return false;
    
    if (checkpoint.data.errosDetalhados && Array.isArray(checkpoint.data.errosDetalhados) && checkpoint.data.errosDetalhados.length > 0) {
        return true;
    }
    
    if (checkpoint.data.falhas && checkpoint.data.falhas > 0) {
        return true;
    }
    
    if (checkpoint.data.erros && checkpoint.data.erros > 0) {
        return true;
    }
    
    return false;
}

// Tornar funções de checkpoint disponíveis globalmente
window.saveCheckpoint = saveCheckpoint;
window.clearCheckpoint = clearCheckpoint;
window.loadCheckpoint = loadCheckpoint;
window.hasErrors = hasErrors;

// Callback global de progresso que roteia para a aba correta
function setupGlobalProgressCallback() {
    if (client) {
        client.onProgressUpdate = (data) => {
            const jobId = data.job_id;
            
            // Determinar qual aba corresponde a este job_id
            let targetTab = null;
            if (activeJobs.upload === jobId) {
                targetTab = 'upload';
            } else if (activeJobs.download === jobId) {
                targetTab = 'download';
            } else if (activeJobs.extract === jobId) {
                targetTab = 'extract';
            }
            
            // Se encontrou a aba correspondente, atualizar apenas ela
            if (targetTab) {
                updateProgressUI(data, targetTab);
                
                // Adicionar ao log se houver informação de item
                if (data.item) {
                    const itemName = data.item.chave || data.item.name || '';
                    const itemMessage = data.item.message || '';
                    const itemError = data.item.error || '';
                    
                    if (data.item.status === 'success') {
                        const successMsg = targetTab === 'download' ? 'Baixado com sucesso' : 
                                         targetTab === 'upload' ? 'Enviado com sucesso' : 
                                         'Processado com sucesso';
                        addLogItem(targetTab, 'success', itemName, itemMessage || successMsg);
                    } else if (data.item.status === 'error') {
                        addLogItem(targetTab, 'error', itemName, itemError || 'Erro desconhecido');
                    } else {
                        addLogItem(targetTab, 'pending', itemName, itemMessage || 'Processando...');
                    }
                }
            }
        };
    }
}

// Callbacks do cliente - configurar quando cliente estiver disponível
document.addEventListener('DOMContentLoaded', () => {
    // Aguardar cliente ser inicializado
    setTimeout(() => {
        if (client) {
            // Configurar callback global de progresso
            setupGlobalProgressCallback();
            
            // Callbacks padrão (podem ser sobrescritos por operações específicas)
            client.onJobStarted = (data) => {
                console.log('Job iniciado:', data.job_id);
            };
            
            client.onJobComplete = (data) => {
                console.log('Job concluído:', data.result);
            };
            
            client.onJobError = (data) => {
                showError(data.error);
            };
        }
    }, 500);
});

// Gerenciamento de abas
function showTab(tabName, event) {
    try {
        console.log('showTab chamado:', tabName, event);
        
        // Esconder todas as abas
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remover active de todos os botões
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Mostrar aba selecionada
        const targetTab = document.getElementById(tabName);
        if (!targetTab) {
            console.error('Aba não encontrada:', tabName);
            return;
        }
        targetTab.classList.add('active');
        console.log('Aba ativada:', tabName);
        
        // Ativar botão correspondente
        let targetButton = null;
        if (event && event.target) {
            targetButton = event.target;
        } else {
            // Fallback: encontrar botão pela aba usando o onclick
            document.querySelectorAll('.tab-button').forEach(btn => {
                const onclickAttr = btn.getAttribute('onclick');
                if (onclickAttr && onclickAttr.includes(`'${tabName}'`)) {
                    targetButton = btn;
                }
            });
        }
        
        if (targetButton) {
            targetButton.classList.add('active');
            console.log('Botão ativado:', targetButton);
        } else {
            console.warn('Botão não encontrado para aba:', tabName);
        }
    } catch (error) {
        console.error('Erro em showTab:', error);
        alert('Erro ao trocar de aba: ' + error.message);
    }
}
// Registrar showTab no window imediatamente
window.showTab = showTab;

// Armazenar arquivos selecionados
let selectedFiles = [];

// Manipular seleção de arquivos/pasta
function handleFileSelection(type) {
    try {
        const input = type === 'files' ? document.getElementById('uploadFiles') : document.getElementById('uploadFolder');
        if (!input || !input.files) {
            console.error('Input de arquivo não encontrado:', type);
            alert('Erro ao acessar arquivos selecionados');
            return;
        }
        
        const files = Array.from(input.files);
        console.log(`Arquivos selecionados (${type}):`, files.length);
        
        // Filtrar apenas XMLs
        const xmlFiles = files.filter(f => {
            const fileName = f.name.toLowerCase();
            const isXML = fileName.endsWith('.xml');
            if (!isXML) {
                console.log('Arquivo ignorado (não é XML):', f.name);
            }
            return isXML;
        });
        
        console.log('Arquivos XML filtrados:', xmlFiles.length);
        
        if (xmlFiles.length === 0) {
            alert('Nenhum arquivo XML encontrado. Certifique-se de que os arquivos têm extensão .xml');
            // Limpar selectedFiles
            selectedFiles = [];
            const infoDiv = document.getElementById('uploadFileInfo');
            if (infoDiv) {
                infoDiv.style.display = 'none';
            }
            return;
        }
        
        selectedFiles = xmlFiles;
        console.log('selectedFiles atualizado:', selectedFiles.length, 'arquivo(s)');
        
        // Atualizar informação
        const infoDiv = document.getElementById('uploadFileInfo');
        const countSpan = document.getElementById('uploadFileCount');
        if (infoDiv && countSpan) {
            countSpan.textContent = xmlFiles.length;
            infoDiv.style.display = 'block';
        }
        
        // Limpar o outro input
        if (type === 'files') {
            const uploadFolder = document.getElementById('uploadFolder');
            if (uploadFolder) {
                uploadFolder.value = '';
            }
        } else {
            const uploadFiles = document.getElementById('uploadFiles');
            if (uploadFiles) {
                uploadFiles.value = '';
            }
        }
    } catch (error) {
        console.error('Erro ao processar seleção de arquivos:', error);
        alert('Erro ao processar arquivos selecionados: ' + error.message);
        selectedFiles = [];
    }
}
// Registrar handleFileSelection no window imediatamente
window.handleFileSelection = handleFileSelection;

// Upload de XMLs
async function handleUpload() {
    // Usar arquivos selecionados (prioritariamente selectedFiles, depois uploadFiles, depois uploadFolder)
    let files = [];
    if (selectedFiles.length > 0) {
        files = selectedFiles;
    } else {
        const uploadFilesInput = document.getElementById('uploadFiles');
        const uploadFolderInput = document.getElementById('uploadFolder');
        
        if (uploadFilesInput && uploadFilesInput.files && uploadFilesInput.files.length > 0) {
            files = Array.from(uploadFilesInput.files);
            console.log('Usando uploadFiles:', files.length, 'arquivo(s)');
        } else if (uploadFolderInput && uploadFolderInput.files && uploadFolderInput.files.length > 0) {
            const allFiles = Array.from(uploadFolderInput.files);
            // Filtrar apenas XMLs quando selecionar pasta
            files = allFiles.filter(f => f.name.toLowerCase().endsWith('.xml'));
            console.log('Usando uploadFolder:', allFiles.length, 'total,', files.length, 'XML(s)');
            // Atualizar selectedFiles para uso futuro
            selectedFiles = files;
        }
    }
    
    if (files.length === 0) {
        alert('Selecione pelo menos um arquivo XML ou uma pasta');
        return;
    }
    
    const verificarExistentes = document.getElementById('verificarExistentes').checked;
    const numThreads = parseInt(document.getElementById('threads').value) || 5;
    
    const btnUpload = document.getElementById('btnUpload');
    const btnCancel = document.getElementById('btnCancelUpload');
    const progressContainer = document.getElementById('uploadProgressContainer');
    const logContainer = document.getElementById('uploadLogContainer');
    const logContent = document.getElementById('uploadLog');
    const resultContainer = document.getElementById('uploadResult');
    
    // Criar token de cancelamento
    uploadCancelToken = new CancelToken();
    
    // Preparar UI
    btnUpload.disabled = true;
    btnUpload.textContent = 'Enviando...';
    btnCancel.style.display = 'inline-block';
    progressContainer.style.display = 'block';
    logContainer.style.display = 'block';
    logContent.innerHTML = '';
    resultContainer.innerHTML = '';
    
    // Ocultar botão "Continuar" quando o upload iniciar
    const btnContinue = document.getElementById('btnContinueUpload');
    const btnClear = document.getElementById('btnClearCheckpointUpload');
    if (btnContinue) btnContinue.style.display = 'none';
    if (btnClear) btnClear.style.display = 'none';
    
    // Verificar se há checkpoint para continuar
    const checkpoint = loadCheckpoint('upload');
    
    // Verificar se estamos reprocessando erros
    const estaReprocessando = checkpoint && checkpoint.data && checkpoint.data.reprocessErrors;
    
    // Calcular total e progresso inicial baseado no checkpoint
    // SEMPRE usar o total real de arquivos selecionados, não o do checkpoint
    const totalFiles = files.length;
    let progressoInicial = 0;
    // Usar checkpoint apenas para progresso inicial se estivermos continuando com os MESMOS arquivos
    if (checkpoint && checkpoint.data) {
        // Se estamos reprocessando erros, manter o checkpoint mesmo com quantidade diferente
        if (estaReprocessando) {
            // Manter total do checkpoint original e progresso inicial
            progressoInicial = (checkpoint.data.sucesso || 0);
        } else if (checkpoint.data.total === totalFiles) {
            // Mesma quantidade - continuar de onde parou
            progressoInicial = (checkpoint.data.sucesso || 0) + (checkpoint.data.erros || 0);
        } else {
            // Quantidade diferente - nova seleção, limpar checkpoint
            clearCheckpoint('upload');
            progressoInicial = 0;
        }
    }
    
    // Usar total do checkpoint se estivermos reprocessando erros
    const totalParaExibicao = estaReprocessando && checkpoint && checkpoint.data ? checkpoint.data.total : totalFiles;
    
    // Resetar progresso (mostrando progresso atual se houver checkpoint)
    updateProgressUI({
        progress: progressoInicial, 
        total: totalParaExibicao, 
        current: checkpoint ? `Continuando... (${progressoInicial}/${totalParaExibicao} já processados)` : 'Iniciando...'
    }, 'upload');
    
    if (checkpoint) {
        if (estaReprocessando) {
            addLogItem('upload', 'info', 'Reprocessando erros', `Reprocessando ${checkpoint.data.errosDetalhados ? checkpoint.data.errosDetalhados.length : 0} arquivo(s) com erro...`);
        } else {
            addLogItem('upload', 'info', 'Continuação', `Continuando upload de onde parou (${progressoInicial}/${totalParaExibicao} já processados)...`);
        }
    } else {
        addLogItem('upload', 'info', 'Iniciando upload...', '');
    }
    
    try {
        // Garantir que o callback global está configurado
        setupGlobalProgressCallback();
        
        // Converter para array se necessário
        const fileArray = Array.isArray(files) ? files : Array.from(files || []);
        
        // Interceptar startJob para capturar job_id
        const originalStartJob = client.startJob.bind(client);
        client.startJob = async function(type, userId) {
            if (type === 'upload') {
                const jobId = await originalStartJob(type, userId);
                activeJobs.upload = jobId;
                client.startJob = originalStartJob; // Restaurar após capturar
                // Garantir callback após capturar job_id
                setupGlobalProgressCallback();
                return jobId;
            }
            return await originalStartJob(type, userId);
        };
        
        const result = await client.uploadXMLs(fileArray, verificarExistentes, numThreads, uploadCancelToken, checkpoint);
        
        // Verificar se foi cancelado
        const foiCancelado = result.cancelado || (uploadCancelToken && uploadCancelToken.isCancelled());
        
        // Verificar se estávamos reprocessando erros
        const estavaReprocessando = checkpoint && checkpoint.data && checkpoint.data.reprocessErrors;
        
        // Salvar checkpoint se cancelado ou se houver erros
        if (foiCancelado) {
            saveCheckpoint('upload', result);
        } else if (result.erros > 0) {
            saveCheckpoint('upload', result);
        } else if (estavaReprocessando) {
            // Se estávamos reprocessando e não há mais erros, limpar checkpoint
            clearCheckpoint('upload');
        } else {
            clearCheckpoint('upload');
        }
        
        // Mostrar resultados
        if (foiCancelado) {
            // Mostrar botões de continuar e limpar checkpoint
            const btnContinue = document.getElementById('btnContinueUpload');
            const btnClear = document.getElementById('btnClearCheckpointUpload');
            if (btnContinue) btnContinue.style.display = 'inline-block';
            if (btnClear) btnClear.style.display = 'inline-block';
            
            resultContainer.innerHTML = `
                <div class="result-error">
                    <h3>⚠️ Upload Cancelado</h3>
                    <div class="result-stats">
                        <div class="stat">
                            <span class="stat-label">Processados:</span>
                            <span class="stat-value">${result.sucesso + result.erros}/${result.total}</span>
                        </div>
                        <div class="stat stat-success">
                            <span class="stat-label">Sucesso:</span>
                            <span class="stat-value">${result.sucesso}</span>
                        </div>
                        <div class="stat stat-error">
                            <span class="stat-label">Erros:</span>
                            <span class="stat-value">${result.erros || 0}</span>
                        </div>
                    </div>
                    <p style="margin-top: 15px; color: #666;">Clique em "Continuar" ao lado do botão "Enviar XMLs" para retomar de onde parou.</p>
                </div>
            `;
            return;
        } else {
            // Ocultar botões de continuar e limpar checkpoint quando não cancelado
            const btnContinue = document.getElementById('btnContinueUpload');
            const btnClear = document.getElementById('btnClearCheckpointUpload');
            if (btnContinue) btnContinue.style.display = 'none';
            if (btnClear) btnClear.style.display = 'none';
        }
        
        resultContainer.innerHTML = `
            <div class="result-success">
                <h3>✅ Upload Concluído!</h3>
                <div class="result-stats">
                    <div class="stat">
                        <span class="stat-label">Total:</span>
                        <span class="stat-value">${result.total}</span>
                    </div>
                    <div class="stat stat-success">
                        <span class="stat-label">Sucesso:</span>
                        <span class="stat-value">${result.sucesso}</span>
                    </div>
                    <div class="stat stat-error">
                        <span class="stat-label">Erros:</span>
                        <span class="stat-value">${result.erros || 0}</span>
                    </div>
                </div>
                ${(result.errosDetalhados && Array.isArray(result.errosDetalhados) && result.errosDetalhados.length > 0) ? `
                    <div class="result-errors">
                        <h4>Erros encontrados:</h4>
                        <ul>
                            ${result.errosDetalhados.slice(0, 20).map(e => {
                                let erroMsg = e.erro;
                                // Destacar erros comuns
                                if (erroMsg.includes('401') || erroMsg.includes('Não autorizado')) {
                                    erroMsg = `<span style="color: #d32f2f; font-weight: bold;">⚠️ ${erroMsg} - Verifique a API key no .env</span>`;
                                } else if (erroMsg.includes('500')) {
                                    erroMsg = `<span style="color: #f57c00;">⚠️ ${erroMsg} - Erro no servidor SIEG, tente novamente</span>`;
                                }
                                return `<li><strong>${e.nome}:</strong> ${erroMsg}</li>`;
                            }).join('')}
                            ${result.errosDetalhados.length > 20 ? `<li>... e mais ${result.errosDetalhados.length - 20} erro(s)</li>` : ''}
                        </ul>
                        <div style="margin-top: 15px;">
                            <button class="btn btn-secondary" onclick="reprocessErrors('upload')" id="btnReprocessUpload">
                                🔄 Reprocessar Apenas os Erros (${result.erros})
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
    } catch (error) {
        addLogItem('upload', 'error', 'Erro geral', error.message);
        resultContainer.innerHTML = `
            <div class="result-error">
                <h3>❌ Erro no Upload</h3>
                <p>${error.message}</p>
            </div>
        `;
    } finally {
        btnUpload.disabled = false;
        btnUpload.textContent = 'Enviar XMLs';
        if (btnCancel) {
            btnCancel.textContent = 'Cancelar';
            btnCancel.style.display = 'none';
        }
        uploadCancelToken = null;
        // Limpar job_id ativo quando terminar
        if (activeJobs.upload) {
            activeJobs.upload = null;
        }
        
        // Verificar se há checkpoint para mostrar botão continuar
        const checkpoint = loadCheckpoint('upload');
        const btnContinue = document.getElementById('btnContinueUpload');
        const btnClear = document.getElementById('btnClearCheckpointUpload');
        if (checkpoint) {
            if (btnContinue) btnContinue.style.display = 'inline-block';
            if (btnClear) btnClear.style.display = 'inline-block';
        } else {
            if (btnContinue) btnContinue.style.display = 'none';
            if (btnClear) btnClear.style.display = 'none';
        }
    }
}
window.handleUpload = handleUpload;

// Cancelar upload
function cancelUpload() {
    if (uploadCancelToken) {
        uploadCancelToken.cancel();
        document.getElementById('btnCancelUpload').textContent = 'Cancelando...';
        addLogItem('upload', 'info', 'Cancelamento', 'Solicitação de cancelamento enviada...');
    }
}
window.handleUpload = handleUpload;
window.cancelUpload = cancelUpload;

// Continuar upload de onde parou
async function continueUpload() {
    const checkpoint = loadCheckpoint('upload');
    if (!checkpoint) {
        alert('Nenhum checkpoint encontrado para continuar');
        return;
    }
    
    // Verificar quantos arquivos ainda precisam ser processados
    const processados = (checkpoint.data.sucesso || 0) + (checkpoint.data.erros || 0);
    const restantes = (checkpoint.data.total || 0) - processados;
    
    if (restantes <= 0) {
        alert('Todos os arquivos já foram processados');
        clearCheckpoint('upload');
        return;
    }
    
    // Verificar se há arquivos disponíveis para continuar
    let files = [];
    if (selectedFiles.length > 0) {
        files = selectedFiles;
    } else {
        const uploadFilesInput = document.getElementById('uploadFiles');
        const uploadFolderInput = document.getElementById('uploadFolder');
        
        if (uploadFilesInput && uploadFilesInput.files && uploadFilesInput.files.length > 0) {
            files = Array.from(uploadFilesInput.files);
        } else if (uploadFolderInput && uploadFolderInput.files && uploadFolderInput.files.length > 0) {
            const allFiles = Array.from(uploadFolderInput.files);
            files = allFiles.filter(f => f.name.toLowerCase().endsWith('.xml'));
            selectedFiles = files; // Atualizar selectedFiles
        }
    }
    
    // Se não houver arquivos, pedir para selecionar
    if (files.length === 0) {
        alert('Por favor, selecione os mesmos arquivos XML que você estava enviando antes e clique em "Continuar" novamente.\n\nO sistema continuará automaticamente de onde parou.');
        return;
    }
    
    // Continuar automaticamente chamando handleUpload
    // O handleUpload vai detectar o checkpoint e continuar de onde parou
    console.log('Continuando upload automaticamente com', files.length, 'arquivo(s)');
    await handleUpload();
}
window.continueUpload = continueUpload;

// Token de cancelamento
class CancelToken {
    constructor() {
        this.cancelled = false;
    }
    
    cancel() {
        this.cancelled = true;
    }
    
    isCancelled() {
        return this.cancelled;
    }
    
    reset() {
        this.cancelled = false;
    }
}
window.cancelUpload = cancelUpload;

// Download de XMLs
async function handleDownload() {
    const file = document.getElementById('downloadPlanilha').files[0];
    if (!file) {
        alert('Selecione uma planilha Excel');
        return;
    }
    
    const btnDownload = document.getElementById('btnDownload');
    const btnCancel = document.getElementById('btnCancelDownload');
    const progressContainer = document.getElementById('downloadProgressContainer');
    const resultContainer = document.getElementById('downloadResult');
    
    // Criar token de cancelamento
    downloadCancelToken = new CancelToken();
    
    // Preparar UI
    btnDownload.disabled = true;
    btnDownload.textContent = 'Baixando...';
    btnCancel.style.display = 'inline-block';
    progressContainer.style.display = 'block';
    resultContainer.innerHTML = '';
    
    // Ocultar botão "Continuar" quando o download iniciar
    const btnContinue = document.getElementById('btnContinueDownload');
    const btnClear = document.getElementById('btnClearCheckpointDownload');
    if (btnContinue) btnContinue.style.display = 'none';
    if (btnClear) btnClear.style.display = 'none';
    
    // Verificar checkpoint para continuar ou reprocessar erros
    const checkpoint = loadCheckpoint('download');
    
    // O total real será determinado após processar a planilha
    // Por enquanto, mostrar progresso inicial se houver checkpoint
    let progressoInicial = 0;
    if (checkpoint && checkpoint.data) {
        progressoInicial = (checkpoint.data.sucesso || 0) + (checkpoint.data.falhas || 0);
    }
    
    // Resetar progresso e XMLs baixados (mas preservar XMLs do checkpoint se existir)
    if (checkpoint && checkpoint.data && checkpoint.data.xmls) {
        downloadedXMLs = checkpoint.data.xmls;
    } else {
        downloadedXMLs = [];
    }
    
    // Progresso inicial será atualizado após processar a planilha
    // Por enquanto, mostrar 0/0 ou progresso do checkpoint se existir
    const totalChavesCheckpoint = checkpoint && checkpoint.data ? checkpoint.data.total : 0;
    updateProgressUI({
        progress: progressoInicial, 
        total: totalChavesCheckpoint, 
        current: checkpoint ? `Processando planilha... (${progressoInicial} já processados)` : 'Processando planilha...'
    }, 'download');
    
    // Mostrar log container
    const logContainer = document.getElementById('downloadLogContainer');
    const logContent = document.getElementById('downloadLog');
    logContainer.style.display = 'block';
    logContent.innerHTML = '';
    
    try {
        // Garantir que o callback global está configurado
        setupGlobalProgressCallback();
        
        if (checkpoint && checkpoint.data) {
            addLogItem('download', 'info', 'Continuação', `Processando planilha... (${progressoInicial} já processados de ${checkpoint.data.total || 0})`);
        } else {
            addLogItem('download', 'info', 'Iniciando', 'Processando planilha...');
        }
        
        const numThreads = parseInt(document.getElementById('downloadThreads').value) || 5;
        
        // Interceptar startJob para capturar job_id
        const originalStartJob = client.startJob.bind(client);
        client.startJob = async function(type, userId) {
            if (type === 'download') {
                const jobId = await originalStartJob(type, userId);
                activeJobs.download = jobId;
                client.startJob = originalStartJob; // Restaurar após capturar
                // Garantir callback após capturar job_id
                setupGlobalProgressCallback();
                return jobId;
            }
            return await originalStartJob(type, userId);
        };
        
        const result = await client.downloadXMLs(file, downloadCancelToken, numThreads, checkpoint);
        
        // Verificar se foi cancelado
        const foiCancelado = result.cancelado || (downloadCancelToken && downloadCancelToken.isCancelled());
        
        // Salvar checkpoint se cancelado ou se houver falhas
        if (foiCancelado) {
            saveCheckpoint('download', result);
        } else if (result.falhas > 0) {
            saveCheckpoint('download', result);
        } else {
            clearCheckpoint('download');
        }
        
        // Armazenar XMLs baixados para download posterior
        if (result.xmls && result.xmls.length > 0) {
            downloadedXMLs = result.xmls;
        } else {
            downloadedXMLs = [];
        }
        
        // Mostrar resultados
        if (foiCancelado) {
            // Mostrar botões de continuar e limpar checkpoint
            const btnContinue = document.getElementById('btnContinueDownload');
            const btnClear = document.getElementById('btnClearCheckpointDownload');
            if (btnContinue) btnContinue.style.display = 'inline-block';
            if (btnClear) btnClear.style.display = 'inline-block';
            
            resultContainer.innerHTML = `
                <div class="result-error">
                    <h3>⚠️ Download Cancelado</h3>
                    <div class="result-stats">
                        <div class="stat">
                            <span class="stat-label">Processados:</span>
                            <span class="stat-value">${result.sucesso + result.falhas}/${result.total}</span>
                        </div>
                        <div class="stat stat-success">
                            <span class="stat-label">Baixados:</span>
                            <span class="stat-value">${result.sucesso}</span>
                        </div>
                        <div class="stat stat-error">
                            <span class="stat-label">Falhas:</span>
                            <span class="stat-value">${result.falhas}</span>
                        </div>
                    </div>
                    ${result.sucesso > 0 ? `
                        <div style="margin-top: 15px;">
                            <button class="btn btn-primary" onclick="downloadZIP()" id="btnDownloadZIP">
                                📦 Baixar ZIP com ${result.sucesso} XML(s)
                            </button>
                        </div>
                    ` : ''}
                    <p style="margin-top: 15px; color: #666;">Clique em "Continuar" ao lado do botão "Baixar XMLs" para retomar de onde parou.</p>
                </div>
            `;
            return;
        }
        
        // Ocultar botões de continuar e limpar checkpoint quando não cancelado
        const btnContinue = document.getElementById('btnContinueDownload');
        const btnClear = document.getElementById('btnClearCheckpointDownload');
        if (btnContinue) btnContinue.style.display = 'none';
        if (btnClear) btnClear.style.display = 'none';
        
        resultContainer.innerHTML = `
            <div class="result-success">
                <h3>✅ Download Concluído!</h3>
                <div class="result-stats">
                    <div class="stat">
                        <span class="stat-label">Total:</span>
                        <span class="stat-value">${result.total}</span>
                    </div>
                    <div class="stat stat-success">
                        <span class="stat-label">Baixados:</span>
                        <span class="stat-value">${result.sucesso}</span>
                    </div>
                    <div class="stat stat-error">
                        <span class="stat-label">Falhas:</span>
                        <span class="stat-value">${result.falhas}</span>
                    </div>
                </div>
                ${result.sucesso > 0 ? `
                    <div style="margin-top: 15px;">
                        <button class="btn btn-primary" onclick="downloadZIP()" id="btnDownloadZIP">
                            📦 Baixar ZIP com ${result.sucesso} XML(s)
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
        
    } catch (error) {
        resultContainer.innerHTML = `
            <div class="result-error">
                <h3>❌ Erro no Download</h3>
                <p>${error.message}</p>
            </div>
        `;
    } finally {
        btnDownload.disabled = false;
        btnDownload.textContent = 'Baixar XMLs';
        if (btnCancel) {
            btnCancel.textContent = 'Cancelar';
            btnCancel.style.display = 'none';
        }
        downloadCancelToken = null;
        // Limpar job_id ativo quando terminar
        if (activeJobs.download) {
            activeJobs.download = null;
        }
        
        // Verificar se há checkpoint para mostrar botão continuar
        const checkpoint = loadCheckpoint('download');
        const btnContinue = document.getElementById('btnContinueDownload');
        const btnClear = document.getElementById('btnClearCheckpointDownload');
        if (checkpoint) {
            if (btnContinue) btnContinue.style.display = 'inline-block';
            if (btnClear) btnClear.style.display = 'inline-block';
        } else {
            if (btnContinue) btnContinue.style.display = 'none';
            if (btnClear) btnClear.style.display = 'none';
        }
    }
}
window.handleDownload = handleDownload;

// Cancelar download
function cancelDownload() {
    if (downloadCancelToken) {
        downloadCancelToken.cancel();
        document.getElementById('btnCancelDownload').textContent = 'Cancelando...';
        addLogItem('download', 'info', 'Cancelamento', 'Solicitação de cancelamento enviada...');
    }
}
window.cancelDownload = cancelDownload;

// Continuar download de onde parou
async function continueDownload() {
    const checkpoint = loadCheckpoint('download');
    if (!checkpoint) {
        alert('Nenhum checkpoint encontrado para continuar');
        return;
    }
    
    // Verificar quantas chaves ainda precisam ser processadas
    const processados = (checkpoint.data.sucesso || 0) + (checkpoint.data.falhas || 0);
    const restantes = (checkpoint.data.total || 0) - processados;
    
    if (restantes <= 0) {
        alert('Todas as chaves já foram processadas');
        clearCheckpoint('download');
        return;
    }
    
    // Verificar se há arquivo selecionado para continuar
    const fileInput = document.getElementById('downloadPlanilha');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert('Por favor, selecione a mesma planilha Excel/SPED que você estava usando antes e clique em "Continuar" novamente.\n\nO sistema continuará automaticamente de onde parou.');
        return;
    }
    
    // Continuar automaticamente chamando handleDownload
    // O handleDownload vai detectar o checkpoint e continuar de onde parou
    console.log('Continuando download automaticamente');
    await handleDownload();
}
window.continueDownload = continueDownload;

// Extração de chaves e download automático
async function handleExtractAndDownload() {
    const fileInput = document.getElementById('extractPlanilha');
    const files = fileInput.files;
    
    if (files.length === 0) {
        alert('Por favor, selecione uma planilha Excel ou arquivo SPED (.txt)');
        return;
    }
    
    const btnExtract = document.getElementById('btnExtract');
    const resultContainer = document.getElementById('extractResult');
    
    // Preparar UI
    btnExtract.disabled = true;
    btnExtract.textContent = 'Processando...';
    resultContainer.innerHTML = '<div class="result-info"><p>Processando arquivo...</p></div>';
    
    try {
        const file = files[0];
        const resultado = await processarArquivo(file);
        
        if (!resultado.chaves || resultado.chaves.length === 0) {
            resultContainer.innerHTML = `
                <div class="result-error">
                    <h3>⚠️ Nenhuma Chave Encontrada</h3>
                    <p>Não foram encontradas chaves de acesso (44 dígitos) no arquivo selecionado.</p>
                </div>
            `;
            btnExtract.disabled = false;
            btnExtract.textContent = 'Extrair e Baixar';
            return;
        }
        
        // Fazer download automático do Excel
        exportarChavesParaExcel(resultado.chaves, 'chaves_xml_consolidadas.xlsx');
        
        resultContainer.innerHTML = `
            <div class="result-success">
                <h3>✅ Processamento Concluído!</h3>
                <p>Total de chaves encontradas: <strong>${resultado.chaves.length}</strong></p>
                <p>O arquivo <strong>chaves_xml_consolidadas.xlsx</strong> foi baixado automaticamente.</p>
            </div>
        `;
        
    } catch (error) {
        resultContainer.innerHTML = `
            <div class="result-error">
                <h3>❌ Erro no Processamento</h3>
                <p>${error.message || 'Erro desconhecido ao processar o arquivo'}</p>
            </div>
        `;
    } finally {
        btnExtract.disabled = false;
        btnExtract.textContent = 'Extrair e Baixar';
    }
}
window.handleExtractAndDownload = handleExtractAndDownload;

// Manter função antiga para compatibilidade (se necessário)
async function handleExtract() {
    await handleExtractAndDownload();
}
window.handleExtract = handleExtract;

// Cancelar extração
function cancelExtract() {
    if (extractCancelToken) {
        extractCancelToken.cancel();
        document.getElementById('btnCancelExtract').textContent = 'Cancelando...';
        addLogItem('extract', 'info', 'Cancelamento', 'Solicitação de cancelamento enviada...');
    }
}
window.handleExtract = handleExtract;
window.cancelExtract = cancelExtract;

// Adicionar item ao log em tempo real
function addLogItem(tab, type, name, message) {
    const logContent = document.getElementById(`${tab}Log`);
    if (!logContent) return;
    
    const logItem = document.createElement('div');
    logItem.className = `log-item ${type}`;
    
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    logItem.innerHTML = `
        <span class="log-item-name">[${timestamp}] ${name}</span>
        ${message ? `<span class="log-item-message">- ${message}</span>` : ''}
    `;
    
    logContent.appendChild(logItem);
    
    // Auto-scroll para o último item
    logContent.scrollTop = logContent.scrollHeight;
    
    // Limitar número de itens (manter últimos 500)
    const items = logContent.querySelectorAll('.log-item');
    if (items.length > 500) {
        items[0].remove();
    }
}

// Reprocessar apenas os erros de uma operação
async function reprocessErrors(tabName) {
    const checkpoint = loadCheckpoint(tabName);
    if (!checkpoint || !hasErrors(checkpoint)) {
        alert('Nenhum erro encontrado para reprocessar');
        return;
    }
    
    if (tabName === 'upload') {
        // Recriar arquivos a partir dos erros
        if (!checkpoint.data.errosDetalhados || checkpoint.data.errosDetalhados.length === 0) {
            alert('Nenhum arquivo com erro encontrado');
            return;
        }
        
        // Solicitar ao usuário que selecione os arquivos novamente ou usar os mesmos
        const confirmMsg = `Deseja reprocessar ${checkpoint.data.errosDetalhados.length} arquivo(s) com erro?\n\nOs arquivos serão reprocessados do zero.`;
        if (!confirm(confirmMsg)) {
            return;
        }
        
        // Marcar checkpoint para reprocessar apenas erros (NÃO limpar o checkpoint)
        checkpoint.data.reprocessErrors = true;
        checkpoint.data.reprocessErrorsTimestamp = new Date().toISOString();
        saveCheckpoint('upload', checkpoint.data);
        
        // Mostrar mensagem para o usuário selecionar os arquivos novamente
        alert('Por favor, selecione os mesmos arquivos XML e clique em "Enviar XMLs" novamente. Apenas os que falharam serão processados.');
    } else if (tabName === 'download') {
        // Reprocessar chaves que falharam
        if (!checkpoint.data || !checkpoint.data.chavesFalhas || checkpoint.data.chavesFalhas.length === 0) {
            // Tentar reconstruir chaves que falharam a partir dos erros
            alert('Nenhuma chave com erro encontrada para reprocessar');
            return;
        }
        
        const confirmMsg = `Deseja reprocessar ${checkpoint.data.falhas} chave(s) com erro?`;
        if (!confirm(confirmMsg)) {
            return;
        }
        
        // Marcar checkpoint para reprocessar apenas erros (NÃO limpar o checkpoint)
        checkpoint.data.reprocessErrors = true;
        checkpoint.data.reprocessErrorsTimestamp = new Date().toISOString();
        saveCheckpoint('download', checkpoint.data);
        
        alert('Por favor, selecione a mesma planilha e clique em "Baixar XMLs" novamente. Apenas as chaves que falharam serão processadas.');
    }
}
window.cancelExtract = cancelExtract;

// Download do ZIP dos XMLs baixados
async function downloadZIP() {
    if (!downloadedXMLs || downloadedXMLs.length === 0) {
        alert('Nenhum XML baixado para incluir no ZIP');
        return;
    }
    
    const btnDownloadZIP = document.getElementById('btnDownloadZIP');
    if (btnDownloadZIP) {
        btnDownloadZIP.disabled = true;
        btnDownloadZIP.textContent = 'Gerando ZIP...';
    }
    
    try {
        await client.downloadZIP(downloadedXMLs);
        if (btnDownloadZIP) {
            btnDownloadZIP.textContent = '✅ ZIP Baixado!';
            setTimeout(() => {
                if (btnDownloadZIP) {
                    btnDownloadZIP.textContent = `📦 Baixar ZIP com ${downloadedXMLs.length} XML(s)`;
                    btnDownloadZIP.disabled = false;
                }
            }, 2000);
        }
    } catch (error) {
        alert(`Erro ao gerar ZIP: ${error.message}`);
        if (btnDownloadZIP) {
            btnDownloadZIP.disabled = false;
            btnDownloadZIP.textContent = `📦 Baixar ZIP com ${downloadedXMLs.length} XML(s)`;
        }
    }
}
window.downloadZIP = downloadZIP;

// Exportar chaves para Excel ou TXT
function exportChaves(format = 'excel') {
    if (currentExtractedChaves.length === 0) {
        alert('Nenhuma chave para exportar');
        return;
    }
    
    if (format === 'excel') {
        exportarChavesParaExcel(currentExtractedChaves, 'chaves_xml_consolidadas.xlsx');
    } else if (format === 'txt') {
        exportarChavesParaTxt(currentExtractedChaves, 'chaves_xml_consolidadas.txt');
    }
}
window.exportChaves = exportChaves;

// Exportar chaves para TXT
function exportarChavesParaTxt(chaves, nomeArquivo = 'chaves_xml_consolidadas.txt') {
    const conteudo = chaves.join('\n');
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Mostrar preview de chaves
function showChavesPreview(resultado) {
    const previewList = document.getElementById('extractPreviewList');
    const previewInfo = document.getElementById('extractPreviewInfo');
    
    const chaves = resultado.chaves || [];
    const limit = Math.min(chaves.length, 100);
    
    previewList.innerHTML = `
        <div class="preview-items">
            ${chaves.slice(0, limit).map(chave => `
                <div class="preview-item">${chave}</div>
            `).join('')}
            ${chaves.length > limit ? `<div class="preview-more">... e mais ${chaves.length - limit} chave(s)</div>` : ''}
        </div>
    `;
    
    previewInfo.innerHTML = `
        <p><strong>Total:</strong> ${chaves.length} chave(s) única(s)</p>
        ${resultado.coluna ? `<p><strong>Coluna identificada:</strong> ${resultado.coluna}</p>` : ''}
    `;
}

// Atualizar UI de progresso
function updateProgressUI(data, type = 'upload') {
    if (!data) return;
    
    const progressFill = document.getElementById(`${type}ProgressFill`);
    const progressText = document.getElementById(`${type}ProgressText`);
    const progressDetail = document.getElementById(`${type}ProgressDetail`);
    
    const progress = data.progress || 0;
    const total = data.total || 0;
    const current = data.current || '';
    
    // Atualização imediata sem requestAnimationFrame para melhor responsividade
    if (progressFill) {
        if (total > 0) {
            const percent = Math.min((progress / total) * 100, 100);
            progressFill.style.width = percent + '%';
        } else {
            progressFill.style.width = '0%';
        }
    }
    
    if (progressText) {
        progressText.textContent = `${progress}/${total}`;
    }
    
    if (progressDetail) {
        progressDetail.textContent = current || '';
    }
}

// Mostrar erro
function showError(message) {
    alert('Erro: ' + message);
}

// Tornar todas as funções necessárias globalmente acessíveis para onclick
// Registrar imediatamente após todas as funções serem definidas
// Como o script está no final do body, o DOM já está carregado
if (typeof window !== 'undefined') {
    // Registrar todas as funções no window para acesso via onclick
    window.showTab = showTab;
    window.handleFileSelection = handleFileSelection;
    window.handleUpload = handleUpload;
    window.handleDownload = handleDownload;
    window.handleExtract = handleExtract;
    window.handleExtractAndDownload = handleExtractAndDownload;
    window.cancelUpload = cancelUpload;
    window.cancelDownload = cancelDownload;
    window.cancelExtract = cancelExtract;
    window.continueUpload = continueUpload;
    window.continueDownload = continueDownload;
    window.exportChaves = exportChaves;
    window.downloadZIP = downloadZIP;
    console.log('✅ Funções globais registradas');
}

// Atualizar status de conexão
if (client && client.socket) {
    client.socket.on('connect', () => {
        const statusEl = document.getElementById('connectionStatus');
        if (statusEl) {
            statusEl.textContent = 'Conectado';
            statusEl.className = 'status connected';
        }
    });
    
    client.socket.on('disconnect', () => {
        const statusEl = document.getElementById('connectionStatus');
        if (statusEl) {
            statusEl.textContent = 'Desconectado';
            statusEl.className = 'status disconnected';
        }
    });
}
