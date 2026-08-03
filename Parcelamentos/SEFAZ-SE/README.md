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

Para escolher o transporte da automacao:

```bash
npm run start -- --input ./model.xlsx --transport browser
npm run start -- --input ./model.xlsx --transport auto
npm run start -- --input ./model.xlsx --transport http
```

O transporte `browser` e o fluxo estavel por Playwright. O transporte `http` usa diretamente os endpoints mapeados do portal para consultar parcelas, adicionar uma parcela isolada ao carrinho, gerar o DAE e baixar o PDF. O transporte `auto` tenta HTTP primeiro e volta para o navegador quando o HTTP falhar antes de produzir um resultado util.

Para mapear as requisicoes reais usadas pelo portal em uma linha da planilha:

```bash
npm run start -- --http-map --input ./model.xlsx --row-number 2
```

O mapeamento grava artefatos redigidos em `output/http-map/<timestamp>/`, incluindo `network-map.json` e `summary.txt`. Esses arquivos podem conter estrutura de sessao e nao devem ser versionados.

O parametro `--map-dir ./output/http-map/<timestamp>` fica reservado para diagnostico/replay de mapas capturados; a execucao HTTP normal nao depende de `replayPlan`.

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
- Coleta as parcelas disponiveis e classifica cada vencimento como `vencida`, `mes_atual` ou `futura`.
- Emite separadamente cada parcela vencida ou do mes atual, reabrindo uma sessao limpa para evitar carrinho unificado.
- Parcelas futuras nao sao emitidas e aparecem no relatorio com status `ignorado`.
- Gera o PDF e renomeia com codigo, rotulo da parcela, empresa e vencimento.
- Salva os PDFs em uma subpasta por mes de solicitacao dentro de `LOCAL PARA SALVAR ARQUIVO`, no formato `MM-AAAA`.
- O rotulo da parcela usa o numero exibido no portal quando disponivel; caso contrario, usa `parcelas pagas + parcelas atrasadas` ou `parcelas pagas + 1`.
- Gera um relatorio XLSX separado em `output/`, incluindo protocolo, vencimento, valor, situacao do vencimento, contadores de parcelas, criterio do rotulo e transporte usado.
