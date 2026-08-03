# MVP POP/IT — Linha de produção documental

Portal + fila + IA + geração Office para transformar vídeo de atividade em **POP (PR), IT (IN), FORM e MP**, com validação humana, publicação em pastas e Índice Mestre.

## Escopo (Fase 1 + 2)

- Formulário de envio (metadados + vídeo)
- Staging em `00 - Entrada de Documentações`
- Transcrição (whisper.cpp via scripts do gerador)
- Estruturação content-v2 + inspetor LLM
- Geração Word/Excel pelos templates oficiais
- Extração/inserção de prints
- Validação (aprovar / solicitar ajuste)
- Numeração automática + publicação (Vigentes / Obsoletos)
- Painel e Índice Mestre

## Stack

- Bun + TypeScript + Elysia
- BullMQ + Redis
- SQLite (Drizzle)
- Ollama ou Gemini
- PowerShell + FFmpeg/Whisper + Word/Excel COM (`vendor/gerador`)

## Setup

```powershell
cd mvp-pop
copy .env.example .env
bun install
bun run setup:storage
bun run setup:vendor
docker compose up -d
bun run dev
```

Acesse: http://localhost:3100

### Redis

O `docker-compose` publica Redis em **6380** (para não colidir com o hub `Pops` na 6379). O `.env.example` já aponta para `redis://localhost:6380`.

Sem Docker: use `INLINE_QUEUE=1` no `.env` para processar jobs no mesmo processo.

### Office / Whisper

- Worker de documentos exige Windows + Word/Excel desktop.
- Para testar sem Office: `SKIP_OFFICE=1` no `.env` (gera placeholders).
- Binários FFmpeg/Whisper: junction para `gerador-pop-it` via `bun run setup:vendor`.

## Fluxo de status

`recebido` → `em_processamento` → `transcrevendo` → `estruturando` → `gerando_docs` → `documentacao_gerada` → `em_validacao` → (`ajuste_solicitado` → `documento_atualizado`) → `aprovado` → `vigente`

## Pastas de publicação

Configurável em `PUBLISH_ROOT` (padrão `./storage/GESTAO DE PROCESSOS`):

```
GESTAO DE PROCESSOS/
├── 00 - Entrada de Documentacoes/{Setor}/{Atividade}/{id}/
├── ATENDIMENTO/
│   ├── Documentos Vigentes/
│   ├── Em Validacao/
│   ├── Registros e Evidencias/
│   └── Documentos Obsoletos/
└── Indice-Mestre.json
```


## Piloto Atendimento

Exemplo: **Registrar solicitação no Bitrix** — use o formulário com setor Atendimento, sistema Bitrix, documentos IT + FORM.

```powershell
# Smoke local sem Office/Redis/Ollama
# .env: SKIP_OFFICE=1, INLINE_QUEUE=1, LLM_PROVIDER=mock
bun test
bun run piloto:smoke
bun run dev
# Envie o piloto pelo formulário (Atendimento + Bitrix) ou via API
```

## API principal

| Método | Rota | Função |
|--------|------|--------|
| POST | `/api/submissions` | Envio multipart |
| GET | `/api/submissions/:id` | Detalhe |
| POST | `/api/submissions/:id/approve` | Aprovar e publicar |
| POST | `/api/submissions/:id/request-adjustment` | Pedir ajuste à IA |
| GET | `/api/panel` | Métricas |
| GET | `/api/index` | Índice Mestre |

## Relação com outros projetos

- Orquestração inspirada em `Pops/`
- Contrato e scripts em `vendor/gerador/` (origem: `gerador-pop-it`)
