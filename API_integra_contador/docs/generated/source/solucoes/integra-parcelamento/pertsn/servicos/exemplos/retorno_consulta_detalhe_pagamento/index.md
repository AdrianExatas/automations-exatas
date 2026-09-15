---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertsn/servicos/exemplos/retorno_consulta_detalhe_pagamento/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "613a5147e1b9d6bfd8d73506aa704a06f2d06f3c877d7f82789c4c22865115a5"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertsn/servicos/exemplos/retorno_consulta_detalhe_pagamento/).

# Exemplo de Json de retorno

Consultar detalhes de pagamento de parcela para a modalidade PERTSN

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
"idSistema": "PERTSN",
"idServico": "DETPAGTOPARC185",
"versaoSistema": "1.0",
"dados": "{ \"numeroParcelamento\": 9102, \"anoMesParcela\": 201806 }"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-RELPSN]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"numeroDas\":\"07181817050461249\",\"dataVencimento\":20180629,\"paDasGerado\":201806,\"geradoEm\":\"20180619155840\",\"numeroParcelamento\":\"9102\",\"numeroParcela\":\"01\",\"dataLimiteAcolhimento\":20180629,\"pagamentoDebitos\":[{\"paDebito\":201511,\"processo\":\"\",\"discriminacoesDebito\":[{\"tributo\":\"IRPJ\",\"principal\":17.11,\"multa\":3.42,\"juros\":4.51,\"total\":25.04,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"CSLL\",\"principal\":17.42,\"multa\":3.48,\"juros\":4.59,\"total\":25.49,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"COFINS\",\"principal\":55.45,\"multa\":11.09,\"juros\":14.61,\"total\":81.15,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"PIS\",\"principal\":13.50,\"multa\":2.70,\"juros\":3.56,\"total\":19.76,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"INSS\",\"principal\":159.24,\"multa\":31.85,\"juros\":41.96,\"total\":233.05,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"ICMS\",\"principal\":40.29,\"multa\":8.06,\"juros\":10.62,\"total\":58.97,\"enteFederadoDestino\":\"RS\"},{\"tributo\":\"ISS\",\"principal\":64.21,\"multa\":12.84,\"juros\":16.92,\"total\":93.97,\"enteFederadoDestino\":\"PORTO ALEGRE\"}]}],\"dataPagamento\":20180629,\"bancoAgencia\":\"41/70\",\"valorPagoArrecadacao\":537.43}"
}
```
