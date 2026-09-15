---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpmei/servicos/exemplos/retorno_consulta_detalhe_pagamento/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "7af08cc2a174413c03ba9802e85674137ce3a1d7dfade8bba37fac6da3b05177"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpmei/servicos/exemplos/retorno_consulta_detalhe_pagamento/).

# Exemplo de Json de retorno

Consultar detalhes de pagamento de parcela para a modalidade RELPMEI

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
"idSistema": "RELPMEI",
"idServico": "DETPAGTOPARC225",
"versaoSistema": "1.0",
"dados": "{ \"numeroParcelamento\": 9131, \"anoMesParcela\": 202303 }"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-RELPMEI]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"numeroDas\":\"07182308868350189\",\"dataVencimento\":2023033\"paDasGerado\":202303,\"geradoEm\":\"20230329211200\\"numeroParcelamento\":\"9131\",\"numeroParcela\":\"05\\"dataLimiteAcolhimento\":20230331,\"pagamentoDebitos\[{\"paDebito\":201908,\"processo\":\"\",\"discriminacoesDebito\[{\"tributo\":\"INSS\",\"principal\":49.13,\"multa\":2.45,\"juros\":2.6\"total\":54.21,\"enteFederadoDestino\":\"União\"}]},{\"paDebito\":20190\"processo\":\"\",\"discriminacoesDebito\":[{\"tributo\":\"ICMS\\"principal\":0.92,\"multa\":0.05,\"juros\":0.05,\"total\":1.0\"enteFederadoDestino\":\"SP\"}]}],\"dataPagamento\":2023033\"bancoAgencia\":\"237/504\",\"valorPagoArrecadacao\":55.23}"
}
```
