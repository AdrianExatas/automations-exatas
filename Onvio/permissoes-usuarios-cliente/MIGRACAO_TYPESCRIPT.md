# Historico: migracao para TypeScript

Este arquivo e historico. Ele resume a migracao que levou o app ao estado atual e substitui a antiga documentacao de status intermediario.

## Resultado da migracao

- TypeScript passou a ser a fonte de verdade para Electron, configuracao, i18n e utilitarios
- `dist/` virou a unica saida compilada usada em execucao
- o `main` do pacote aponta para `dist/electron/main.js`
- `src/renderer/renderer.js` permaneceu em JavaScript por ser um arquivo estatico da interface

## Estado atual esperado

- editar arquivos `.ts` em `src/` para qualquer mudanca de logica
- executar `npm run build` para gerar `dist/`
- usar `npm run typecheck` para validar a tipagem sem gerar build
- tratar quaisquer copias `.js` locais ao lado de arquivos `.ts` como artefatos de uma fase anterior, nao como codigo canonico

## O que este arquivo substitui

As notas antigas de "pendencias", "100% concluido", "fase 2" e "correcoes de TypeScript" descreviam etapas intermediarias da migracao. O fluxo atual ja assumido pelo projeto e:

- fonte em TypeScript
- build em `dist/`
- interface estatica em `src/renderer/`

## Referencias atuais

- `README.md` para setup e execucao
- `docs/README-TESTES.md` para validacao
- `REFATORACAO.md` para o contexto da reorganizacao estrutural
