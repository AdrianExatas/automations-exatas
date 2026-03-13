/**
 * Testes unitários para funções auxiliares de extractUserData
 */

const {
  validateCPF,
  validateEmail,
  validatePhone,
  validateRequiredFields,
  sanitizeValue,
  formatCPF,
  formatPhone
} = require('../../src/utils/extractUserData');

describe('sanitizeValue', () => {
  test('deve remover espaços em branco', () => {
    expect(sanitizeValue('  teste  ')).toBe('teste');
  });

  test('deve retornar string vazia para null', () => {
    expect(sanitizeValue(null)).toBe('');
  });

  test('deve retornar string vazia para undefined', () => {
    expect(sanitizeValue(undefined)).toBe('');
  });

  test('deve retornar string vazia para valores não-string', () => {
    expect(sanitizeValue(123)).toBe('');
    expect(sanitizeValue({})).toBe('');
    expect(sanitizeValue([])).toBe('');
  });

  test('deve manter string válida', () => {
    expect(sanitizeValue('João Silva')).toBe('João Silva');
  });
});

describe('validateCPF', () => {
  test('deve validar CPF válido', () => {
    expect(validateCPF('12345678909')).toBe(true);
    expect(validateCPF('11144477735')).toBe(true);
  });

  test('deve rejeitar CPF inválido', () => {
    expect(validateCPF('12345678900')).toBe(false);
    expect(validateCPF('11111111111')).toBe(false);
    expect(validateCPF('00000000000')).toBe(false);
  });

  test('deve validar CPF com formatação', () => {
    expect(validateCPF('123.456.789-09')).toBe(true);
  });

  test('deve rejeitar CPF com menos de 11 dígitos', () => {
    expect(validateCPF('1234567890')).toBe(false);
  });

  test('deve rejeitar CPF vazio ou null', () => {
    expect(validateCPF('')).toBe(false);
    expect(validateCPF(null)).toBe(false);
  });
});

describe('validateEmail', () => {
  test('deve validar e-mail válido', () => {
    expect(validateEmail('teste@example.com')).toBe(true);
    expect(validateEmail('usuario.nome@dominio.com.br')).toBe(true);
    expect(validateEmail('test+tag@example.co.uk')).toBe(true);
  });

  test('deve rejeitar e-mail inválido', () => {
    expect(validateEmail('teste@')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('teste.example.com')).toBe(false);
    expect(validateEmail('teste@')).toBe(false);
  });

  test('deve rejeitar e-mail vazio ou null', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail(null)).toBe(false);
  });

  test('deve validar e-mail com espaços (será removido pelo sanitize)', () => {
    expect(validateEmail('  teste@example.com  ')).toBe(true);
  });
});

describe('validatePhone', () => {
  test('deve validar telefone fixo (10 dígitos)', () => {
    expect(validatePhone('1133334444')).toBe(true);
    expect(validatePhone('(11) 3333-4444')).toBe(true);
  });

  test('deve validar telefone celular (11 dígitos)', () => {
    expect(validatePhone('11987654321')).toBe(true);
    expect(validatePhone('(11) 98765-4321')).toBe(true);
  });

  test('deve rejeitar telefone com menos de 10 dígitos', () => {
    expect(validatePhone('123456789')).toBe(false);
  });

  test('deve rejeitar telefone com mais de 11 dígitos', () => {
    expect(validatePhone('119876543210')).toBe(false);
  });

  test('deve rejeitar telefone vazio ou null', () => {
    expect(validatePhone('')).toBe(false);
    expect(validatePhone(null)).toBe(false);
  });
});

describe('formatCPF', () => {
  test('deve formatar CPF corretamente', () => {
    expect(formatCPF('12345678909')).toBe('123.456.789-09');
  });

  test('deve retornar string vazia para CPF vazio', () => {
    expect(formatCPF('')).toBe('');
    expect(formatCPF(null)).toBe('');
  });

  test('deve retornar CPF original se não tiver 11 dígitos', () => {
    expect(formatCPF('1234567890')).toBe('1234567890');
  });
});

describe('formatPhone', () => {
  test('deve formatar telefone fixo corretamente', () => {
    expect(formatPhone('1133334444')).toBe('(11) 3333-4444');
  });

  test('deve formatar telefone celular corretamente', () => {
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321');
  });

  test('deve retornar string vazia para telefone vazio', () => {
    expect(formatPhone('')).toBe('');
    expect(formatPhone(null)).toBe('');
  });

  test('deve retornar telefone original se não tiver formato válido', () => {
    expect(formatPhone('12345')).toBe('12345');
  });
});

describe('validateRequiredFields', () => {
  test('deve validar dados completos e válidos', () => {
    const userData = {
      nome: 'João Silva',
      emailContato: 'joao@example.com',
      cpf: '12345678909',
      telefone: '11987654321',
      emailLogin: 'joao.login@example.com'
    };
    
    const result = validateRequiredFields(userData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('deve detectar nome ausente', () => {
    const userData = {
      nome: '',
      emailContato: 'joao@example.com'
    };
    
    const result = validateRequiredFields(userData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Nome é obrigatório');
  });

  test('deve detectar e-mails ausentes', () => {
    const userData = {
      nome: 'João Silva',
      emailContato: '',
      emailLogin: ''
    };
    
    const result = validateRequiredFields(userData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Pelo menos um e-mail (contato ou login) é obrigatório');
  });

  test('deve aceitar apenas emailContato', () => {
    const userData = {
      nome: 'João Silva',
      emailContato: 'joao@example.com',
      emailLogin: ''
    };
    
    const result = validateRequiredFields(userData);
    expect(result.isValid).toBe(true);
  });

  test('deve aceitar apenas emailLogin', () => {
    const userData = {
      nome: 'João Silva',
      emailContato: '',
      emailLogin: 'joao@example.com'
    };
    
    const result = validateRequiredFields(userData);
    expect(result.isValid).toBe(true);
  });

  test('deve detectar CPF inválido', () => {
    const userData = {
      nome: 'João Silva',
      emailContato: 'joao@example.com',
      cpf: '12345678900' // CPF inválido
    };
    
    const result = validateRequiredFields(userData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('CPF está em formato inválido');
  });

  test('deve detectar e-mail inválido', () => {
    const userData = {
      nome: 'João Silva',
      emailContato: 'email-invalido'
    };
    
    const result = validateRequiredFields(userData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('E-mail de contato está em formato inválido');
  });

  test('deve detectar telefone inválido', () => {
    const userData = {
      nome: 'João Silva',
      emailContato: 'joao@example.com',
      telefone: '12345' // Telefone inválido
    };
    
    const result = validateRequiredFields(userData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Telefone está em formato inválido');
  });

  test('deve acumular múltiplos erros', () => {
    const userData = {
      nome: '',
      emailContato: 'email-invalido',
      cpf: '12345678900'
    };
    
    const result = validateRequiredFields(userData);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});
