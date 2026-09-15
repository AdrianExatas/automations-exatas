---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-e-processo/eprocesso/exemplos/retorno_consultar_processos/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "feaddb7250ac215eeca511a180b8e5127313f9bac3f65e0e58aea0fcc93d8835"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-e-processo/eprocesso/exemplos/retorno_consultar_processos/).

# Exemplo de Json de retorno

Exemplo do retorno da consulta dos processos.

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
"idSistema": "EPROCESSO",
"idServico": "CONSPROCPORINTER271",
"versaoSistema": "2.0",
"dados": "{}"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-EPROCESSO-SC_001]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": [
{
"numeroDoProcesso": "00000000000000001",
"relacaoDoInteressadoComOProcesso": "INTERESSADO",
"dataDeProtocolo": "01/01/2020",
"tipoDoProcesso": "AÇÃO FISCAL",
"subtipoDoProcesso": "MEMORIAL",
"localizacao": "DRJ",
"situacao": "CONFIRMADO",
"ultimoEncaminhamentoExterno": null
},{
"numeroDoProcesso": "00000000000000002",
"relacaoDoInteressadoComOProcesso": "INTERESSADO",
"dataDeProtocolo": "01/01/2020",
"tipoDoProcesso": "AÇÃO FISCAL",
"subtipoDoProcesso": "MEMORIAL",
"localizacao": "CARF",
"situacao": "CONFIRMADO",
"ultimoEncaminhamentoExterno": null
}
]
}
```
