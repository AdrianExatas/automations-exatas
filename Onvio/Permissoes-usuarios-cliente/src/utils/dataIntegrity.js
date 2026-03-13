const crypto = require('crypto');
const logger = require('./logger');

/**
 * Calcula checksum de um objeto
 */
function calculateChecksum(data) {
  const dataString = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Valida integridade de dados do usuário
 */
function validateUserDataIntegrity(userData) {
  const issues = [];
  
  // Validar estrutura básica
  if (!userData || typeof userData !== 'object') {
    issues.push({ type: 'structure', message: 'Dados do usuário não são um objeto válido' });
    return { isValid: false, issues };
  }

  // Validar campos obrigatórios
  if (!userData.nome || !userData.nome.trim()) {
    issues.push({ type: 'required', field: 'nome', message: 'Nome é obrigatório' });
  }

  if (!userData.emailContato && !userData.emailLogin) {
    issues.push({ type: 'required', field: 'email', message: 'Pelo menos um e-mail é obrigatório' });
  }

  // Validar consistência de arrays
  if (!Array.isArray(userData.departamentos)) {
    issues.push({ type: 'type', field: 'departamentos', message: 'Departamentos deve ser um array' });
  }

  if (!Array.isArray(userData.empresas)) {
    issues.push({ type: 'type', field: 'empresas', message: 'Empresas deve ser um array' });
  }

  if (!Array.isArray(userData.permissoes)) {
    issues.push({ type: 'type', field: 'permissoes', message: 'Permissões deve ser um array' });
  }

  // Validar estrutura de departamentos
  if (Array.isArray(userData.departamentos)) {
    userData.departamentos.forEach((dept, index) => {
      if (!dept.codigo && !dept.nome) {
        issues.push({ 
          type: 'structure', 
          field: `departamentos[${index}]`, 
          message: 'Departamento deve ter código ou nome' 
        });
      }
    });
  }

  // Validar estrutura de empresas
  if (Array.isArray(userData.empresas)) {
    userData.empresas.forEach((empresa, index) => {
      if (!empresa.codigo && !empresa.empresa && !empresa.inscricao) {
        issues.push({ 
          type: 'structure', 
          field: `empresas[${index}]`, 
          message: 'Empresa deve ter pelo menos código, nome ou inscrição' 
        });
      }
    });
  }

  // Validar consistência cruzada
  // Se tem departamentos, deve ter pelo menos um habilitado
  if (Array.isArray(userData.departamentos) && userData.departamentos.length > 0) {
    const hasEnabled = userData.departamentos.some(d => d.habilitado === true);
    if (!hasEnabled && userData.departamentos.length > 0) {
      issues.push({ 
        type: 'consistency', 
        field: 'departamentos', 
        message: 'Tem departamentos mas nenhum está habilitado' 
      });
    }
  }

  // Validar formato de dados
  if (userData.cpf && userData.cpf.length > 0) {
    const cleanCPF = userData.cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) {
      issues.push({ 
        type: 'format', 
        field: 'cpf', 
        message: 'CPF deve ter 11 dígitos' 
      });
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    checksum: calculateChecksum(userData)
  };
}

/**
 * Valida integridade de múltiplos usuários
 */
function validateMultipleUsersIntegrity(usersArray) {
  const results = {
    total: usersArray.length,
    valid: 0,
    invalid: 0,
    issues: [],
    checksums: []
  };

  usersArray.forEach((userData, index) => {
    const validation = validateUserDataIntegrity(userData);
    
    if (validation.isValid) {
      results.valid++;
    } else {
      results.invalid++;
      results.issues.push({
        index,
        user: userData.nome || userData.emailContato || `Usuário ${index + 1}`,
        issues: validation.issues
      });
    }
    
    results.checksums.push({
      index,
      checksum: validation.checksum
    });
  });

  // Verificar duplicatas por checksum
  const checksumMap = new Map();
  results.checksums.forEach(({ index, checksum }) => {
    if (checksumMap.has(checksum)) {
      results.issues.push({
        index,
        type: 'duplicate',
        message: `Usuário duplicado (mesmo checksum que índice ${checksumMap.get(checksum)})`
      });
    } else {
      checksumMap.set(checksum, index);
    }
  });

  return results;
}

/**
 * Detecta dados inconsistentes ou suspeitos
 */
function detectInconsistencies(userData) {
  const inconsistencies = [];

  // Verificar se nome e email são consistentes
  if (userData.nome && userData.emailContato) {
    const nomeParts = userData.nome.toLowerCase().split(' ');
    const emailLocal = userData.emailContato.split('@')[0].toLowerCase();
    
    // Verificar se email contém partes do nome (heurística simples)
    const nomeInEmail = nomeParts.some(part => 
      part.length > 2 && emailLocal.includes(part)
    );
    
    if (!nomeInEmail && nomeParts.length > 1) {
      inconsistencies.push({
        type: 'inconsistency',
        field: 'nome/email',
        message: 'Nome e e-mail podem não corresponder',
        severity: 'low'
      });
    }
  }

  // Verificar se tem empresas mas não tem departamentos
  if (userData.empresas && userData.empresas.length > 0) {
    if (!userData.departamentos || userData.departamentos.length === 0) {
      inconsistencies.push({
        type: 'inconsistency',
        field: 'empresas/departamentos',
        message: 'Tem empresas mas não tem departamentos',
        severity: 'medium'
      });
    }
  }

  // Verificar se situação é inconsistente
  if (userData.situacao === 'Inativo') {
    const hasActiveItems = 
      (userData.departamentos && userData.departamentos.some(d => d.habilitado)) ||
      (userData.empresas && userData.empresas.length > 0) ||
      (userData.permissoes && userData.permissoes.length > 0);
    
    if (hasActiveItems) {
      inconsistencies.push({
        type: 'inconsistency',
        field: 'situacao',
        message: 'Usuário inativo mas tem itens ativos',
        severity: 'high'
      });
    }
  }

  return inconsistencies;
}

/**
 * Gera relatório de integridade
 */
function generateIntegrityReport(usersArray) {
  const validation = validateMultipleUsersIntegrity(usersArray);
  const allInconsistencies = [];

  usersArray.forEach((userData, index) => {
    const inconsistencies = detectInconsistencies(userData);
    if (inconsistencies.length > 0) {
      allInconsistencies.push({
        index,
        user: userData.nome || userData.emailContato || `Usuário ${index + 1}`,
        inconsistencies
      });
    }
  });

  return {
    timestamp: new Date().toISOString(),
    summary: {
      total: validation.total,
      valid: validation.valid,
      invalid: validation.invalid,
      validityRate: validation.total > 0 
        ? ((validation.valid / validation.total) * 100).toFixed(2) + '%'
        : '0%',
      inconsistenciesCount: allInconsistencies.length
    },
    validation,
    inconsistencies: allInconsistencies,
    recommendations: generateRecommendations(validation, allInconsistencies)
  };
}

/**
 * Gera recomendações baseadas em problemas encontrados
 */
function generateRecommendations(validation, inconsistencies) {
  const recommendations = [];

  if (validation.invalid > 0) {
    recommendations.push({
      type: 'validation',
      priority: 'high',
      message: `${validation.invalid} usuário(s) com problemas de validação. Revise os dados antes de usar.`
    });
  }

  const highSeverityInconsistencies = inconsistencies.filter(item =>
    item.inconsistencies.some(inc => inc.severity === 'high')
  );

  if (highSeverityInconsistencies.length > 0) {
    recommendations.push({
      type: 'inconsistency',
      priority: 'high',
      message: `${highSeverityInconsistencies.length} usuário(s) com inconsistências de alta severidade detectadas.`
    });
  }

  const duplicates = validation.issues.filter(issue => issue.type === 'duplicate');
  if (duplicates.length > 0) {
    recommendations.push({
      type: 'duplicate',
      priority: 'medium',
      message: `${duplicates.length} possível(is) usuário(s) duplicado(s) detectado(s).`
    });
  }

  return recommendations;
}

/**
 * Valida dados antes de salvar
 */
function validateBeforeSave(usersArray) {
  const validation = validateMultipleUsersIntegrity(usersArray);
  const report = generateIntegrityReport(usersArray);

  if (validation.invalid > 0) {
    logger.warn('Problemas de integridade detectados antes de salvar', {
      invalid: validation.invalid,
      total: validation.total,
      issues: validation.issues.slice(0, 5) // Primeiros 5 problemas
    });
  }

  if (report.inconsistencies.length > 0) {
    const highSeverity = report.inconsistencies.filter(item =>
      item.inconsistencies.some(inc => inc.severity === 'high')
    );
    
    if (highSeverity.length > 0) {
      logger.warn('Inconsistências de alta severidade detectadas', {
        count: highSeverity.length,
        inconsistencies: highSeverity.map(item => ({
          user: item.user,
          issues: item.inconsistencies.filter(inc => inc.severity === 'high')
        }))
      });
    }
  }

  return {
    canSave: validation.invalid < validation.total * 0.5, // Permitir se menos de 50% inválidos
    validation,
    report
  };
}

module.exports = {
  calculateChecksum,
  validateUserDataIntegrity,
  validateMultipleUsersIntegrity,
  detectInconsistencies,
  generateIntegrityReport,
  validateBeforeSave
};
