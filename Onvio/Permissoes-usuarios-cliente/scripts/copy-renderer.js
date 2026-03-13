const fs = require('fs');
const path = require('path');

/**
 * Copia arquivos do renderer para dist/renderer
 */
function copyRendererFiles() {
  const srcRendererDir = path.join(__dirname, '..', 'src', 'renderer');
  const distRendererDir = path.join(__dirname, '..', 'dist', 'renderer');

  // Criar diretório dist/renderer se não existir
  if (!fs.existsSync(distRendererDir)) {
    fs.mkdirSync(distRendererDir, { recursive: true });
  }

  // Lista de arquivos a copiar
  const filesToCopy = ['index.html', 'renderer.js', 'styles.css'];

  filesToCopy.forEach(file => {
    const srcFile = path.join(srcRendererDir, file);
    const distFile = path.join(distRendererDir, file);

    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, distFile);
      console.log(`✅ Copiado: ${file}`);
    } else {
      console.warn(`⚠️  Arquivo não encontrado: ${srcFile}`);
    }
  });

  console.log('✅ Arquivos do renderer copiados com sucesso!');
}

/**
 * Copia arquivos de tradução (i18n) para dist/i18n
 */
function copyI18nFiles() {
  const srcI18nDir = path.join(__dirname, '..', 'src', 'i18n');
  const distI18nDir = path.join(__dirname, '..', 'dist', 'i18n');

  // Criar diretório dist/i18n se não existir
  if (!fs.existsSync(distI18nDir)) {
    fs.mkdirSync(distI18nDir, { recursive: true });
  }

  // Copiar diretório locales
  const srcLocalesDir = path.join(srcI18nDir, 'locales');
  const distLocalesDir = path.join(distI18nDir, 'locales');

  if (fs.existsSync(srcLocalesDir)) {
    // Criar diretório locales em dist
    if (!fs.existsSync(distLocalesDir)) {
      fs.mkdirSync(distLocalesDir, { recursive: true });
    }

    // Copiar todos os arquivos JSON de tradução
    const localeFiles = fs.readdirSync(srcLocalesDir);
    localeFiles.forEach(file => {
      if (file.endsWith('.json')) {
        const srcFile = path.join(srcLocalesDir, file);
        const distFile = path.join(distLocalesDir, file);
        fs.copyFileSync(srcFile, distFile);
        console.log(`✅ Copiado: locales/${file}`);
      }
    });

    console.log('✅ Arquivos de tradução copiados com sucesso!');
  } else {
    console.warn(`⚠️  Diretório de traduções não encontrado: ${srcLocalesDir}`);
  }
}

// Executar
try {
  copyRendererFiles();
  copyI18nFiles();
  console.log('✅ Todos os arquivos copiados com sucesso!');
} catch (error) {
  console.error('❌ Erro ao copiar arquivos:', error);
  process.exit(1);
}
