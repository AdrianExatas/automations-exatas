# SEFAZ-SE AGIL

Automacao Playwright com interface Electron para acessar o AGIL e incluir notas fiscais em lote.

## Configuracao

Instale as dependencias:

```powershell
bun install
```

Para rodar **testes Playwright** ou o **script em linha de comando** (`bun run agil`) com o Chromium baixado pelo Playwright, execute uma vez:

```powershell
bunx playwright install chromium
```

Na **interface Electron** em ambiente corporativo, costuma-se usar o Chrome ou o Edge **ja instalados** no Windows, sem baixar o Chromium do Playwright. No **app instalado** (`dist:win`), se `BROWSER_CHANNEL` nao estiver definida, o app usa **Microsoft Edge** por padrao (`channel: msedge`). Em desenvolvimento (`bun run app`), sem variavel o Playwright usa o Chromium proprio, que exige `playwright install chromium`. Para forcar outro canal, defina `BROWSER_CHANNEL=chrome` ou `msedge` no `.env` ou no ambiente.

Para usar o script sem interface, crie um arquivo `.env` a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

Preencha no `.env`:

```env
SEFAZ_USERNAME=seu_usuario
SEFAZ_PASSWORD=sua_senha
SEFAZ_DANFE=chave_de_44_digitos
SEFAZ_DANFE_FILE=
AUTH_MODE=credentials
BROWSER_CHANNEL=
DRY_RUN=false
HEADLESS=false
SLOW_MO=0
KEEP_OPEN=false
PDF_DOWNLOAD_DIR=output/agil-pdfs
```

Para **certificado digital**, use `AUTH_MODE=certificate` (ou `certificado`). `SEFAZ_USERNAME` e `SEFAZ_PASSWORD` ficam em branco. No Windows, defina `BROWSER_CHANNEL=msedge` para o Playwright usar o Edge e o prompt de certificado do sistema, ou `BROWSER_CHANNEL=chrome` se a politica da empresa padronizar o Google Chrome.

`SEFAZ_DANFE` e opcional no script. A interface Electron nao grava login, senha ou certificado em disco.

## Interface Electron

Rodar a aplicacao:

```powershell
bun run app
```

Na aba Login, escolha `Login e senha` ou `Certificado digital`. No modo certificado, o Chromium abre visivel e a selecao do certificado e feita manualmente no prompt do sistema.

Na aba Login tambem existe a opcao `Dry-run`, que preenche a chave e para antes de `Salvar`. Na aba Notas fiscais, cole chaves de NF-e ou importe arquivos `.xls`, `.xlsx`, `.csv` e `.txt`. A aplicacao detecta sequencias de 44 digitos, remove duplicadas e processa o lote de forma sequencial.

Apos carregar ou executar notas, use `Baixar relatorio` para exportar um `.xlsx`
com o resumo por chave e o historico de eventos da execucao. O relatorio nao
inclui credenciais.

Quando houver PDFs salvos para as chaves processadas, o botao `Baixar PDFs (ZIP)` abre uma caixa de dialogo para salvar um arquivo `.zip` com esses comprovantes (apenas caminhos sob o diretorio configurado de downloads).

## Onde os PDFs sao gravados (Electron)

Se `PDF_DOWNLOAD_DIR` estiver definida no ambiente ou no `.env`, a interface Electron usa esse caminho (absoluto ou relativo ao diretorio de trabalho atual).

Se **nao** estiver definida, os PDFs vao para a pasta **Documents\SEFAZ-SE-AGIL\agil-pdfs** do usuario (subpastas por empresa, como no fluxo do AGIL).

O script em linha de comando (`bun run agil`) continua usando `output/agil-pdfs` por padrao quando a variavel nao existe, conforme o codigo em `src/agil-flow.ts`.

## Distribuicao interna (Windows)

Gere o instalador NSIS e o pacote portable com:

```powershell
bun run dist:win
```

Os artefatos aparecem em `release\`. A configuracao atual **nao assina** o executavel (`signAndEditExecutable: false`), adequado a uso interno; para publicacao externa, configure assinatura de codigo conforme a documentacao do electron-builder.

Na versao empacotada, o Edge instalado no Windows e usado por padraio; `BROWSER_CHANNEL` no `.env` ou no sistema continua tendo prioridade (por exemplo `chrome` se a empresa padronizar o Google Chrome).

## Execucao por script

O comando `bun run agil` executa o script com **tsx** (Node), porque no Windows o Playwright costuma nao abrir o navegador se o proprio script for interpretado diretamente pelo Bun.

```powershell
bun run agil
```

Rodar dry-run lento com certificado digital:

```powershell
$env:AUTH_MODE="certificate"
$env:DRY_RUN="true"
$env:HEADLESS="false"
$env:KEEP_OPEN="true"
$env:SLOW_MO="1200"
$env:SEFAZ_DANFE="35260343648971000155550090001065091392607031"
bun run agil
```

Rodar testes:

```powershell
bun run test
```

Ao finalizar uma inclusao com sucesso, o PDF gerado pelo AGIL e salvo em uma
subpasta por empresa dentro de `PDF_DOWNLOAD_DIR` ou, se a variavel nao for
definida, dentro de `output/agil-pdfs` (script) ou **Documents\SEFAZ-SE-AGIL\agil-pdfs** (interface Electron), conforme a secao acima.
