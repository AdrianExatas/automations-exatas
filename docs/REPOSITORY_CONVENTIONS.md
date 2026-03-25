# Repository Conventions

## Objetivo

Manter as automações como apps independentes, com convenção mínima suficiente para setup, manutenção e limpeza operacional.

## Estrutura esperada por automação

- `README.md` com objetivo, entrada, saída, setup e execução
- `.gitignore` cobrindo outputs, segredos e arquivos locais
- `.env.example` quando houver configuração sensível
- código em pasta previsível (`src/`, `electron/`, `scripts/` ou equivalente)
- uma área explícita para outputs locais não versionados

## Convenções de diretório

- Automações ativas permanecem agrupadas por sistema de negócio.
- Conteúdo legado deve ficar em `_legacy/`.
- Conteúdo exclusivamente local deve ficar em `_local/` ou em diretórios já ignorados pelo projeto.
- Novos diretórios devem evitar espaços e acentos nos nomes.

## O que não deve ser versionado

- certificados, senhas e segredos
- `.env` e credenciais locais
- planilhas de cliente e arquivos de operação diária
- PDFs, exports, checkpoints, logs e relatórios gerados
- backups locais e workspaces de ferramenta

## Componentes especiais

- `Onvio/BD/` é mantido como repositório local independente; o monorepo principal não deve rastrear seu estado interno.
- Diretórios de dados operacionais em nível de grupo, como `Onvio/Gestta-Tarefas/data/`, devem permanecer locais.
