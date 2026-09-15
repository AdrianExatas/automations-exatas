---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/exemplos/retorno_consultar_anos/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "07dd0dd79d08f563d23f6e0d47f48d11f0c00365737a2804a82554328cd210c5"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/exemplos/retorno_consultar_anos/).

# Exemplo de Json de retorno

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
"idSistema": "REGIMEAPURACAO",
"idServico": "CONSULTARANOSCALENDARIOS102",
"versaoSistema": "1.0",
"dados": ""
},
"status": 200,
"dados": "[{\"anoCalendario\":2023,\"regimeApurado\":\"CAIXA\"},{\"anoCalendario\":2017,\"regimeApurado\":\"COMPETENCIA\"},{\"anoCalendario\":2016,\"regimeApurado\":\"CAIXA\"},{\"anoCalendario\":2015,\"regimeApurado\":\"COMPETENCIA\"},{\"anoCalendario\":2014,\"regimeApurado\":\"COMPETENCIA\"},{\"anoCalendario\":2013,\"regimeApurado\":\"COMPETENCIA\"},{\"anoCalendario\":2012,\"regimeApurado\":\"COMPETENCIA\"},{\"anoCalendario\":2011,\"regimeApurado\":\"COMPETENCIA\"},{\"anoCalendario\":2010,\"regimeApurado\":\"COMPETENCIA\"}]",
"mensagens": [
{
"codigo": "[Sucesso-REGIME]",
"texto": "Requisição efetuada com sucesso."
}
]
}
```
