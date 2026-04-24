# Caixa Postal SEFAZ MA

Automacao em TypeScript + Playwright para fluxos da caixa postal da SEFAZ MA.

## Estrutura

- `src/`: specs e arquivos de suporte
- `playwright.config.ts`: configuracao de execucao
- `output/`: artefatos locais

## Setup

```bash
bun install
bun run chrome:install
```

## Comandos principais

```bash
bun run test
bun run test:headed
bun run build
bun run start
```

Use `bun run codegen` para gravar interacoes com o Chrome.
