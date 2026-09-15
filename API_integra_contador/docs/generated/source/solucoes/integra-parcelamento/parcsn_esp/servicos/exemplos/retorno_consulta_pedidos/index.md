---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn_esp/servicos/exemplos/retorno_consulta_pedidos/"
sourceUpdatedAt: "10 de abril de 2026 14:58:42 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "80e9a5e6b293f918c21e6513bf100666bc8b252e08d704d67b0994bb112bf6ed"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn_esp/servicos/exemplos/retorno_consulta_pedidos/).

# Exemplo de Json de retorno

Consultar todos os parcelamentos para a modalidade PARCSN ESPECIAL

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
"idSistema": "PARCSN-ESP",
"idServico": "PEDIDOSPARC173",
"versaoSistema": "1.0",
"dados": ""
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PARCSN-ESP]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"parcelamentos\":[{\"numero\":9001,\"dataDoPedido\":20161222,\"situacao\":\"Em parcelamento\",\"dataDaSituacao\":20161227}]}"
}
```
