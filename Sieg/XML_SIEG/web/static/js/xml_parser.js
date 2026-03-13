/**
 * Utilitários para parsing e validação de XML
 */

/**
 * Valida se uma string é um XML válido
 * @param {string} xmlContent - Conteúdo do XML
 * @returns {boolean} True se válido
 */
function validateXML(xmlContent) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlContent, 'text/xml');
        const parserError = doc.querySelector('parsererror');
        return !parserError;
    } catch (e) {
        return false;
    }
}

/**
 * Extrai a chave de acesso do XML
 * @param {string} xmlContent - Conteúdo do XML
 * @returns {string|null} Chave de acesso (44 dígitos) ou null
 */
function extractChave(xmlContent) {
    // Tentar vários padrões
    const patterns = [
        /<chNFe>(\d{44})<\/chNFe>/,
        /<chCTe>(\d{44})<\/chCTe>/,
        /<chaveAcesso>(\d{44})<\/chaveAcesso>/,
        /<chave>(\d{44})<\/chave>/,
        /chNFe="(\d{44})"/,
        /chCTe="(\d{44})"/
    ];
    
    for (const pattern of patterns) {
        const match = xmlContent.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    return null;
}

/**
 * Extrai data (ano e mês) do XML
 * @param {string} xmlContent - Conteúdo do XML
 * @returns {Object|null} {ano: string, mes: number} ou null
 */
function extractData(xmlContent) {
    // Padrões para data de emissão
    const patterns = [
        /<dhEmi>(\d{4})-(\d{2})-\d{2}/,
        /<dhEmissao>(\d{4})-(\d{2})-\d{2}/,
        /<dEmi>(\d{4})-(\d{2})-\d{2}/,
        /<dEmissao>(\d{4})-(\d{2})-\d{2}/
    ];
    
    for (const pattern of patterns) {
        const match = xmlContent.match(pattern);
        if (match && match[1] && match[2]) {
            return {
                ano: match[1],
                mes: parseInt(match[2], 10)
            };
        }
    }
    
    return null;
}

/**
 * Identifica o tipo do XML
 * @param {string} xmlContent - Conteúdo do XML
 * @returns {string} Tipo do XML (NFe, NFCe, CTe, etc)
 */
function getTipoXML(xmlContent) {
    if (xmlContent.includes('<NFe ') || xmlContent.includes('<NFe>')) {
        if (xmlContent.includes('tpEmis') && xmlContent.includes('tpEmis="9"')) {
            return 'NFCe';
        }
        return 'NFe';
    }
    if (xmlContent.includes('<CTe ') || xmlContent.includes('<CTe>')) {
        return 'CTe';
    }
    if (xmlContent.includes('<CFe ') || xmlContent.includes('<CFe>')) {
        return 'CFe';
    }
    if (xmlContent.includes('<NFSe ') || xmlContent.includes('<NFSe>')) {
        return 'NFSe';
    }
    if (xmlContent.includes('<nfeProc>')) {
        return 'NFe Proc';
    }
    
    return 'Desconhecido';
}

/**
 * Extrai informações completas do XML
 * @param {string} xmlContent - Conteúdo do XML
 * @returns {Object} Informações extraídas
 */
function extractXMLInfo(xmlContent) {
    return {
        chave: extractChave(xmlContent),
        data: extractData(xmlContent),
        tipo: getTipoXML(xmlContent),
        valido: validateXML(xmlContent)
    };
}
