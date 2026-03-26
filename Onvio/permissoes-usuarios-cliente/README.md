# permissoes-usuarios-cliente

Automacao com Playwright e interface Electron para extrair dados de usuarios do Portal do Cliente Onvio.

## Inicio rapido

```bash
npm install
npx playwright install
copy .env.example .env
```

Preencha `.env` com as credenciais de acesso e o `ONVIO_CLIENT_ID`.

## Comandos principais

- `npm run build`: compila o TypeScript e copia os arquivos estaticos para `dist/`
- `npm start`: compila e inicia a interface Electron
- `npm run dev`: compila e inicia a interface com DevTools
- `npm run typecheck`: valida o TypeScript sem gerar build
- `npm run test:unit`: valida a estrutura minima do projeto
- `npm run test:functions`: executa os testes unitarios em `tests/unit`
- `npm test`: executa os testes Playwright

## Estrutura atual

```text
src/
  electron/
    main.ts
    preload.ts
    automation-runner.ts
  renderer/
    index.html
    renderer.js
    styles.css
  utils/
    *.ts
  config/
    index.ts
  i18n/
    index.ts
dist/
scripts/
tests/
docs/
```

## Fonte de verdade

- `src/` e a fonte de verdade do projeto.
- O codigo de Electron, configuracao, i18n e utilitarios fica em TypeScript.
- `dist/` contem apenas a saida compilada usada em execucao.
- `src/renderer/renderer.js` permanece versionado de forma deliberada como codigo-fonte JavaScript da interface.
- Copias `.js` locais que eventualmente coexistam com arquivos `.ts` em `src/` nao fazem parte do fluxo versionado atual.

## Scripts Windows

- `scripts/iniciar-interface.bat`
- `scripts/executar-automacao.bat`
- `scripts/executar-com-config.bat`
- `scripts/instalar-dependencias.bat`
- `scripts/testar-projeto.bat`
- `scripts/testar-sintaxe.bat`

## Documentacao

Operacao atual:

- [docs/README-BAT.md](docs/README-BAT.md)
- [docs/README-TESTES.md](docs/README-TESTES.md)

Historico:

- [REFATORACAO.md](REFATORACAO.md)
- [MIGRACAO_TYPESCRIPT.md](MIGRACAO_TYPESCRIPT.md)
- [docs/HISTORICO.md](docs/HISTORICO.md)
