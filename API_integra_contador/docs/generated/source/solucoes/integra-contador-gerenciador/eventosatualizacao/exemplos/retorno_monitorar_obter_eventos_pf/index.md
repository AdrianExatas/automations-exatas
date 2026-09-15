---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/exemplos/retorno_monitorar_obter_eventos_pf/"
sourceUpdatedAt: "17 de junho de 2026 18:10:56 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "d9e5459612dfde6de35c51334d79b8f5bfe0bab7f3161e5bfe6978a9814395e4"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/exemplos/retorno_monitorar_obter_eventos_pf/).

# Exemplo de Json de retorno

Retorno da consulta de eventos de última atualização de PF.

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
"tipo": 3
},
"pedidoDados": {
"idSistema": "EVENTOSATUALIZACAO",
"idServico": "OBTEREVENTOSPF133",
"versaoSistema": "1.0",
"dados": "{\"protocolo\":\"a65f3455-fa91-419b-b0ad-c4ac50695abf\",\"evento\":\"E0301\"}"
},
"status": 200,
"dados": "[[\"00000000000\",\"\"],[\"11111111111\",\"230407\"][\"22222222222\",\"230408\"], [\"33333333333\",\"x\"]]",
"responseId": "z65rs455-ta91-419t-a0sz-w4bm50695agh",
"mensagens":[
{
"codigo": "[Sucesso-EVENTOSATUALIZACAO]",
"texto": "Requisição efetuada com sucesso."
},
{
"codigo": "[Aviso-EVENTOSATUALIZACAO-001]",
"texto": "998 requisições restantes para consultas de eventos do tipE0301 para PF."
}
]
}
```
