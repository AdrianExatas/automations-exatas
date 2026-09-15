---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_procuracoes/"
sourceUpdatedAt: "10 de abril de 2026 14:58:42 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "7e6dd3065c13e586f492333a3aa2ebe9019fc6ef56c45aaecab8e8c481475539"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/cenarios_trial/cenarios_procuracoes/).

# Cenários Procurações

**IMPORTANTE**

A chamada da API Trial é apenas para demonstração. As APIs disponíveis e suas respectivas URLs (endpoints) para consumo são disponibilizadas (através da documentação dos seus respectivos swaggers) na seção [Referência da API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/chamadas/api_reference/).

Na chamada da API Trial o parâmetro do tipo header jwt_token não é obrigatório, apenas no contexto real de produção esse parâmetro é obrigatório. Saiba mais sobre o jwt_token na seção [Como Autenticar na API](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/quick_start/).

## Obter Procurações

Esta simulação retorna as procurações eletrônicas entre um outorgante titular e seu respectivo procurador. Para cada procuração eletrônica encontrada, as seguintes informações são retornadas: quantidade de sistemas na procuração, nome do sistema e a data de expiração.

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
"numero": "99999999999",
"tipo": 1
},
"pedidoDados": {
"idSistema": "PROCURACOES",
"idServico": "OBTERPROCURACAO41",
"versaoSistema": "1",
"dados": "{ \"outorgante\":\"99999999999999\", \"tipoOutorgante\": \"2\",\"outorgado\":\"99999999999\", \"tipoOutorgado\":\"1\" }"
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
"numero": "99999999999",
"tipo": 1
},
"pedidoDados": {
"idSistema": "PROCURACOES",
"idServico": "OBTERPROCURACAO41",
"versaoSistema": "1",
"dados": "{ \"outorgante\":\"99999999999999\", \"tipoOutorgante\": \"2\", \"outorgado\":\"99999999999\", \"tipoOutorgado\":\"1\" }"
}
}'
```
