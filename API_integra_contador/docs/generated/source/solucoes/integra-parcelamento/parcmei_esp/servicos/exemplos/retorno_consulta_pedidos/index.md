---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei_esp/servicos/exemplos/retorno_consulta_pedidos/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "cd87c3d11064a9ca72c39f0701c9abb632455876632559c158aec9716ab7196c"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei_esp/servicos/exemplos/retorno_consulta_pedidos/).

# Exemplo de Json de retorno

Consultar todos os parcelamentos para a modalidade PARCMEI ESPECIAL

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
"idSistema": "PARCMEI-ESP",
"idServico": "PEDIDOSPARC213",
"versaoSistema": "1.0",
"dados": ""
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PARCMEI-ESP]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"parcelamentos\":[{\"numero\":9001,\"dataDoPedido\":2017100\"situacao\":\"Em parcelamento\",\"dataDaSituacao\":20171007}]}"
}
```
