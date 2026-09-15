---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpmei/servicos/exemplos/retorno_consulta_pedidos/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "73bda5b87ec46f597fa6eb99bb8e2081d1b2e1db1adb0e58d948acae55aa8393"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpmei/servicos/exemplos/retorno_consulta_pedidos/).

# Exemplo de Json de retorno

Consultar todos os parcelamentos para a modalidade RELPMEI

## Json de retorno completo

```text
{
"contratante": {
"numero": "00000000000000",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000000",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000000",
"tipo": 2
},
"pedidoDados": {
"idSistema": "RELPMEI",
"idServico": "PEDIDOSPARC233",
"versaoSistema": "1.0",
"dados": ""
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-RELPMEI]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"parcelamentos\":[{\"numero\":9131,\"dataDoPedido\":2022052\"situacao\":\"Em parcelamento\",\"dataDaSituacao\":20220602}]}"
}
```
