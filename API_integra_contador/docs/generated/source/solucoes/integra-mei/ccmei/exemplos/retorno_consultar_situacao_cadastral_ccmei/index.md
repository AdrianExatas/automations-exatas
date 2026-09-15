---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/exemplos/retorno_consultar_situacao_cadastral_ccmei/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "265b535ec0bd209500a111418d068ad4de4f01a9b79e8d5bc3c3c36984cda0b6"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/exemplos/retorno_consultar_situacao_cadastral_ccmei/).

# Exemplo de Json de retorno

Exemplo do retorno da consulta dos CNPJ (MEI).

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
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-CCMEI-SUC-00010]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "[{\"cnpj\":\"00000000000000\",\"situacao\":\"BAIXADA\",\"enquadradoMei\":true},{\"cnpj\":\"11111111111111\",\"situacao\":\"ATIVA\",\"enquadradoMei\":true}]]"
}
```
