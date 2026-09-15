---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_consolidar_emitir_um_darf_pj/"
sourceUpdatedAt: "24 de junho de 2026 13:59:00 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "36c293aa44c6a77bcc26b4d146a13f7960f659b9831cb049f8af474ed270ecf6"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_consolidar_emitir_um_darf_pj/).

# Exemplo de JSON de retorno

Exemplo de emissão de DARF de pessoa jurídica com cotas.

## JSON de retorno completo

```text
{
"contratante": {
"numero": "99999999999999",
"tipo": 2
},
"autorPedidoDados": {
"numero": "99999999999999",
"tipo": 2
},
"contribuinte": {
"numero": "99999999999999",
"tipo": 2
},
"pedidoDados": {
"idSistema": "SICALC",
"idServico": "CONSOLIDARGERARDARF51",
"versaoSistema": "2.9",
"dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\":\"0220\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"TR\", \"dataPA\":\"04/2021\", \"cota\": \"1\", \"valorImposto\": \"1000.00\",\"dataConsolidacao\": \"2022-08-08T00:00:00\", \"observacao\": \"Darfcalculado\"}"
},
"status": 200,
"dados": "{\"consolidado\": {\"valorPrincipalMoedaCorrente\":1000.00\"valorTotalConsolidado\":1266.00,\"valorMultaMora\":200.00\"percentualMultaMora\":20.00,\"valorJuros\":66.00,\"percentualJuros\":6.60\"termoInicialJuros\":\"2022-02-01T00:00:00\"\"dataArrecadacaoConsolidacao\":\"2022-08-08T00:00:00\"\"dataValidadeCalculo\":\"2022-08-31T00:00:00\"}, \"darf\": \"<dados do Darf noformato base64>\"}"
}
```
