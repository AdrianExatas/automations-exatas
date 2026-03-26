# ONVIO Certificado – Automação Importação Receita Federal

Automação Playwright (TypeScript) para o fluxo de importação de certificado no Portal do Cliente Onvio (NFe – Import Receita Federal), seguindo Page Object Model e regras do `.cursorrules`.

## Pré-requisitos

- Node.js 18+
- Arquivo `.pfx` do certificado (ex.: `EXATAS CONTABILIDADE LTDA_27939154000108.pfx`)

## Configuração

1. Instalar dependências:
   ```bash
   npm install
   ```

2. Copiar variáveis de ambiente:
   ```bash
   copy .env.example .env
   ```

3. Editar `.env` e preencher:
   - `ONVIO_EMAIL` – e-mail de login Onvio
   - `ONVIO_PASSWORD` – senha do usuário
   - `ONVIO_PFX_PATH` – **caminho absoluto** do arquivo `.pfx`
   - `ONVIO_PFX_PASSWORD` – senha do certificado `.pfx`
   - `ONVIO_CNPJ` – CNPJ apenas números (14 dígitos)

## Execução

- **Rodar o teste** (global-setup faz login e grava sessão; o spec usa essa sessão e executa o fluxo de certificado):
  ```bash
  npm test
  ```

- **Rodar com browser visível**:
  ```bash
  npm run test:headed
  ```

O `global-setup` faz login uma vez e salva o estado em `test-results/.auth/storageState.json`. Os testes reutilizam essa sessão (não repetem login).

## Estrutura (resumo)

- `src/pages/` – Page Objects (Login, NFe Import Receita Federal)
- `src/schemas/` – validação Zod (env)
- `tests/` – `global-setup.ts` (auth) e spec que orquestra o fluxo

Nenhuma interação direta com `page.click()`/`page.fill()` nos specs; tudo fica nos Page Objects.
