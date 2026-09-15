# SEFAZ-SE AGIL

Automacao Playwright com interface Electron para acessar o AGIL e incluir notas fiscais em lote.

O login e **interativo**: o navegador (Microsoft Edge, por padrao) abre visivel. Voce escolhe o certificado no prompt do Windows e o vinculo **Empresa Inscrita** no Portal Fazendario. Depois o app abre **Incluir Nota Fiscal** e processa o lote.

## Configuracao

Instale as dependencias:

```powershell
bun install
```

A interface e o script usam o **Microsoft Edge** instalado no Windows (`BROWSER_CHANNEL=msedge`) para o prompt de certificado do sistema. Para forcar o Chrome, defina `BROWSER_CHANNEL=chrome`.

Para usar o script sem interface, crie um arquivo `.env` a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

Preencha no `.env`:

```env
SEFAZ_DANFE=chave_de_44_digitos
SEFAZ_DANFE_FILE=
BROWSER_CHANNEL=msedge
DRY_RUN=false
HEADLESS=false
SLOW_MO=0
KEEP_OPEN=false
PDF_DOWNLOAD_DIR=output/agil-pdfs
```

Nao e necessario `SEFAZ_USER` nem arquivo `.pfx`. O certificado e o vinculo sao escolhidos na tela.

`SEFAZ_DANFE` e opcional no script.

## Interface Electron

Rodar a aplicacao:

```powershell
bun run app
```

Ao clicar em Iniciar, o Edge abre. Selecione o certificado e o vinculo Empresa Inscrita. Na aba Login existe a opcao `Dry-run`, que preenche a chave e para antes de `Salvar`. Na aba Notas fiscais, cole chaves de NF-e ou importe arquivos `.xls`, `.xlsx`, `.csv` e `.txt`. A aplicacao detecta sequencias de 44 digitos, remove duplicadas e processa o lote de forma sequencial.

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

## Execucao por script

O comando `bun run agil` executa o script com **tsx** (Node), porque no Windows o Playwright costuma nao abrir o navegador se o proprio script for interpretado diretamente pelo Bun.

```powershell
bun run agil
```

Rodar dry-run lento (o operador seleciona certificado e vinculo no navegador):

```powershell
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

O teste ao vivo `incluir-nota-fiscal.spec.ts` tambem e headed: escolha certificado e vinculo quando o navegador abrir.

Ao finalizar uma inclusao com sucesso, o PDF gerado pelo AGIL e salvo em uma
subpasta por empresa dentro de `PDF_DOWNLOAD_DIR` ou, se a variavel nao for
definida, dentro de `output/agil-pdfs` (script) ou **Documents\SEFAZ-SE-AGIL\agil-pdfs** (interface Electron), conforme a secao acima.
