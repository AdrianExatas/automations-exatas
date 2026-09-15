---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei_esp/servicos/exemplos/retorno_consulta_detalhe_pagamento/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "6eeaa711c0289b825af151eac9e6c2b163c75386463eb194bce295cb176a390d"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei_esp/servicos/exemplos/retorno_consulta_detalhe_pagamento/).

# Exemplo de Json de retorno

Consultar detalhes de pagamento de parcela para a modalidade PARCMEI ESPECIAL

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
"idSistema": "PARCMEI-ESP",
"idServico": "DETPAGTOPARC215",
"versaoSistema": "1.0",
"dados": "{ \"numeroParcelamento\": 9001, \"anoMesParcela\": 202111 }"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PARCMEI-ESP]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"numeroDas\":\"07182133406733697\",\"dataVencimento\":2021113\"paDasGerado\":202111,\"geradoEm\":\"20211130180801\\"numeroParcelamento\":\"9001\",\"numeroParcela\":\"50\\"dataLimiteAcolhimento\":20211130,\"pagamentoDebitos\[{\"paDebito\":201502,\"processo\":\"\",\"discriminacoesDebito\[{\"tributo\":\"INSS\",\"principal\":29.25,\"multa\":5.85,\"juros\":14.9\"total\":50.07,\"enteFederadoDestino\":\"União\"}]},{\"paDebito\":20150\"processo\":\"\",\"discriminacoesDebito\":[{\"tributo\":\"INSS\\"principal\":5.88,\"multa\":1.18,\"juros\":2.96,\"total\":10.0\"enteFederadoDestino\":\"União\"},{\"tributo\":\"ICMS\",\"principal\":15,\"multa\":0.03,\"juros\":0.07,\"total\":0.2\"enteFederadoDestino\":\"MG\"}]}],\"dataPagamento\":2021113\"bancoAgencia\":\"104/3988\",\"valorPagoArrecadacao\":60.34}"
}
```
