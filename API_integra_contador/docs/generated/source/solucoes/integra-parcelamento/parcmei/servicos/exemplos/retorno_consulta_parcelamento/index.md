---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/servicos/exemplos/retorno_consulta_parcelamento/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "6f58d8a868a2693b9249dfb46e91ac33c56d6ac945fc7f95611c0e7db81ae2a8"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/servicos/exemplos/retorno_consulta_parcelamento/).

# Exemplo de Json de retorno

Consultar um parcelamento específico para a modalidade PARCMEI

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
"idServico": "OBTERPARC204",
"versaoSistema": "1.0",
"dados": "{ \"numeroParcelamento\": 1}"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PARCMEI]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"numero\":1,\"dataDoPedido\":20200325,\"situacao\":\"Encerradpor Rescisão\",\"dataDaSituacao\":20211114,\"consolidacaoOriginal\{\"valorTotalConsolidado\":1773.86,\"quantidadeParcelas\":3\"primeiraParcela\":0.0,\"parcelaBasica\":50.6\"dataConsolidacao\":20200325131244,\"detalhesConsolidacao\[{\"periodoApuracao\":201711,\"vencimento\":20171220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":51.85,\"valorAtualizado\":69.31{\"periodoApuracao\":201712,\"vencimento\":20180122,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":51.85,\"valorAtualizado\":69.01{\"periodoApuracao\":201801,\"vencimento\":20180220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":69.90{\"periodoApuracao\":201802,\"vencimento\":20180320,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":69.62{\"periodoApuracao\":201803,\"vencimento\":20180420,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":69.35{\"periodoApuracao\":201804,\"vencimento\":20180521,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":69.07{\"periodoApuracao\":201805,\"vencimento\":20180620,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":68.79{\"periodoApuracao\":201806,\"vencimento\":20180720,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":68.51{\"periodoApuracao\":201807,\"vencimento\":20180820,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":68.21{\"periodoApuracao\":201808,\"vencimento\":20180920,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":67.96{\"periodoApuracao\":201809,\"vencimento\":20181022,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":67.68{\"periodoApuracao\":201810,\"vencimento\":20181120,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":67.42{\"periodoApuracao\":201811,\"vencimento\":20181220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":67.16{\"periodoApuracao\":201812,\"vencimento\":20190121,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":66.88{\"periodoApuracao\":201901,\"vencimento\":20190220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":69.40{\"periodoApuracao\":201902,\"vencimento\":20190320,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":69.14{\"periodoApuracao\":201903,\"vencimento\":20190422,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":68.86{\"periodoApuracao\":201904,\"vencimento\":20190520,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":68.56{\"periodoApuracao\":201905,\"vencimento\":20190621,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":68.31{\"periodoApuracao\":201906,\"vencimento\":20190722,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":67.99{\"periodoApuracao\":201907,\"vencimento\":20190820,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":67.71{\"periodoApuracao\":201908,\"vencimento\":20190920,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":67.46{\"periodoApuracao\":201909,\"vencimento\":20191021,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":67.20{\"periodoApuracao\":201910,\"vencimento\":20191121,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":66.99{\"periodoApuracao\":201911,\"vencimento\":20191220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":66.79{\"periodoApuracao\":201912,\"vencimento\":20200120,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":66.58}]\"alteracoesDivida\":[],\"demonstrativoPagamentos\[{\"mesDaParcela\":202003,\"vencimentoDoDas\":2020032\"dataDeArrecadacao\":20200325,\"valorPago\":50.68},{\"mesDaParcela\":20200\"vencimentoDoDas\":20200430,\"dataDeArrecadacao\":20200420,\"valorPago\":518},{\"mesDaParcela\":202005,\"vencimentoDoDas\":2020052\"dataDeArrecadacao\":20200521,\"valorPago\":51.32},{\"mesDaParcela\":20200\"vencimentoDoDas\":20200630,\"dataDeArrecadacao\":20200626,\"valorPago\":545},{\"mesDaParcela\":202007,\"vencimentoDoDas\":2020073\"dataDeArrecadacao\":20200721,\"valorPago\":51.55},{\"mesDaParcela\":20200\"vencimentoDoDas\":20200831,\"dataDeArrecadacao\":20200820,\"valorPago\":565},{\"mesDaParcela\":202009,\"vencimentoDoDas\":2020093\"dataDeArrecadacao\":20201020,\"valorPago\":51.81},{\"mesDaParcela\":20201\"vencimentoDoDas\":20201030,\"dataDeArrecadacao\":20201020,\"valorPago\":581},{\"mesDaParcela\":202011,\"vencimentoDoDas\":2020113\"dataDeArrecadacao\":20201126,\"valorPago\":51.89},{\"mesDaParcela\":20201\"vencimentoDoDas\":20201230,\"dataDeArrecadacao\":20201228,\"valorPago\":597},{\"mesDaParcela\":202101,\"vencimentoDoDas\":2021012\"dataDeArrecadacao\":20210129,\"valorPago\":52.05},{\"mesDaParcela\":20210\"vencimentoDoDas\":20210226,\"dataDeArrecadacao\":20210301,\"valorPago\":519},{\"mesDaParcela\":202103,\"vencimentoDoDas\":2021033\"dataDeArrecadacao\":20210330,\"valorPago\":52.19},{\"mesDaParcela\":20210\"vencimentoDoDas\":20210430,\"dataDeArrecadacao\":20210430,\"valorPago\":529},{\"mesDaParcela\":202105,\"vencimentoDoDas\":2021053\"dataDeArrecadacao\":20210531,\"valorPago\":52.40},{\"mesDaParcela\":20210\"vencimentoDoDas\":20210630,\"dataDeArrecadacao\":20210702,\"valorPago\":569},{\"mesDaParcela\":202107,\"vencimentoDoDas\":2021073\"dataDeArrecadacao\":20210811,\"valorPago\":52.87}]}"
}
```
