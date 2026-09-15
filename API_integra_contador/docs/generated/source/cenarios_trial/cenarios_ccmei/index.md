---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_ccmei/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "ea19f88358a85342bf20db69c42436776cc6f5f38788196a6d7391ef0dad3926"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_ccmei/).

# Cenários CCMEI

**IMPORTANTE**

A chamada da API Trial é apenas para demonstração. As APIs disponíveis e suas respectivas URLs (endpoints) para consumo são disponibilizadas (através da documentação dos seus respectivos swaggers) na seção [Referência da API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/chamadas/api_reference/).

Na chamada da API Trial o parâmetro do tipo header jwt_token não é obrigatório, apenas no contexto real de produção esse parâmetro é obrigatório. Saiba mais sobre o jwt_token na seção [Como Autenticar na API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/quick_start/).

## Consulta os dados do Certificado de Condição MEI

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
"idSistema": "CCMEI",
"idServico": "DADOSCCMEI122",
"versaoSistema": "1.0",
"dados": ""
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
"idSistema": "CCMEI",
"idServico": "DADOSCCMEI122",
"versaoSistema": "1.0",
"dados": ""
}
}'
```

## Consulta a situação cadastral dos CNPJ MEI vinculados ao CPF

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
"idSistema": "CCMEI",
"idServico": "CCMEISITCADASTRAL123",
"versaoSistema": "1.0",
"dados": ""
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
"idSistema": "CCMEI",
"idServico": "CCMEISITCADASTRAL123",
"versaoSistema": "1.0",
"dados": ""
}
}'
```

## Emissão do Certificado de Condição de MEI em formato PDF

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
"cpfCnpj": "00000000000000",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000000",
"tipo": 2
},
"pedidoDados": {
"idSistema": "CCMEI",
"idServico": "EMITIRCCMEI121",
"dados": ""
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
"cpfCnpj": "00000000000000",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000000",
"tipo": 2
},
"pedidoDados": {
"idSistema": "CCMEI",
"idServico": "EMITIRCCMEI121",
"dados": ""
}
}'
```
