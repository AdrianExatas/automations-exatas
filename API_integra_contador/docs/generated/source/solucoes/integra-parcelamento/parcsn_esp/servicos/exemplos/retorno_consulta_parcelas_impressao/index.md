---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn_esp/servicos/exemplos/retorno_consulta_parcelas_impressao/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "b19ada81eb1b29cde7788ec18226cad95f84bc4707159540dd156ab3ce89255c"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn_esp/servicos/exemplos/retorno_consulta_parcelas_impressao/).

# Exemplo de Json de retorno

Consultar parcelas disponíveis para impressão do DAS na modalidade PARCSN ESPECIAL

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
"idServico": "PARCELASPARAGERAR172",
"versaoSistema": "1.0",
"dados": ""
},
"status": 200
"mensagens": [
{
"codigo": "[Sucesso-PARCSN-ESP]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"listaParcelas\":[{\"parcela\":202211,\"valor\":3469.73{\"parcela\":202212,\"valor\":3469.73},{\"parcela\":202301,\"valor\":34673},{\"parcela\":202302,\"valor\":3469.73},{\"parcela\":20230\"valor\":3469.73},{\"parcela\":202304,\"valor\":3469.73{\"parcela\":202305,\"valor\":3469.73},{\"parcela\":202306,\"valor\":34673},{\"parcela\":202307,\"valor\":3469.73},{\"parcela\":20230\"valor\":3469.73},{\"parcela\":202309,\"valor\":3469.73{\"parcela\":202310,\"valor\":3469.73}]}"
}
```
