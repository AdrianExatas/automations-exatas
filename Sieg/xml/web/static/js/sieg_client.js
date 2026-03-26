/**
 * Cliente JavaScript para processamento de XMLs SIEG
 * Processamento em borda (edge computing) - todo processamento no cliente
 */

class SiegXMLClient {
    constructor() {
        this.apiKey = null;
        this.apiEndpoints = {};
        this.socket = null;
        this.currentJobId = null;
        this.configLoaded = false;
    }
    
    /**
     * Inicializa o cliente
     */
    async init() {
        try {
            // Buscar configurações do servidor
            const config = await fetch('/api/config').then(r => r.json());
            this.apiKey = config.api_key;
            this.apiEndpoints = config.api_endpoints;
            this.configLoaded = true;
            
            // Conectar WebSocket
            this.socket = io();
            this.setupSocketHandlers();
            
            console.log('Cliente SIEG XML inicializado');
            return true;
        } catch (error) {
            console.error('Erro ao inicializar cliente:', error);
            return false;
        }
    }
    
    /**
     * Configura handlers do WebSocket
     */
    setupSocketHandlers() {
        this.socket.on('connect', () => {
            console.log('WebSocket conectado');
        });
        
        this.socket.on('disconnect', () => {
            console.log('WebSocket desconectado');
        });
        
        this.socket.on('job_started', (data) => {
            console.log('Job iniciado:', data.job_id);
            this.currentJobId = data.job_id;
            this.onJobStarted?.(data);
        });
        
        this.socket.on('progress_update', (data) => {
            this.onProgressUpdate?.(data);
        });
        
        this.socket.on('job_complete', (data) => {
            console.log('Job concluído:', data.job_id);
            this.onJobComplete?.(data);
        });
        
        this.socket.on('job_error', (data) => {
            console.error('Erro no job:', data.error);
            this.onJobError?.(data);
        });
    }
    
