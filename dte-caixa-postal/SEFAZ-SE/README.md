# DTE Caixa Postal

Automacao Electron + Playwright para consultar a Caixa Postal da SEFAZ e exportar o resultado em planilha.

## Estrutura

- `src/`: regras da automacao e geracao do relatorio
- `electron/`: shell da interface desktop
- `tests/`: testes unitarios e integracao Playwright
- `certificado/`: material local, fora do versionamento
- `output/` e `release/`: artefatos locais

## Setup

```bash
npm install
```

## Comandos principais

```bash
npm run build
npm run electron:start
npm run test
```

## Entradas e saidas

- certificado digital fica em `certificado/`
- planilhas e relatórios gerados ficam em `output/`
- builds do Electron ficam em `release/`
