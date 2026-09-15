---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_consolidar_emitir_um_darf_pf/"
sourceUpdatedAt: "24 de junho de 2026 13:59:00 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "ce8c4bba9da6445c78cd96bb417f8e2ecb2d5db231387b51b23aaa8b3e4c60f2"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_consolidar_emitir_um_darf_pf/).

# Exemplo de JSON de retorno

Exemplo de emissão de DARF de pessoa física.

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
"idServico": "CONSOLIDARGERARDARF51",
"versaoSistema": "2.9",
"dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\"\"0190\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"ME\"\"dataPA\": \"12/2017\", \"vencimento\": \"2018-01-31T00:00:00\"\"valorImposto\": \"1000.00\", \"dataConsolidacao\"\"2022-08-08T00:00:00\", \"observacao\": \"Darf calculado\"}"
},
"status": 200,
"dados": \"consolidado\": \"{\"valorPrincipalMoedaCorrente\":1000.0\"valorTotalConsolidado\":1458.30,\"valorMultaMora\":200.0\"percentualMultaMora\":20.00,\"valorJuros\":258.30,\"percentualJuros\":283,\"termoInicialJuros\":\"2018-02-01T00:00:00\",\"dataArrecadacaoConsolidacao\":\"2022-08-08T00:00:00\",\"dataValidadeCalculo\":\"2022-08-31T00:00:00\"}, \"darf\": \"<dados do Darf no formato base64>"
}
```
