# Unecont

Automacao em TypeScript para baixar relatorios de Servicos Tomados no Unecont,
formatar as planilhas em um layout padronizado e, opcionalmente, enviar os
arquivos gerados para o Onvio.

## O que este projeto faz

- Le uma planilha de empresas com CNPJ, codigo e dados de upload.
- Acessa o Unecont com Playwright e baixa os relatorios de Servicos Tomados.
- Salva os arquivos brutos em `runtime/downloads/`.
- Cria uma copia formatada em `runtime/normalized/`.
- Gera relatorios de execucao em `_meta/`.
- Pode enviar os arquivos normalizados para o Onvio.

## Estrutura principal

```text
assets/
  mappings/service-item-map.xlsx           # mapa de item de servico para descricao/CNAE
  templates/empresas-template.xlsx         # modelo da planilha de entrada
  templates/report-layout-example.xlsx     # modelo usado para formatar os relatorios
runtime/
  checkpoints/                             # progresso das execucoes
  downloads/                               # relatorios brutos baixados do Unecont
  normalized/                              # relatorios formatados
  uploads/                                 # relatorios de upload sem anexos
src/
```

## Requisitos

- Node.js 18+
- Bun instalado
- Chromium do Playwright instalado
- Credenciais do Unecont
- Para upload no Onvio: API do BD acessivel, normalmente em `http://localhost:3000/api`

## Instalacao

Na pasta deste pacote (`Unecont`):

```powershell
bun install
bunx playwright install chromium
```

Se precisar recriar a planilha modelo de empresas:

```powershell
bunx tsx scripts/generate-template.ts
```

Se voce estiver executando comandos a partir da raiz do monorepo, use `--cwd Unecont`:

```powershell
bun run --cwd Unecont download
```

## Configuracao

Crie um arquivo `.env` a partir de `.env.example` e preencha pelo menos:

```env
UNECONT_EMAIL=seu_email
UNECONT_SENHA=sua_senha
EMPRESAS_EXCEL_PATH=assets/templates/empresas-template.xlsx
HEADLESS=false
```

Campos importantes:

- `UNECONT_EMAIL` e `UNECONT_SENHA`: login usado no Unecont.
- `EMPRESAS_EXCEL_PATH`: caminho da planilha de entrada.
- `HEADLESS=false`: abre o navegador visivel, util para acompanhar ou resolver login.
- `DEFAULT_TIMEOUT`, `SHORT_TIMEOUT`, `LONG_TIMEOUT`: tempos de espera do Playwright.

## Planilha de entrada

A planilha de empresas deve conter as colunas abaixo. Use
`assets/templates/empresas-template.xlsx` como referencia.

Colunas obrigatorias ou usadas no fluxo:

- `CNPJ/CPF`
- `CODIGO`
- `EMPRESA`
- `SOLICITANTE`
- `DEPARTAMENTO`
- `ASSUNTO`
- `DESCRICAO`

Colunas opcionais:

- `QTD_ARQUIVOS`
- `ARQUIVOS`
- `ONVIO_CLIENT_ID`
- `ONVIO_REQUESTER_ID`
- `ONVIO_DEPARTMENT_ID`

Quando `ARQUIVOS` estiver vazio, o upload procura arquivos `.pdf` e `.xlsx`
cujo nome contenha o `CODIGO` como token numerico exato.

## Baixar e formatar planilhas

Este e o fluxo principal. Ele baixa os relatorios do Unecont e ja cria as
planilhas formatadas.

Na pasta `Unecont`:

```powershell
bun run download
```

Para informar uma planilha especifica:

```powershell
bun run download -- --planilha "C:\caminho\para\empresas.xlsx"
```

Tambem funciona com:

```powershell
bun run download -- --excel "C:\caminho\para\empresas.xlsx"
```

Se nenhum caminho for passado, no Windows o comando tenta abrir uma janela para
selecionar a planilha. Se a janela nao for usada, ele procura o caminho definido
em `EMPRESAS_EXCEL_PATH`.

Ao final, o terminal mostra os caminhos gerados:

```text
Downloads: runtime/downloads/Unecont_<data>
Normalizadas: runtime/normalized/Unecont_<data>
Relatorio: runtime/downloads/Unecont_<data>/_meta/relatorio-execucao.xlsx
Resumo: ...
```

Arquivos gerados:

- `runtime/downloads/Unecont_<data>/`: arquivos brutos baixados.
- `runtime/normalized/Unecont_<data>/`: copias formatadas para uso/upload.
- `runtime/downloads/Unecont_<data>/_meta/relatorio-execucao.xlsx`: resumo por empresa.
- `runtime/checkpoints/download-batch.json`: checkpoint do lote de download.

