---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_autenticaprocurador/"
sourceUpdatedAt: "10 de abril de 2026 14:58:42 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "1ace69cf3d2c74852dd8a095292993e29d015cfeeb0bbd5add459b7c51ea3247"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_autenticaprocurador/).

# Cenários Autentica Procurador

**IMPORTANTE**

A chamada da API Trial é apenas para demonstração. As APIs disponíveis e suas respectivas URLs (endpoints) para consumo são disponibilizadas (através da documentação dos seus respectivos swaggers) na seção [Referência da API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/chamadas/api_reference/).

Na chamada da API Trial o parâmetro do tipo header jwt_token não é obrigatório, apenas no contexto real de produção esse parâmetro é obrigatório. Saiba mais sobre o jwt_token na seção [Como Autenticar na API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/quick_start/).

## Envio de XML assinado com o Termo de Autorização

Essa simulação permite o envio de um documento XML assinado digitalmente pelo Autor Pedido de Dados (Procurador) para receber um TOKEN de autorização que permite o Contratante realizar as requisições em nome do Autor Pedido de Dados.

**Informação**

Nesta simulação é possível decodificar o conteúdo XML que está deve ser enviado como `base64`. O XML contém dados apenas para simulação.

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
"numero": "00000000000000",
"tipo": 2
},
"contribuinte": {
"numero": "11111111111111",
"tipo": 2
},
"pedidoDados": {
"idSistema": "AUTENTICAPROCURADOR",
"idServico": "ENVIOXMLASSINADO81",
"versaoSistema": "1.0",
"dados": "{\"xml\": \"<BASE64_REMOVIDO_TAMANHO_3314>\"}"
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
"numero": "99999999999999",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000000",
"tipo": 2
},
"contribuinte": {
"numero": "11111111111111",
"tipo": 2
},
"pedidoDados": {
"idSistema": "AUTENTICAPROCURADOR",
"idServico": "ENVIOXMLASSINADO81",
"versaoSistema": "1.0",
"dados": "{\"xml\": \"<BASE64_REMOVIDO_TAMANHO_3314>\"}"
}
}'
```
