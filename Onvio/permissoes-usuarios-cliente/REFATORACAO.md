# Historico: refatoracao estrutural

Este arquivo e historico. Ele registra a reorganizacao estrutural feita no app e nao deve ser usado como guia operacional principal.

## O que mudou

- o projeto saiu de uma estrutura centrada em arquivos JavaScript na raiz para uma organizacao em `src/`, `scripts/`, `tests/` e `docs/`
- credenciais deixaram de ficar embutidas no codigo e passaram para `.env`
- os scripts auxiliares do Windows foram centralizados em `scripts/`
- a documentacao operacional foi reduzida para `README.md`, `docs/README-BAT.md` e `docs/README-TESTES.md`

## Estado atual relevante

- a fonte de verdade do app fica em `src/`
- `dist/` e somente build gerado
- `src/renderer/renderer.js` continua versionado por ser um arquivo-fonte da interface
- referencias antigas a `main.js`, `preload.js` e `automation-runner.js` na raiz valem apenas para o estado anterior do projeto

## Como ler este historico

- use este arquivo apenas para entender por que a estrutura mudou
- para setup, execucao e testes, use o `README.md`
- para detalhes da migracao de linguagem, use `MIGRACAO_TYPESCRIPT.md`