A formatacao usa:

- Modelo: `assets/templates/report-layout-example.xlsx`
- Mapa de servicos: `assets/mappings/service-item-map.xlsx`

Se existirem linhas mapeaveis sem `DESCRICAO DO SERVICO`, a validacao pode
falhar. Nesse caso, ajuste `assets/mappings/service-item-map.xlsx` e rode a
reformatacao novamente.

## Reformatar um lote antigo

Use este comando quando os arquivos ja foram baixados, mas voce quer recriar a
pasta `runtime/normalized/` com o layout atualizado ou com um mapa de servicos
corrigido.

Para reformatar o ultimo lote encontrado em `runtime/downloads/`:

```powershell
bun run reformat-downloads
```

Para escolher um lote especifico:

```powershell
bun run reformat-downloads -- "runtime/downloads/Unecont_2026-03-12_17-34-38"
```

O comando copia os `.xlsx` do lote bruto para
`runtime/normalized/<nome-do-lote>`, reaplica o layout e preenche
`DESCRICAO DO SERVICO` usando o mapa de servicos.

## Comparar planilha operacional com base atualizada

Use este comando para comparar a planilha usada na automacao com a base atualizada
do Unecont e gerar uma nova planilha operacional pronta para executar.

```powershell
bun run compare-empresas -- --atualizada "assets/planilha/UneCont - Empresas - EXATAS CONTABILIDADE - 2026-06-08.xlsx" --operacional "assets/planilha/Panilha-de-junho.xlsx"
```

O comando gera:

```text
runtime/comparisons/<data>/relatorio-comparacao.xlsx
runtime/comparisons/<data>/planilha-operacional-atualizada.xlsx
```

A comparacao usa `CNPJ` como identidade da empresa. Se o `CODIGO` mudou, a
empresa entra como alterada e a planilha final recebe o codigo atualizado.

Durante a comparacao, o comando tambem consulta os usuarios do cliente no Onvio
por requisicoes HTTP, apenas para empresas novas ou linhas sem `RESPONSAVEL`.
Por isso, configure no `.env`:

```env
ONVIO_UDS_TOKEN=seu_token
ONVIO_FIRM_COMPANY_ID=DA26DD8B76C04A7B9A5EE3D029347E4D
```

Se `ONVIO_UDS_TOKEN` estiver vazio, o comando tenta reaproveitar um token ja
cacheado pelo pacote `@exatas/onvio-auth`. Ele nao navega pela tela de usuarios
do cliente.

Regras de usuarios na planilha final:

- os usuarios aparecem apenas pelo nome, sem e-mail;
- se encontrar 1 usuario, preenche `RESPONSAVEL` automaticamente e cria lista suspensa;
- se encontrar mais de 1, preenche `USUARIOS_CLIENTE` e cria lista suspensa em `RESPONSAVEL`;
- se nao encontrar ou houver erro, marca `STATUS_USUARIOS_CLIENTE`.

As opcoes dos dropdowns ficam em uma aba auxiliar escondida chamada
`Opcoes Usuarios`.

Colunas novas na planilha final:

- `USUARIOS_CLIENTE`
- `QTD_USUARIOS_CLIENTE`
- `STATUS_USUARIOS_CLIENTE`

## Atualizar planilha operacional automaticamente

Use este comando para fazer o fluxo mensal completo: entrar no Unecont, baixar a
base atualizada de empresas, comparar com a ultima planilha operacional
atualizada e publicar a nova planilha do mes.

```powershell
bun run update-planilha-operacional
```

O comando usa por padrao:

- base Unecont: `https://app.unecont.com/Contador/Empresas/Default.aspx`
- planilha operacional anterior: arquivo mais recente em
  `assets/planilha/planilha-operacional-*-atualizada.xlsx`
- referencia da descricao: mes anterior ao dia da execucao
- saida historica: `runtime/planilhas-operacionais/<AAAA-MM>/`
- planilha publicada: `assets/planilha/planilha-operacional-<mes>-atualizada.xlsx`

Opcoes:

```powershell
bun run update-planilha-operacional -- --referencia "06/2026"
bun run update-planilha-operacional -- --operacional "assets/planilha/planilha-operacional-maio-atualizada.xlsx"
bun run update-planilha-operacional -- --force
bun run update-planilha-operacional -- --headless=false
```

Configure no `.env`:

