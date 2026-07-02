# Automacao SEFAZ-SE

## Instalacao

```bash
npm install
npx playwright install chromium
```

## Execucao

```bash
npm run start -- --input ./model.xlsx
```

## Geracao da planilha de entrada

```bash
npm run generate-input
```

O comando:

- Le as requisicoes em `requisicoes.txt`.
- Reexecuta as `curl` para montar a lista de clientes.
- Recaptura o `JWT_GESTTA` via `shared/onvio-auth` se alguma requisicao retornar `Unauthorized`.
- Gera uma nova planilha em `output/model-preenchido-<timestamp>.xlsx`.

Para abrir o navegador durante a execucao:

```bash
npm run start -- --input ./model.xlsx --headed
```

Para usar o Edge instalado no Windows, como no aplicativo Electron:

```bash
npm run start -- --input ./model.xlsx --browser-channel msedge
```

## Aplicativo desktop

Rodar a interface Electron localmente:

```bash
npm run electron:dev
```

A interface permite selecionar uma planilha `.xlsx`, validar as linhas, gerar uma planilha modelo vazia, executar a automacao e abrir a pasta de relatorios. No aplicativo desktop, os relatorios sao gravados em `Documents\Exatas\Parcelamentos SEFAZ-SE\output`. Os PDFs continuam sendo salvos no caminho informado pela coluna `LOCAL PARA SALVAR ARQUIVO`.

Gerar o instalador interno para Windows:

```bash
npm run desktop:dist
```

O instalador NSIS e gerado em `release\`. A configuracao nao assina o executavel e usa Microsoft Edge por padrao no app instalado.

## Regras implementadas

- Le todas as linhas da primeira aba de `model.xlsx`.
- Usa `INSCRICAO ESTADUAL` + `CPF` para acessar o portal.
- Seleciona a parcela cujo vencimento esteja no mes corrente.
- Gera o PDF e renomeia para `PARCELA <rotulo> N\u00BA <numero-do-dae>.pdf`.
- O rotulo da parcela segue a regra `parcelas pagas + parcelas atrasadas`; se nao houver atrasadas, usa `parcelas pagas + 1`.
- Salva o PDF em `LOCAL PARA SALVAR ARQUIVO`.
- Gera um relatorio XLSX separado em `output/`.
