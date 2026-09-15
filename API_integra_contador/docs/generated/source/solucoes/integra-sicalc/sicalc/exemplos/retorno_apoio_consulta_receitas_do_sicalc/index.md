---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_apoio_consulta_receitas_do_sicalc/"
sourceUpdatedAt: "24 de junho de 2026 13:59:00 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "ef8f7769616ad7b09b9d18ba7f0b90a9e3b028a571e76a39183c32a88a83da16"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_apoio_consulta_receitas_do_sicalc/).

# Exemplo de JSON de retorno

Exemplo de uma consulta de apoio para obtenção dos atributos da receita.

## JSON de retorno completo

```text
{
"contratante": {
"numero": "00000000000000",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000",
"tipo": 1
},
"contribuinte": {
"numero": "00000000000",
"tipo": 1
},
"pedidoDados": {
"idSistema": "SICALC",
"idServico": "CONSULTAAPOIORECEITAS52",
"versaoSistema": "2.9",
"dados": "{\"codigoReceita\": \"6106\"}"
},
"status": 200,
"dados": "{\"receita\": {\"codigoReceita\":6106,\"descricaoReceita\":\"Simples - Pagamento de Micro Empresa e Empresa de Pequeno Porte\",\"extensoes\":[{\"obrigatorios\":{\"codigoReceita\":true,\"codigoReceitaExtensao\":true,\"cota\":false,\"dataConsolidacao\":true,\"dataPA\":true,\"referencia\":false,\"tipoPA\":true,\"valorImposto\":true,\"vencimento\":false},\"informacoes\":{\"calculado\":true,\"codigoBarras\":true,\"codigoReceitaExtensao\":1,\"criacao\":\"1997-01-01T00:00:00\",\"descricaoReceitaExtensao\":\"SIMPLES - PAGAMENTO ME/EPP\",\"descricaoReferencia\":\"SEM REFERÊNCIA\",\"exigeMatriz\":true,\"extincao\":\"2007-06-30T00:00:00\",\"manual\":false,\"pf\":false,\"pj\":false,\"tipoPeriodoApuracao\":\"ME\",\"vedaValor\":true},\"opcionais\":{\"cno\":false,\"cnpjPrestador\":false,\"municipio\":true,\"observacao\":true,\"referencia\":true,\"uf\":true,\"valorJuros\":false,\"valorMulta\":false}},{\"obrigatorios\":{\"codigoReceita\":true,\"codigoReceitaExtensao\":true,\"cota\":false,\"dataConsolidacao\":true,\"dataPA\":true,\"referencia\":false,\"tipoPA\":true,\"valorImposto\":true,\"vencimento\":true},\"informacoes\":{\"calculado\":true,\"codigoBarras\":true,\"codigoReceitaExtensao\":2,\"criacao\":\"2006-07-01T00:00:00\",\"descricaoReceitaExtensao\":\"SIMPLES - PAGAMENTO ME-EPP\",\"descricaoReferencia\":\"SEM REFERÊNCIA\",\"exigeMatriz\":true,\"extincao\":\"2007-06-30T00:00:00\",\"manual\":false,\"pf\":false,\"pj\":false,\"tipoPeriodoApuracao\":\"ME\",\"vedaValor\":true},\"opcionais\":{\"cno\":false,\"cnpjPrestador\":false,\"municipio\":true,\"observacao\":true,\"referencia\":true,\"uf\":true,\"valorJuros\":false,\"valorMulta\":false}}]}}",
"mensagens":[{
"codigo":"[Sucesso-SICALC]",
"texto":"Requisição efetuada com sucesso."
}]
}
```

## JSON do campo "dados"

Nesse exemplo o JSON está formatado e sem os caracteres de escape. O exemplo completo é demonstrado acima.

```text
{
"dados":{
"receita":{
"codigoReceita":6106,
"descricaoReceita":"Simples - Pagamento de Micro Empresa e Empresa de Pequeno Porte",
"extensoes":[
{
"obrigatorios":{
"codigoReceita":true,
"codigoReceitaExtensao":true,
"cota":false,
"dataConsolidacao":true,
"dataPA":true,
"referencia":false,
"tipoPA":true,
"valorImposto":true,
"vencimento":false
},
"informacoes":{
"calculado":true,
"codigoBarras":true,
"codigoReceitaExtensao":1,
"criacao":"1997-01-01T00:00:00",
"descricaoReceitaExtensao":"SIMPLES - PAGAMENTO ME/EPP",
"descricaoReferencia":"SEM REFERÊNCIA",
"exigeMatriz":true,
"extincao":"2007-06-30T00:00:00",
"manual":false,
"pf":false,
"pj":false,
"tipoPeriodoApuracao":"ME",
"vedaValor":true
},
"opcionais":{
"cno":false,
"cnpjPrestador":false,
"municipio":true,
"observacao":true,
"referencia":true,
"uf":true,
"valorJuros":false,
"valorMulta":false
}
},
{
"obrigatorios":{
"codigoReceita":true,
"codigoReceitaExtensao":true,
"cota":false,
"dataConsolidacao":true,
"dataPA":true,
"referencia":false,
"tipoPA":true,
"valorImposto":true,
"vencimento":true
},
"informacoes":{
"calculado":true,
"codigoBarras":true,
"codigoReceitaExtensao":2,
"criacao":"2006-07-01T00:00:00",
"descricaoReceitaExtensao":"SIMPLES - PAGAMENTO ME-EPP",
"descricaoReferencia":"SEM REFERÊNCIA",
"exigeMatriz":true,
"extincao":"2007-06-30T00:00:00",
"manual":false,
"pf":false,
"pj":false,
"tipoPeriodoApuracao":"ME",
"vedaValor":true
},
"opcionais":{
"cno":false,
"cnpjPrestador":false,
"municipio":true,
"observacao":true,
"referencia":true,
"uf":true,
"valorJuros":false,
"valorMulta":false
}
}
]
}
}
}
```
