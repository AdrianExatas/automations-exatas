---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn/servicos/exemplos/retorno_consulta_parcelamento/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "d77e6641bc87fa63afc1e656ad361a385fc9b1e9f895b3a6a01235d1aab8c826"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn/servicos/exemplos/retorno_consulta_parcelamento/).

# Exemplo de Json de retorno

Consultar um parcelamento específico para a modalidade PARCSN ORDINÁRIO

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
"idServico": "OBTERPARC164",
"versaoSistema": "1.0",
"dados": "{ \"numeroParcelamento\": 1}"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PARCSN]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"numero\":1,\"dataDoPedido\":20160211,\"situacao\":\"Encerrado Pedido do Contribuinte\",\"dataDaSituacao\":2017012\"consolidacaoOriginal\":{\"valorTotalConsolidado\":5127.3\"quantidadeParcelas\":17,\"primeiraParcela\":301.61,\"parcelaBasica\":3061,\"dataConsolidacao\":20160211124844,\"detalhesConsolidacao\[{\"periodoApuracao\":201511,\"vencimento\":20151221,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":2296.80,\"valorAtualizado\":2803.42{\"periodoApuracao\":201512,\"vencimento\":20160120,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":1920.68,\"valorAtualizado\":2323.97}]\"alteracoesDivida\":[],\"demonstrativoPagamentos\[{\"mesDaParcela\":201602,\"vencimentoDoDas\":2016021\"dataDeArrecadacao\":20160212,\"valorPago\":301.61{\"mesDaParcela\":201603,\"vencimentoDoDas\":2016033\"dataDeArrecadacao\":20160318,\"valorPago\":304.62{\"mesDaParcela\":201604,\"vencimentoDoDas\":2016042\"dataDeArrecadacao\":20160428,\"valorPago\":308.12{\"mesDaParcela\":201605,\"vencimentoDoDas\":2016053\"dataDeArrecadacao\":20160630,\"valorPago\":314.66{\"mesDaParcela\":201606,\"vencimentoDoDas\":2016063\"dataDeArrecadacao\":20160630,\"valorPago\":314.66{\"mesDaParcela\":201607,\"vencimentoDoDas\":2016072\"dataDeArrecadacao\":20160728,\"valorPago\":318.16{\"mesDaParcela\":201608,\"vencimentoDoDas\":2016083\"dataDeArrecadacao\":20160816,\"valorPago\":321.51{\"mesDaParcela\":201609,\"vencimentoDoDas\":2016093\"dataDeArrecadacao\":20160928,\"valorPago\":325.19{\"mesDaParcela\":201610,\"vencimentoDoDas\":2016103\"dataDeArrecadacao\":20161028,\"valorPago\":328.54{\"mesDaParcela\":201611,\"vencimentoDoDas\":2016113\"dataDeArrecadacao\":20161125,\"valorPago\":331.71{\"mesDaParcela\":201612,\"vencimentoDoDas\":2016122\"dataDeArrecadacao\":20161228,\"valorPago\":334.84}]}"
}
```
