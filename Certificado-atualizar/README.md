# Certificado Manager

Gerenciador unificado de certificados digitais com integração à **API SIEG**, automação **UNECONT** e automação **ONVIO**.

## Funcionalidades

- **SIEG** – Registrar e atualizar certificados digitais via API
- **UNECONT** – Automação com Playwright para acessar certificados
- **ONVIO** – Automação com Playwright para NFe Import Receita Federal

## Estrutura do Projeto

```
├── client/                        # Frontend React (Vite + TypeScript)
│   ├── src/
│   │   ├── api/                   # Cliente da API
│   │   ├── components/            # Layout, ResultMessage, LoadingButton
│   │   ├── context/               # SiegDataContext, AutomacaoFormsContext
│   │   ├── panels/                # SiegPanel, UnecontPanel, OnvioPanel, ExecutarTodas
│   │   ├── constants/             # Lista de UFs
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── src/
│   ├── server/                    # Servidor web (Node.js)
│   │   ├── server.ts              # Servidor principal
│   │   ├── config.ts              # Configurações
│   │   ├── sieg-client.ts         # Cliente API SIEG
│   │   ├── extrair-cnpj-pfx.ts    # Extração de CNPJ do PFX
│   │   ├── routes/                # Rotas da API
│   │   │   ├── certificado.ts     # Rotas SIEG
│   │   │   ├── unecont.ts         # Rota automação UNECONT
│   │   │   ├── onvio.ts           # Rota automação ONVIO
│   │   │   └── static.ts          # Arquivos estáticos + SPA fallback
│   │   └── utils/
│   └── automations/               # Automações Playwright
│       ├── unecont/
│       └── onvio/
├── public/                        # Interface legada (HTML/JS) – opcional
├── dist/                          # Build do servidor
├── client/dist/                   # Build do frontend React (produção)
├── package.json
├── playwright.config.js
├── tsconfig.json
└── README.md
```

## Instalação

```bash
# Instalar dependências
npm install

# Instalar navegadores Playwright
npx playwright install chromium
```

## Configuração

Copie o arquivo de exemplo e configure suas credenciais:

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais:

```env
# API SIEG
SIEG_API_KEY=sua-api-key

# UNECONT
UNECONT_EMAIL=seu-email@exemplo.com
UNECONT_PASSWORD=sua-senha

# ONVIO
ONVIO_EMAIL=seu-email@exemplo.com
ONVIO_PASSWORD=sua-senha
ONVIO_PFX_PATH=./caminho/certificado.pfx
ONVIO_PFX_PASSWORD=senha-do-certificado
ONVIO_CNPJ=00000000000000
```

## Uso

### Interface Web (React)

**Desenvolvimento** (API + frontend com hot-reload):

```bash
# Terminal 1: servidor da API (porta 3000)
npm run dev:server

# Terminal 2: frontend Vite (porta 5173, proxy /api → 3000)
npm run dev:client
```

Ou subir os dois de uma vez:

```bash
npm run dev:both
```

Acesse o frontend: http://localhost:5173 (o Vite faz proxy de `/api` para o servidor em 3000).

**Produção** (build do React + servidor servindo tudo na porta 3000):

```bash
# Compilar servidor + client e iniciar
npm run web

# Ou separadamente:
npm run build
npm run build:client
npm run server
```

Acesse: http://localhost:3000. O servidor serve o build do React em `client/dist`; se `client/dist` não existir, serve a pasta `public` (interface legada).

### Automações via CLI

```bash
# Executar todas as automações
npm test

# Executar apenas UNECONT
npm run test:unecont

# Executar apenas ONVIO
npm run test:onvio

# Modo headed (com navegador visível)
npm run test:headed
```

### Outros comandos

```bash
# Servidor sozinho (sem frontend Vite)
npm run dev

# Capturar automação com codegen
npm run codegen
```

## API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/certificado/registrar` | Registrar novo certificado |
| POST | `/api/certificado/editar` | Atualizar certificado existente |
| GET | `/api/certificado/listar` | Listar certificados |
| GET | `/api/certificado/status` | Status de um certificado |
| POST | `/api/certificado/extrair-cnpj` | Extrair CNPJ do PFX |
| POST | `/api/certificado/habilitar` | Habilitar certificado |
| POST | `/api/certificado/desabilitar` | Desabilitar certificado |
| POST | `/api/unecont/executar` | Executar automação UNECONT |
| POST | `/api/onvio/executar` | Executar automação ONVIO |

## Agendamento (Windows Task Scheduler)

Para agendar execuções automáticas:

1. Crie um arquivo `.bat`:

```batch
@echo off
cd /d "C:\caminho\para\projeto"
call npm run test:unecont
```

2. Abra o **Agendador de Tarefas** do Windows
3. Crie uma nova tarefa com o gatilho desejado
4. Configure a ação para executar o `.bat`

## Requisitos

- Node.js >= 18.0.0
- Windows, macOS ou Linux

## Licença

MIT
