# Parcelamentos SEFAZ-AL

Automacao em TypeScript + Playwright para baixar o boleto atual de todos os parcelamentos listados no portal da SEFAZ-AL.

## Entrada

O projeto inclui uma planilha de exemplo versionada em `./model.xlsx`.

A primeira aba da planilha precisa conter estas colunas:

- `EMPRESA`
- `USUARIO`
- `SENHA`

## Execucao

Instalacao:

```bash
npm install
```

Execucao padrao, usando `./model.xlsx` e salvando os PDFs em `./output/downloads`:

```bash
npm run start
```

Execucao informando caminhos explicitamente:

```bash
npm run start -- --input ./model.xlsx --output ./output/downloads
```

Para abrir o navegador durante a execucao:

```bash
npm run start -- --headed
```

## Saida

- PDFs em `output/downloads/EMPRESA/PARCELAMENTO N° <CONSOLIDACAO>/PARCELA N°<emitida> DE <total> - <CONSOLIDACAO>.pdf`
- Relatorio XLSX em `output/`

## Comandos uteis

```bash
npm run check
npm run test
npm run smoke:headed
```

O smoke test usa `SEFAZ_AL_USUARIO`, `SEFAZ_AL_SENHA` e, opcionalmente, `SEFAZ_AL_CONSOLIDACAO`.
