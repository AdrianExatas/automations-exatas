---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_pagtoweb/"
sourceUpdatedAt: "10 de abril de 2026 14:58:42 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "e0e38bbd910d6c7ec095f85ebe6b6470880e43b557663bada6d8fa89318ca6bf"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_pagtoweb/).

# Cenários do Pagamentos (PAGTOWEB)

**IMPORTANTE**

A chamada da API Trial é apenas para demonstração. As APIs disponíveis e suas respectivas URLs (endpoints) para consumo são disponibilizadas (através da documentação dos seus respectivos swaggers) na seção [Referência da API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/chamadas/api_reference/).

Na chamada da API Trial o parâmetro do tipo header jwt_token não é obrigatório, apenas no contexto real de produção esse parâmetro é obrigatório. Saiba mais sobre o jwt_token na seção [Como Autenticar na API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/quick_start/).

## Consulta Pagamento: quando pesquisado por intervaloDataArrecadacao

Esta simulação retorna os detalhes de documentos de arrecadação pagos pesquisando por intervaloDataArrecadacao.

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
"numero": "99999999999",
"tipo": 1
},
"contribuinte": {
"numero": "99999999999",
"tipo": 1
},
"pedidoDados": {
"idSistema": "PAGTOWEB",
"idServico": "PAGAMENTOS71",
"dados": "{ \"intervaloDataArrecadacao\": {\"dataInicial\": \"2019-09-01\",\"dataFinal\": \"2019-11-30\"}, \"primeiroDaPagina\": 0,\"tamanhoDaPagina\":100}"
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
"idSistema": "PAGTOWEB",
"idServico": "PAGAMENTOS71",
"dados": "{ \"intervaloDataArrecadacao\": {\"dataInicial\":\"2019-09-01\", \"dataFinal\": \"2019-11-30\"}, \"primeiroDaPagina\": 0\"tamanhoDaPagina\": 100}"
}
}'
```

## Consulta Pagamento: quando pesquisado por codigoReceitaLista

Esta simulação retorna os detalhes de documentos de arrecadação pagos pesquisando por codigoReceitaLista.

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
"idSistema": "PAGTOWEB",
"idServico": "PAGAMENTOS71",
"dados": "{\"codigoReceitaLista\": [\"9999\", \"9999\"],\"primeiroDaPagina\": 0,\"tamanhoDaPagina\": 100}"
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
"idSistema": "PAGTOWEB",
"idServico": "PAGAMENTOS71",
"dados": "{\"codigoReceitaLista\": [\"9999\", \"9999\"],\"primeiroDaPagina\": 0,\"tamanhoDaPagina\": 100}"
}
}'
```

## Consulta Pagamento: quando pesquisado por intervaloValorTotalDocumento

Esta simulação retorna os detalhes de documentos de arrecadação pagos pesquisando por intervaloValorTotalDocumento.

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
"idSistema": "PAGTOWEB",
"idServico": "PAGAMENTOS71",
"dados": "{ \"intervaloDataArrecadacao\": {\"dataInicial\": \"2022-01-01\",\"dataFinal\": \"2022-01-31\"}, \"intervaloValorTotalDocumento\":{\"valorInicial\": 6000,\"valorFinal\": 13000}, \"primeiroDaPagina\": 0\"tamanhoDaPagina\": 100}"
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
"idSistema": "PAGTOWEB",
"idServico": "PAGAMENTOS71",
"dados": "{ \"intervaloDataArrecadacao\": {\"dataInicial\": \"2022-01-01\",\"dataFinal\": \"2022-01-31\"}, \"intervaloValorTotalDocumento\":{\"valorInicial\": 6000,\"valorFinal\": 13000}, \"primeiroDaPagina\": 0\"tamanhoDaPagina\": 100}"
}
}'
```

## Conta Consulta Pagamento: quando pesquisado por intervaloDataArrecadacao

Esta simulação retorna um quantitativo de documentos de arrecadação pagos.

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
"idSistema": "PAGTOWEB",
"idServico": "CONTACONSDOCARRPG73",
"dados": "{ \"intervaloDataArrecadacao\": {\"dataInicial\": \"2019-09-01\",\"dataFinal\": \"2019-11-30\"}}"
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
"idSistema": "PAGTOWEB",
"idServico": "CONTACONSDOCARRPG73",
"dados": "{ \"intervaloDataArrecadacao\": {\"dataInicial\": \"2019-09-01\",\"dataFinal\": \"2019-11-30\"}}"
}
}'
```

## Conta Consulta Pagamento: quando pesquisado por codigoReceitaLista

Esta simulação retorna um quantitativo de documentos de arrecadação pagos.

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
"idSistema": "PAGTOWEB",
"idServico": "CONTACONSDOCARRPG73",
"dados": "{\"codigoReceitaLista\": [\"9999\", \"9999\"]}"
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
"idSistema": "PAGTOWEB",
"idServico": "CONTACONSDOCARRPG73",
"dados": "{\"codigoReceitaLista\": [\"9999\", \"9999\"]}"
}
}'
```

## Conta Consulta Pagamento: quando pesquisado por intervaloValorTotalDocumento

Esta simulação retorna um quantitativo de documentos de arrecadação pagos.

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
"idSistema": "PAGTOWEB",
"idServico": "CONTACONSDOCARRPG73",
"dados": "{ \"intervaloDataArrecadacao\": {\"dataInicial\": \"2022-01-01\", \"dataFinal\": \"2022-01-31\"}, \"intervaloValorTotalDocumento\": {\"valorInicial\": 6000,\"valorFinal\": 13000}}"
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
"idSistema": "PAGTOWEB",
"idServico": "CONTACONSDOCARRPG73",
"dados": "{ \"intervaloDataArrecadacao\": {\"dataInicial\": \"2022-01-01\",\"dataFinal\": \"2022-01-31\"}, \"intervaloValorTotalDocumento\":{\"valorInicial\": 6000,\"valorFinal\": 13000}}"
}
}'
```

## Emitir Comprovante de Pagamento

Esta simulação retorna o comprovante de pagamento.

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
"numero": "99999999999",
"tipo": 1    },
"contribuinte": {
"numero": "99999999999",
"tipo": 1    },
"pedidoDados": {
"idSistema": "PAGTOWEB",
"idServico": "COMPARRECADACAO72",
"dados": "{\"numeroDocumento\": \"99999999999999999\"}"
}
}
```

Curl:

```text
curl -X 'POST' \
'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1/Emitir' \
-H 'accept: text/plain' \
-H "Authorization: Bearer <ACCESS_TOKEN>" \
-H 'Content-Type: application/json' \
-d '{
"contratante": {
"numero": "99999999999999",
"tipo": 2
},
"autorPedidoDados": {
"numero": "99999999999",
"tipo": 1    },
"contribuinte": {
"numero": "99999999999",
"tipo": 1    },
"pedidoDados": {
"idSistema": "PAGTOWEB",
"idServico": "COMPARRECADACAO72",
"dados": "{\"numeroDocumento\": \"99999999999999999\"}"
}
}'
```
