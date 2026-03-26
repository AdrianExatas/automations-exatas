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

Salva os arquivos brutos em `runtime/downloads/Unecont_*` e usa o checkpoint em `runtime/checkpoints/download-batch.json`.

### Reformatacao

```bash
bun run --cwd Unecont reformat-downloads -- runtime/downloads/Unecont_2026-03-12_17-34-38
```

Copia os `.xlsx` do lote bruto para `runtime/normalized/<nome-do-lote>`, reaplica o layout de `assets/templates/report-layout-example.xlsx`, preenche `DESCRICAO DO SERVICO` com `assets/mappings/service-item-map.xlsx` e falha quando restarem linhas mapeaveis sem descricao.

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

Usa:

- `ONVIO_UDS_TOKEN` para autenticacao;
- `BD_API_BASE_URL` para resolver `clientId`, solicitante e departamento;
- `UNECONT_UPLOAD_DIR` para sobrescrever a pasta de anexos.
- `ONVIO_SKIP_ATTACHMENTS=true` para abrir solicitacoes usando apenas `ASSUNTO` e `DESCRICAO`;
- `ONVIO_DRY_RUN=true` para validar e mostrar o que seria enviado sem chamar a API do Onvio.

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
