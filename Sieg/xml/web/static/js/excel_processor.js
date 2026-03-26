/**
 * Processamento de planilhas Excel no navegador
 */

/**
 * Identifica a coluna que contém chaves de acesso
 * @param {Array} data - Array de objetos (linhas da planilha)
 * @returns {string|null} Nome da coluna ou null
 */
function identificarColunaChaves(data) {
    if (!data || data.length === 0) {
        return null;
    }
    
    // Padrão de chave de acesso: 44 dígitos
    const chavePattern = /^\d{44}$/;
    
    // Verificar cada coluna
    const columns = Object.keys(data[0]);
    
    for (const col of columns) {
        // Verificar se a maioria dos valores na coluna são chaves válidas
        let chavesValidas = 0;
        let totalValores = 0;
        
        for (const row of data) {
            const valor = String(row[col] || '').trim();
            if (valor) {
                totalValores++;
                if (chavePattern.test(valor)) {
                    chavesValidas++;
                }
            }
        }
        
        // Se pelo menos 50% são chaves válidas, essa é a coluna
        if (totalValores > 0 && (chavesValidas / totalValores) >= 0.5) {
            return col;
        }
    }
    
    // Se não encontrou, retornar a primeira coluna como fallback
    return columns.length > 0 ? columns[0] : null;
}

/**
 * Extrai chaves válidas de uma coluna da planilha
 * @param {Array} data - Array de objetos (linhas da planilha)
 * @param {string} coluna - Nome da coluna
 * @returns {Array<string>} Array de chaves válidas
 */
function extrairChaves(data, coluna) {
    if (!data || !coluna) {
        return [];
    }
    
    const chaves = [];
    const chavePattern = /^\d{44}$/;
    const chavesSet = new Set(); // Para evitar duplicatas
    
    for (const row of data) {
        const valor = String(row[coluna] || '').trim();
        if (valor && chavePattern.test(valor) && !chavesSet.has(valor)) {
            chaves.push(valor);
            chavesSet.add(valor);
        }
    }
    
    return chaves;
}

/**
 * Processa uma planilha Excel e retorna as chaves
 * @param {File} file - Arquivo Excel
 * @returns {Promise<Object>} {chaves: Array, coluna: string, totalLinhas: number}
 */
async function processarPlanilha(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                
                if (workbook.SheetNames.length === 0) {
                    reject(new Error('Planilha vazia'));
                    return;
                }
                
                // Usar a primeira aba
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Converter para JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                if (jsonData.length === 0) {
                    reject(new Error('Planilha sem dados'));
                    return;
                }
                
                // Identificar coluna de chaves
                const coluna = identificarColunaChaves(jsonData);
                
                if (!coluna) {
                    reject(new Error('Não foi possível identificar coluna de chaves'));
                    return;
                }
                
                // Extrair chaves
                const chaves = extrairChaves(jsonData, coluna);
                
                resolve({
                    chaves: chaves,
                    coluna: coluna,
                    totalLinhas: jsonData.length,
                    totalChaves: chaves.length,
                    nomeArquivo: file.name
                });
                
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = function(e) {
            reject(new Error('Erro ao ler arquivo'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Processa múltiplas planilhas/arquivos e consolida as chaves
 * @param {Array<File>} files - Array de arquivos (Excel ou SPED)
 * @returns {Promise<Object>} Chaves consolidadas
 */
async function processarMultiplasPlanilhas(files) {
    const todasChaves = [];
    const resultados = [];
    
    for (const file of files) {
        try {
            const resultado = await processarArquivo(file);
            resultados.push({
                arquivo: file.name,
                ...resultado
            });
            todasChaves.push(...resultado.chaves);
        } catch (error) {
            resultados.push({
                arquivo: file.name,
                erro: error.message
            });
        }
    }
    
    // Remover duplicatas
    const chavesUnicas = Array.from(new Set(todasChaves));
    
    return {
        chaves: chavesUnicas,
        total: chavesUnicas.length,
        resultados: resultados
    };
}

/**
 * Extrai chaves de 44 dígitos de um texto
 * @param {string} texto - Texto onde buscar chaves
 * @returns {Array<string>} Array de chaves encontradas
 */
function extrairChavesDoTexto(texto) {
    // Padrão para chave de XML: exatamente 44 dígitos consecutivos
    const chavePattern = /\b\d{44}\b/g;
    const chaves = [];
    const chavesSet = new Set(); // Para evitar duplicatas
    
    let match;
    while ((match = chavePattern.exec(texto)) !== null) {
        const chave = match[0];
        if (!chavesSet.has(chave)) {
            chaves.push(chave);
            chavesSet.add(chave);
        }
    }
    
    return chaves;
}

/**
 * Processa um arquivo SPED (.txt) e extrai chaves de XML
 * @param {File} file - Arquivo de texto SPED
 * @returns {Promise<Object>} {chaves: Array, totalLinhas: number}
 */
async function processarArquivoSPED(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const texto = e.target.result;
                
                if (!texto || texto.trim().length === 0) {
                    reject(new Error('Arquivo vazio'));
                    return;
                }
                
                // Extrair chaves do texto
                const chaves = extrairChavesDoTexto(texto);
                
                // Contar linhas (aproximado)
                const totalLinhas = texto.split('\n').length;
                
                if (chaves.length === 0) {
                    reject(new Error('Nenhuma chave de 44 dígitos encontrada no arquivo'));
                    return;
                }
                
                resolve({
                    chaves: chaves,
                    totalLinhas: totalLinhas,
                    totalChaves: chaves.length,
                    nomeArquivo: file.name
                });
                
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = function(e) {
            reject(new Error('Erro ao ler arquivo'));
        };
        
        reader.readAsText(file, 'UTF-8');
    });
}

/**
 * Detecta o tipo de arquivo e processa adequadamente (Excel ou SPED)
 * @param {File} file - Arquivo (Excel ou TXT)
 * @returns {Promise<Object>} {chaves: Array, coluna?: string, totalLinhas: number}
 */
async function processarArquivo(file) {
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.split('.').pop();
    
    // Se for arquivo de texto (.txt), processar como SPED
    if (fileExtension === 'txt' || file.type === 'text/plain') {
        return await processarArquivoSPED(file);
    }
    // Se for Excel (.xlsx, .xls), processar como planilha
    else if (fileExtension === 'xlsx' || fileExtension === 'xls' || 
             file.type.includes('spreadsheet') || file.type.includes('excel')) {
        return await processarPlanilha(file);
    }
    else {
        throw new Error('Tipo de arquivo não suportado. Use Excel (.xlsx, .xls) ou SPED (.txt)');
    }
}

/**
 * Exporta chaves para Excel
 * @param {Array<string>} chaves - Array de chaves
 * @param {string} nomeArquivo - Nome do arquivo de saída
 */
function exportarChavesParaExcel(chaves, nomeArquivo = 'chaves_xml.xlsx') {
    // Criar dados
    const dados = chaves.map(chave => ({ 'Chave XML': chave }));
    
    // Criar workbook
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chaves');
    
    // Gerar arquivo
    XLSX.writeFile(wb, nomeArquivo);
}
