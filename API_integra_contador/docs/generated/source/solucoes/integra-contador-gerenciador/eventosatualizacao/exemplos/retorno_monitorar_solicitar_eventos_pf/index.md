---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/exemplos/retorno_monitorar_solicitar_eventos_pf/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "84c8299a2dac8db7ea502c0f20dd9063b83058bb0a6041536dcc40a4448a191f"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/exemplos/retorno_monitorar_solicitar_eventos_pf/).

# Exemplo de Json de retorno

Retorno da solicitação de eventos de última atualização de PF.

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
"numero": "00000000000,11111111111,22222222222,33333333333",
"tipo": 3
},
"pedidoDados": {
"idSistema": "EVENTOSATUALIZACAO",
"idServico": "SOLICEVENTOSPF131",
"versaoSistema": "1.0",
"dados": "{\"eventValue\": \"E0301\"}"
},
"status": 200,
"dados": "{\"protocolo\":\"a65f3455-fa91-419b-b0ad-c4ac50695abf\"TempoEsperaMedioEmMs\":5000,\"TempoLimiteEmMin\":20}",
"responseId": "z65rs455-ta91-419t-a0sz-w4bm50695agh",
"mensagens":[
{
"codigo": "[Sucesso-EVENTOSATUALIZACAO]",
"texto": "Requisição efetuada com sucesso."
},
{
"codigo": "[Aviso-EVENTOSATUALIZACAO-001]",
"texto": "209 requisições restantes para consultas de eventos dtipo E0301 para PF."
}
]
}
```