    /**
     * Inicia um novo job no servidor
     */
    async startJob(type, userId = null) {
        if (!this.configLoaded) {
            await this.init();
        }
        
        const response = await fetch('/api/job/start', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                type: type,
                user_id: userId || this.getUserId()
            })
        });
        
        const data = await response.json();
        if (data.job_id) {
            this.currentJobId = data.job_id;
        }
        return data.job_id;
    }
    
    /**
     * Atualiza progresso do job
     */
    async updateProgress(progress, total, current = '') {
        if (!this.currentJobId) return;
        
        try {
            await fetch(`/api/job/${this.currentJobId}/progress`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({progress, total, current, status: 'running'})
            });
        } catch (error) {
            console.error('Erro ao atualizar progresso:', error);
        }
    }
    
    /**
     * Finaliza um job com sucesso
     */
    async completeJob(result) {
        if (!this.currentJobId) return;
        
        try {
            await fetch(`/api/job/${this.currentJobId}/complete`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({result})
            });
        } catch (error) {
            console.error('Erro ao finalizar job:', error);
        }
    }
    
    /**
     * Reporta erro no job
     */
    async reportError(error) {
        if (!this.currentJobId) return;
        
        try {
            await fetch(`/api/job/${this.currentJobId}/error`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({error: String(error)})
            });
        } catch (e) {
            console.error('Erro ao reportar erro:', e);
        }
    }
    
    /**
     * Obtém ID do usuário (IP)
     */
    getUserId() {
        return 'user_' + Date.now();
    }
    
    /**
     * Envia XML para API SIEG (via proxy do servidor)
     */
    async sendToSIEG(xmlContent) {
        const xmlBase64 = btoa(unescape(encodeURIComponent(xmlContent)));
        
        try {
            // Usar proxy do servidor para evitar problemas de CORS
            const response = await fetch('/api/proxy/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({Xml: xmlBase64})
            });
            
            // Criar clone antes de ler para evitar erro de leitura dupla
            const clonedResponse = response.clone();
            
            if (response.ok) {
                try {
                    const data = await response.json();
                    return {success: true, data: data};
                } catch {
                    // Se falhar ao parsear JSON, tentar como texto usando clone
                    try {
                        const text = await clonedResponse.text();
                        return {success: true, data: {message: text || 'Enviado com sucesso'}};
                    } catch {
                        return {success: true, data: {message: 'Enviado com sucesso'}};
                    }
                }
            } else {
                let errorMsg = `Erro HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorData.message || errorMsg;
                } catch {
                    // Se falhar ao parsear JSON, usar clone para ler como texto
                    try {
                        errorMsg = await clonedResponse.text() || errorMsg;
                    } catch {
                        // Se também falhar, usar mensagem padrão
                    }
                }
                return {success: false, error: errorMsg};
            }
        } catch (error) {
            console.error('Erro ao enviar XML:', error);
            return {success: false, error: error.message || 'Erro de conexão'};
        }
    }
    
    /**
     * Baixa XML da API SIEG (via proxy do servidor)
     * Retorna {success: true, xml: string} ou {success: false, error: string}
     */
    async downloadFromSIEG(chave) {
        try {
            // Validar chave antes de enviar
            if (!chave || chave.length !== 44 || !/^\d+$/.test(chave)) {
                console.error('[DEBUG] Chave inválida no cliente:', chave, 'Tamanho:', chave ? chave.length : 0);
                return {success: false, error: 'Chave inválida (deve ter 44 dígitos)'};
            }
            
            console.log('[DEBUG] Enviando chave para download:', chave.substring(0, 10) + '...', 'Tamanho:', chave.length);
            
            // Usar proxy do servidor para evitar problemas de CORS
            const response = await fetch('/api/proxy/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain',
                    'Accept': 'text/xml, application/json'
                },
                body: chave
            });
            
            console.log('[DEBUG] Resposta recebida - Status:', response.status, 'OK:', response.ok);
            
            // Ler resposta uma única vez usando clone para poder ler depois
            const contentType = response.headers.get('content-type') || '';
            let responseText = null;
            let responseJson = null;
            
            // Criar clone para poder ler novamente se necessário
            const clonedResponse = response.clone();
            
            // Decidir como ler baseado no Content-Type
            if (contentType.includes('application/json')) {
                try {
                    responseJson = await response.json();
                } catch {
                    // Se falhar, usar clone para ler como texto
                    try {
                        responseText = await clonedResponse.text();
                    } catch {
                        responseText = '';
                    }
                }
            } else {
                // Ler como texto diretamente
                responseText = await response.text();
            }
            
            if (response.ok) {
                // Processar resposta bem-sucedida
                let xmlContent = null;
                
                if (responseJson) {
                    // Se veio como JSON, extrair string
                    if (typeof responseJson === 'string') {
                        xmlContent = responseJson;
                    } else if (responseJson.xml || responseJson.data) {
                        xmlContent = responseJson.xml || responseJson.data;
                    } else {
                        xmlContent = JSON.stringify(responseJson);
                    }
                } else if (responseText) {
                    xmlContent = responseText;
                }
                
                if (!xmlContent) {
                    return {success: false, error: 'Resposta vazia do servidor'};
                }
                
                // Verificar se é um erro em formato JSON
                if (xmlContent.startsWith('{')) {
                    try {
                        const errorData = JSON.parse(xmlContent);
                        if (errorData.error) {
                            return {success: false, error: errorData.error};
                        }
                    } catch {
                        // Não é JSON válido, continuar
                    }
                }
                
                // Remover aspas JSON se houver
                if (xmlContent.startsWith('"') && xmlContent.endsWith('"')) {
                    try {
                        xmlContent = JSON.parse(xmlContent);
                    } catch {
                        // Ignorar erro de parse
                    }
                }
                
                // Verificar se parece XML
                if (!xmlContent || !xmlContent.trim().startsWith('<')) {
                    return {success: false, error: `Resposta não é XML válido: ${xmlContent ? xmlContent.substring(0, 100) : 'resposta vazia'}`};
                }
                
                return {success: true, xml: xmlContent};
            } else {
                // Processar erro - usar o que já foi lido
                let errorMsg = `Erro HTTP ${response.status}`;
                
                if (responseJson) {
                    errorMsg = responseJson.error || responseJson.message || errorMsg;
                    console.error('[DEBUG] Erro JSON recebido:', responseJson);
                } else if (responseText) {
                    // Tentar parsear como JSON se for texto
                    if (responseText.startsWith('{')) {
                        try {
                            const errorData = JSON.parse(responseText);
                            errorMsg = errorData.error || errorData.message || errorMsg;
                            console.error('[DEBUG] Erro parseado do texto:', errorData);
                        } catch {
                            errorMsg = responseText.substring(0, 200) || errorMsg;
                            console.error('[DEBUG] Erro como texto (não JSON):', responseText.substring(0, 200));
                        }
                    } else {
                        errorMsg = responseText.substring(0, 200) || errorMsg;
                        console.error('[DEBUG] Erro como texto:', responseText.substring(0, 200));
                    }
                }
                
                console.error(`[DEBUG] Erro final para chave ${chave.substring(0, 10)}...:`, errorMsg);
                return {success: false, error: errorMsg};
            }
        } catch (error) {
            return {success: false, error: error.message || 'Erro de conexão'};
        }
    }
    
    /**
     * Processa upload de XMLs
     */
    async uploadXMLs(files, verificarExistentes = false, numThreads = 5, cancelToken = null, checkpoint = null) {
        const jobId = await this.startJob('upload');
        
        // Garantir que files é um array
        let filesArray = Array.isArray(files) ? files : Array.from(files || []);
        
        if (filesArray.length === 0) {
            throw new Error('Nenhum arquivo selecionado');
        }
        
        // Se houver checkpoint, usar arquivos que falharam ou continuar de onde parou
        let processedFiles = new Set();
        let isReprocessingErrors = false;
        
        // Determinar o total de arquivos
        // Se há checkpoint e estamos continuando/reprocessando, usar o total do checkpoint
        // Se não há checkpoint ou é nova seleção, usar o total real dos arquivos selecionados
        let totalFiles = filesArray.length;
        
        if (checkpoint && checkpoint.data) {
            // Verificar se estamos reprocessando erros (flag especial)
            if (checkpoint.data.reprocessErrors) {
                // Modo reprocessar erros - processar apenas arquivos com erro
                isReprocessingErrors = true;
                totalFiles = checkpoint.data.total;
                
                // Manter sucessos e enviados do checkpoint original
                if (checkpoint.data.enviados) {
                    checkpoint.data.enviados.forEach(item => {
                        processedFiles.add(item.nome);
                    });
                }
                
                // Filtrar apenas arquivos com erro que estão na seleção atual
                if (checkpoint.data.errosDetalhados && checkpoint.data.errosDetalhados.length > 0) {
                    const errorFiles = checkpoint.data.errosDetalhados.map(e => e.nome);
                    filesArray = filesArray.filter(file => errorFiles.includes(file.name));
                } else {
                    // Se não há erros detalhados, não há nada para reprocessar
                    filesArray = [];
                }
            } else if (checkpoint.data.total === filesArray.length) {
                // Mesma quantidade - continuar de onde parou
                totalFiles = checkpoint.data.total;
                
                if (checkpoint.data.enviados) {
                    checkpoint.data.enviados.forEach(item => {
                        // Encontrar arquivo correspondente pelo nome
                        const file = filesArray.find(f => f.name === item.nome);
                        if (file) processedFiles.add(file.name);
                    });
                }
            } else {
                // Quantidade diferente - nova seleção, ignorar checkpoint
                checkpoint = null;
            }
        }
        
        const results = {
            sucesso: checkpoint && checkpoint.data && !isReprocessingErrors ? (checkpoint.data.sucesso || 0) : (checkpoint && checkpoint.data ? (checkpoint.data.sucesso || 0) : 0),
            erros: 0, // Resetar erros ao reprocessar
            total: totalFiles,
            enviados: checkpoint && checkpoint.data && !isReprocessingErrors ? (checkpoint.data.enviados || []) : (checkpoint && checkpoint.data ? (checkpoint.data.enviados || []) : []),
            errosDetalhados: [], // Limpar erros detalhados ao reprocessar
            cancelado: false
        };
        
        // Se não estamos reprocessando erros e há arquivos já processados, pular eles
        if (!isReprocessingErrors && processedFiles.size > 0) {
            // Continuar processamento - pular arquivos já processados
            filesArray = filesArray.filter(file => !processedFiles.has(file.name));
        }
        
        // Lock para atualização thread-safe do progresso
        let progressLock = Promise.resolve();
        
        const updateProgressSafely = async (progress, total, current, item = null) => {
            // Atualizar callback imediatamente (síncrono) para UI responsiva
            if (this.onProgressUpdate) {
                this.onProgressUpdate({
                    job_id: jobId,
                    progress: progress,
                    total: total,
                    current: current,
                    item: item
                });
            }
            
            // Atualizar via API em background (não bloquear)
            progressLock = progressLock.then(async () => {
                await this.updateProgress(progress, total, current).catch(() => {});
            });
        };
        
        try {
            // Processar em chunks para controle de concorrência
            const chunks = this.chunkArray(filesArray, numThreads);
            
            for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
                // Verificar cancelamento antes de processar chunk
                if (cancelToken && cancelToken.isCancelled()) {
                    results.cancelado = true;
                    break;
                }
                
                const chunk = chunks[chunkIndex];
                
                // Processar chunk em paralelo
                const promises = chunk.map(async (file, idx) => {
                    try {
                        // Verificar cancelamento
                        if (cancelToken && cancelToken.isCancelled()) {
                            return {status: 'cancelled', file: file.name};
                        }
                        
                        // Notificar início do processamento
                        updateProgressSafely(
                            results.sucesso + results.erros, 
                            results.total, 
                            file.name,
                            {status: 'pending', name: file.name, message: 'Processando...'}
                        );
                        
                        // Ler arquivo
                        const xmlContent = await this.readFileAsText(file);
                        
                        // Validar XML
                        if (!validateXML(xmlContent)) {
                            throw new Error('XML inválido ou mal formado');
                        }
                        
                        // Verificar existente se solicitado
                        if (verificarExistentes) {
                            const chave = extractChave(xmlContent);
                            if (chave) {
                                // Verificar se existe (implementar se necessário)
                                // Por enquanto, sempre envia
                            }
                        }
                        
                        // Enviar à API SIEG
                        const resultado = await this.sendToSIEG(xmlContent);
                        
                        const xmlInfo = extractXMLInfo(xmlContent);
                        
                        // Atualizar contadores de forma thread-safe
                        let currentProgress;
                        if (resultado.success) {
                            results.sucesso++;
                            results.enviados.push({
                                nome: file.name,
                                tipo: xmlInfo.tipo,
                                chave: xmlInfo.chave
                            });
                            
                            // Atualizar progresso com sucesso
                            currentProgress = results.sucesso + results.erros;
                            updateProgressSafely(
                                currentProgress, 
                                results.total, 
                                file.name,
                                {status: 'success', name: file.name, message: 'Enviado com sucesso'}
                            );
                        } else {
                            results.erros++;
                            results.errosDetalhados.push({
                                nome: file.name,
                                erro: resultado.error
                            });
                            
                            // Atualizar progresso com erro
                            currentProgress = results.sucesso + results.erros;
                            updateProgressSafely(
                                currentProgress, 
                                results.total, 
                                file.name,
                                {status: 'error', name: file.name, error: resultado.error}
                            );
                        }
                        
                        return resultado.success 
                            ? {status: 'success', file: file.name}
                            : {status: 'error', file: file.name, error: resultado.error};
                        
                    } catch (error) {
                        if (cancelToken && cancelToken.isCancelled()) {
                            return {status: 'cancelled', file: file.name};
                        }
                        
                        results.erros++;
                        results.errosDetalhados.push({
                            nome: file.name,
                            erro: error.message
                        });
                        
                        const currentProgress = results.sucesso + results.erros;
                        updateProgressSafely(
                            currentProgress, 
                            results.total, 
                            file.name,
                            {status: 'error', name: file.name, error: error.message}
                        );
                        
                        return {status: 'error', file: file.name, error: error.message};
                    }
                });
                
                await Promise.all(promises);
                
                // Salvar checkpoint periodicamente (após cada chunk)
                if (window.saveCheckpoint && typeof window.saveCheckpoint === 'function') {
                    // Atualizar total para incluir arquivos já processados do checkpoint
                    if (checkpoint && checkpoint.data) {
                        results.total = checkpoint.data.total;
                        
                        // Se estamos reprocessando erros, manter sucessos anteriores e mesclar resultados
                        if (isReprocessingErrors) {
                            // Manter sucessos anteriores
                            const sucessosAnteriores = checkpoint.data.enviados || [];
                            // Adicionar novos sucessos (evitando duplicatas)
                            const novosSucessos = results.enviados.filter(novo => 
                                !sucessosAnteriores.some(antigo => antigo.nome === novo.nome)
                            );
                            results.enviados = [...sucessosAnteriores, ...novosSucessos];
                            results.sucesso = results.enviados.length;
                            
                            // Remover arquivos que foram reprocessados com sucesso da lista de erros
                            if (checkpoint.data.errosDetalhados) {
                                const nomesSucesso = results.enviados.map(e => e.nome);
                                checkpoint.data.errosDetalhados = checkpoint.data.errosDetalhados.filter(
                                    erro => !nomesSucesso.includes(erro.nome)
                                );
                            }
                            
                            // Adicionar novos erros (se houver)
                            if (results.errosDetalhados && results.errosDetalhados.length > 0) {
                                checkpoint.data.errosDetalhados = [
                                    ...(checkpoint.data.errosDetalhados || []),
                                    ...results.errosDetalhados
                                ];
                            }
                            
                            // Atualizar contadores
                            results.erros = checkpoint.data.errosDetalhados ? checkpoint.data.errosDetalhados.length : 0;
                            
                            // Remover flag de reprocessamento após processar
                            delete checkpoint.data.reprocessErrors;
                            delete checkpoint.data.reprocessErrorsTimestamp;
                        }
                    }
                    window.saveCheckpoint('upload', results);
                }
            }
            
            // Aguardar todas as atualizações de progresso terminarem
            await progressLock;
            
            await this.completeJob(results);
            
            // Limpar checkpoint se não houver erros (e não estivermos reprocessando)
            if (results.erros === 0 && !isReprocessingErrors && window.clearCheckpoint && typeof window.clearCheckpoint === 'function') {
                window.clearCheckpoint('upload');
            }
            
            return results;
            
        } catch (error) {
            // Se foi cancelado, não reportar como erro
            if (cancelToken && cancelToken.isCancelled()) {
                results.cancelado = true;
                // Salvar checkpoint mesmo se cancelado
                if (window.saveCheckpoint && typeof window.saveCheckpoint === 'function') {
                    if (checkpoint && checkpoint.data) {
                        results.total = checkpoint.data.total;
                        
                        // Se estamos reprocessando erros, manter sucessos anteriores
                        if (isReprocessingErrors) {
                            const sucessosAnteriores = checkpoint.data.enviados || [];
                            const novosSucessos = results.enviados.filter(novo => 
                                !sucessosAnteriores.some(antigo => antigo.nome === novo.nome)
                            );
                            results.enviados = [...sucessosAnteriores, ...novosSucessos];
                            results.sucesso = results.enviados.length;
                            
                            // Mesclar erros
                            if (checkpoint.data.errosDetalhados && results.errosDetalhados) {
                                checkpoint.data.errosDetalhados = [
                                    ...checkpoint.data.errosDetalhados,
                                    ...results.errosDetalhados
                                ];
                            }
                            results.errosDetalhados = checkpoint.data.errosDetalhados || [];
                            results.erros = results.errosDetalhados.length;
                        }
                    }
                    window.saveCheckpoint('upload', results);
                }
                await this.completeJob(results);
                return results;
            }
            await this.reportError(error);
            throw error;
        }
    }
    
    /**
     * Processa download de XMLs
     */
    async downloadXMLs(planilhaFile, cancelToken = null, numThreads = 5, checkpoint = null) {
        const jobId = await this.startJob('download');
        
        try {
            // Processar arquivo (Excel ou SPED) primeiro para conhecer o total real
            let chaves = [];
            let isReprocessingErrors = false;
            
            // Processar planilha para obter o total real de chaves
            const planilhaData = await processarArquivo(planilhaFile);
            const totalChavesReais = planilhaData.chaves.length;
            
            // Verificar se há checkpoint e se é continuação com a mesma planilha
            if (checkpoint && checkpoint.data) {
                // Se o total do checkpoint é diferente do total real, é nova seleção
                if (checkpoint.data.total === totalChavesReais && checkpoint.data.chavesFalhas && checkpoint.data.chavesFalhas.length > 0) {
                    // Continuando com a mesma planilha e reprocessando erros
                    chaves = checkpoint.data.chavesFalhas;
                    isReprocessingErrors = true;
                } else if (checkpoint.data.total === totalChavesReais) {
                    // Continuando com a mesma planilha, mas reprocessar erros não especificado
                    // Usar todas as chaves (será filtrado depois se necessário)
                    chaves = planilhaData.chaves;
                } else {
                    // Total diferente - nova seleção, ignorar checkpoint
                    checkpoint = null;
                    chaves = planilhaData.chaves;
                }
            } else {
                // Sem checkpoint, usar todas as chaves da planilha
                chaves = planilhaData.chaves;
            }
            
            if (chaves.length === 0) {
                throw new Error('Nenhuma chave válida encontrada na planilha');
            }
            
            // SEMPRE usar o total real da planilha processada
            // O checkpoint é usado apenas para recuperar progresso anterior se for continuação
            const results = {
                sucesso: checkpoint && checkpoint.data && !isReprocessingErrors ? (checkpoint.data.sucesso || 0) : 0,
                falhas: 0, // Resetar falhas se reprocessando
                total: totalChavesReais, // Sempre usar o total real
                xmls: checkpoint && checkpoint.data && !isReprocessingErrors ? (checkpoint.data.xmls || []) : [],
                cancelado: false
            };
            
            // Lock para atualização thread-safe do progresso
            let progressLock = Promise.resolve();
            
            const updateProgressSafely = async (progress, total, current, item = null) => {
                // Atualizar callback imediatamente (síncrono) para UI responsiva
                if (this.onProgressUpdate) {
                    this.onProgressUpdate({
                        job_id: jobId,
                        progress: progress,
                        total: total,
                        current: current,
                        item: item
                    });
                }
                
                // Atualizar via API em background (não bloquear)
                progressLock = progressLock.then(async () => {
                    await this.updateProgress(progress, total, current).catch(() => {});
                });
            };
            
            // Processar em chunks para controle de concorrência
            const chunks = this.chunkArray(chaves, numThreads);
            
            for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
                // Verificar cancelamento antes de processar chunk
                if (cancelToken && cancelToken.isCancelled()) {
                    results.cancelado = true;
                    break;
                }
                
                const chunk = chunks[chunkIndex];
                
                // Processar chunk em paralelo
                const promises = chunk.map(async (chave, idx) => {
                    try {
                        // Verificar cancelamento
                        if (cancelToken && cancelToken.isCancelled()) {
                            return {status: 'cancelled', chave: chave};
                        }
                        
                        const chaveShort = chave.substring(0, 10) + '...';
                        
                        // Notificar início do processamento
                        updateProgressSafely(
                            results.sucesso + results.falhas, 
                            results.total, 
                            chaveShort,
                            {status: 'pending', chave: chave, message: 'Baixando...'}
                        );
                        
                        // Baixar da API SIEG
                        const downloadResult = await this.downloadFromSIEG(chave);
                        
                        // Atualizar contadores de forma thread-safe
                        let currentProgress;
                        
                        if (downloadResult.success && downloadResult.xml) {
                            const xmlContent = downloadResult.xml;
                            
                            // Validar
                            if (validateXML(xmlContent)) {
                                const xmlInfo = extractXMLInfo(xmlContent);
                                
                                // Adicionar XML aos resultados (thread-safe)
                                results.xmls.push({
                                    chave: chave,
                                    conteudo: xmlContent,
                                    ano: xmlInfo.data?.ano,
                                    mes: xmlInfo.data?.mes,
                                    tipo: xmlInfo.tipo
                                });
                                results.sucesso++;
                                
                                // Atualizar progresso com sucesso
                                currentProgress = results.sucesso + results.falhas;
                                updateProgressSafely(
                                    currentProgress, 
                                    results.total, 
                                    chaveShort,
                                    {status: 'success', chave: chave, message: 'Baixado com sucesso'}
                                );
                                
                                return {status: 'success', chave: chave};
                            } else {
                                results.falhas++;
                                currentProgress = results.sucesso + results.falhas;
                                updateProgressSafely(
                                    currentProgress, 
                                    results.total, 
                                    chaveShort,
                                    {status: 'error', chave: chave, error: 'XML inválido ou mal formado'}
                                );
                                
                                return {status: 'error', chave: chave, error: 'XML inválido ou mal formado'};
                            }
                        } else {
                            results.falhas++;
                            const errorMsg = downloadResult.error || 'Falha ao baixar XML';
                            currentProgress = results.sucesso + results.falhas;
                            updateProgressSafely(
                                currentProgress, 
                                results.total, 
                                chaveShort,
                                {status: 'error', chave: chave, error: errorMsg}
                            );
                            
                            return {status: 'error', chave: chave, error: errorMsg};
                        }
                        
                    } catch (error) {
                        if (cancelToken && cancelToken.isCancelled()) {
                            return {status: 'cancelled', chave: chave};
                        }
                        
                        results.falhas++;
                        const chaveShort = chave.substring(0, 10) + '...';
                        const currentProgress = results.sucesso + results.falhas;
                        
                        updateProgressSafely(
                            currentProgress, 
                            results.total, 
                            chaveShort,
                            {status: 'error', chave: chave, error: error.message || 'Erro desconhecido'}
                        );
                        
                        return {status: 'error', chave: chave, error: error.message || 'Erro desconhecido'};
                    }
                });
                
                await Promise.all(promises);
                
                // Salvar checkpoint periodicamente (após cada chunk)
                if (window.saveCheckpoint && typeof window.saveCheckpoint === 'function') {
                    // Garantir que total seja preservado do checkpoint original
                    if (checkpoint && checkpoint.data && checkpoint.data.total) {
                        results.total = checkpoint.data.total;
                    }
                    window.saveCheckpoint('upload', results);
                }
            }
            
            // Aguardar todas as atualizações de progresso terminarem
            await progressLock;
            
            await this.completeJob(results);
            
            // Limpar checkpoint se não houver erros (e não estivermos reprocessando)
            if (results.erros === 0 && !isReprocessingErrors && window.clearCheckpoint && typeof window.clearCheckpoint === 'function') {
                window.clearCheckpoint('upload');
            }
            
            return results;
            
        } catch (error) {
            // Se foi cancelado, não reportar como erro
            if (cancelToken && cancelToken.isCancelled()) {
                const cancelResults = {
                    sucesso: 0,
                    falhas: 0,
                    total: 0,
                    xmls: [],
                    cancelado: true
                };
                await this.completeJob(cancelResults);
                return cancelResults;
            }
            await this.reportError(error);
            throw error;
        }
    }
    
    /**
     * Extrai chaves de planilhas
     */
    async extractKeys(files) {
        const jobId = await this.startJob('extract');
        
        try {
            const filesArray = Array.isArray(files) ? files : [files];
            
            if (filesArray.length === 1) {
                const resultado = await processarPlanilha(filesArray[0]);
                await this.completeJob(resultado);
                return resultado;
            } else {
                const resultado = await processarMultiplasPlanilhas(filesArray);
                await this.completeJob(resultado);
                return resultado;
            }
        } catch (error) {
            await this.reportError(error);
            throw error;
        }
    }
    
    /**
     * Cria e baixa ZIP com XMLs
     */
    async downloadZIP(xmls) {
        const zip = new JSZip();
        
        xmls.forEach(xml => {
            const pasta = (xml.ano && xml.mes) 
                ? `${xml.ano}/${String(xml.mes).padStart(2, '0')}/` 
                : '';
            zip.file(`${pasta}${xml.chave}.xml`, xml.conteudo);
        });
        
        try {
            const blob = await zip.generateAsync({type: 'blob'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `xmls_baixados_${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Erro ao criar ZIP:', error);
            throw error;
        }
    }
    
    /**
     * Utilitários
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file, 'utf-8');
        });
    }
    
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}

// Instância global do cliente
let client = null;

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', async () => {
    client = new SiegXMLClient();
    await client.init();
});
