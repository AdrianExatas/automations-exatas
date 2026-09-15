---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_consultar_vinculos/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "358e5712bd2fcc2713c817e579783395aa5a944f7c9341d5ca433de6127c8fc8"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_consultar_vinculos/).

# Exemplo de Json de retorno

Exemplo de retorno da consulta de vínculos contabilistas.

## Json de retorno completo

```text
{
"contratante": {
"numero": "00000000000101",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000101",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000101",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PNRCONTADOR",
"idServico": "CONSVINCULOS261",
"versaoSistema": "1.0",
"dados": "{ \"pagination\": { \"size\": 5 } }"
},
"status": 200,
"mensagens": [
{
"codigo": "Sucesso-PNRCONTADOR",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"cnpjs\":[{\"cnpj\":\"99999999999999\\"tipoEstabelecimento\":\"Matriz\",\"situacaoCadastral\":{\"codigo\":\"02\\"descricao\":\"Ativa\"},\"uf\":\"BA\",\"codigoMunicipio\":\"3287\\"nomeMunicipio\":null},{\"cnpj\":\"99999999999999\\"tipoEstabelecimento\":\"Matriz\",\"situacaoCadastral\":{\"codigo\":\"02\\"descricao\":\"Ativa\"},\"uf\":\"AP\",\"codigoMunicipio\":\"0667\\"nomeMunicipio\":null},{\"cnpj\":\"99999999999999\\"tipoEstabelecimento\":\"Matriz\",\"situacaoCadastral\":{\"codigo\":\"02\\"descricao\":\"Ativa\"},\"uf\":\"AP\",\"codigoMunicipio\":\"0667\\"nomeMunicipio\":null},{\"cnpj\":\"99999999999999\\"tipoEstabelecimento\":\"Matriz\",\"situacaoCadastral\":{\"codigo\":\"02\\"descricao\":\"Ativa\"},\"uf\":\"AM\",\"codigoMunicipio\":\"0255\\"nomeMunicipio\":null},{\"cnpj\":\"99999999999999\\"tipoEstabelecimento\":\"Matriz\",\"situacaoCadastral\":{\"codigo\":\"02\\"descricao\":\"Ativa\"},\"uf\":\"AM\",\"codigoMunicipio\":\"0255\\"nomeMunicipio\":null}],\"totalInThePage\":5,\"totalInTheDatabase\":16\"lastCnpj\":\"99999999999999\"}"
}
```
