---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertsn/servicos/exemplos/retorno_consulta_parcelas_impressao/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "ff76371eb0db919445b277b249db6aba9041d52f262db1bde5ffdb51668b78ec"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertsn/servicos/exemplos/retorno_consulta_parcelas_impressao/).

# Exemplo de Json de retorno

Consultar parcelas disponíveis para impressão do DAS na modalidade PERTSN

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
"idServico": "PARCELASPARAGERAR182",
"versaoSistema": "1.0",
"dados": ""
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PERTSN]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"listaParcelas\":[{\"parcela\":201811,\"valor\":429.71{\"parcela\":201812,\"valor\":429.71},{\"parcela\":201901,\"valor\":429.71{\"parcela\":201902,\"valor\":429.71},{\"parcela\":201903,\"valor\":429.71{\"parcela\":201904,\"valor\":429.71},{\"parcela\":201905,\"valor\":429.71{\"parcela\":201906,\"valor\":429.71},{\"parcela\":201907,\"valor\":429.71{\"parcela\":201908,\"valor\":429.71},{\"parcela\":201909,\"valor\":429.71{\"parcela\":201910,\"valor\":429.71},{\"parcela\":201911,\"valor\":429.71{\"parcela\":201912,\"valor\":429.71},{\"parcela\":202001,\"valor\":429.71{\"parcela\":202002,\"valor\":429.71},{\"parcela\":202003,\"valor\":429.71{\"parcela\":202004,\"valor\":429.71},{\"parcela\":202005,\"valor\":429.71{\"parcela\":202006,\"valor\":429.71},{\"parcela\":202007,\"valor\":429.71{\"parcela\":202008,\"valor\":429.71},{\"parcela\":202009,\"valor\":429.71{\"parcela\":202010,\"valor\":429.71},{\"parcela\":202011,\"valor\":429.71{\"parcela\":202012,\"valor\":429.71},{\"parcela\":202101,\"valor\":429.71{\"parcela\":202102,\"valor\":429.71},{\"parcela\":202103,\"valor\":429.71{\"parcela\":202104,\"valor\":429.71},{\"parcela\":202105,\"valor\":429.71{\"parcela\":202106,\"valor\":429.71},{\"parcela\":202107,\"valor\":429.71{\"parcela\":202108,\"valor\":429.71},{\"parcela\":202109,\"valor\":429.71{\"parcela\":202110,\"valor\":429.71},{\"parcela\":202111,\"valor\":429.71{\"parcela\":202112,\"valor\":429.71},{\"parcela\":202201,\"valor\":429.71{\"parcela\":202202,\"valor\":429.71},{\"parcela\":202203,\"valor\":429.71{\"parcela\":202204,\"valor\":429.71},{\"parcela\":202205,\"valor\":429.71{\"parcela\":202206,\"valor\":429.71},{\"parcela\":202207,\"valor\":429.71{\"parcela\":202208,\"valor\":429.71},{\"parcela\":202209,\"valor\":429.71{\"parcela\":202210,\"valor\":429.71},{\"parcela\":202211,\"valor\":429.71{\"parcela\":202212,\"valor\":429.71},{\"parcela\":202301,\"valor\":429.71{\"parcela\":202302,\"valor\":429.71},{\"parcela\":202303,\"valor\":429.71{\"parcela\":202304,\"valor\":429.71},{\"parcela\":202305,\"valor\":429.71{\"parcela\":202306,\"valor\":429.71},{\"parcela\":202307,\"valor\":429.71{\"parcela\":202308,\"valor\":429.71},{\"parcela\":202309,\"valor\":429.71{\"parcela\":202310,\"valor\":429.71}]}"
}
```
