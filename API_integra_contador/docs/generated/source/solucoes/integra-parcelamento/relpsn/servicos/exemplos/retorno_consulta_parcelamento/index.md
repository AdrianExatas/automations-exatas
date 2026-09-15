---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpsn/servicos/exemplos/retorno_consulta_parcelamento/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "3a8091000a0d6a317e0869429ff9c84bd3bfa05c8b54d03f8e267d3d89b5afc9"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpsn/servicos/exemplos/retorno_consulta_parcelamento/).

# Exemplo de Json de retorno

Consultar um parcelamento específico para a modalidade RELPSN

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
"idSistema": "RELPSN",
"idServico": "OBTERPARC194",
"versaoSistema": "1.0",
"dados": "{ \"numeroParcelamento\": 9131}"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-RELPSN]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"numero\":9131,\"dataDoPedido\":20220520,\"situacao\":\"Eparcelamento\",\"dataDaSituacao\":20220526,\"consolidacaoOriginal\{\"valorTotalConsolidadoDeEntrada\":2801.5\"quantidadeParcelasDeEntrada\":8,\"parcelaDeEntrada\":350.1\"dataConsolidacao\":20220520164440,\"valorConsolidadoDivida\":22412.0\"detalhesConsolidacao\":[{\"periodoApuracao\":20181\"vencimento\":20190121,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":10380.29,\"valorAtualizado\":14176.31{\"periodoApuracao\":201905,\"vencimento\":20190621,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":6142.47,\"valorAtualizado\":8235.77}]\"alteracoesDivida\":[{\"dataAlteracaoDivida\":20230120162\"identificadorConsolidacao\":1,\"saldoDevedorOriginalSemReducoes\":144577,\"valorRemanescenteComReducoes\":20810.71,\"partePrevidenciaria\":90379,\"demaisDebitos\":11778.92,\"detalhesConsolidacao\[{\"periodoApuracao\":201812,\"vencimento\":2019012\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":8310.3\"valorAtualizado\":12054.06},{\"periodoApuracao\":20190\"vencimento\":20190621,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":6142.47,\"valorAtualizado\":8756.65}\"parcelasAlteracao\":[{\"faixaParcelas\":\"1ª a 12ª\\"parcelaInicial\":202301,\"vencimentoInicial\":2023013\"parcelaBasica\":300.00},{\"faixaParcelas\":\"13ª a 24ª\\"parcelaInicial\":202401,\"vencimentoInicial\":2024013\"parcelaBasica\":300.00},{\"faixaParcelas\":\"25ª a 36ª\\"parcelaInicial\":202501,\"vencimentoInicial\":2025013\"parcelaBasica\":300.00},{\"faixaParcelas\":\"37ª a 60ª\\"parcelaInicial\":202601,\"vencimentoInicial\":2026013\"parcelaBasica\":300.00},{\"faixaParcelas\":\"61ª a 69ª\\"parcelaInicial\":202801,\"vencimentoInicial\":2028013\"parcelaBasica\":312.30}]},{\"dataAlteracaoDivida\":20230127124\"identificadorConsolidacao\":2,\"saldoDevedorOriginalSemReducoes\":144577,\"valorRemanescenteComReducoes\":16247.78,\"partePrevidenciaria\":70549,\"demaisDebitos\":9196.29,\"detalhesConsolidacao\[{\"periodoApuracao\":201812,\"vencimento\":2019012\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":8310.3\"valorAtualizado\":9373.16},{\"periodoApuracao\":20190\"vencimento\":20190621,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":6142.47,\"valorAtualizado\":6874.62}\"parcelasAlteracao\":[{\"faixaParcelas\":\"1ª a 12ª\\"parcelaInicial\":202301,\"vencimentoInicial\":2023013\"parcelaBasica\":300.00},{\"faixaParcelas\":\"13ª a 24ª\\"parcelaInicial\":202401,\"vencimentoInicial\":2024013\"parcelaBasica\":300.00},{\"faixaParcelas\":\"25ª a 36ª\\"parcelaInicial\":202501,\"vencimentoInicial\":2025013\"parcelaBasica\":300.00},{\"faixaParcelas\":\"37ª a 54ª\\"parcelaInicial\":202601,\"vencimentoInicial\":2026013\"parcelaBasica\":302.65}]}],\"demonstrativoPagamentos\[{\"mesDaParcela\":202205,\"vencimentoDoDas\":2022052\"dataDeArrecadacao\":20220523,\"valorPago\":350.19{\"mesDaParcela\":202206,\"vencimentoDoDas\":2022063\"dataDeArrecadacao\":20220629,\"valorPago\":353.69{\"mesDaParcela\":202207,\"vencimentoDoDas\":2022072\"dataDeArrecadacao\":20220729,\"valorPago\":357.26{\"mesDaParcela\":202208,\"vencimentoDoDas\":2022083\"dataDeArrecadacao\":20220830,\"valorPago\":360.87{\"mesDaParcela\":202209,\"vencimentoDoDas\":2022093\"dataDeArrecadacao\":20220930,\"valorPago\":364.96{\"mesDaParcela\":202210,\"vencimentoDoDas\":2022103\"dataDeArrecadacao\":20221031,\"valorPago\":368.71{\"mesDaParcela\":202211,\"vencimentoDoDas\":2022113\"dataDeArrecadacao\":20221130,\"valorPago\":372.28{\"mesDaParcela\":202212,\"vencimentoDoDas\":2022122\"dataDeArrecadacao\":20221229,\"valorPago\":375.85{\"mesDaParcela\":202301,\"vencimentoDoDas\":2023013\"dataDeArrecadacao\":20230131,\"valorPago\":325.34{\"mesDaParcela\":202302,\"vencimentoDoDas\":2023022\"dataDeArrecadacao\":20230228,\"valorPago\":328.70{\"mesDaParcela\":202303,\"vencimentoDoDas\":2023033\"dataDeArrecadacao\":20230331,\"valorPago\":331.46{\"mesDaParcela\":202304,\"vencimentoDoDas\":2023042\"dataDeArrecadacao\":20230428,\"valorPago\":334.97{\"mesDaParcela\":202305,\"vencimentoDoDas\":2023053\"dataDeArrecadacao\":20230531,\"valorPago\":337.73{\"mesDaParcela\":202306,\"vencimentoDoDas\":2023063\"dataDeArrecadacao\":20230630,\"valorPago\":341.09{\"mesDaParcela\":202307,\"vencimentoDoDas\":2023073\"dataDeArrecadacao\":20230731,\"valorPago\":344.30{\"mesDaParcela\":202308,\"vencimentoDoDas\":2023083\"dataDeArrecadacao\":20230830,\"valorPago\":347.51{\"mesDaParcela\":202309,\"vencimentoDoDas\":2023092\"dataDeArrecadacao\":20230929,\"valorPago\":350.93{\"mesDaParcela\":202310,\"vencimentoDoDas\":2023103\"dataDeArrecadacao\":20231031,\"valorPago\":353.84}]}"
}
```
