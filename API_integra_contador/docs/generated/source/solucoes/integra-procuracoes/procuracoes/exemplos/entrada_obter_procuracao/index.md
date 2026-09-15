---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-procuracoes/procuracoes/exemplos/entrada_obter_procuracao/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "204a7c0ea361c2dacb2ee527ba3d3c0ebe35b9cc62fffbebd10b31314303f24c"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-procuracoes/procuracoes/exemplos/entrada_obter_procuracao/).

# Exemplo de Json de entrada

Obter Procuração

## Json de entrada completo

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
"numero": "99999999999",
"tipo": 1
},
"pedidoDados": {
"idSistema": "PROCURACOES",
"idServico": "OBTERPROCURACAO41",
"versaoSistema": "1",
"dados": "{ \"outorgante\":\"99999999999999\", \"tipoOutorgante\": \"2\", \"outorgado\":\"99999999999\", \"tipoOutorgado\":\"1\" }"
}
}
```
