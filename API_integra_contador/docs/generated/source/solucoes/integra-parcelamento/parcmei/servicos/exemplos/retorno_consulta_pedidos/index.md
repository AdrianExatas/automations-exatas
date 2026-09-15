---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/servicos/exemplos/retorno_consulta_pedidos/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "c3827c7e9436638668d7d125b63b2335515e91411df996536fbd312215126648"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/servicos/exemplos/retorno_consulta_pedidos/).

# Exemplo de Json de retorno

Consultar todos os parcelamentos para a modalidade PARCMEI

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
"idSistema": "PARCMEI",
"idServico": "PEDIDOSPARC203",
"versaoSistema": "1.0",
"dados": ""
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PARCMEI]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"parcelamentos\":[{\"numero\":1,\"dataDoPedido\":2020032\"situacao\":\"Encerrado por Rescisão\",\"dataDaSituacao\":20211114{\"numero\":2,\"dataDoPedido\":20220330,\"situacao\":\"Em parcelamento\\"dataDaSituacao\":20231005}]}"
}
```
