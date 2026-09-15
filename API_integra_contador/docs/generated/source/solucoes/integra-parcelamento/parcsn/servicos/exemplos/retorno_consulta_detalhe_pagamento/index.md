---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn/servicos/exemplos/retorno_consulta_detalhe_pagamento/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "eecfaf4f5d8a66b5ce1f34bdcee526ac2dcddf0c971951d0c5040033fd765d97"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn/servicos/exemplos/retorno_consulta_detalhe_pagamento/).

# Exemplo de Json de retorno

Consultar detalhes de pagamento de parcela para a modalidade PARCSN ORDINÁRIO

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
"idSistema": "PARCSN",
"idServico": "DETPAGTOPARC165",
"versaoSistema": "1.0",
"dados": "{ \"numeroParcelamento\": 1, \"anoMesParcela\": 201612 }"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PARCSN]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"numeroDas\":\"00000000000000000\",\"dataVencimento\":2016122\"paDasGerado\":201612,\"geradoEm\":\"20161213125856\\"numeroParcelamento\":\"0001\",\"numeroParcela\":\"11\\"dataLimiteAcolhimento\":20161229,\"pagamentoDebitos\[{\"paDebito\":201512,\"processo\":\"\",\"discriminacoesDebito\[{\"tributo\":\"IRPJ\",\"principal\":17.68,\"multa\":3.54,\"juros\":2.1\"total\":23.34,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"CSLL\\"principal\":17.68,\"multa\":3.54,\"juros\":2.12,\"total\":23.3\"enteFederadoDestino\":\"União\"},{\"tributo\":\"COFINS\",\"principal\":505,\"multa\":10.61,\"juros\":6.38,\"total\":70.0\"enteFederadoDestino\":\"União\"},{\"tributo\":\"PIS\",\"principal\":12.6\"multa\":2.53,\"juros\":1.52,\"total\":16.6\"enteFederadoDestino\":\"União\"},{\"tributo\":\"INSS\",\"principal\":1558,\"multa\":30.52,\"juros\":18.34,\"total\":201.4\"enteFederadoDestino\":\"União\"}]}],\"dataPagamento\":2016122\"bancoAgencia\":\"0/49\",\"valorPagoArrecadacao\":334.84}"
}
```
