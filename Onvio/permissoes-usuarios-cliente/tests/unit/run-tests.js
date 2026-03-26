/**
 * Executor de testes unitários simples
 * Execute com: node tests/unit/run-tests.js
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

let testsPassed = 0;
let testsFailed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    testsPassed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    testsFailed++;
    failures.push({ name, error: error.message });
    console.log(`✗ ${name}`);
    console.log(`  Erro: ${error.message}`);
  }
}

function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Esperado "${expected}", mas recebido "${actual}"`);
      }
    },
    toContain: (item) => {
      if (!actual.includes(item)) {
        throw new Error(`Esperado que "${actual}" contenha "${item}"`);
      }
    },
    toHaveLength: (length) => {
      if (actual.length !== length) {
        throw new Error(`Esperado comprimento ${length}, mas recebido ${actual.length}`);
      }
    },
    toBeGreaterThan: (value) => {
      if (actual <= value) {
        throw new Error(`Esperado que ${actual} seja maior que ${value}`);
      }
    }
  };
}

console.log('========================================');
console.log('  Testes Unitários - Extract User Data');
console.log('========================================\n');

// Testes sanitizeValue
console.log('Testando sanitizeValue...');
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
});

test('deve manter string válida', () => {
  expect(sanitizeValue('João Silva')).toBe('João Silva');
});

// Testes validateCPF
console.log('\nTestando validateCPF...');
test('deve validar CPF válido', () => {
  expect(validateCPF('11144477735')).toBe(true);
});

test('deve rejeitar CPF inválido', () => {
  expect(validateCPF('12345678900')).toBe(false);
  expect(validateCPF('11111111111')).toBe(false);
});

test('deve validar CPF com formatação', () => {
  expect(validateCPF('111.444.777-35')).toBe(true);
});

test('deve rejeitar CPF vazio', () => {
  expect(validateCPF('')).toBe(false);
  expect(validateCPF(null)).toBe(false);
});

// Testes validateEmail
console.log('\nTestando validateEmail...');
test('deve validar e-mail válido', () => {
  expect(validateEmail('teste@example.com')).toBe(true);
  expect(validateEmail('usuario.nome@dominio.com.br')).toBe(true);
});

test('deve rejeitar e-mail inválido', () => {
  expect(validateEmail('teste@')).toBe(false);
  expect(validateEmail('@example.com')).toBe(false);
  expect(validateEmail('teste.example.com')).toBe(false);
});

test('deve rejeitar e-mail vazio', () => {
  expect(validateEmail('')).toBe(false);
  expect(validateEmail(null)).toBe(false);
});

// Testes validatePhone
console.log('\nTestando validatePhone...');
test('deve validar telefone fixo (10 dígitos)', () => {
  expect(validatePhone('1133334444')).toBe(true);
  expect(validatePhone('(11) 3333-4444')).toBe(true);
});

test('deve validar telefone celular (11 dígitos)', () => {
  expect(validatePhone('11987654321')).toBe(true);
  expect(validatePhone('(11) 98765-4321')).toBe(true);
});

test('deve rejeitar telefone inválido', () => {
  expect(validatePhone('123456789')).toBe(false);
  expect(validatePhone('119876543210')).toBe(false);
});

// Testes formatCPF
console.log('\nTestando formatCPF...');
test('deve formatar CPF corretamente', () => {
  expect(formatCPF('12345678909')).toBe('123.456.789-09');
});

test('deve retornar string vazia para CPF vazio', () => {
  expect(formatCPF('')).toBe('');
  expect(formatCPF(null)).toBe('');
});

// Testes formatPhone
console.log('\nTestando formatPhone...');
test('deve formatar telefone fixo corretamente', () => {
  expect(formatPhone('1133334444')).toBe('(11) 3333-4444');
});

test('deve formatar telefone celular corretamente', () => {
  expect(formatPhone('11987654321')).toBe('(11) 98765-4321');
});

// Testes validateRequiredFields
console.log('\nTestando validateRequiredFields...');
test('deve validar dados completos e válidos', () => {
  const userData = {
    nome: 'João Silva',
    emailContato: 'joao@example.com',
    cpf: '11144477735',
    telefone: '11987654321'
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

test('deve detectar CPF inválido', () => {
  const userData = {
    nome: 'João Silva',
    emailContato: 'joao@example.com',
    cpf: '12345678900'
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

// Resumo
console.log('\n========================================');
console.log('  Resumo dos Testes');
console.log('========================================\n');

console.log(`Total de testes: ${testsPassed + testsFailed}`);
console.log(`✓ Passou: ${testsPassed}`);
console.log(`✗ Falhou: ${testsFailed}`);

if (failures.length > 0) {
  console.log('\nFalhas:');
  failures.forEach((failure, index) => {
    console.log(`  ${index + 1}. ${failure.name}`);
    console.log(`     ${failure.error}`);
  });
}

if (testsFailed === 0) {
  console.log('\n✅ Todos os testes passaram!');
  process.exit(0);
} else {
  console.log('\n❌ Alguns testes falharam.');
  process.exit(1);
}
