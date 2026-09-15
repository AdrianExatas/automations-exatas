---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_pnrcontador/"
sourceUpdatedAt: "10 de abril de 2026 14:58:42 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "ed49ecdb2ae2f54b622a39aab9a1878dfc55ab7c2b429953637f4d483dcf5b6a"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_pnrcontador/).

# Cenários PNRCONTADOR

**IMPORTANTE**

A chamada da API Trial é apenas para demonstração. As APIs disponíveis e suas respectivas URLs (endpoints) para consumo são disponibilizadas (através da documentação dos seus respectivos swaggers) na seção [Referência da API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/chamadas/api_reference/).

Na chamada da API Trial o parâmetro do tipo header jwt_token não é obrigatório, apenas no contexto real de produção esse parâmetro é obrigatório. Saiba mais sobre o jwt_token na seção [Como Autenticar na API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/quick_start/).

## Consultar Vínculos

Este exemplo simula a consulta dos vínculos.

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

```text
{
"contratante": {
"numero": "00000000000101",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000101",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000101",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PNRCONTADOR",
"idServico": "CONSVINCULOS261",
"versaoSistema": "1.0",
"dados": "{ \"pagination\": { \"size\": 5 } }"
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
"numero": "00000000000101",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000101",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000101",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PNRCONTADOR",
"idServico": "CONSVINCULOS261",
"versaoSistema": "1.0",
"dados": "{ \"pagination\": { \"size\": 5 } }"
}
}
'
```

## Emitir Comprovante

De posse de um idRenuncia é simulado a emissão de um comprovante de renúncia em formato PDF.

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

```text
{
"contratante": {
"numero": "00000000000100",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000100",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000100",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PNRCONTADOR",
"idServico": "COMPRENUNCIA264",
"versaoSistema": "1.0",
"dados": "{ \"idRenuncia\": 2558 }"
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
"numero": "00000000000100",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000100",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000100",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PNRCONTADOR",
"idServico": "COMPRENUNCIA264",
"versaoSistema": "1.0",
"dados": "{ \"idRenuncia\": 2558 }"
}
}'
```

## Consultar Renúncias

Simula a consulta de renúncias em um período de data.

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

```text
{
"contratante": {
"numero": "00000000000101",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000101",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000101",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PNRCONTADOR",
"idServico": "CONSRENUNCIA263",
"versaoSistema": "1.0",
"dados": "{\"page\": 0, \"pageSize\": 10, \"dtInicio\":\"2026-01-01\",\"dtFim\":\"2026-01-31\"}"
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
"numero": "00000000000101",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000101",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000101",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PNRCONTADOR",
"idServico": "CONSRENUNCIA263",
"versaoSistema": "1.0",
"dados": "{\"page\": 0, \"pageSize\": 10, \"dtInicio\":\"2026-01-01\",\"dtFim\":\"2026-01-31\"}"
}
}'
```

## Solicitar Renúncia

Simula a solicitação de renúncia de um Contador PF de um determinado CNPJ. O contador declara ciência da solicitação realizada.

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

```text
{
"contratante": {
"numero": "00000000000100",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000100",
"tipo": 2
},
"contribuinte": {
"numero": "00000000011",
"tipo": 1
},
"pedidoDados": {
"idSistema": "PNRCONTADOR",
"idServico": "SOLICRENUNCIA262",
"versaoSistema": "1.0",
"dados": "{ \"solicitacaoRenunciaContador\": { \"cnpj\": \"99999999999999\",\"cpfContador\": \"00000000011\", \"cnpjEmpresaContabil\": \"00000000000100\",\"cpfPreenchedor\": \"00000000011\" }, \"cienciaDeclaracoes\": true }"
}
}
```

Curl:

```text
curl -X 'POST' \
'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1/Declarar' \
-H 'accept: text/plain' \
-H "Authorization: Bearer <ACCESS_TOKEN>" \
-H 'Content-Type: application/json' \
-d '{
"contratante": {
"numero": "00000000000100",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000100",
"tipo": 2
},
"contribuinte": {
"numero": "00000000011",
"tipo": 1
},
"pedidoDados": {
"idSistema": "PNRCONTADOR",
"idServico": "SOLICRENUNCIA262",
"versaoSistema": "1.0",
"dados": "{ \"solicitacaoRenunciaContador\": { \"cnpj\": \"99999999999999\",\"cpfContador\": \"00000000011\", \"cnpjEmpresaContabil\":\"00000000000100\", \"cpfPreenchedor\": \"00000000011\" },\"cienciaDeclaracoes\": true }"
}
}'
```

## Consultar a Situação da Solicitação de Renúncia

Este cenário, simula uma consulta da situação de uma renúncia solicitada.

| header | valor |
| --- | --- |
| jwt_token | vazio (não precisa preencher) |
| autenticar_procurador_token | vazio (não precisa preencher) |

Body:

```text
{
"contratante": {
"numero": "00000000000100",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000100",
"tipo": 2
},
"contribuinte": {
"numero": "00000000011",
"tipo": 1
},
"pedidoDados": {
"idSistema": "PNRCONTADOR",
"idServico": "SITSOLICRENUNCIA265",
"versaoSistema": "1.0",
"dados": "{ \"idSolicitacao\": \"PNRCONTADOR-20250212-af81730aeb29c9fdac15\" }"
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
"numero": "00000000000100",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000100",
"tipo": 2
},
"contribuinte": {
"numero": "00000000011",
"tipo": 1
},
"pedidoDados": {
"idSistema": "PNRCONTADOR",
"idServico": "SITSOLICRENUNCIA265",
"versaoSistema": "1.0",
"dados": "{ \"idSolicitacao\":\"PNRCONTADOR-20250212-af81730aeb29c9fdac15\" }"
}
}'
```
