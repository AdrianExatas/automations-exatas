# ONVIO - Automação de Usuários

Automação com Playwright e interface Electron para extrair dados de usuários do ONVIO Portal do Cliente.

## 🚀 Início Rápido

### 1. Instalação

```bash
# Instalar dependências
npm install

# Instalar navegadores do Playwright
npx playwright install
```

### 2. Configuração

Copie o arquivo de exemplo e configure suas credenciais:

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
ONVIO_EMAIL=seu-email@exemplo.com
ONVIO_PASSWORD=sua-senha
ONVIO_CLIENT_ID=467
ONVIO_MFA_METHOD=E-mail
ONVIO_MFA_CODE=
```

### 3. Executar

**Opção 1 - Interface Gráfica (Recomendado):**
```bash
npm start
```

ou

```batch
scripts\iniciar-interface.bat
```

**Opção 2 - Linha de Comando:**
```bash
npm test
```

ou

```batch
scripts\executar-com-config.bat
```

---

## 📁 Estrutura do Projeto

```
projeto/
├── src/
│   ├── electron/              # Código do Electron
│   │   ├── main.js           # Processo principal
│   │   ├── preload.js        # Comunicação segura
│   │   └── automation-runner.js  # Executor da automação
│   ├── renderer/             # Interface do usuário
│   │   ├── index.html        # HTML da interface
│   │   ├── renderer.js       # Lógica da interface
│   │   └── styles.css        # Estilos
│   └── utils/                # Utilitários
│       ├── extractUserData.js
│       └── listUsers.js
├── tests/                     # Testes Playwright
│   └── usuario-permissoes-loop.spec.js
├── scripts/                   # Scripts auxiliares
│   ├── *.bat                 # Scripts Windows
│   └── test-unitario.js      # Testes unitários
├── docs/                      # Documentação
│   ├── README-BAT.md
│   └── README-TESTES.md
├── .env                       # Configurações (não commitado)
├── .env.example              # Exemplo de configuração
└── package.json
```

---

## 🖥️ Interface Electron

Interface gráfica moderna para facilitar o uso da automação.

### Recursos

- ✅ Interface moderna e intuitiva
- ✅ Logs em tempo real
- ✅ Indicador de status visual
- ✅ Lista de arquivos gerados
- ✅ Abertura automática de arquivos Excel
- ✅ Controle de início/parada da automação
- ✅ Barra de progresso
- ✅ Tempo decorrido em tempo real

### Como Usar

1. Preencha os campos (E-mail, Senha, ID do Cliente, MFA)
2. Clique em "Iniciar Automação"
3. Acompanhe o progresso nos logs
4. Acesse os arquivos gerados na lista lateral

---

## 🪟 Scripts .BAT para Windows

Scripts prontos para facilitar a execução:

- **`scripts/iniciar-interface.bat`** - Inicia a interface gráfica Electron
- **`scripts/executar-automacao.bat`** - Executa via linha de comando (entrada interativa)
- **`scripts/executar-com-config.bat`** - Executa usando arquivo `.env`
- **`scripts/instalar-dependencias.bat`** - Instala todas as dependências
- **`scripts/testar-projeto.bat`** - Testa estrutura do projeto
- **`scripts/testar-sintaxe.bat`** - Valida sintaxe JavaScript

📖 **Documentação completa:** Veja [docs/README-BAT.md](docs/README-BAT.md)

---

## 🧪 Testes

O projeto inclui vários tipos de testes:

- **`npm run test:unit`** - Testes unitários de estrutura
- **`scripts\testar-projeto.bat`** - Testes completos do ambiente (Windows)
- **`scripts\testar-sintaxe.bat`** - Validação de sintaxe JavaScript
- **`npm test`** - Testes de automação Playwright (requer credenciais)

📖 **Documentação completa:** Veja [docs/README-TESTES.md](docs/README-TESTES.md)

---

## 🔷 TypeScript

O projeto foi **100% migrado para TypeScript!** Todos os arquivos principais foram convertidos, incluindo:
- ✅ `extractUserData.ts` - Extração de dados de usuários
- ✅ `automation-runner.ts` - Executor principal da automação
- ✅ Todos os utilitários e módulos

### Compilar TypeScript
```bash
npm run build
```

### Verificar tipos
```bash
npm run typecheck
```

### Desenvolvimento com watch
```bash
npm run build:watch
```

**Nota:** Execute `npm run build` antes de executar a aplicação, pois o Electron usa os arquivos compilados de `dist/`.

📖 **Documentação da migração:** Veja [MIGRACAO_TYPESCRIPT.md](MIGRACAO_TYPESCRIPT.md)

---

## 📋 Comandos Úteis

### Desenvolvimento
- `npm start` - Inicia a interface Electron
- `npm run dev` - Inicia em modo desenvolvimento (com DevTools)
- `npm run codegen` - Inicia o codegen do Playwright

### Testes
- `npm test` - Executa testes de automação
- `npm run test:unit` - Executa testes unitários
- `npm run test:project` - Executa testes de projeto (Windows)
- `npm test -- tests/usuario-permissoes-loop.spec.js` - Executa teste específico

### Utilitários
- `npx playwright install` - Instala/atualiza navegadores
- `npx playwright show-report` - Abre relatório HTML dos testes

---

## 🔒 Segurança

- **Nunca commite** o arquivo `.env` no Git (já está no `.gitignore`)
- Use variáveis de ambiente para credenciais
- Para maior segurança, use a interface Electron (senha não fica em arquivo de texto)

---

## 📚 Documentação Adicional

- [Guia de Scripts .BAT](docs/README-BAT.md) - Documentação completa dos scripts
- [Guia de Testes](docs/README-TESTES.md) - Como executar e interpretar testes

---

## 🛠️ Melhorias Implementadas

### Melhorias Básicas
- ✅ Interface Electron moderna e intuitiva
- ✅ Logs em tempo real durante a execução
- ✅ Lista de arquivos gerados com acesso rápido
- ✅ Código refatorado com boas práticas
- ✅ Estrutura de pastas organizada
- ✅ Informações sensíveis movidas para `.env`
- ✅ Aguardar carregamento de páginas (`waitForLoadState`)
- ✅ Aguardar navegação após login (`waitForURL`)
- ✅ Comentários descritivos em cada passo
- ✅ Versão com variáveis de ambiente para segurança
- ✅ Configuração do Playwright com screenshots e vídeos em falhas
- ✅ Testes automatizados para edição de usuário e permissões
- ✅ Suporte a múltiplas abas (popups) com gerenciamento adequado
- ✅ Validações opcionais com snapshots de acessibilidade
- ✅ Organização clara por etapas do fluxo de trabalho

### Melhorias Avançadas (2026)
- ✅ **Sistema de logging estruturado** - Logs em arquivo e console com níveis
- ✅ **Configuração centralizada** - Todas as configs em um lugar com suporte a env vars
- ✅ **Tratamento de erros robusto** - Recovery automático e categorização
- ✅ **Cache de seletores inteligente** - Aprendizado automático e persistência
- ✅ **Métricas e monitoramento** - Coleta automática e relatórios
- ✅ **Sistema de backup automático** - Versionamento e recuperação
- ✅ **Validação de integridade** - Checksum e detecção de inconsistências
- ✅ **Interface melhorada** - Métricas em tempo real e histórico
- ✅ **Sistema de relatórios** - HTML e texto com análises detalhadas
- ✅ **Sistema de notificações** - Desktop notifications e alertas
- ✅ **Configuração externa de seletores** - Editar seletores sem modificar código
- ✅ **Suporte a múltiplos idiomas (i18n)** - PT-BR e EN
- ✅ **Paralelização básica** - Processamento paralelo de usuários
- ✅ **Migração para TypeScript** - Type-safety e melhor desenvolvimento
- ✅ **Sistema de Health Checks** - Verificação de saúde do sistema
- ✅ **Otimizações de Performance** - Debounce, throttle, memoização
- ✅ **Export Múltiplos Formatos** - CSV, JSON além de Excel

📖 **Documentação completa:** Veja [docs/IMPLEMENTACAO-COMPLETA.md](docs/IMPLEMENTACAO-COMPLETA.md)  
📖 **Melhorias Fase 2:** Veja [docs/IMPLEMENTACAO_FASE2.md](docs/IMPLEMENTACAO_FASE2.md)

---

## 📝 Licença

ISC
