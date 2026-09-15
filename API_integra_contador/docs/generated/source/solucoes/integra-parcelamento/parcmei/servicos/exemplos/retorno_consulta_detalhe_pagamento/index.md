---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/servicos/exemplos/retorno_consulta_detalhe_pagamento/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "87879409fbb2f1e024511e4156b340b2c0de4e5ba3cb404449631c75e0e5e0d8"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/servicos/exemplos/retorno_consulta_detalhe_pagamento/).

# Exemplo de Json de retorno

Consultar detalhes de pagamento de parcela para a modalidade PARCMEI

## Json de retorno completo

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
"idSistema": "PARCMEI",
"idServico": "DETPAGTOPARC205",
"versaoSistema": "1.0",
"dados": "{ \"numeroParcelamento\": 1, \"anoMesParcela\": 202107 }"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PARCMEI]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"numeroDas\":\"07182122380898052\",\"dataVencimento\":2021073\"paDasGerado\":202107,\"geradoEm\":\"20210811154408\\"numeroParcelamento\":\"0001\",\"numeroParcela\":\"17\\"dataLimiteAcolhimento\":20210831,\"pagamentoDebitos\[{\"paDebito\":201810,\"processo\":\"\",\"discriminacoesDebito\[{\"tributo\":\"INSS\",\"principal\":4.33,\"multa\":0.86,\"juros\":0.5\"total\":5.69,\"enteFederadoDestino\":\"União\"}]},{\"paDebito\":20181\"processo\":\"\",\"discriminacoesDebito\":[{\"tributo\":\"INSS\\"principal\":32.57,\"multa\":6.51,\"juros\":3.63,\"total\":42.7\"enteFederadoDestino\":\"União\"},{\"tributo\":\"ISS\",\"principal\":3.4\"multa\":0.68,\"juros\":0.38,\"total\":4.4\"enteFederadoDestino\":\"CUIABA\"}]}],\"dataPagamento\":2021081\"bancoAgencia\":\"1/1903\",\"valorPagoArrecadacao\":52.87}"
}
```
