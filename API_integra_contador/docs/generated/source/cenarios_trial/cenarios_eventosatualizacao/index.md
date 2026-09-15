---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_eventosatualizacao/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "3e0aa34ffecd18a08c35d8a0f16062c6f6803c9be0606f99105d4c58dae14e85"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_eventosatualizacao/).

# Cenários Eventos de Atualização

**IMPORTANTE**

A chamada da API Trial é apenas para demonstração. As APIs disponíveis e suas respectivas URLs (endpoints) para consumo são disponibilizadas (através da documentação dos seus respectivos swaggers) na seção [Referência da API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/chamadas/api_reference/).

Na chamada da API Trial o parâmetro do tipo header jwt_token não é obrigatório, apenas no contexto real de produção esse parâmetro é obrigatório. Saiba mais sobre o jwt_token na seção [Como Autenticar na API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/quick_start/).

## Solicitar eventos de PF

Logo abaixo, uma simulação de solicitação de eventos para monitorar um lote de 4 contribuintes nos eventos E0301 correspondente ao sistema de negócio DCTFWeb.

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

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
"dados": "{\"evento\": \"E0301\"}"
}
}
```

Curl:

```text
curl -X 'POST' \
'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1/Monitorar' \
-H 'accept: text/plain' \
-H "Authorization: Bearer <ACCESS_TOKEN>" \
-H 'Content-Type: application/json' \
-d '{
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
"dados": "{\"evento\": \"E0301\"}"
}
}'
```

## Obter eventos de PF

Através dessa simulação é possível obter as data com a última atualização de cada contribuinte.

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

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
"dados": "{\"protocolo\":\"a65f3455-fa91-419b-b0ad-c4ac50695abf\"\"evento\":\"E0301\"}"
}
}
```

Curl:

```text
curl -X 'POST' \
'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1/Monitorar' \
-H 'accept: text/plain' \
-H "Authorization: Bearer <ACCESS_TOKEN>" \
-H 'Content-Type: application/json' \
-d '{
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
}
}'
```

## Solicitar eventos de PJ

Logo abaixo, uma simulação de solicitação de eventos para monitorar um lote de 4 contribuintes nos eventos E0301 correspondente ao sistema de negócio DCTFWeb.

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

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
}
}
```

Curl:

```text
curl -X 'POST' \
'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1/Monitorar' \
-H 'accept: text/plain' \
-H "Authorization: Bearer <ACCESS_TOKEN>" \
-H 'Content-Type: application/json' \
-d '{
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
}
}'
```

## Obter eventos de PJ

Através dessa simulação é possível obter as data com a última atualização de cada contribuinte.

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

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
"dados": "{\"protocolo\":\"q90n3455-fa91-419c-c0ad-a4ms50215acl\"\"evento\":\"E0301\"}"
}
}
```

Curl:

```text
curl -X 'POST' \
'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1/Monitorar' \
-H 'accept: text/plain' \
-H "Authorization: Bearer <ACCESS_TOKEN>" \
-H 'Content-Type: application/json' \
-d '{
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
}
}'
```
