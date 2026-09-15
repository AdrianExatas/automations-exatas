---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_sicalc/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "b0aaf82a37ff32f23b9dd971d47de09fd10cd486d9f2a81d0a379c2d339a028d"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_sicalc/).

# Cenários SICALC

**IMPORTANTE**

A chamada da API Trial é apenas para demonstração. As APIs disponíveis e suas respectivas URLs (endpoints) para consumo são disponibilizadas (através da documentação dos seus respectivos swaggers) na seção [Referência da API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/chamadas/api_reference/).

Na chamada da API Trial o parâmetro do tipo header jwt_token não é obrigatório, apenas no contexto real de produção esse parâmetro é obrigatório. Saiba mais sobre o jwt_token na seção [Como Autenticar na API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/quick_start/).

## DARF de Pessoa Física

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
"idSistema": "SICALC",
"idServico": "CONSOLIDARGERARDARF51",
"versaoSistema": "2.9",
"dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\":\"0190\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"ME\", \"dataPA\":\"12/2017\", \"vencimento\": \"2018-01-31T00:00:00\", \"valorImposto\":\"1000.00\", \"dataConsolidacao\": \"2022-08-08T00:00:00\", \"observacao\":\"Darf calculado\"}"
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
"tipo": 1
},
"contribuinte": {
"numero": "99999999999",
"tipo": 1
},
"pedidoDados": {
"idSistema": "SICALC",
"idServico": "CONSOLIDARGERARDARF51",
"versaoSistema": "2.9",
"dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\":\"0190\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"ME\",\"dataPA\": \"12/2017\", \"vencimento\": \"2018-01-31T00:00:00\",\"valorImposto\": \"1000.00\", \"dataConsolidacao\":\"2022-08-08T00:00:00\", \"observacao\": \"Darf calculado\"}"
}
}'
```

## DARF de Pessoa Jurídica de um débito com cotas

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

```text
{
"contratante":{
"numero":"00000000000000",
"tipo":2
},
"autorPedidoDados":{
"numero":"99999999999999",
"tipo":2
},
"contribuinte":{
"numero":"99999999999999",
"tipo":2
},
"pedidoDados":{
"idSistema":"SICALC",
"idServico":"CONSOLIDARGERARDARF51",
"versaoSistema":"2.9",
"dados":"{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\": \"0220\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"TR\", \"dataPA\": \"04/2021\", \"cota\": \"1\", \"valorImposto\": \"1000.00\", \"dataConsolidacao\": \"2022-08-08T00:00:00\", \"observacao\": \"Darf calculado\"}"
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
"contratante":{
"numero":"00000000000000",
"tipo":2
},
"autorPedidoDados":{
"numero":"99999999999999",
"tipo":2
},
"contribuinte":{
"numero":"99999999999999",
"tipo":2
},
"pedidoDados":{
"idSistema":"SICALC",
"idServico":"CONSOLIDARGERARDARF51",
"versaoSistema":"2.9",
"dados":"{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\":\"0220\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"TR\",\"dataPA\": \"04/2021\", \"cota\": \"1\", \"valorImposto\": \"1000.00\",\"dataConsolidacao\": \"2022-08-08T00:00:00\", \"observacao\": \"Darfcalculado\"}"
}
}'
```

## DARF de Pessoa Jurídica - com código de barras e com numeração - QRCODE

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
"idSistema": "SICALC",
"idServico": "CONSOLIDARGERARDARF51",
"versaoSistema": "2.9",
"dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\":\"1162\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"ME\", \"dataPA\":\"01/2022\", \"vencimento\": \"2022-02-18T00:00:00\", \"valorImposto\":\"1000.00\", \"dataConsolidacao\": \"2022-08-08T00:00:00\", \"observacao\":\"Darf calculado\"}"
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
"numero": "99999999999999",
"tipo": 2
},
"contribuinte": {
"numero": "99999999999999",
"tipo": 2
},
"pedidoDados": {
"idSistema": "SICALC",
"idServico": "CONSOLIDARGERARDARF51",
"versaoSistema": "2.9",
"dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\":\"1162\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"ME\",\"dataPA\": \"01/2022\", \"vencimento\": \"2022-02-18T00:00:00\",\"valorImposto\": \"1000.00\", \"dataConsolidacao\":\"2022-08-08T00:00:00\", \"observacao\": \"Darf calculado\"}"
}
}'
```

## Consultar Receitas do SICALC

Esta simulação consulta as receitas de apoio do SICALC.

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
"numero": "00000000000",
"tipo": 1
},
"pedidoDados": {
"idSistema": "SICALC",
"idServico": "CONSULTAAPOIORECEITAS52",
"versaoSistema": "2.9",
"dados": "{\"codigoReceita\": \"6106\"}"
}
}
```

Curl:

```text
curl -X 'POST' \
'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1/Apoiar' \
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
"numero": "00000000000",
"tipo": 1
},
"pedidoDados": {
"idSistema": "SICALC",
"idServico": "CONSULTAAPOIORECEITAS52",
"versaoSistema": "2.9",
"dados": "{\"codigoReceita\": \"6106\"}"
}
}'
```

## DARF de Pessoa Jurídica - com código de barras

Consolidação e emissão de DARF com código de barras.

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
"idSistema": "SICALC",
"idServico": "GERARDARFCODBARRA53",
"versaoSistema": "2.9",
"dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\":\"6106\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"ME\", \"dataPA\":\"05/2005\", \"vencimento\": \"2005-06-10T00:00:00\", \"valorImposto\":\"1000.00\", \"dataConsolidacao\": \"2024-03-25T00:00:00\", \"observacao\":\"Darf calculado\", \"confissao\": false}"
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
"numero": "99999999999999",
"tipo": 2
},
"contribuinte": {
"numero": "99999999999999",
"tipo": 2
},
"pedidoDados": {
"idSistema": "SICALC",
"idServico": "GERARDARFCODBARRA53",
"versaoSistema": "2.9",
"dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\":\"6106\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"ME\",\"dataPA\": \"05/2005\", \"vencimento\": \"2005-06-10T00:00:00\",\"valorImposto\": \"1000.00\", \"dataConsolidacao\":\"2024-03-25T00:00:00\", \"observacao\": \"Darf calculado\",\"confissao\": false}"
}
}'
```

