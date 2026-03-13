const fs = require('fs');
const path = require('path');
const logger = require('./logger');

let selectorConfig = null;
const configPath = path.join(__dirname, '../../config/selectors.json');
const defaultConfigPath = path.join(__dirname, '../../config/selectors.json.example');

/**
 * Carrega configuração de seletores
 */
function loadSelectorConfig() {
  if (selectorConfig) {
    return selectorConfig;
  }

  try {
    // Tentar carregar configuração customizada
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      selectorConfig = JSON.parse(content);
      logger.debug('Configuração de seletores carregada', { path: configPath });
      return selectorConfig;
    }

    // Tentar carregar exemplo se existir
    if (fs.existsSync(defaultConfigPath)) {
      const content = fs.readFileSync(defaultConfigPath, 'utf8');
      selectorConfig = JSON.parse(content);
      logger.warn('Usando configuração de exemplo de seletores', { path: defaultConfigPath });
      return selectorConfig;
    }

    // Retornar configuração padrão (hardcoded)
    logger.warn('Nenhuma configuração de seletores encontrada, usando padrão');
    return getDefaultConfig();
  } catch (error) {
    logger.error('Erro ao carregar configuração de seletores', error, { path: configPath });
    return getDefaultConfig();
  }
}

/**
 * Retorna configuração padrão (fallback)
 */
function getDefaultConfig() {
  return {
    fields: {
      nome: [
        { type: 'selector', value: 'input[formcontrolname="name"]', description: 'formcontrolname', priority: 1 },
        { type: 'testid', value: 'name', description: 'data-testid', priority: 2 },
        { type: 'selector', value: '#name[type="text"]', description: 'id', priority: 3 }
      ],
      cpf: [
        { type: 'testid', value: 'cpf', description: 'data-testid', priority: 1 },
        { type: 'selector', value: 'input[formcontrolname*="cpf" i], input[id*="cpf" i]', description: 'formcontrolname/id', priority: 2 }
      ],
      telefone: [
        { type: 'testid', value: 'phone', description: 'data-testid', priority: 1 },
        { type: 'selector', value: 'input[formcontrolname*="phone" i], input[id*="phone" i]', description: 'formcontrolname/id', priority: 2 }
      ],
      emailContato: [
        { type: 'testid', value: 'email', description: 'data-testid', priority: 1 },
        { type: 'selector', value: 'input[formcontrolname*="email" i]', description: 'formcontrolname', priority: 2 }
      ],
      emailLogin: [
        { type: 'selector', value: 'input[formcontrolname*="login" i]', description: 'formcontrolname', priority: 1 }
      ]
    }
  };
}

/**
 * Converte configuração de seletor para formato usado pelo findFieldValue
 */
function convertSelectorToStrategy(selectorDef, page) {
  if (selectorDef.type === 'testid') {
    return {
      selector: (p) => p.getByTestId(selectorDef.value).first(),
      description: selectorDef.description || selectorDef.value
    };
  } else if (selectorDef.type === 'selector') {
    return {
      selector: selectorDef.value,
      description: selectorDef.description || selectorDef.value
    };
  } else {
    return {
      selector: selectorDef.value,
      description: selectorDef.description || selectorDef.value
    };
  }
}

/**
 * Obtém estratégias de seletores para um campo
 */
function getFieldStrategies(fieldName) {
  const config = loadSelectorConfig();
  const fieldConfig = config.fields?.[fieldName];
  
  if (!fieldConfig || !Array.isArray(fieldConfig)) {
    logger.warn(`Nenhuma configuração de seletor encontrada para campo: ${fieldName}`, { field: fieldName });
    return [];
  }

  // Ordenar por prioridade
  const sorted = [...fieldConfig].sort((a, b) => (a.priority || 999) - (b.priority || 999));
  
  return sorted.map(def => ({
    selector: def.type === 'testid' 
      ? (page) => page.getByTestId(def.value).first()
      : def.value,
    description: def.description || def.value,
    priority: def.priority || 999
  }));
}

/**
 * Obtém padrões de label para busca por texto
 */
function getLabelPatterns(fieldName) {
  const config = loadSelectorConfig();
  const patterns = config.labels?.[fieldName];
  
  if (!patterns || !Array.isArray(patterns)) {
    return [];
  }

  return patterns.map(pattern => new RegExp(pattern, 'i'));
}

/**
 * Recarrega configuração (útil para testes ou atualizações dinâmicas)
 */
function reloadSelectorConfig() {
  selectorConfig = null;
  return loadSelectorConfig();
}

/**
 * Valida configuração de seletores
 */
function validateSelectorConfig(config) {
  const errors = [];

  if (!config.fields || typeof config.fields !== 'object') {
    errors.push('Configuração deve ter um objeto "fields"');
  }

  if (config.fields) {
    Object.entries(config.fields).forEach(([fieldName, strategies]) => {
      if (!Array.isArray(strategies)) {
        errors.push(`Campo "${fieldName}" deve ser um array de estratégias`);
        return;
      }

      strategies.forEach((strategy, index) => {
        if (!strategy.type) {
          errors.push(`Estratégia ${index} do campo "${fieldName}" deve ter um "type"`);
        }
        if (!strategy.value) {
          errors.push(`Estratégia ${index} do campo "${fieldName}" deve ter um "value"`);
        }
      });
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  loadSelectorConfig,
  getFieldStrategies,
  getLabelPatterns,
  reloadSelectorConfig,
  validateSelectorConfig,
  convertSelectorToStrategy
};
