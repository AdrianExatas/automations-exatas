---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_caixapostal/"
sourceUpdatedAt: "10 de abril de 2026 14:58:42 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "3c9fc7854bbae22a9c3f81416abc99c11464739369053a21f945faa4bc99c012"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_caixapostal/).

# Cenários do Caixa Postal

**IMPORTANTE**

A chamada da API Trial é apenas para demonstração. As APIs disponíveis e suas respectivas URLs (endpoints) para consumo são disponibilizadas (através da documentação dos seus respectivos swaggers) na seção [Referência da API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/chamadas/api_reference/).

Na chamada da API Trial o parâmetro do tipo header jwt_token não é obrigatório, apenas no contexto real de produção esse parâmetro é obrigatório. Saiba mais sobre o jwt_token na seção [Como Autenticar na API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/quick_start/).

## Obter Lista de Mensagens por Contribuintes

Esta simulação obtém a lista de mensagens filtradas de acordo com o status (lida/não-lida).

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
"numero": "99999999999999",
"tipo": 2
},
"pedidoDados": {
"idSistema": "CAIXAPOSTAL",
"idServico": "MSGCONTRIBUINTE61",
"versaoSistema": "1.0",
"dados": "{\"statusLeitura\":\"0\",\"indicadorPagina\":\"0\\"ponteiroPagina\":\"00000000000000\"}"
}
}
```

Curl:

```text
curl -X 'POST' \
'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1/Consultar' \
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
"numero": "99999999999999",
"tipo": 2
},
"pedidoDados": {
"idSistema": "CAIXAPOSTAL",
"idServico": "MSGCONTRIBUINTE61",
"versaoSistema": "1.0",
"dados": "{\"statusLeitura\":\"0\",\"indicadorPagina\":\"0\\"ponteiroPagina\":\"00000000000000\"}"
}
}'
```

## Obter Detalhes de uma Mensagem Específica

Esta simulação obtém os detalhes de uma mensagem específica.

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

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
"idSistema": "CAIXAPOSTAL",
"idServico": "MSGDETALHAMENTO62",
"versaoSistema": "1.0",
"dados": "{\"isn\":\"0000082838\"}"
}
}
```

Curl:

```text
curl -X 'POST' \
'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1/Consultar' \
-H 'accept: text/plain' \
-H "Authorization: Bearer <ACCESS_TOKEN>" \
-H 'Content-Type: application/json' \
-d '{
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
"idSistema": "CAIXAPOSTAL",
"idServico": "MSGDETALHAMENTO62",
"versaoSistema": "1.0",
"dados": "{\"isn\":\"0000082838\"}"
}
}'
```

## Obter Indicador de Novas Mensagens

Esta simulação obtém informação que indica se há mensagens novas.

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

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
"numero": "99999999999",
"tipo": 1
},
"pedidoDados": {
"idSistema": "CAIXAPOSTAL",
"idServico": "INNOVAMSG63",
"versaoSistema": "1.0",
"dados": ""
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
"numero": "00000000000000",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000000",
"tipo": 2
},
"contribuinte": {
"numero": "99999999999",
"tipo": 1
},
"pedidoDados": {
"idSistema": "CAIXAPOSTAL",
"idServico": "INNOVAMSG63",
"versaoSistema": "1.0",
"dados": ""
}
}'
```
