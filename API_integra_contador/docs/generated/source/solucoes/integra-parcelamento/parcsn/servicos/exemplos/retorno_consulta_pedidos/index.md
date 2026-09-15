---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn/servicos/exemplos/retorno_consulta_pedidos/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "6c6b5afdea200f4fd767a295dc911123310a6e4ff649744b48d402eda41cd5c6"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn/servicos/exemplos/retorno_consulta_pedidos/).

# Exemplo de Json de retorno

Consultar todos os parcelamentos para a modalidade PARCSN ORDINÁRIO

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
"idSistema": "PARCSN",
"idServico": "PEDIDOSPARC163",
"versaoSistema": "1.0",
"dados": ""
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PARCSN]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"parcelamentos\":[{\"numero\":1,\"dataDoPedido\":20160211,\"situacao\":\"Encerrado a Pedido do Contribuinte\",\"dataDaSituacao\":20170125},{\"numero\":2,\"dataDoPedido\":20170126,\"situacao\":\"Encerrado a Pedido do Contribuinte\",\"dataDaSituacao\":20180108},{\"numero\":3,\"dataDoPedido\":20180109,\"situacao\":\"Encerrado a Pedido do Contribuinte\",\"dataDaSituacao\":20180625},{\"numero\":4,\"dataDoPedido\":20190102,\"situacao\":\"Encerrado a Pedido do Contribuinte\",\"dataDaSituacao\":20220511},{\"numero\":5,\"dataDoPedido\":20220929,\"situacao\":\"Encerrado a Pedido do Contribuinte\",\"dataDaSituacao\":20230117},{\"numero\":6,\"dataDoPedido\":20230131,\"situacao\":\"Encerrado a Pedido do Contribuinte\",\"dataDaSituacao\":20230209}]}"
}
```
