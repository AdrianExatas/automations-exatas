---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_consolidar_emitir_um_darf_codbarras/"
sourceUpdatedAt: "24 de junho de 2026 13:59:00 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "569dcea2213ed037bbfd77e641feee0c2ac11aa054b4812dc7ffb6af6e31d8a8"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_consolidar_emitir_um_darf_codbarras/).

# Exemplo de JSON de retorno

Exemplo de uma consolidação de pessoa física com o retorno do código de barras.

## JSON de retorno completo

```text
{
"contratante": {
"numero": "99999999999999",
"tipo": 2
},
"autorPedidoDados": {
"numero": "99999999999",
"tipo": 1
},
"contribuinte": {
"numero": "99999999999",
"tipo": 1
},
"pedidoDados": {
"idSistema": "SICALC",
"idServico": "GERARDARFCODBARRA53",
"versaoSistema": "2.9",
"dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\"\"1394\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"ME\"\"dataPA\": \"12/2017\", \"vencimento\": \"2018-01-31T00:00:00\"\"valorImposto\": \"1000.00\", \"dataConsolidacao\"\"2022-08-08T00:00:00\", \"observacao\": \"Darf calculado\"}"
},
"status": 200,
"dados": "{\"consolidado\": {\"valorPrincipalMoedaCorrente\":1000.0\"valorTotalConsolidado\":1458.30,\"valorMultaMora\":200.0\"percentualMultaMora\":20.00,\"valorJuros\":258.30,\"percentualJuros\":283,\"termoInicialJuros\":\"2018-02-01T00:00:00\",\"dataArrecadacaoConsolidacao\":\"2022-08-08T00:00:00\",\"dataValidadeCalculo\":\"2022-08-31T00:00:00\"},\"codigoDeBarras\": {\"campo1ComDV\":\"858200000104\",\"campo2ComDV\":\"000003852334\",\"campo3ComDV\":\"130701233131\",\"campo4ComDV\":\"019056427906\",\"codigo44\":\"85820000010000003852331307012331301905642790\"\"numeroDocumento\":\"9999999999999999\"}","mensagens": null
}
```

## JSON do campo "dados"

Nesse exemplo o JSON está formatado e sem os caracteres de escape. O exemplo completo é demonstrado acima.

```text
{
"dados": {
"consolidado": {
"valorPrincipalMoedaCorrente": 1000.00,
"valorTotalConsolidado": 1458.30,
"valorMultaMora": 200.00,
"percentualMultaMora": 20.00,
"valorJuros": 258.30,
"percentualJuros": 25.83,
"termoInicialJuros": "2018-02-01T00:00:00",
"dataArrecadacaoConsolidacao": "2022-08-08T00:00:00",
"dataValidadeCalculo": "2022-08-31T00:00:00"
},
"codigoDeBarras": {
"campo1ComDV":"858200000104",
"campo2ComDV":"000003852334",
"campo3ComDV":"130701233131",
"campo4ComDV":"019056427906",
"codigo44":"85820000010000003852331307012331301905642790"
},
"numeroDocumento":"9999999999999999"
}
}
```
