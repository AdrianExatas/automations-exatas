# Caixa de Entrada SEFAZ PI

Automacao em TypeScript para consultar a Caixa de Entrada do Domicilio Eletronico no SIATWEB da SEFAZ PI. Ha dois modos de execucao:

- **Navegador (padrao)**: Playwright + Chrome; login por certificado digital (manual ou automatico se houver PFX configurado).
- **HTTP (`SEFAZ_PI_HTTP_MODE=1`)**: sem browser — OIDC PKCE com mTLS (undici) e navegacao no e-AGEAT via requisicoes HTTP (cheerio).

## Estrutura

- [`src/app.ts`](src/app.ts): orquestra leitura de empresas, coleta (browser ou HTTP) e exportacao Excel
- [`src/portal.ts`](src/portal.ts): fluxo Playwright (login, busca de empresa, e-AGEAT, tabela)
- [`src/mailbox/`](src/mailbox/): tipos e funcoes puras (datas, linhas da tabela, resultado de erro)
- [`src/http/`](src/http/): cliente HTTP, autenticacao OIDC, contexto de empresa, coleta e-AGEAT
- [`src/config/siatweb-urls.ts`](src/config/siatweb-urls.ts): URLs e hosts do SIATWEB / SSO
- [`src/certificate/load-pfx.ts`](src/certificate/load-pfx.ts): resolucao de certificado PFX a partir de `SEFAZ_PI_CERT_CODE`
- [`playwright.config.ts`](playwright.config.ts): configuracao de testes
- `output/`: artefatos locais (planilhas, traces)
- `empresas/relacao-empresas.xlsx`: empresas consultadas na execucao

## Variaveis de ambiente

Crie um arquivo `.env` na raiz do projeto. O script `start` usa `node --env-file=.env`.

| Variavel | Obrigatoria | Descricao |
|----------|-------------|-----------|
| `SEFAZ_PI_HTTP_MODE` | Nao | Defina `1` para usar o fluxo HTTP em vez do Playwright. |
| `SEFAZ_PI_CERT_CODE` | Depende | Codigo da pasta sob `certificados/<codigo>/`. Obrigatoria no modo HTTP. No modo browser, opcional: se definida, usa PFX automatico; se vazia, selecao manual do certificado no Chrome. |
| `SEFAZ_PI_OIDC_CLIENT_SECRET` | Nao | Secret do client OIDC usado no fluxo HTTP. Se omitida, e usado um fallback embutido (o mesmo exposto no front do portal); para ambientes reais, prefira definir no `.env` e **nao** commitar o arquivo. |

## Certificados (PFX)

Para login automatico (browser) ou para o modo HTTP:

1. Crie `certificados/<SEFAZ_PI_CERT_CODE>/` (ex.: `certificados/591/`).
2. Coloque um arquivo `.pfx` nessa pasta (usa o primeiro encontrado).
3. Arquivo `SENHA.txt` na mesma pasta, contendo apenas a senha do PFX (texto puro).

## Setup

```bash
bun install
```

## Comandos principais

```bash
bun run test
bun run build
bun run start
```

Use `bun run test:integration` apenas para o fluxo manual do portal real.

## Fluxo (modo browser)

- abre o login do SIATWEB
- inicia o acesso por `CERTIFICADO DIGITAL`
- com `SEFAZ_PI_CERT_CODE`: autentica com PFX no contexto do Chrome; sem codigo: aguarda selecao manual do certificado
- consulta cada empresa listada em `empresas/relacao-empresas.xlsx`
- entra no `e-AGEAT ATIVO`
- coleta notificacoes com `Data da Emissao` do mes atual ou anterior
- gera uma planilha consolidada em `output/spreadsheets/`

## Fluxo (modo HTTP)

Com `SEFAZ_PI_HTTP_MODE=1` e `SEFAZ_PI_CERT_CODE` definido: autentica via Keycloak com mTLS, define cookies de empresa pela API de contribuintes e coleta a tabela do e-AGEAT via POSTs JSF (RichFaces), aplicando o mesmo filtro de mes atual/anterior.
