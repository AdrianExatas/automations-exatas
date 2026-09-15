---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/servicos/exemplos/retorno_consulta_pedidos/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "290583d21ef1c7c553c50c9f5cbd46a660b83cb0ddcc5c314cab7cb32aa0160a"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/servicos/exemplos/retorno_consulta_pedidos/).

# Exemplo de Json de retorno

Consultar todos os parcelamentos para a modalidade PERTMEI

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
"idSistema": "PERTMEI",
"idServico": "PEDIDOSPARC223",
"versaoSistema": "1.0",
"dados": ""
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PERTMEI]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"parcelamentos\":[{\"numero\":9101,\"dataDoPedido\":2018062\"situacao\":\"Em parcelamento\",\"dataDaSituacao\":20181106}]}"
}
```
