const fs = require('fs');

const errors = [];
const warnings = [];

console.log('========================================');
console.log('  Testes Unitarios - Projeto ONVIO');
console.log('========================================\n');

console.log('[1/5] Verificando arquivos principais...');
const requiredFiles = [
  'package.json',
  'src/electron/main.ts',
  'src/electron/preload.ts',
  'src/electron/automation-runner.ts',
  'src/renderer/index.html',
  'src/renderer/renderer.js',
  'playwright.config.js',
];

for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`  OK ${file}`);
  } else {
    console.log(`  ERRO ${file}`);
    errors.push(`Arquivo obrigatorio nao encontrado: ${file}`);
  }
}
console.log();

console.log('[2/5] Verificando diretorios...');
for (const dir of ['src/utils', 'src/electron', 'src/renderer', 'tests']) {
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    console.log(`  OK ${dir}/`);
  } else {
    console.log(`  ERRO ${dir}/`);
    errors.push(`Diretorio obrigatorio nao encontrado: ${dir}`);
  }
}
console.log();

console.log('[3/5] Verificando TypeScript fonte...');
for (const file of ['src/utils/extractUserData.ts', 'src/utils/listUsers.ts']) {
  if (!fs.existsSync(file)) {
    console.log(`  ERRO ${file}`);
    errors.push(`Arquivo TypeScript nao encontrado: ${file}`);
    continue;
  }

  const content = fs.readFileSync(file, 'utf8');
  console.log(`  OK ${file}`);
  if (!content.includes('export')) {
    warnings.push(`${file} nao parece exportar simbolos`);
  }
}
console.log();

console.log('[4/5] Verificando package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`  OK package.json (${packageJson.name} ${packageJson.version})`);

  for (const script of ['build', 'start', 'test', 'typecheck']) {
    if (!packageJson.scripts?.[script]) {
      warnings.push(`Script ausente: ${script}`);
    }
  }

  if (packageJson.main !== 'dist/electron/main.js') {
    warnings.push(`package.json.main deveria apontar para dist/electron/main.js, valor atual: ${packageJson.main}`);
  }
} catch (error) {
  errors.push(`Erro ao processar package.json: ${error.message}`);
}
console.log();

console.log('[5/5] Verificando .env.example...');
if (!fs.existsSync('.env.example')) {
  warnings.push('.env.example nao encontrado');
} else {
  const envExample = fs.readFileSync('.env.example', 'utf8');
  if (!envExample.includes('ONVIO_EMAIL') || !envExample.includes('ONVIO_PASSWORD')) {
    warnings.push('.env.example nao contem as variaveis basicas de login');
  }
}
console.log();

console.log('========================================');
console.log('  Resumo');
console.log('========================================\n');

if (errors.length) {
  console.log(`Erros: ${errors.length}`);
  errors.forEach((error, index) => console.log(`  ${index + 1}. ${error}`));
  console.log();
}

if (warnings.length) {
  console.log(`Avisos: ${warnings.length}`);
  warnings.forEach((warning, index) => console.log(`  ${index + 1}. ${warning}`));
  console.log();
}

process.exit(errors.length ? 1 : 0);
