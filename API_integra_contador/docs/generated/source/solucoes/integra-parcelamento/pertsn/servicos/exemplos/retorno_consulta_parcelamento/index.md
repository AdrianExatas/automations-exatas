---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertsn/servicos/exemplos/retorno_consulta_parcelamento/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "bc8bcb8fb9d98a4b843930f993b005849983ea5bca77f2c2ca1889fb3045a16d"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertsn/servicos/exemplos/retorno_consulta_parcelamento/).

# Exemplo de Json de retorno

Consultar um parcelamento específico para a modalidade PERTSN

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
"idServico": "OBTERPARC184",
"versaoSistema": "1.0",
"dados": "{ \"numeroParcelamento\": 9102}"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PERTSN]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"numero\":9102,\"dataDoPedido\":20180619,\"situacao\":\"Eparcelamento\",\"dataDaSituacao\":20230831,\"consolidacaoOriginal\{\"valorTotalConsolidadoDaEntrada\":2687.1\"quantidadeParcelasDeEntrada\":5,\"parcelaDeEntrada\":537.4\"dataConsolidacao\":20180619155825,\"valorConsolidadoDaDivida\":53742.9\"detalhesConsolidacao\":[{\"periodoApuracao\":20151\"vencimento\":20151221,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":3156.80,\"valorAtualizado\":4619.91{\"periodoApuracao\":201607,\"vencimento\":20160822,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":3343.62,\"valorAtualizado\":4596.40{\"periodoApuracao\":201612,\"vencimento\":20170120,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":4338.52,\"valorAtualizado\":5729.41{\"periodoApuracao\":201707,\"vencimento\":20170821,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":5419.66,\"valorAtualizado\":6829.25{\"periodoApuracao\":201708,\"vencimento\":20170921,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":7767.86,\"valorAtualizado\":9738.50{\"periodoApuracao\":201709,\"vencimento\":20171020,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":8037.84,\"valorAtualizado\":10025.52{\"periodoApuracao\":201710,\"vencimento\":20171120,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":5347.95,\"valorAtualizado\":6639.95{\"periodoApuracao\":201711,\"vencimento\":20171220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":4500.95,\"valorAtualizado\":5564.01}]\"alteracoesDivida\":[{\"totalConsolidado\":45089.0\"parcelasRemanescentes\":145,\"parcelaBasica\":310.9\"dataAlteracaoDivida\":202308311053,\"valorConsolidadoPrincipal\":40435.4\"detalhesAlteracaoDivida\":[{\"periodoApuracao\":20151\"vencimento\":20151221,\"numeroProcesso\":\"12376094286201915\\"saldoDevedorOriginal\":1679.07,\"valorAtualizado\":1935.42{\"periodoApuracao\":201607,\"vencimento\":2016082\"numeroProcesso\":\"12376094286201915\",\"saldoDevedorOriginal\":3343.6\"valorAtualizado\":3794.66},{\"periodoApuracao\":20161\"vencimento\":20170120,\"numeroProcesso\":\"12376094286201915\\"saldoDevedorOriginal\":4338.52,\"valorAtualizado\":4876.91{\"periodoApuracao\":201707,\"vencimento\":2017082\"numeroProcesso\":\"12376094286201915\",\"saldoDevedorOriginal\":5419.6\"valorAtualizado\":6026.62},{\"periodoApuracao\":20170\"vencimento\":20170921,\"numeroProcesso\":\"12376094286201915\\"saldoDevedorOriginal\":7767.86,\"valorAtualizado\":8627.74{\"periodoApuracao\":201709,\"vencimento\":2017102\"numeroProcesso\":\"12376094286201915\",\"saldoDevedorOriginal\":8037.8\"valorAtualizado\":8917.15},{\"periodoApuracao\":20171\"vencimento\":20171120,\"numeroProcesso\":\"12376094286201915\\"saldoDevedorOriginal\":5347.95,\"valorAtualizado\":5927.11{\"periodoApuracao\":201711,\"vencimento\":2017122\"numeroProcesso\":\"12376094286201915\",\"saldoDevedorOriginal\":4500.9\"valorAtualizado\":4983.43}]}],\"demonstrativoPagamentos\[{\"mesDaParcela\":201806,\"vencimentoDoDas\":2018062\"dataDeArrecadacao\":20180629,\"valorPago\":537.43{\"mesDaParcela\":201807,\"vencimentoDoDas\":2018073\"dataDeArrecadacao\":20180731,\"valorPago\":542.80{\"mesDaParcela\":201808,\"vencimentoDoDas\":2018083\"dataDeArrecadacao\":20180829,\"valorPago\":545.70{\"mesDaParcela\":201809,\"vencimentoDoDas\":2018092\"dataDeArrecadacao\":20180928,\"valorPago\":548.76}]}"
}
```
