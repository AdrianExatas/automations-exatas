---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/servicos/exemplos/retorno_consulta_parcelas_impressao/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "46185708666b69899e782bb199bf6d885544b3ec1d8f6866e216b06cf0bba6bf"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/servicos/exemplos/retorno_consulta_parcelas_impressao/).

# Exemplo de Json de retorno

Consultar parcelas disponíveis para impressão do DAS na modalidade PARCMEI

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
"idServico": "PARCELASPARAGERAR202",
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
"dados": "{\"listaParcelas\":[{\"parcela\":202304,\"valor\":53.81{\"parcela\":202305,\"valor\":53.81},{\"parcela\":202306,\"valor\":53.81{\"parcela\":202307,\"valor\":53.81},{\"parcela\":202308,\"valor\":53.81{\"parcela\":202309,\"valor\":53.81},{\"parcela\":202310,\"valor\":53.81}]}"
}
```
