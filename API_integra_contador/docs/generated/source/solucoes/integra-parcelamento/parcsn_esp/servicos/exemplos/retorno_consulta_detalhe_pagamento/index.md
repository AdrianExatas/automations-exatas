---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn_esp/servicos/exemplos/retorno_consulta_detalhe_pagamento/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "a30394f0a8bf3b85262ed083dda204f1b642990428b86d27a43e78afae421e85"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn_esp/servicos/exemplos/retorno_consulta_detalhe_pagamento/).

# Exemplo de Json de retorno

Consultar detalhes de pagamento de parcela para a modalidade PARCSN ESPECIAL

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
"idSistema": "PARCSN-ESP",
"idServico": "DETPAGTOPARC175",
"versaoSistema": "1.0",
"dados": "{ \"numeroParcelamento\": 9001, \"anoMesParcela\": 201612 }"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PARCSN-ESP]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"numeroDas\":\"00000000000000000\",\"dataVencimento\":20161229,\"paDasGerado\":201612,\"geradoEm\":\"20161213125856\",\"numeroParcelamento\":\"0001\",\"numeroParcela\":\"11\",\"dataLimiteAcolhimento\":20161229,\"pagamentoDebitos\":[{\"paDebito\":201512,\"processo\":\"\",\"discriminacoesDebito\":[{\"tributo\":\"IRPJ\",\"principal\":17.68,\"multa\":3.54,\"juros\":2.12,\"total\":23.34,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"CSLL\",\"principal\":17.68,\"multa\":3.54,\"juros\":2.12,\"total\":23.34,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"COFINS\",\"principal\":53.05,\"multa\":10.61,\"juros\":6.38,\"total\":70.04,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"PIS\",\"principal\":12.63,\"multa\":2.53,\"juros\":1.52,\"total\":16.68,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"INSS\",\"principal\":152.58,\"multa\":30.52,\"juros\":18.34,\"total\":201.44,\"enteFederadoDestino\":\"União\"}]}],\"dataPagamento\":20161228,\"bancoAgencia\":\"0/49\",\"valorPagoArrecadacao\":334.84}"
}
```
