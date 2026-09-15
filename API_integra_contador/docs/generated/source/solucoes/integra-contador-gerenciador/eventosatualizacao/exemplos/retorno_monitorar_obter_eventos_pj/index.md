---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/exemplos/retorno_monitorar_obter_eventos_pj/"
sourceUpdatedAt: "17 de junho de 2026 18:10:56 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "f28ed98021ff13a00efcca9606ad6d5bdbbb62ab3feb075ea7f8ecaa6c864036"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/exemplos/retorno_monitorar_obter_eventos_pj/).

# Exemplo de Json de retorno

Retorno da consulta de eventos de última atualização de PJ.

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
"numero": "",
"tipo": 4
},
"pedidoDados": {
"idSistema": "EVENTOSATUALIZACAO",
"idServico": "OBTEREVENTOSPJ134",
"versaoSistema": "1.0",
"dados": "{\"protocolo\":\"q90n3455-fa91-419c-c0ad-a4ms50215acl\",\"evento\":\"E0301\"}"
},
"status": 200,
"dados": "[[\"00000000000000\",\"\"],[\"11111111111111\",\"230327\"][\"22222222222222\",\"230328\"], [\"33333333333333\",\"x\"]]",
"responseId": "565f3455-fa91-419b-b0ad-c4ac50695abf",
"mensagens":[
{
"codigo": "[Sucesso-EVENTOSATUALIZACAO]",
"texto": "Requisição efetuada com sucesso."
},
{
"codigo": "[Aviso-EVENTOSATUALIZACAO-001]",
"texto": "195 requisições restantes para consultas de eventos do tipE0301 para PF."
}
]
}
```
