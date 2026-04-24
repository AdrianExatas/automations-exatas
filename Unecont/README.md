# Unecont

Automacao em TypeScript para:

- baixar relatorios de Servicos Tomados no Unecont;
- normalizar planilhas com um modelo padronizado;
- enviar os arquivos gerados para o Onvio.

## Estrutura

```text
assets/
  mappings/service-item-map.xlsx
  templates/empresas-template.xlsx
  templates/report-model.xlsx
  templates/report-layout-example.xlsx
runtime/
  checkpoints/
  downloads/
  normalized/
  uploads/
src/
```

## Requisitos

- Node.js 18+
- `bun install` na raiz do repositorio
- `bunx playwright install chromium`
- API `ONVIO/BD` acessivel em `http://localhost:3000/api` ou `http://localhost:3001/api`

## Instalacao

```bash
bun install
bunx playwright install chromium
bunx tsx Unecont/scripts/generate-template.ts
```

Configure `.env` a partir de `.env.example`.

## CLI

### Download

```bash
bun run --cwd Unecont download
```

Salva os relatorios em `runtime/downloads/Unecont_*` **ja normalizados** (layout `assets/templates/report-layout-example.xlsx`, descricoes via `assets/mappings/service-item-map.xlsx`, mesmo criterio do comando `reformat-downloads`), grava o relatorio consolidado em `runtime/downloads/Unecont_*/_meta/relatorio-execucao.xlsx` e usa o checkpoint em `runtime/checkpoints/download-batch.json`.

### Reformatacao

```bash
bun run --cwd Unecont reformat-downloads -- runtime/downloads/Unecont_2026-03-12_17-34-38
```

Copia os `.xlsx` do lote bruto para `runtime/normalized/<nome-do-lote>`, reaplica o layout de `assets/templates/report-layout-example.xlsx`, preenche `DESCRICAO DO SERVICO` com `assets/mappings/service-item-map.xlsx` e falha quando restarem linhas mapeaveis sem descricao. Use quando quiser reprocessar downloads **sem** normalizacao automatica ou gerar uma segunda copia em `normalized/`.

### Upload

```bash
bun run --cwd Unecont upload
```

```bash
bun run --cwd Unecont upload -- --sem-anexos
```

```bash
bun run --cwd Unecont upload -- --sem-anexos --dry-run
```

```bash
bun run --cwd Unecont upload -- --limite 3
```

`--limite N` envia apenas as **primeiras N linhas** da planilha (útil para testes).

```bash
bun run --cwd Unecont upload -- --codigos 107,108,120
```

`--codigos` envia só os **CODIGO**s listados (nessa ordem); útil para testar empresas que já têm anexos na pasta normalizada. Não combine com `--limite`.

Usa:

- `ONVIO_UDS_TOKEN` para autenticacao (pode ficar vazio se `ONVIO_AUTO_REFRESH_TOKEN=true` e `ONVIO_EMAIL` / `ONVIO_PASSWORD` estiverem preenchidos: a CLI obtem o token uma vez via Playwright antes do envio);
- `BD_API_BASE_URL` para resolver `clientId`, solicitante e departamento;
- `UNECONT_UPLOAD_DIR` para sobrescrever a pasta de anexos.
- `UNECONT_ONVIO_NFS_VIDEO_PATH` (opcional): caminho de um arquivo de vídeo (ex. `.mp4`) anexado a **cada** solicitação no upload **com** anexos; ignorado com `--sem-anexos` ou `ONVIO_SKIP_ATTACHMENTS`. Se usar `QTD_ARQUIVOS` na planilha, inclua esse arquivo na contagem.
- `ONVIO_SKIP_ATTACHMENTS=true` para abrir solicitacoes usando apenas `ASSUNTO` e `DESCRICAO`;
- `ONVIO_DRY_RUN=true` para validar e mostrar o que seria enviado sem chamar a API do Onvio.
- `ONVIO_AUTO_REFRESH_TOKEN=true` (opcional): com `ONVIO_UDS_TOKEN` vazio, executa `capture-tokens` **antes** do primeiro envio; na primeira resposta **401** durante o upload, executa de novo **uma vez por execução**. Em ambos os casos usa `npm run capture-tokens` no pacote `shared/onvio-auth` (login Playwright com `ONVIO_EMAIL` / `ONVIO_PASSWORD`), lê o `UDSLongToken` no artefato (ex. `runtime/latest-auth.json`). Requer `npm` no PATH, Chromium instalado (`bunx playwright install chromium`) e MFA configurado no ambiente quando o portal exigir (ver `shared/onvio-auth/.env.example`). Não atualiza o `.env` automaticamente.

Sem `UNECONT_UPLOAD_DIR`, a CLI usa o ultimo lote em `runtime/normalized/Unecont_*`.
No modo sem anexos, `UNECONT_UPLOAD_DIR` nao e obrigatorio.
O wrapper do `Unecont` usa `@exatas/onvio-solicitacoes-servico` por baixo e preserva o fallback legado de anexos por `CODIGO`.

## Uso como biblioteca

```ts
import {
  downloadUnecontBatch,
  loadEmpresasFromExcel,
  reformatDownloadedReports,
  uploadOnvioBatch,
} from "unecont";

const empresas = loadEmpresasFromExcel("assets/templates/empresas-template.xlsx");

await downloadUnecontBatch({
  credentials: { email: "user@example.com", senha: "secret" },
  input: { empresas },
  browser: { headless: false },
  checkpointPath: "runtime/checkpoints/download-batch.json",
  logger: console,
  reportFormatting: {
    enabled: true,
    modelPath: "assets/templates/report-layout-example.xlsx",
    serviceMapPath: "assets/mappings/service-item-map.xlsx",
    overwrite: true,
  },
});

await reformatDownloadedReports({
  downloadsDir: "runtime/downloads/Unecont_2026-03-12_10-00-00",
  outputDir: "runtime/normalized/Unecont_2026-03-12_10-00-00",
  modelPath: "assets/templates/report-layout-example.xlsx",
  serviceMapPath: "assets/mappings/service-item-map.xlsx",
  overwrite: true,
});

await uploadOnvioBatch({
  token: process.env.ONVIO_UDS_TOKEN!,
  input: { empresas },
  attachmentsDir: "runtime/normalized/Unecont_2026-03-12_10-00-00",
  attachmentsMode: "required",
  dryRun: false,
  bdApiBaseUrl: "http://localhost:3000/api",
  defaults: {
    departmentName: "SETOR FISCAL",
  },
});
```

## Planilha de entrada

Colunas suportadas:

- obrigatorias/usadas: `CNPJ/CPF`, `CODIGO`, `EMPRESA`, `SOLICITANTE`, `DEPARTAMENTO`, `ASSUNTO`, `DESCRICAO`
- opcionais: `QTD_ARQUIVOS`, `ARQUIVOS`
- overrides opcionais para upload: `ONVIO_CLIENT_ID`, `ONVIO_REQUESTER_ID`, `ONVIO_DEPARTMENT_ID`

Quando `ARQUIVOS` estiver vazio, o upload procura arquivos `.pdf` e `.xlsx` cujo nome contenha o `CODIGO` como token numerico exato.

## API publica

- `loadEmpresasFromExcel(excelPath)`
- `downloadUnecontBatch(options)`
- `reformatDownloadedReports(options)`
- `uploadOnvioBatch(options)`

Os retornos incluem `summary` e `items[]` com status por empresa.