## DARF de Pessoa Jurídica - manual - com código de barras

Emissão de DARF preenchido de forma manual com código de barras de barras.

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

```text
{
"contratante":{
"numero":"99999999999999",
"tipo":2
},
"autorPedidoDados":{
"numero":"99999999999999",
"tipo":2
},
"contribuinte":{
"numero":"00000000000",
"tipo":1
},
"pedidoDados":{
"idSistema":"SICALC",
"idServico":"GERARDARFCODBARRA53",
"versaoSistema":"2.9",
"dados":"{\"codigoReceita\": \"1394\", \"codigoReceitaExtensao\": \"01\",\"tipoPA\": \"DI\", \"dataPA\": \"25/03/2024\", \"vencimento\":\"2024-03-25T00:00:00\", \"numeroReferencia\": \"8176000\",\"valorImposto\": \"1000.00\", \"dataConsolidacao\":\"2024-03-25T00:00:00\", \"observacao\": \"Darf manual\"}"
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
"contratante":{
"numero":"99999999999999",
"tipo":2
},
"autorPedidoDados":{
"numero":"99999999999999",
"tipo":2
},
"contribuinte":{
"numero":"00000000000",
"tipo":1
},
"pedidoDados":{
"idSistema":"SICALC",
"idServico":"GERARDARFCODBARRA53",
"versaoSistema":"2.9",
"dados":"{\"codigoReceita\": \"1394\", \"codigoReceitaExtensao\": \"01\",\"tipoPA\": \"DI\", \"dataPA\": \"25/03/2024\", \"vencimento\":\"2024-03-25T00:00:00\", \"numeroReferencia\": \"8176000\",\"valorImposto\": \"1000.00\", \"dataConsolidacao\":\"2024-03-25T00:00:00\", \"observacao\": \"Darf manual\"}"
}
}'
```
