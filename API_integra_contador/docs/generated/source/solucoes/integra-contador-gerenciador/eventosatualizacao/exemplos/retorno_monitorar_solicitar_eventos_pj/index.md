---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/exemplos/retorno_monitorar_solicitar_eventos_pj/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "477f0bf6b5a9ff99c62b4eb97f110987f349de026955b71f37548babbbd9ba63"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/exemplos/retorno_monitorar_solicitar_eventos_pj/).

# Exemplo de Json de retorno

Retorno da solicitação de eventos de última atualização de PJ.

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
"numero": "00000000000000,11111111111111,22222222222222,33333333333333",
"tipo": 4
},
"pedidoDados": {
"idSistema": "EVENTOSATUALIZACAO",
"idServico": "SOLICEVENTOSPJ132",
"versaoSistema": "1.0",
"dados": "{\"evento\": \"E0301\"}"
},
"status": 200,
"dados": "{\"protocolo\":\"q90n3455-fa91-419c-c0ad-a4ms50215acl\"TempoEsperaMedioEmMs\":3000,\"TempoLimiteEmMin\":20}",
"responseId": "a66rq456-ma85-419v-v0az-r6bm50695ufo",
"mensagens":[
{
"codigo": "[Sucesso-EVENTOSATUALIZACAO]",
"texto": "Requisição efetuada com sucesso."
},
{
"codigo": "[Aviso-EVENTOSATUALIZACAO-001]",
"texto": "209 requisições restantes para consultas de eventos dtipo E0301 para PJ."
}
]
}
```
