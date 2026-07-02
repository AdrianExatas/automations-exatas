# Auto-POP Hub

Hub de geração automática de POPs (Procedimentos Operacionais Padrão) a partir de transcrições de vídeos, com validação por agentes de IA e exportação em Word (.docx).

## Objetivo

- Receber transcrições em lote (`.txt` ou `.json`)
- Gerar POPs estruturados no padrão contábil via agente Escritor
- Validar fidelidade à transcrição via agente Inspetor (LLM-as-a-Judge)
- Exportar documento Word editável com link de feedback
- Centralizar sugestões e revisões enviadas pelos usuários

## Stack

- **Runtime:** Bun + TypeScript
- **API/UI:** Elysia.js
- **Filas:** BullMQ + Redis
- **Banco:** SQLite (via `bun:sqlite` + Drizzle ORM)
- **LLM:** Ollama (local, gratuito) ou Google Gemini (nuvem)
- **Export:** biblioteca `docx`

## Pré-requisitos

- [Bun](https://bun.sh) 1.1+
- [Docker](https://www.docker.com/) (para Redis local)
- [Ollama](https://ollama.com) **ou** chave de API do Google Gemini

## Setup rápido (modo gratuito — Ollama + disco D:)

```powershell
cd Pops

# 1. Criar pastas no D: e configurar OLLAMA_MODELS
bun run setup:d-drive

# 2. Feche e abra um NOVO PowerShell, depois baixe o modelo
ollama pull llama3.2:3b

# 3. Subir Redis e app
docker compose up -d
bun install
bun run dev
```

Acesse: http://localhost:3000

### O que fica no disco D:

| Caminho | Conteúdo |
|---------|----------|
| `C:\ollama-models` | Modelos de IA do Ollama (precisa NTFS — ver nota abaixo) |
| `D:\auto-pop-hub\uploads` | Transcrições enviadas |
| `D:\auto-pop-hub\outputs` | POPs `.docx` gerados |
| `D:\auto-pop-hub\auto-pop.db` | Banco SQLite |
| `D:\auto-pop-hub\redis` | Dados da fila Redis (Docker) |

### Requisitos de hardware (Ollama)

- Modelos 7B: ~8 GB RAM recomendados
- Modelos menores (`llama3.2:3b`): ~4 GB RAM — **padrão recomendado**

> **Importante (disco D: em exFAT):** o Ollama não consegue carregar modelos de drives **exFAT** (erro `unable to allocate CPU buffer`). Por isso os modelos ficam em `C:\ollama-models` (NTFS). Uploads, outputs e Redis continuam no D:.

## Setup alternativo (Gemini na nuvem)

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=sua-chave-aqui
GEMINI_MODEL=gemini-2.0-flash
```

## Armazenamento em disco D:

O `.env` já vem configurado para o disco D:

```env
STORAGE_PATH=D:/auto-pop-hub
DATABASE_PATH=D:/auto-pop-hub/auto-pop.db
```

Os modelos Ollama usam a variável de sistema `OLLAMA_MODELS=D:\ollama-models`, configurada pelo script `setup:d-drive`.

As pastas são criadas automaticamente. Arquivos no D: ficam fora do repositório Git.

## Execução

| Comando | Descrição |
|---------|-----------|
| `bun run dev` | Servidor + worker integrados (desenvolvimento) |
| `bun run start` | Produção |
| `bun run worker` | Worker isolado (opcional) |
| `bun test` | Testes unitários |

## Entrada

- **Upload:** arquivos `.txt` (texto bruto) ou `.json` com campo `transcription`, `text` ou `content`
- **API:** `POST /api/upload` (multipart, campo `files`)

## Saída

- POP em `.docx` em `{STORAGE_PATH}/outputs/{jobId}.docx`
- Download via `GET /api/download/:id`
- Link de feedback no rodapé do documento: `/feedback/{token}`

## Status do job

| Status | Significado |
|--------|-------------|
| `queued` | Na fila |
| `processing` | Agente Escritor gerando POP |
| `validating` | Agente Inspetor validando |
| `completed` | docx pronto |
| `error` | Falha ou tentativas esgotadas |

## Variáveis de ambiente

Veja `.env.example`:

| Variável | Descrição |
|----------|-----------|
| `LLM_PROVIDER` | `ollama` (padrão) ou `gemini` |
| `OLLAMA_BASE_URL` | URL do Ollama (padrão `http://localhost:11434`) |
| `OLLAMA_MODEL` | Modelo local (padrão `qwen2.5:7b`) |
| `OLLAMA_TIMEOUT_MS` | Timeout por chamada (padrão 120000 ms) |
| `GEMINI_API_KEY` | Obrigatória apenas se `LLM_PROVIDER=gemini` |
| `STORAGE_PATH` | Raiz de uploads/outputs (padrão `./storage`) |
| `DATABASE_PATH` | SQLite (padrão `{STORAGE_PATH}/auto-pop.db`) |
| `REDIS_URL` | padrão `redis://localhost:6379` |
| `BASE_URL` | URL base para links de feedback |
| `MAX_RETRIES` | Tentativas após rejeição do Inspetor |
| `PORT` | Porta do servidor (padrão 3000) |

## Estrutura

```
src/
├── agents/       # Escritor, Inspetor e providers (Ollama/Gemini)
├── skills/       # Prompts Markdown dos agentes
├── workers/      # BullMQ processor
├── export/       # Geração docx
├── db/           # SQLite + repositório
├── server/       # API Elysia + UI estática
└── feedback/     # Tokens de feedback
```

## Troubleshooting

- **Redis indisponível:** execute `docker compose up -d` na pasta `Pops/`
- **Ollama indisponível:** verifique se `ollama serve` está rodando e se o modelo foi baixado (`ollama pull qwen2.5:7b`)
- **GEMINI_API_KEY:** necessária apenas com `LLM_PROVIDER=gemini`
- **Job em erro:** consulte `errorMessage` via `GET /api/jobs/:id`
- **Health check:** `GET /health` retorna status do LLM e caminho de storage