```env
UNECONT_EMPRESAS_URL=https://app.unecont.com/Contador/Empresas/Default.aspx
UNECONT_EMPRESAS_REPORT_NAME=
```

`UNECONT_EMPRESAS_REPORT_NAME` pode ficar vazio; nesse caso o nome enviado ao
Unecont usa a data atual. Cookies e `RequestVerificationToken` sao obtidos pela
sessao autenticada do Playwright a cada execucao.

## Upload para o Onvio

Antes do upload, confirme no `.env`:

```env
ONVIO_UDS_TOKEN=...
BD_API_BASE_URL=http://localhost:3000/api
ONVIO_DEPARTMENT_NAME=SETOR FISCAL
UNECONT_UPLOAD_DIR=
```

Se `UNECONT_UPLOAD_DIR` ficar vazio, o comando usa o ultimo lote valido em
`runtime/normalized/Unecont_*`.

Enviar com anexos:

```powershell
bun run upload
```

Validar sem chamar a API do Onvio:

```powershell
bun run upload -- --dry-run
```

Abrir solicitacoes sem anexar arquivos:

```powershell
bun run upload -- --sem-anexos
```

Testar sem anexos e sem chamar a API:

```powershell
bun run upload -- --sem-anexos --dry-run
```

Enviar somente as primeiras linhas da planilha:

```powershell
bun run upload -- --limite 3
```

Enviar codigos especificos, na ordem informada:

```powershell
bun run upload -- --codigos 107,108,120
```

Retomar a partir de um codigo:

```powershell
bun run upload -- --a-partir-de 314
```

Use apenas uma destas opcoes por vez: `--limite`, `--codigos` ou
`--a-partir-de`.

O upload grava checkpoint em
`runtime/checkpoints/upload-onvio-<nome-do-lote>.json` e pula automaticamente
solicitacoes ja enviadas quando o mesmo lote e executado novamente.

Opcoes relacionadas ao checkpoint:

- `--checkpoint caminho.json`: usa um checkpoint especifico.
- `ONVIO_UPLOAD_CHECKPOINT_PATH`: define o checkpoint pelo `.env`.
- `--sem-checkpoint`: executa sem checkpoint.
- Em `--dry-run`, o checkpoint nao e gravado.

## Token do Onvio

O upload precisa de `ONVIO_UDS_TOKEN`, exceto quando a renovacao automatica
estiver ativada.

Modo manual:

```env
ONVIO_UDS_TOKEN=seu_token
ONVIO_AUTO_REFRESH_TOKEN=false
```

Modo automatico:

```env
ONVIO_UDS_TOKEN=
ONVIO_AUTO_REFRESH_TOKEN=true
ONVIO_EMAIL=seu_email_onvio
ONVIO_PASSWORD=sua_senha_onvio
```

Com `ONVIO_AUTO_REFRESH_TOKEN=true`, o comando tenta obter o token via
`shared/onvio-auth` antes do upload quando `ONVIO_UDS_TOKEN` estiver vazio. Se
receber 401 durante o upload, tenta renovar uma vez na mesma execucao.

Esse modo requer:

- `npm` no PATH.
- Chromium instalado com `bunx playwright install chromium`.
- MFA configurado no ambiente quando o portal exigir.

O `.env` nao e atualizado automaticamente.

## Problemas comuns

### Planilha nao encontrada

Confira `EMPRESAS_EXCEL_PATH` ou passe o caminho explicitamente:

```powershell
bun run download -- --planilha "C:\caminho\para\empresas.xlsx"
```

### Nenhum diretorio normalizado encontrado no upload

Execute primeiro:

```powershell
bun run download
```

Ou configure:

```env
UNECONT_UPLOAD_DIR=runtime/normalized/Unecont_<data>
```

### Falha de consistencia na formatacao

Normalmente significa que existem itens de servico que deveriam receber
descricao, mas nao foram encontrados no mapa.

Revise:

```text
assets/mappings/service-item-map.xlsx
```

Depois rode:

```powershell
bun run reformat-downloads -- "runtime/downloads/Unecont_<data>"
```

### O navegador nao aparece

Confirme:

```env
HEADLESS=false
```

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
    outputDir: "runtime/normalized/Unecont_2026-03-12_10-00-00",
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

## API publica

- `loadEmpresasFromExcel(excelPath)`
- `downloadUnecontBatch(options)`
- `reformatDownloadedReports(options)`
- `uploadOnvioBatch(options)`

Os retornos incluem `summary` e `items[]` com status por empresa.
