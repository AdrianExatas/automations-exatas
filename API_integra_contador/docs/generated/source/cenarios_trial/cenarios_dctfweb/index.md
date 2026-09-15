---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_dctfweb/"
sourceUpdatedAt: "10 de abril de 2026 14:58:42 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "3f65e178854201e05e05ef17bff26ab64f492f0271ecd6f17de0adec342c0eee"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_dctfweb/).

# Cenários DCTFWEB

**IMPORTANTE**

A chamada da API Trial é apenas para demonstração. As APIs disponíveis e suas respectivas URLs (endpoints) para consumo são disponibilizadas (através da documentação dos seus respectivos swaggers) na seção [Referência da API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/chamadas/api_reference/).

Na chamada da API Trial o parâmetro do tipo header jwt_token não é obrigatório, apenas no contexto real de produção esse parâmetro é obrigatório. Saiba mais sobre o jwt_token na seção [Como Autenticar na API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/quick_start/).

## Gerar Documento de Arrecadação

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
"idSistema": "DCTFWEB",
"idServico": "GERARGUIA31",
"versaoSistema": "1.0",
"dados": "{\"categoria\": \"GERAL_MENSAL\",\"anoPA\":\"2027\\"mesPA\":\"11\",\"numeroReciboEntrega\": 24573}"
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
"idSistema": "DCTFWEB",
"idServico": "GERARGUIA31",
"versaoSistema": "1.0",
"dados": "{\"categoria\": \"GERAL_MENSAL\",\"anoPA\":\"2027\"\"mesPA\":\"11\",\"numeroReciboEntrega\": 24573}"
}
}'
```

## Gerar Documento de Arrecadação - Gerar Guia em Andamento

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
"idSistema": "DCTFWEB",
"idServico": "GERARGUIAANDAMENTO313",
"versaoSistema": "1.0",
"dados": "{\"categoria\":\"GERAL_MENSAL\",\"anoPA\":\"2025\\"mesPA\":\"01\"}"
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
"idSistema": "DCTFWEB",
"idServico": "GERARGUIAANDAMENTO313",
"versaoSistema": "1.0",
"dados": "{\"categoria\":\"GERAL_MENSAL\",\"anoPA\":\"2025\"\"mesPA\":\"01\"}"
}
}'
```

## Consultar Recibo de Transmissão

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
"idSistema": "DCTFWEB",
"idServico": "CONSRECIBO32",
"versaoSistema": "1.0",
"dados": "{\"categoria\": 40,\"anoPA\":\"2027\",\"mesPA\":\"11\\"numeroReciboEntrega\": 24573}"
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
"idSistema": "DCTFWEB",
"idServico": "CONSRECIBO32",
"versaoSistema": "1.0",
"dados": "{\"categoria\": 40,\"anoPA\":\"2027\",\"mesPA\":\"11\"\"numeroReciboEntrega\": 24573}"
}
}'
```

## Consultar Relatório Declaração Completa

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
"idSistema": "DCTFWEB",
"idServico": "CONSDECCOMPLETA33",
"versaoSistema": "1.0",
"dados": "{\"categoria\": \"GERAL_MENSAL\",\"anoPA\":\"2027\    "mesPA\":\"11\",\"numeroReciboEntrega\": 24573}"
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
"idSistema": "DCTFWEB",
"idServico": "CONSDECCOMPLETA33",
"versaoSistema": "1.0",
"dados": "{\"categoria\": \"GERAL_MENSAL\",\"anoPA\":\"2027\"\"mesPA\":\"11\",\"numeroReciboEntrega\": 24573}"
}
}'
```

## Consultar o XML da Declaração

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

```text
{
"contratante": {
"numero": "00000000000",
"tipo": 1
},
"autorPedidoDados": {
"numero": "00000000000",
"tipo": 1
},
"contribuinte": {
"numero": "00000000000",
"tipo": 1
},
"pedidoDados": {
"idSistema": "DCTFWEB",
"idServico": "CONSXMLDECLARACAO38",
"versaoSistema": "1.0",
"dados": "{\"categoria\": \"PF_MENSAL\",\"anoPA\":\"2022\\"mesPA\":\"06\"}"
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
-d ' {
"contratante": {
"numero": "00000000000",
"tipo": 1
},
"autorPedidoDados": {
"numero": "00000000000",
"tipo": 1
},
"contribuinte": {
"numero": "00000000000",
"tipo": 1
},
"pedidoDados": {
"idSistema": "DCTFWEB",
"idServico": "CONSXMLDECLARACAO38",
"versaoSistema": "1.0",
"dados": "{\"categoria\": \"PF_MENSAL\",\"anoPA\":\"2022\"\"mesPA\":\"06\"}"
}
}'
```

## Transmitir Declaração

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

```text
{
"contratante": {
"numero": "00000000000",
"tipo": 1
},
"autorPedidoDados": {
"numero": "00000000000",
"tipo": 1
},
"contribuinte": {
"numero": "00000000000",
"tipo": 1
},
"pedidoDados": {
"idSistema": "DCTFWEB",
"idServico": "TRANSDECLARACAO310",
"versaoSistema": "1.0",
"dados": "{\"categoria\": \"PF_MENSAL\",\"anoPA\":\"2022\",\"mesPA\":\"06\",\"xmlAssinadoBase64\": \"<BASE64_REMOVIDO_TAMANHO_24892>\"}"
}
}
```

Curl:

```text
curl -X 'POST' \
'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1/Transmitir' \
-H 'accept: text/plain' \
-H "Authorization: Bearer <ACCESS_TOKEN>" \
-H 'Content-Type: application/json' \
-d '{
"contratante": {
"numero": "00000000000",
"tipo": 1
},
"autorPedidoDados": {
"numero": "00000000000",
"tipo": 1
},
"contribuinte": {
"numero": "00000000000",
"tipo": 1
},
"pedidoDados": {
"idSistema": "DCTFWEB",
"idServico": "TRANSDECLARACAO310",
"versaoSistema": "1.0",
"dados": "{\"categoria\": \"PF_MENSAL\",\"anoPA\":\"2022\",\"mesPA\":\"06\"\"xmlAssinadoBase64\":\"<BASE64_REMOVIDO_TAMANHO_24517>\"}"
}
}'
```
