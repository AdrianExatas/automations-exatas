---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/servicos/exemplos/retorno_consulta_detalhe_pagamento/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "3df75f8e2d5faad4194a4923fd8dcad52ab196d6e034a5152d97edb2ab36a8d4"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/servicos/exemplos/retorno_consulta_detalhe_pagamento/).

# Exemplo de Json de retorno

Consultar detalhes de pagamento de parcela para a modalidade PERTMEI

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
"idSistema": "PERTMEI",
"idServico": "DETPAGTOPARC225",
"versaoSistema": "1.0",
"dados": "{ \"numeroParcelamento\": 9101, \"anoMesParcela\": 201907 }"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PERTMEI]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"numeroDas\":\"07181922816516181\",\"dataVencimento\":20190731,\"paDasGerado\":201907,\"geradoEm\":\"20190816084003\",\"numeroParcelamento\":\"9101\",\"numeroParcela\":\"13\",\"dataLimiteAcolhimento\":20190830,\"pagamentoDebitos\":[{\"paDebito\":201308,\"processo\":\"\",\"discriminacoesDebito\":[{\"tributo\":\"INSS\",\"principal\":18.95,\"multa\":1.89,\"juros\":2.23,\"total\":23.07,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"ISS\",\"principal\":2.80,\"multa\":0.28,\"juros\":0.33,\"total\":3.41,\"enteFederadoDestino\":\"SAO PAULO\"}]},{\"paDebito\":201309,\"processo\":\"\",\"discriminacoesDebito\":[{\"tributo\":\"INSS\",\"principal\":20.17,\"multa\":2.02,\"juros\":2.34,\"total\":24.53,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"ISS\",\"principal\":2.98,\"multa\":0.30,\"juros\":0.35,\"total\":3.63,\"enteFederadoDestino\":\"SAO PAULO\"}]}],\"dataPagamento\":20190816,\"bancoAgencia\":\"341/367\",\"valorPagoArrecadacao\":54.64}"
}
```
