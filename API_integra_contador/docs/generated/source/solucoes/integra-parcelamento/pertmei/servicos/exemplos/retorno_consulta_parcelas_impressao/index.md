---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/servicos/exemplos/retorno_consulta_parcelas_impressao/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "9497140a45615acf3ad0b4e4a83396493174f3fa84e3b5297ce7ac9f449c3052"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/servicos/exemplos/retorno_consulta_parcelas_impressao/).

# Exemplo de Json de retorno

Consultar parcelas disponíveis para impressão do DAS na modalidade PERTMEI

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
"idServico": "PARCELASPARAGERAR222",
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
"dados": "{\"listaParcelas\":[{\"parcela\":202306,\"valor\":68.13}]}"
}
```
