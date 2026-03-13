/**
 * Testes unitários básicos para validar a estrutura do projeto
 * Execute com: node scripts/test-unitario.js
 */

const fs = require('fs');
const path = require('path');

let errors = [];
let warnings = [];

console.log('========================================');
console.log('  Testes Unitários - Projeto ONVIO');
console.log('========================================\n');

// Teste 1: Verificar arquivos principais
console.log('[1/6] Verificando arquivos principais...');
const requiredFiles = [
  'package.json',
  'src/electron/main.js',
  'src/electron/preload.js',
  'src/renderer/index.html',
  'src/renderer/renderer.js',
  'src/electron/automation-runner.js',
  'playwright.config.js'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✓ ${file}`);
  } else {
    console.log(`  ✗ ${file} - NÃO ENCONTRADO`);
    errors.push(`Arquivo obrigatório não encontrado: ${file}`);
  }
});
console.log();

// Teste 2: Verificar estrutura de diretórios
console.log('[2/6] Verificando estrutura de diretórios...');
const requiredDirs = ['src/utils', 'src/electron', 'src/renderer', 'tests'];
requiredDirs.forEach(dir => {
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    console.log(`  ✓ Diretório ${dir}/ existe`);
  } else {
    console.log(`  ✗ Diretório ${dir}/ não encontrado`);
    errors.push(`Diretório obrigatório não encontrado: ${dir}`);
  }
});
console.log();

// Teste 3: Verificar arquivos de utilitários
console.log('[3/6] Verificando arquivos de utilitários...');
const utilsFiles = ['src/utils/extractUserData.js', 'src/utils/listUsers.js'];
utilsFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✓ ${file}`);
    
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('module.exports') || content.includes('exports.')) {
      console.log(`    ✓ ${file} tem exports`);
    } else {
      warnings.push(`${file} não parece ter exports`);
    }
  } else {
    console.log(`  ✗ ${file} - NÃO ENCONTRADO`);
    errors.push(`Arquivo de utilitário não encontrado: ${file}`);
  }
});
console.log();

// Teste 4: Verificar package.json
console.log('[4/6] Verificando package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`  ✓ package.json válido`);
  console.log(`    Nome: ${packageJson.name}`);
  console.log(`    Versão: ${packageJson.version}`);
  
  if (packageJson.scripts) {
    const requiredScripts = ['start', 'test'];
    requiredScripts.forEach(script => {
      if (packageJson.scripts[script]) {
        console.log(`    ✓ Script "${script}" definido`);
      } else {
        warnings.push(`Script "${script}" não encontrado em package.json`);
      }
    });
  }
  
  if (packageJson.dependencies) {
    const requiredDeps = ['@playwright/test', 'xlsx'];
    requiredDeps.forEach(dep => {
      if (packageJson.dependencies[dep]) {
        console.log(`    ✓ Dependência "${dep}" encontrada`);
      } else {
        warnings.push(`Dependência "${dep}" não encontrada`);
      }
    });
  }
  
  if (packageJson.devDependencies) {
    if (packageJson.devDependencies.electron) {
      console.log(`    ✓ Electron em devDependencies`);
    } else {
      warnings.push('Electron não encontrado em devDependencies');
    }
  }
  
  if (packageJson.main === 'src/electron/main.js') {
    console.log(`    ✓ main.js aponta para: ${packageJson.main}`);
  } else {
    warnings.push(`main.js deve apontar para src/electron/main.js, mas aponta para: ${packageJson.main}`);
  }
} catch (error) {
  console.log(`  ✗ Erro ao ler package.json: ${error.message}`);
  errors.push(`Erro ao processar package.json: ${error.message}`);
}
console.log();

// Teste 5: Verificar sintaxe básica dos arquivos JS
console.log('[5/6] Verificando sintaxe básica...');
const jsFiles = ['src/electron/main.js', 'src/electron/preload.js', 'src/electron/automation-runner.js'];
jsFiles.forEach(file => {
  if (fs.existsSync(file)) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const openBraces = (content.match(/{/g) || []).length;
      const closeBraces = (content.match(/}/g) || []).length;
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;
      
      if (openBraces === closeBraces && openParens === closeParens) {
        console.log(`  ✓ ${file} - Estrutura básica OK`);
      } else {
        warnings.push(`${file} pode ter problemas de sintaxe (chaves ou parênteses não balanceados)`);
      }
    } catch (error) {
      warnings.push(`Erro ao verificar ${file}: ${error.message}`);
    }
  }
});
console.log();

// Teste 6: Verificar arquivo .env.example
console.log('[6/6] Verificando configuração de ambiente...');
try {
  if (fs.existsSync('.env.example')) {
    console.log(`  ✓ .env.example encontrado`);
    const envExample = fs.readFileSync('.env.example', 'utf8');
    if (envExample.includes('ONVIO_EMAIL') && envExample.includes('ONVIO_PASSWORD')) {
      console.log(`    ✓ .env.example contém variáveis necessárias`);
    } else {
      warnings.push('.env.example não contém todas as variáveis necessárias');
    }
  } else {
    warnings.push('.env.example não encontrado');
  }
} catch (error) {
  warnings.push(`Erro ao verificar configuração: ${error.message}`);
}
console.log();

// Resumo
console.log('========================================');
console.log('  Resumo dos Testes');
console.log('========================================\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ Todos os testes passaram!');
  console.log('O projeto está pronto para uso.\n');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log(`❌ ${errors.length} erro(s) encontrado(s):`);
    errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
    console.log();
  }
  
  if (warnings.length > 0) {
    console.log(`⚠️  ${warnings.length} aviso(s):`);
    warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
    console.log();
  }
  
  if (errors.length > 0) {
    console.log('❌ Alguns erros críticos foram encontrados. Corrija-os antes de continuar.\n');
    process.exit(1);
  } else {
    console.log('⚠️  Alguns avisos foram encontrados, mas não são críticos.\n');
    process.exit(0);
  }
}
