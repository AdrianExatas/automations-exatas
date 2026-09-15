---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/exemplos/retorno_conta_consulta_pagamento/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "b0372141db6ab3b6bf88452cc744dc161b4ceee27b8f9a5cbe4a166828d6b9a9"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/exemplos/retorno_conta_consulta_pagamento/).

# Exemplo de Json de retorno

Consultar Pagamentos.

## Json de retorno completo

```text
{
"contratante": {
"numero": "99999999999999",
"tipo": 2
},
"autorPedidoDados": {
"numero": "99999999999999",
"tipo": 2
},
"contribuinte": {
"numero": "99999999999999",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PAGTOWEB",
"idServico": "CONTACONSDOCARRPG73",
"versaoSistema": "1.0",
"dados": "{\"numeroDocumentoLista\":[\"9999999999\"]}"
},
"status": 200,
"dados": "1",
"mensagens": [
{
"codigo": "Sucesso-PAGTOWEB-00000",
"texto": "Requisição efetuada com sucesso."
}
]
}
```
