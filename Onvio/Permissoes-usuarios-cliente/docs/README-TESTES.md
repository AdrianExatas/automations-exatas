# 🧪 Guia de Testes - Projeto ONVIO

Este documento descreve como executar os diferentes tipos de testes disponíveis no projeto.

## 📋 Tipos de Testes

### 1. Testes Unitários (Estrutura do Projeto)

Valida a estrutura básica do projeto, arquivos obrigatórios e configurações.

**Executar:**
```bash
npm run test:unit
```

ou

```bash
node scripts/test-unitario.js
```

**O que testa:**
- ✅ Presença de arquivos principais (main.js, preload.js, index.html, etc.)
- ✅ Estrutura de diretórios (src/utils/, src/electron/, src/renderer/, tests/)
- ✅ Validade do package.json
- ✅ Presença de exports nos módulos
- ✅ Configuração do Electron
- ✅ Sintaxe básica dos arquivos JavaScript
- ✅ Arquivo .env.example

---

### 2. Testes de Projeto (Windows)

Script .bat completo que verifica todo o ambiente e dependências.

**Executar:**
```bash
npm run test:project
```

ou

```bash
scripts\testar-projeto.bat
```

**O que testa:**
- ✅ Instalação do Node.js e npm
- ✅ Arquivos principais do projeto
- ✅ Arquivos de utilitários
- ✅ Sintaxe JavaScript
- ✅ Dependências instaladas (node_modules)
- ✅ Estrutura de diretórios
- ✅ Scripts .bat disponíveis

---

### 3. Testes de Sintaxe

Verifica apenas a sintaxe dos arquivos JavaScript principais.

**Executar:**
```bash
scripts\testar-sintaxe.bat
```

**O que testa:**
- ✅ Sintaxe de `src/electron/automation-runner.js`
- ✅ Sintaxe de `src/electron/main.js`
- ✅ Sintaxe de `src/electron/preload.js`

---

### 4. Testes de Automação (Playwright)

Testes end-to-end que executam a automação real no navegador.

**⚠️ ATENÇÃO:** Estes testes requerem credenciais válidas e executam a automação completa.

**Executar:**
```bash
npm test
```

ou para um teste específico:

```bash
npm test -- tests/usuario-permissoes-loop.spec.js
```

**Com variáveis de ambiente (arquivo .env):**
1. Configure o arquivo `.env` com suas credenciais
2. Execute:
   ```bash
   npm test
   ```

**O que testa:**
- ✅ Login no ONVIO
- ✅ Navegação para Portal do Cliente
- ✅ Listagem de usuários
- ✅ Extração de dados de usuários
- ✅ Geração de planilha Excel

---

## 🚀 Fluxo Recomendado de Testes

### Antes de começar a desenvolver:

1. **Teste a estrutura do projeto:**
   ```bash
   npm run test:unit
   ```

2. **Teste o ambiente (Windows):**
   ```bash
   scripts\testar-projeto.bat
   ```

3. **Se houver erros, instale dependências:**
   ```bash
   scripts\instalar-dependencias.bat
   ```

### Antes de fazer commit:

1. **Teste a sintaxe:**
   ```bash
   scripts\testar-sintaxe.bat
   ```

2. **Teste a estrutura novamente:**
   ```bash
   npm run test:unit
   ```

### Para validar a automação completa:

1. **Configure as credenciais** no arquivo `.env` (copie de `.env.example`)

2. **Execute o teste de automação:**
   ```bash
   npm test
   ```

---

## 📊 Interpretando os Resultados

### Testes Unitários

- **✅ Todos os testes passaram:** Projeto está pronto para uso
- **⚠️ Avisos:** Problemas não críticos, mas devem ser revisados
- **❌ Erros:** Problemas críticos que impedem o funcionamento

### Testes de Projeto

- **✅ Todos os testes passaram:** Ambiente configurado corretamente
- **❌ Erros encontrados:** Siga as instruções exibidas para corrigir

### Testes de Automação

- **✅ Teste passou:** Automação executada com sucesso, arquivo Excel gerado
- **❌ Teste falhou:** Verifique os logs para identificar o problema

---

## 🔧 Solução de Problemas Comuns

### Erro: "Node.js não está instalado"
- **Solução:** Instale o Node.js de https://nodejs.org/

### Erro: "npm não está instalado"
- **Solução:** Node.js geralmente inclui npm. Reinstale o Node.js se necessário.

### Erro: "node_modules não encontrado"
- **Solução:** Execute `npm install` ou `scripts\instalar-dependencias.bat`

### Erro: "Arquivo não encontrado"
- **Solução:** Verifique se você está no diretório raiz do projeto

### Erro: "Dependências não instaladas"
- **Solução:** Execute `npm install` ou `scripts\instalar-dependencias.bat`

### Erro: "Playwright não encontrado"
- **Solução:** Execute `npx playwright install`

### Erro: "Electron não encontrado"
- **Solução:** Execute `npm install electron --save-dev`

---

## 📝 Adicionando Novos Testes

### Teste Unitário

Adicione verificações em `scripts/test-unitario.js`:

```javascript
// Exemplo
if (fs.existsSync('novo-arquivo.js')) {
  console.log('  ✓ novo-arquivo.js');
} else {
  errors.push('novo-arquivo.js não encontrado');
}
```

### Teste de Projeto

Adicione verificações em `scripts/testar-projeto.bat`:

```batch
REM Teste novo
echo [X/Y] Verificando novo arquivo...
if not exist "novo-arquivo.js" (
    echo [ERRO] novo-arquivo.js não encontrado
    set /a ERROR_COUNT+=1
) else (
    echo [OK] novo-arquivo.js encontrado
)
```

---

## 📚 Recursos Adicionais

- [Documentação do Playwright](https://playwright.dev/)
- [Documentação do Electron](https://www.electronjs.org/docs)
- [README Principal](../README.md)
- [README dos Scripts .BAT](README-BAT.md)

---

## ✅ Checklist de Testes

Antes de considerar o projeto pronto:

- [ ] `npm run test:unit` passa sem erros
- [ ] `scripts\testar-projeto.bat` passa sem erros críticos
- [ ] `scripts\testar-sintaxe.bat` passa sem erros
- [ ] Interface Electron abre corretamente (`npm start`)
- [ ] Teste de automação executa com sucesso (com credenciais válidas)

---

**Última atualização:** Janeiro 2026
