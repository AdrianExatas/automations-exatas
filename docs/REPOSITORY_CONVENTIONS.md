# Repository Conventions

## Objetivo

Manter as automacoes como apps independentes, com convencao minima suficiente para setup, manutencao e limpeza operacional.

## Estrutura esperada por automacao

- `README.md` com objetivo, entrada, saida, setup e execucao
- `.gitignore` cobrindo outputs, segredos e arquivos locais
- `.env.example` quando houver configuracao sensivel
- codigo em pasta previsivel (`src/`, `electron/`, `scripts/` ou equivalente)
- uma area explicita para outputs locais nao versionados

## Convencoes de diretorio

- Automacoes ativas permanecem agrupadas por sistema de negocio.
- Pastas que representam a marca inteira podem preservar a capitalizacao oficial, como `Onvio/`, `Sieg/` e `Omie/`.
- Pastas funcionais e de automacao devem usar `kebab-case` em minusculas, ASCII, sem espacos e sem acentos.
- Quando a pasta filha repetir o nome da marca do pai, prefira remover a redundancia no nome final.
- Conteudo legado deve ficar em `_legacy/`.
- Conteudo exclusivamente local deve ficar em `_local/` ou em diretorios ja ignorados pelo projeto.
- Diretorios tecnicos convencionais, como `src/`, `tests/`, `docs/`, `scripts/`, `public/` e `client/`, permanecem com seus nomes padrao.

## O que nao deve ser versionado

- certificados, senhas e segredos
- `.env` e credenciais locais
- planilhas de cliente e arquivos de operacao diaria
- PDFs, exports, checkpoints, logs e relatorios gerados
- backups locais e workspaces de ferramenta

## Componentes especiais

- `Onvio/BD/` e mantido como repositorio local independente; o monorepo principal nao deve rastrear seu estado interno.
- Diretorios de dados operacionais em nivel de grupo, como `Onvio/gestta-tarefas/_local/`, devem permanecer locais.
