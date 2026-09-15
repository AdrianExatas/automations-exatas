---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/exemplos/retorno_consulta_pagamento/"
sourceUpdatedAt: "10 de abril de 2026 14:58:42 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "bf4095939609a8905694c7320cdc0de3f53fd0ee32affbc54cd1a47590f4cd59"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/exemplos/retorno_consulta_pagamento/).

# Exemplos

Aqui você encontra os JSON de resposta completo.

## Cenário de arrecadação via DARF.

Cenário: Consultar pagamentos de Documentos de Arrecadação de Receitas Federais (DARF).

```text
{
"contratante": {
"numero": "99999999999999",
"tipo": 2
},
"autorPedidoDados": {
"numero": "99999999999999",
"tipo": 2
},
"contribuinte": {
"numero": "99999999999999",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PAGTOWEB",
"idServico": "PAGAMENTOS71",
"versaoSistema": "1.0",
"dados": "{\"numeroDocumentoLista\":[\"9999999999\"],\"primeiroDaPagina\": 0,\"tamanhoDaPagina\": 100}"
},
"status": 200,
"dados": "[{\"numeroDocumento\":\"9999999999\",\"tipo\":{\"codigo\":\"4\",\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DE RECEITAS FEDERAIS\",\"descricaoAbreviada\":\"DARF\"},\"periodoApuracao\":\"2019-09-30T00:00:00-03:00\",\"dataArrecadacao\":\"2019-09-30T00:00:00-03:00\",\"dataVencimento\":\"2019-09-30T00:00:00-03:00\",\"receitaPrincipal\":{\"codigo\":\"481\",\"descricao\":\"IRRF - Juros e Comissões em Geral - Residentes no Exterior\",\"extensaoReceita\":null},\"referencia\":null,\"valorTotal\":369176.53,\"valorPrincipal\":369176.53,\"valorMulta\":null,\"valorJuros\":null,\"valorSaldoTotal\":null,\"valorSaldoPrincipal\":null,\"valorSaldoMulta\":null,\"valorSaldoJuros\":null,\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\":{\"codigo\":\"481\",\"descricao\":\"IRRF - Juros e Comissões em Geral - Residentes no Exterior\",\"extensaoReceita\":null},\"periodoApuracao\":\"2019-09-30T00:00:00-03:00\",\"dataVencimento\":\"2019-09-30T00:00:00-03:00\",\"valorTotal\":null,\"valorPrincipal\":null,\"valorMulta\":null,\"valorJuros\":null,\"valorSaldoTotal\":null,\"valorSaldoPrincipal\":null,\"valorSaldoMulta\":null,\"valorSaldoJuros\":null}]}]",
"mensagens": [
{
"codigo": "Sucesso-PAGTOWEB-00000",
"texto": "Requisição efetuada com sucesso."
}
]
}
```

### Json do campo "dados"

Nesse exemplo o json está formatado e sem o scaped string. O exemplo completo é demonstrado acima.

```text
{
"numeroDocumento": "9999999999",
"tipo": {
"codigo": "4",
"descricao": "DOCUMENTO DE ARRECADAÇÃO DE RECEITAS FEDERAIS",
"descricaoAbreviada": "DARF"
},
"periodoApuracao": "2019-09-30T00:00:00-03:00",
"dataArrecadacao": "2019-09-30T00:00:00-03:00",
"dataVencimento": "2019-09-30T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "481",
"descricao": "IRRF - Juros e Comissões em Geral - Residentes no Exterior",
"extensaoReceita": null
},
"referencia": null,
"valorTotal": 369176.53,
"valorPrincipal": 369176.53,
"valorMulta": null,
"valorJuros": null,
"valorSaldoTotal": null,
"valorSaldoPrincipal": null,
"valorSaldoMulta": null,
"valorSaldoJuros": null,
"desmembramentos": [{
"sequencial": "1",
"receitaPrincipal": {
"codigo": "481",
"descricao": "IRRF - Juros e Comissões em Geral - Residentes noExterior",
"extensaoReceita": null
},
"periodoApuracao": "2019-09-30T00:00:00-03:00",
"dataVencimento": "2019-09-30T00:00:00-03:00",
"valorTotal": null,
"valorPrincipal": null,
"valorMulta": null,
"valorJuros": null,
"valorSaldoTotal": null,
"valorSaldoPrincipal": null,
"valorSaldoMulta": null,
"valorSaldoJuros": null
}]
}
```

## Cenário de arrecadação via DAS, contribuinte MEI e outras arrecadações.

Cenário: Consultar pagamentos de com documentos do Tipo Documentos de Arrecadação do Simples Nacional (DAS/EI), DAS do Simples Nacional e DARF.

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
"numero": "11111111111111",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PAGTOWEB",
"idServico": "PAGAMENTOS71",
"versaoSistema": "1.0",
"dados": "{ \"intervaloDataArrecadacao\": {\"dataInicial\": \"2022-01-01\",\"dataFinal\": \"2022-12-31\"}, \"primeiroDaPagina\": 0\"tamanhoDaPagina\": 100}"
},
"status": 200,
"responseId": "674cb729-83b9-4a2d-860e-62c68c7e8933",
"responseDateTime": "2026-03-13T11:21:52.844Z",
"dados": "[{\"numeroDocumento\":\"7082207696788000\",\"tipo\":{\"codigo\":\"9\"\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL\"\"descricaoAbreviada\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL\"}\"periodoApuracao\":\"2022-03-01T00:00:00-03:00\"\"dataArrecadacao\":\"2022-04-20T00:00:00-03:00\"\"dataVencimento\":\"2022-04-20T00:00:00-03:00\",\"receitaPrincipal\"{\"codigo\":\"55\",\"descricao\":null,\"extensaoReceita\":null}\"referencia\":null,\"valorTotal\":66.6,\"valorPrincipal\":66.6\"valorMulta\":null,\"valorJuros\":null,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\"{\"codigo\":\"151\",\"descricao\":\"INSS - SImples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"1\",\"descricao\":\"INSS - SIMPLES NACIONAL -MEI\"}},\"periodoApuracao\":\"2022-03-01T00:00:00-03:00\"\"dataVencimento\":\"2022-04-20T00:00:00-03:00\",\"valorTotal\":60.6\"valorPrincipal\":60.6,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null},{\"sequencial\":\"2\",\"receitaPrincipal\":{\"codigo\":\"83\"\"descricao\":\"ICMS - Simples Nacional - MEI\",\"extensaoReceita\"{\"codigo\":\"1\",\"descricao\":\"ICMS - SIMPLES NACIONAL - MEI\"}}\"periodoApuracao\":\"2022-03-01T00:00:00-03:00\"\"dataVencimento\":\"2022-04-20T00:00:00-03:00\",\"valorTotal\":1\"valorPrincipal\":1,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null},{\"sequencial\":\"3\",\"receitaPrincipal\":{\"codigo\":\"125\"\"descricao\":\"ISS - Simples Nacional - MEI\",\"extensaoReceita\"{\"codigo\":\"1\",\"descricao\":\"ISS - SIMPLES NACIONAL - MEI\"}}\"periodoApuracao\":\"2022-03-01T00:00:00-03:00\"\"dataVencimento\":\"2022-04-20T00:00:00-03:00\",\"valorTotal\":5\"valorPrincipal\":5,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null}]},{\"numeroDocumento\":\"7082226956119000\",\"tipo\"{\"codigo\":\"9\",\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\",\"descricaoAbreviada\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\"},\"periodoApuracao\":\"2022-08-01T00:00:00-03:00\"\"dataArrecadacao\":\"2022-09-26T00:00:00-03:00\"\"dataVencimento\":\"2022-09-20T00:00:00-03:00\",\"receitaPrincipal\"{\"codigo\":\"55\",\"descricao\":null,\"extensaoReceita\":null}\"referencia\":null,\"valorTotal\":154.44,\"valorPrincipal\":151.44\"valorMulta\":3,\"valorJuros\":null,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\"{\"codigo\":\"151\",\"descricao\":\"INSS - SImples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"INSS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-08-01T00:00:00-03:00\"\"dataVencimento\":\"2022-09-20T00:00:00-03:00\",\"valorTotal\":148.32\"valorPrincipal\":145.44,\"valorMulta\":2.88,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"2\",\"receitaPrincipal\"{\"codigo\":\"83\",\"descricao\":\"ICMS - Simples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"ICMS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-08-01T00:00:00-03:00\"\"dataVencimento\":\"2022-09-20T00:00:00-03:00\",\"valorTotal\":1.02\"valorPrincipal\":1,\"valorMulta\":0.02,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null},{\"sequencial\":\"3\",\"receitaPrincipal\":{\"codigo\":\"125\"\"descricao\":\"ISS - Simples Nacional - MEI\",\"extensaoReceita\"{\"codigo\":\"11\",\"descricao\":\"ISS - SIMPLES NACIONAL - MEI -CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-08-01T00:00:00-03:00\"\"dataVencimento\":\"2022-09-20T00:00:00-03:00\",\"valorTotal\":5.1\"valorPrincipal\":5,\"valorMulta\":0.1,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null}]},{\"numeroDocumento\":\"7082221013370000\",\"tipo\"{\"codigo\":\"9\",\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\",\"descricaoAbreviada\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\"},\"periodoApuracao\":\"2022-06-01T00:00:00-03:00\"\"dataArrecadacao\":\"2022-07-29T00:00:00-03:00\"\"dataVencimento\":\"2022-07-20T00:00:00-03:00\",\"receitaPrincipal\"{\"codigo\":\"55\",\"descricao\":null,\"extensaoReceita\":null}\"referencia\":null,\"valorTotal\":155.94,\"valorPrincipal\":151.44\"valorMulta\":4.5,\"valorJuros\":null,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\"{\"codigo\":\"151\",\"descricao\":\"INSS - SImples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"INSS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-06-01T00:00:00-03:00\"\"dataVencimento\":\"2022-07-20T00:00:00-03:00\",\"valorTotal\":149.76\"valorPrincipal\":145.44,\"valorMulta\":4.32,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"2\",\"receitaPrincipal\"{\"codigo\":\"83\",\"descricao\":\"ICMS - Simples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"ICMS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-06-01T00:00:00-03:00\"\"dataVencimento\":\"2022-07-20T00:00:00-03:00\",\"valorTotal\":1.03\"valorPrincipal\":1,\"valorMulta\":0.03,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null},{\"sequencial\":\"3\",\"receitaPrincipal\":{\"codigo\":\"125\"\"descricao\":\"ISS - Simples Nacional - MEI\",\"extensaoReceita\"{\"codigo\":\"11\",\"descricao\":\"ISS - SIMPLES NACIONAL - MEI -CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-06-01T00:00:00-03:00\"\"dataVencimento\":\"2022-07-20T00:00:00-03:00\",\"valorTotal\":5.15\"valorPrincipal\":5,\"valorMulta\":0.15,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null}]},{\"numeroDocumento\":\"7082220904976000\",\"tipo\"{\"codigo\":\"9\",\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\",\"descricaoAbreviada\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\"},\"periodoApuracao\":\"2022-11-01T00:00:00-03:00\"\"dataArrecadacao\":\"2022-12-19T00:00:00-03:00\"\"dataVencimento\":\"2022-12-20T00:00:00-03:00\",\"receitaPrincipal\"{\"codigo\":\"55\",\"descricao\":null,\"extensaoReceita\":null}\"referencia\":null,\"valorTotal\":151.44,\"valorPrincipal\":151.44\"valorMulta\":null,\"valorJuros\":null,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\"{\"codigo\":\"151\",\"descricao\":\"INSS - SImples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"INSS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-11-01T00:00:00-03:00\"\"dataVencimento\":\"2022-12-20T00:00:00-03:00\",\"valorTotal\":145.44\"valorPrincipal\":145.44,\"valorMulta\":0,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"2\",\"receitaPrincipal\"{\"codigo\":\"83\",\"descricao\":\"ICMS - Simples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"ICMS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-11-01T00:00:00-03:00\"\"dataVencimento\":\"2022-12-20T00:00:00-03:00\",\"valorTotal\":1\"valorPrincipal\":1,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null},{\"sequencial\":\"3\",\"receitaPrincipal\":{\"codigo\":\"125\"\"descricao\":\"ISS - Simples Nacional - MEI\",\"extensaoReceita\"{\"codigo\":\"11\",\"descricao\":\"ISS - SIMPLES NACIONAL - MEI -CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-11-01T00:00:00-03:00\"\"dataVencimento\":\"2022-12-20T00:00:00-03:00\",\"valorTotal\":5\"valorPrincipal\":5,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null}]},{\"numeroDocumento\":\"7082220904976000\",\"tipo\"{\"codigo\":\"9\",\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\",\"descricaoAbreviada\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\"},\"periodoApuracao\":\"2022-10-01T00:00:00-03:00\"\"dataArrecadacao\":\"2022-11-21T00:00:00-03:00\"\"dataVencimento\":\"2022-11-21T00:00:00-03:00\",\"receitaPrincipal\"{\"codigo\":\"55\",\"descricao\":null,\"extensaoReceita\":null}\"referencia\":null,\"valorTotal\":151.44,\"valorPrincipal\":151.44\"valorMulta\":null,\"valorJuros\":null,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\"{\"codigo\":\"151\",\"descricao\":\"INSS - SImples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"INSS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-10-01T00:00:00-03:00\"\"dataVencimento\":\"2022-11-21T00:00:00-03:00\",\"valorTotal\":145.44\"valorPrincipal\":145.44,\"valorMulta\":0,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"2\",\"receitaPrincipal\"{\"codigo\":\"83\",\"descricao\":\"ICMS - Simples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"ICMS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-10-01T00:00:00-03:00\"\"dataVencimento\":\"2022-11-21T00:00:00-03:00\",\"valorTotal\":1\"valorPrincipal\":1,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null},{\"sequencial\":\"3\",\"receitaPrincipal\":{\"codigo\":\"125\"\"descricao\":\"ISS - Simples Nacional - MEI\",\"extensaoReceita\"{\"codigo\":\"11\",\"descricao\":\"ISS - SIMPLES NACIONAL - MEI -CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-10-01T00:00:00-03:00\"\"dataVencimento\":\"2022-11-21T00:00:00-03:00\",\"valorTotal\":5\"valorPrincipal\":5,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null}]},{\"numeroDocumento\":\"7082220904970000\",\"tipo\"{\"codigo\":\"9\",\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\",\"descricaoAbreviada\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\"},\"periodoApuracao\":\"2022-09-01T00:00:00-03:00\"\"dataArrecadacao\":\"2022-10-20T00:00:00-03:00\"\"dataVencimento\":\"2022-10-20T00:00:00-03:00\",\"receitaPrincipal\"{\"codigo\":\"55\",\"descricao\":null,\"extensaoReceita\":null}\"referencia\":null,\"valorTotal\":151.44,\"valorPrincipal\":151.44\"valorMulta\":null,\"valorJuros\":null,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\"{\"codigo\":\"151\",\"descricao\":\"INSS - SImples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"INSS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-09-01T00:00:00-03:00\"\"dataVencimento\":\"2022-10-20T00:00:00-03:00\",\"valorTotal\":145.44\"valorPrincipal\":145.44,\"valorMulta\":0,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"2\",\"receitaPrincipal\"{\"codigo\":\"83\",\"descricao\":\"ICMS - Simples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"ICMS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-09-01T00:00:00-03:00\"\"dataVencimento\":\"2022-10-20T00:00:00-03:00\",\"valorTotal\":1\"valorPrincipal\":1,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null},{\"sequencial\":\"3\",\"receitaPrincipal\":{\"codigo\":\"125\"\"descricao\":\"ISS - Simples Nacional - MEI\",\"extensaoReceita\"{\"codigo\":\"11\",\"descricao\":\"ISS - SIMPLES NACIONAL - MEI -CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-09-01T00:00:00-03:00\"\"dataVencimento\":\"2022-10-20T00:00:00-03:00\",\"valorTotal\":5\"valorPrincipal\":5,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null}]},{\"numeroDocumento\":\"7082220904900000\",\"tipo\"{\"codigo\":\"9\",\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\",\"descricaoAbreviada\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\"},\"periodoApuracao\":\"2022-07-01T00:00:00-03:00\"\"dataArrecadacao\":\"2022-08-22T00:00:00-03:00\"\"dataVencimento\":\"2022-08-22T00:00:00-03:00\",\"receitaPrincipal\"{\"codigo\":\"55\",\"descricao\":null,\"extensaoReceita\":null}\"referencia\":null,\"valorTotal\":151.44,\"valorPrincipal\":151.44\"valorMulta\":null,\"valorJuros\":null,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\"{\"codigo\":\"151\",\"descricao\":\"INSS - SImples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"INSS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-07-01T00:00:00-03:00\"\"dataVencimento\":\"2022-08-22T00:00:00-03:00\",\"valorTotal\":145.44\"valorPrincipal\":145.44,\"valorMulta\":0,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"2\",\"receitaPrincipal\"{\"codigo\":\"83\",\"descricao\":\"ICMS - Simples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"ICMS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-07-01T00:00:00-03:00\"\"dataVencimento\":\"2022-08-22T00:00:00-03:00\",\"valorTotal\":1\"valorPrincipal\":1,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null},{\"sequencial\":\"3\",\"receitaPrincipal\":{\"codigo\":\"125\"\"descricao\":\"ISS - Simples Nacional - MEI\",\"extensaoReceita\"{\"codigo\":\"11\",\"descricao\":\"ISS - SIMPLES NACIONAL - MEI -CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-07-01T00:00:00-03:00\"\"dataVencimento\":\"2022-08-22T00:00:00-03:00\",\"valorTotal\":5\"valorPrincipal\":5,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null}]},{\"numeroDocumento\":\"7082216654265000\",\"tipo\"{\"codigo\":\"9\",\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\",\"descricaoAbreviada\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\"},\"periodoApuracao\":\"2022-05-01T00:00:00-03:00\"\"dataArrecadacao\":\"2022-06-20T00:00:00-03:00\"\"dataVencimento\":\"2022-06-20T00:00:00-03:00\",\"receitaPrincipal\"{\"codigo\":\"55\",\"descricao\":null,\"extensaoReceita\":null}\"referencia\":null,\"valorTotal\":151.44,\"valorPrincipal\":151.44\"valorMulta\":null,\"valorJuros\":null,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\"{\"codigo\":\"151\",\"descricao\":\"INSS - SImples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"INSS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-05-01T00:00:00-03:00\"\"dataVencimento\":\"2022-06-20T00:00:00-03:00\",\"valorTotal\":145.44\"valorPrincipal\":145.44,\"valorMulta\":0,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"2\",\"receitaPrincipal\"{\"codigo\":\"83\",\"descricao\":\"ICMS - Simples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"ICMS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-05-01T00:00:00-03:00\"\"dataVencimento\":\"2022-06-20T00:00:00-03:00\",\"valorTotal\":1\"valorPrincipal\":1,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null},{\"sequencial\":\"3\",\"receitaPrincipal\":{\"codigo\":\"125\"\"descricao\":\"ISS - Simples Nacional - MEI\",\"extensaoReceita\"{\"codigo\":\"11\",\"descricao\":\"ISS - SIMPLES NACIONAL - MEI -CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-05-01T00:00:00-03:00\"\"dataVencimento\":\"2022-06-20T00:00:00-03:00\",\"valorTotal\":5\"valorPrincipal\":5,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null}]},{\"numeroDocumento\":\"7082213919932000\",\"tipo\"{\"codigo\":\"9\",\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\",\"descricaoAbreviada\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\"},\"periodoApuracao\":\"2022-04-01T00:00:00-03:00\"\"dataArrecadacao\":\"2022-05-20T00:00:00-03:00\"\"dataVencimento\":\"2022-05-20T00:00:00-03:00\",\"receitaPrincipal\"{\"codigo\":\"55\",\"descricao\":null,\"extensaoReceita\":null}\"referencia\":null,\"valorTotal\":151.44,\"valorPrincipal\":151.44\"valorMulta\":null,\"valorJuros\":null,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\"{\"codigo\":\"151\",\"descricao\":\"INSS - SImples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"INSS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-04-01T00:00:00-03:00\"\"dataVencimento\":\"2022-05-20T00:00:00-03:00\",\"valorTotal\":145.44\"valorPrincipal\":145.44,\"valorMulta\":0,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"2\",\"receitaPrincipal\"{\"codigo\":\"83\",\"descricao\":\"ICMS - Simples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"ICMS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-04-01T00:00:00-03:00\"\"dataVencimento\":\"2022-05-20T00:00:00-03:00\",\"valorTotal\":1\"valorPrincipal\":1,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null},{\"sequencial\":\"3\",\"receitaPrincipal\":{\"codigo\":\"125\"\"descricao\":\"ISS - Simples Nacional - MEI\",\"extensaoReceita\"{\"codigo\":\"11\",\"descricao\":\"ISS - SIMPLES NACIONAL - MEI -CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-04-01T00:00:00-03:00\"\"dataVencimento\":\"2022-05-20T00:00:00-03:00\",\"valorTotal\":5\"valorPrincipal\":5,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null}]},{\"numeroDocumento\":\"7162203158376000\",\"tipo\"{\"codigo\":\"4\",\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DE RECEITASFEDERAIS\",\"descricaoAbreviada\":\"DOCUMENTO DE ARRECADAÇÃO DE RECEITASFEDERAIS\"},\"periodoApuracao\":\"2022-01-01T00:00:00-03:00\"\"dataArrecadacao\":\"2022-02-18T00:00:00-03:00\"\"dataVencimento\":\"2022-02-18T00:00:00-03:00\",\"receitaPrincipal\"{\"codigo\":\"1410\",\"descricao\":null,\"extensaoReceita\":null}\"referencia\":null,\"valorTotal\":133.32,\"valorPrincipal\":133.32\"valorMulta\":null,\"valorJuros\":null,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\"{\"codigo\":\"1099\",\"descricao\":\"Contribuição Previdenciária descontada desegurados contribuintes individuais\",\"extensaoReceita\":{\"codigo\":\"1\"\"descricao\":\"CP SEGURADOS - CONTRIBUINTES INDIVIDUAIS - 11%\"}}\"periodoApuracao\":\"2022-01-01T00:00:00-03:00\"\"dataVencimento\":\"2022-02-18T00:00:00-03:00\",\"valorTotal\":133.32\"valorPrincipal\":133.32,\"valorMulta\":0,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null}]},{\"numeroDocumento\":\"7162200366296000\"\"tipo\":{\"codigo\":\"4\",\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DE RECEITASFEDERAIS\",\"descricaoAbreviada\":\"DOCUMENTO DE ARRECADAÇÃO DE RECEITASFEDERAIS\"},\"periodoApuracao\":\"2021-12-01T00:00:00-03:00\"\"dataArrecadacao\":\"2022-01-20T00:00:00-03:00\"\"dataVencimento\":\"2022-01-20T00:00:00-03:00\",\"receitaPrincipal\"{\"codigo\":\"1410\",\"descricao\":null,\"extensaoReceita\":null}\"referencia\":null,\"valorTotal\":121,\"valorPrincipal\":121\"valorMulta\":null,\"valorJuros\":null,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\"{\"codigo\":\"1099\",\"descricao\":\"Contribuição Previdenciária descontada desegurados contribuintes individuais\",\"extensaoReceita\":{\"codigo\":\"1\"\"descricao\":\"CP SEGURADOS - CONTRIBUINTES INDIVIDUAIS - 11%\"}}\"periodoApuracao\":\"2021-12-01T00:00:00-03:00\"\"dataVencimento\":\"2022-01-20T00:00:00-03:00\",\"valorTotal\":121\"valorPrincipal\":121,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null}]},{\"numeroDocumento\":\"7082212106300000\",\"tipo\"{\"codigo\":\"9\",\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\",\"descricaoAbreviada\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\"},\"periodoApuracao\":\"2022-01-01T00:00:00-03:00\"\"dataArrecadacao\":\"2022-05-30T00:00:00-03:00\"\"dataVencimento\":\"2022-02-21T00:00:00-03:00\",\"receitaPrincipal\"{\"codigo\":\"55\",\"descricao\":null,\"extensaoReceita\":null}\"referencia\":null,\"valorTotal\":81.76,\"valorPrincipal\":66.6\"valorMulta\":13.32,\"valorJuros\":1.84,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\"{\"codigo\":\"151\",\"descricao\":\"INSS - SImples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"1\",\"descricao\":\"INSS - SIMPLES NACIONAL -MEI\"}},\"periodoApuracao\":\"2022-01-01T00:00:00-03:00\"\"dataVencimento\":\"2022-02-21T00:00:00-03:00\",\"valorTotal\":74.39\"valorPrincipal\":60.6,\"valorMulta\":12.12,\"valorJuros\":1.67\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"2\",\"receitaPrincipal\"{\"codigo\":\"83\",\"descricao\":\"ICMS - Simples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"1\",\"descricao\":\"ICMS - SIMPLES NACIONAL -MEI\"}},\"periodoApuracao\":\"2022-01-01T00:00:00-03:00\"\"dataVencimento\":\"2022-02-21T00:00:00-03:00\",\"valorTotal\":1.23\"valorPrincipal\":1,\"valorMulta\":0.2,\"valorJuros\":0.03\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"3\",\"receitaPrincipal\"{\"codigo\":\"125\",\"descricao\":\"ISS - Simples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"1\",\"descricao\":\"ISS - SIMPLES NACIONAL -MEI\"}},\"periodoApuracao\":\"2022-01-01T00:00:00-03:00\"\"dataVencimento\":\"2022-02-21T00:00:00-03:00\",\"valorTotal\":6.14\"valorPrincipal\":5,\"valorMulta\":1,\"valorJuros\":0.14,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null}]},{\"numeroDocumento\":\"7202204961360000\",\"tipo\"{\"codigo\":\"9\",\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\",\"descricaoAbreviada\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\"},\"periodoApuracao\":\"2022-01-01T00:00:00-03:00\"\"dataArrecadacao\":\"2022-02-21T00:00:00-03:00\"\"dataVencimento\":\"2022-02-21T00:00:00-03:00\",\"receitaPrincipal\"{\"codigo\":\"3333\",\"descricao\":null,\"extensaoReceita\":null}\"referencia\":null,\"valorTotal\":340.35,\"valorPrincipal\":340.35\"valorMulta\":null,\"valorJuros\":null,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\"{\"codigo\":\"1001\",\"descricao\":\"IRPJ - Simples Nacional\"\"extensaoReceita\":null},\"periodoApuracao\":\"2022-01-01T00:00:00-03:00\"\"dataVencimento\":\"2022-02-21T00:00:00-03:00\",\"valorTotal\":16.14\"valorPrincipal\":16.14,\"valorMulta\":0,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"2\",\"receitaPrincipal\"{\"codigo\":\"1002\",\"descricao\":\"CSLL - Simples Nacional\"\"extensaoReceita\":null},\"periodoApuracao\":\"2022-01-01T00:00:00-03:00\"\"dataVencimento\":\"2022-02-21T00:00:00-03:00\",\"valorTotal\":14.12\"valorPrincipal\":14.12,\"valorMulta\":0,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"3\",\"receitaPrincipal\"{\"codigo\":\"1004\",\"descricao\":\"Cofins - Simples Nacional\"\"extensaoReceita\":null},\"periodoApuracao\":\"2022-01-01T00:00:00-03:00\"\"dataVencimento\":\"2022-02-21T00:00:00-03:00\",\"valorTotal\":51.74\"valorPrincipal\":51.74,\"valorMulta\":0,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"4\",\"receitaPrincipal\"{\"codigo\":\"1005\",\"descricao\":\"PIS - Simples Nacional\"\"extensaoReceita\":null},\"periodoApuracao\":\"2022-01-01T00:00:00-03:00\"\"dataVencimento\":\"2022-02-21T00:00:00-03:00\",\"valorTotal\":11.22\"valorPrincipal\":11.22,\"valorMulta\":0,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"5\",\"receitaPrincipal\"{\"codigo\":\"1006\",\"descricao\":\"INSS - Simples Nacional\"\"extensaoReceita\":null},\"periodoApuracao\":\"2022-01-01T00:00:00-03:00\"\"dataVencimento\":\"2022-02-21T00:00:00-03:00\",\"valorTotal\":175.15\"valorPrincipal\":175.15,\"valorMulta\":0,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"6\",\"receitaPrincipal\"{\"codigo\":\"1007\",\"descricao\":\"ICMS - Simples Nacional\"\"extensaoReceita\":null},\"periodoApuracao\":\"2022-01-01T00:00:00-03:00\"\"dataVencimento\":\"2022-02-21T00:00:00-03:00\",\"valorTotal\":71.98\"valorPrincipal\":71.98,\"valorMulta\":0,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null}]},{\"numeroDocumento\":\"7082207696700000\"\"tipo\":{\"codigo\":\"9\",\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\",\"descricaoAbreviada\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\"},\"periodoApuracao\":\"2022-02-01T00:00:00-03:00\"\"dataArrecadacao\":\"2022-03-21T00:00:00-03:00\"\"dataVencimento\":\"2022-03-21T00:00:00-03:00\",\"receitaPrincipal\"{\"codigo\":\"55\",\"descricao\":null,\"extensaoReceita\":null}\"referencia\":null,\"valorTotal\":66.6,\"valorPrincipal\":66.6\"valorMulta\":null,\"valorJuros\":null,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\"{\"codigo\":\"151\",\"descricao\":\"INSS - SImples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"1\",\"descricao\":\"INSS - SIMPLES NACIONAL -MEI\"}},\"periodoApuracao\":\"2022-02-01T00:00:00-03:00\"\"dataVencimento\":\"2022-03-21T00:00:00-03:00\",\"valorTotal\":60.6\"valorPrincipal\":60.6,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null},{\"sequencial\":\"2\",\"receitaPrincipal\":{\"codigo\":\"83\"\"descricao\":\"ICMS - Simples Nacional - MEI\",\"extensaoReceita\"{\"codigo\":\"1\",\"descricao\":\"ICMS - SIMPLES NACIONAL - MEI\"}}\"periodoApuracao\":\"2022-02-01T00:00:00-03:00\"\"dataVencimento\":\"2022-03-21T00:00:00-03:00\",\"valorTotal\":1\"valorPrincipal\":1,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null},{\"sequencial\":\"3\",\"receitaPrincipal\":{\"codigo\":\"125\"\"descricao\":\"ISS - Simples Nacional - MEI\",\"extensaoReceita\"{\"codigo\":\"1\",\"descricao\":\"ISS - SIMPLES NACIONAL - MEI\"}}\"periodoApuracao\":\"2022-02-01T00:00:00-03:00\"\"dataVencimento\":\"2022-03-21T00:00:00-03:00\",\"valorTotal\":5\"valorPrincipal\":5,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null}]},{\"numeroDocumento\":\"7202201891050000\",\"tipo\"{\"codigo\":\"9\",\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\",\"descricaoAbreviada\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\"},\"periodoApuracao\":\"2021-12-01T00:00:00-03:00\"\"dataArrecadacao\":\"2022-01-20T00:00:00-03:00\"\"dataVencimento\":\"2022-01-20T00:00:00-03:00\",\"receitaPrincipal\"{\"codigo\":\"3333\",\"descricao\":null,\"extensaoReceita\":null}\"referencia\":null,\"valorTotal\":687.14,\"valorPrincipal\":687.14\"valorMulta\":null,\"valorJuros\":null,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\"{\"codigo\":\"1001\",\"descricao\":\"IRPJ - Simples Nacional\"\"extensaoReceita\":null},\"periodoApuracao\":\"2021-12-01T00:00:00-03:00\"\"dataVencimento\":\"2022-01-20T00:00:00-03:00\",\"valorTotal\":32.37\"valorPrincipal\":32.37,\"valorMulta\":0,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"2\",\"receitaPrincipal\"{\"codigo\":\"1002\",\"descricao\":\"CSLL - Simples Nacional\"\"extensaoReceita\":null},\"periodoApuracao\":\"2021-12-01T00:00:00-03:00\"\"dataVencimento\":\"2022-01-20T00:00:00-03:00\",\"valorTotal\":28.32\"valorPrincipal\":28.32,\"valorMulta\":0,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"3\",\"receitaPrincipal\"{\"codigo\":\"1004\",\"descricao\":\"Cofins - Simples Nacional\"\"extensaoReceita\":null},\"periodoApuracao\":\"2021-12-01T00:00:00-03:00\"\"dataVencimento\":\"2022-01-20T00:00:00-03:00\",\"valorTotal\":103.73\"valorPrincipal\":103.73,\"valorMulta\":0,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"4\",\"receitaPrincipal\"{\"codigo\":\"1005\",\"descricao\":\"PIS - Simples Nacional\"\"extensaoReceita\":null},\"periodoApuracao\":\"2021-12-01T00:00:00-03:00\"\"dataVencimento\":\"2022-01-20T00:00:00-03:00\",\"valorTotal\":22.49\"valorPrincipal\":22.49,\"valorMulta\":0,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"5\",\"receitaPrincipal\"{\"codigo\":\"1006\",\"descricao\":\"INSS - Simples Nacional\"\"extensaoReceita\":null},\"periodoApuracao\":\"2021-12-01T00:00:00-03:00\"\"dataVencimento\":\"2022-01-20T00:00:00-03:00\",\"valorTotal\":351.16\"valorPrincipal\":351.16,\"valorMulta\":0,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"6\",\"receitaPrincipal\"{\"codigo\":\"1007\",\"descricao\":\"ICMS - Simples Nacional\"\"extensaoReceita\":null},\"periodoApuracao\":\"2021-12-01T00:00:00-03:00\"\"dataVencimento\":\"2022-01-20T00:00:00-03:00\",\"valorTotal\":149.07\"valorPrincipal\":149.07,\"valorMulta\":0,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null}]}]",
"mensagens": [
{
"codigo": "Sucesso-PAGTOWEB-00000",
"texto": "Requisição efetuada com sucesso."
}
]
}
```

### Json do campo "dados"

Nesse exemplo o json está formatado e sem o scaped string. O exemplo completo é demonstrado acima.

```text
[
{
"dataArrecadacao": "2022-04-20T00:00:00-03:00",
"dataVencimento": "2022-04-20T00:00:00-03:00",
"desmembramentos": [
{
"cib": null,
"dataVencimento": "2022-04-20T00:00:00-03:00",
"periodoApuracao": "2022-03-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "151",
"descricao": "INSS - SImples Nacional - MEI",
"extensaoReceita": {
"codigo": "1",
"descricao": "INSS - SIMPLES NACIONAL - MEI"
}
},
"sequencial": "1",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 60.6,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 60.6
},
{
"cib": null,
"dataVencimento": "2022-04-20T00:00:00-03:00",
"periodoApuracao": "2022-03-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "83",
"descricao": "ICMS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "1",
"descricao": "ICMS - SIMPLES NACIONAL - MEI"
}
},
"sequencial": "2",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 1,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 1
},
{
"cib": null,
"dataVencimento": "2022-04-20T00:00:00-03:00",
"periodoApuracao": "2022-03-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "125",
"descricao": "ISS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "1",
"descricao": "ISS - SIMPLES NACIONAL - MEI"
}
},
"sequencial": "3",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 5,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 5
}
],
"numeroDocumento": "7082207696788000",
"periodoApuracao": "2022-03-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "55",
"descricao": null,
"extensaoReceita": null
},
"referencia": null,
"tipo": {
"codigo": "9",
"descricao": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL",
"descricaoAbreviada": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL"
},
"valorJuros": null,
"valorMulta": null,
"valorPrincipal": 66.6,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 66.6
},
{
"dataArrecadacao": "2022-09-26T00:00:00-03:00",
"dataVencimento": "2022-09-20T00:00:00-03:00",
"desmembramentos": [
{
"cib": null,
"dataVencimento": "2022-09-20T00:00:00-03:00",
"periodoApuracao": "2022-08-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "151",
"descricao": "INSS - SImples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "INSS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "1",
"valorJuros": 0,
"valorMulta": 2.88,
"valorPrincipal": 145.44,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 148.32
},
{
"cib": null,
"dataVencimento": "2022-09-20T00:00:00-03:00",
"periodoApuracao": "2022-08-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "83",
"descricao": "ICMS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "ICMS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "2",
"valorJuros": 0,
"valorMulta": 0.02,
"valorPrincipal": 1,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 1.02
},
{
"cib": null,
"dataVencimento": "2022-09-20T00:00:00-03:00",
"periodoApuracao": "2022-08-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "125",
"descricao": "ISS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "ISS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "3",
"valorJuros": 0,
"valorMulta": 0.1,
"valorPrincipal": 5,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 5.1
}
],
"numeroDocumento": "7082226956119000",
"periodoApuracao": "2022-08-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "55",
"descricao": null,
"extensaoReceita": null
},
"referencia": null,
"tipo": {
"codigo": "9",
"descricao": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL",
"descricaoAbreviada": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL"
},
"valorJuros": null,
"valorMulta": 3,
"valorPrincipal": 151.44,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 154.44
},
{
"dataArrecadacao": "2022-07-29T00:00:00-03:00",
"dataVencimento": "2022-07-20T00:00:00-03:00",
"desmembramentos": [
{
"cib": null,
"dataVencimento": "2022-07-20T00:00:00-03:00",
"periodoApuracao": "2022-06-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "151",
"descricao": "INSS - SImples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "INSS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "1",
"valorJuros": 0,
"valorMulta": 4.32,
"valorPrincipal": 145.44,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 149.76
},
{
"cib": null,
"dataVencimento": "2022-07-20T00:00:00-03:00",
"periodoApuracao": "2022-06-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "83",
"descricao": "ICMS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "ICMS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "2",
"valorJuros": 0,
"valorMulta": 0.03,
"valorPrincipal": 1,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 1.03
},
{
"cib": null,
"dataVencimento": "2022-07-20T00:00:00-03:00",
"periodoApuracao": "2022-06-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "125",
"descricao": "ISS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "ISS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "3",
"valorJuros": 0,
"valorMulta": 0.15,
"valorPrincipal": 5,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 5.15
}
],
"numeroDocumento": "7082221013370000",
"periodoApuracao": "2022-06-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "55",
"descricao": null,
"extensaoReceita": null
},
"referencia": null,
"tipo": {
"codigo": "9",
"descricao": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL",
"descricaoAbreviada": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL"
},
"valorJuros": null,
"valorMulta": 4.5,
"valorPrincipal": 151.44,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 155.94
},
{
"dataArrecadacao": "2022-12-19T00:00:00-03:00",
"dataVencimento": "2022-12-20T00:00:00-03:00",
"desmembramentos": [
{
"cib": null,
"dataVencimento": "2022-12-20T00:00:00-03:00",
"periodoApuracao": "2022-11-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "151",
"descricao": "INSS - SImples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "INSS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "1",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 145.44,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 145.44
},
{
"cib": null,
"dataVencimento": "2022-12-20T00:00:00-03:00",
"periodoApuracao": "2022-11-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "83",
"descricao": "ICMS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "ICMS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "2",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 1,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 1
},
{
"cib": null,
"dataVencimento": "2022-12-20T00:00:00-03:00",
"periodoApuracao": "2022-11-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "125",
"descricao": "ISS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "ISS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "3",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 5,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 5
}
],
"numeroDocumento": "7082220904976000",
"periodoApuracao": "2022-11-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "55",
"descricao": null,
"extensaoReceita": null
},
"referencia": null,
"tipo": {
"codigo": "9",
"descricao": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL",
"descricaoAbreviada": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL"
},
"valorJuros": null,
"valorMulta": null,
"valorPrincipal": 151.44,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 151.44
},
{
"dataArrecadacao": "2022-11-21T00:00:00-03:00",
"dataVencimento": "2022-11-21T00:00:00-03:00",
"desmembramentos": [
{
"cib": null,
"dataVencimento": "2022-11-21T00:00:00-03:00",
"periodoApuracao": "2022-10-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "151",
"descricao": "INSS - SImples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "INSS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "1",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 145.44,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 145.44
},
{
"cib": null,
"dataVencimento": "2022-11-21T00:00:00-03:00",
"periodoApuracao": "2022-10-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "83",
"descricao": "ICMS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "ICMS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "2",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 1,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 1
},
{
"cib": null,
"dataVencimento": "2022-11-21T00:00:00-03:00",
"periodoApuracao": "2022-10-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "125",
"descricao": "ISS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "ISS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "3",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 5,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 5
}
],
"numeroDocumento": "7082220904976000",
"periodoApuracao": "2022-10-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "55",
"descricao": null,
"extensaoReceita": null
},
"referencia": null,
"tipo": {
"codigo": "9",
"descricao": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL",
"descricaoAbreviada": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL"
},
"valorJuros": null,
"valorMulta": null,
"valorPrincipal": 151.44,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 151.44
},
{
"dataArrecadacao": "2022-10-20T00:00:00-03:00",
"dataVencimento": "2022-10-20T00:00:00-03:00",
"desmembramentos": [
{
"cib": null,
"dataVencimento": "2022-10-20T00:00:00-03:00",
"periodoApuracao": "2022-09-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "151",
"descricao": "INSS - SImples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "INSS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "1",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 145.44,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 145.44
},
{
"cib": null,
"dataVencimento": "2022-10-20T00:00:00-03:00",
"periodoApuracao": "2022-09-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "83",
"descricao": "ICMS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "ICMS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "2",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 1,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 1
},
{
"cib": null,
"dataVencimento": "2022-10-20T00:00:00-03:00",
"periodoApuracao": "2022-09-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "125",
"descricao": "ISS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "ISS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "3",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 5,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 5
}
],
"numeroDocumento": "7082220904970000",
"periodoApuracao": "2022-09-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "55",
"descricao": null,
"extensaoReceita": null
},
"referencia": null,
"tipo": {
"codigo": "9",
"descricao": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL",
"descricaoAbreviada": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL"
},
"valorJuros": null,
"valorMulta": null,
"valorPrincipal": 151.44,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 151.44
},
{
"dataArrecadacao": "2022-08-22T00:00:00-03:00",
"dataVencimento": "2022-08-22T00:00:00-03:00",
"desmembramentos": [
{
"cib": null,
"dataVencimento": "2022-08-22T00:00:00-03:00",
"periodoApuracao": "2022-07-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "151",
"descricao": "INSS - SImples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "INSS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "1",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 145.44,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 145.44
},
{
"cib": null,
"dataVencimento": "2022-08-22T00:00:00-03:00",
"periodoApuracao": "2022-07-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "83",
"descricao": "ICMS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "ICMS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "2",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 1,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 1
},
{
"cib": null,
"dataVencimento": "2022-08-22T00:00:00-03:00",
"periodoApuracao": "2022-07-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "125",
"descricao": "ISS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "ISS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "3",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 5,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 5
}
],
"numeroDocumento": "7082220904900000",
"periodoApuracao": "2022-07-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "55",
"descricao": null,
"extensaoReceita": null
},
"referencia": null,
"tipo": {
"codigo": "9",
"descricao": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL",
"descricaoAbreviada": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL"
},
"valorJuros": null,
"valorMulta": null,
"valorPrincipal": 151.44,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 151.44
},
{
"dataArrecadacao": "2022-06-20T00:00:00-03:00",
"dataVencimento": "2022-06-20T00:00:00-03:00",
"desmembramentos": [
{
"cib": null,
"dataVencimento": "2022-06-20T00:00:00-03:00",
"periodoApuracao": "2022-05-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "151",
"descricao": "INSS - SImples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "INSS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "1",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 145.44,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 145.44
},
{
"cib": null,
"dataVencimento": "2022-06-20T00:00:00-03:00",
"periodoApuracao": "2022-05-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "83",
"descricao": "ICMS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "ICMS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "2",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 1,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 1
},
{
"cib": null,
"dataVencimento": "2022-06-20T00:00:00-03:00",
"periodoApuracao": "2022-05-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "125",
"descricao": "ISS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "ISS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "3",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 5,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 5
}
],
"numeroDocumento": "7082216654265000",
"periodoApuracao": "2022-05-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "55",
"descricao": null,
"extensaoReceita": null
},
"referencia": null,
"tipo": {
"codigo": "9",
"descricao": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL",
"descricaoAbreviada": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL"
},
"valorJuros": null,
"valorMulta": null,
"valorPrincipal": 151.44,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 151.44
},
{
"dataArrecadacao": "2022-05-20T00:00:00-03:00",
"dataVencimento": "2022-05-20T00:00:00-03:00",
"desmembramentos": [
{
"cib": null,
"dataVencimento": "2022-05-20T00:00:00-03:00",
"periodoApuracao": "2022-04-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "151",
"descricao": "INSS - SImples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "INSS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "1",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 145.44,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 145.44
},
{
"cib": null,
"dataVencimento": "2022-05-20T00:00:00-03:00",
"periodoApuracao": "2022-04-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "83",
"descricao": "ICMS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "ICMS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "2",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 1,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 1
},
{
"cib": null,
"dataVencimento": "2022-05-20T00:00:00-03:00",
"periodoApuracao": "2022-04-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "125",
"descricao": "ISS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "11",
"descricao": "ISS - SIMPLES NACIONAL - MEI - CAMINHONEIRO"
}
},
"sequencial": "3",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 5,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 5
}
],
"numeroDocumento": "7082213919932000",
"periodoApuracao": "2022-04-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "55",
"descricao": null,
"extensaoReceita": null
},
"referencia": null,
"tipo": {
"codigo": "9",
"descricao": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL",
"descricaoAbreviada": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL"
},
"valorJuros": null,
"valorMulta": null,
"valorPrincipal": 151.44,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 151.44
},
{
"dataArrecadacao": "2022-02-18T00:00:00-03:00",
"dataVencimento": "2022-02-18T00:00:00-03:00",
"desmembramentos": [
{
"cib": null,
"dataVencimento": "2022-02-18T00:00:00-03:00",
"periodoApuracao": "2022-01-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "1099",
"descricao": "Contribuição Previdenciária descontada desegurados contribuintes individuais",
"extensaoReceita": {
"codigo": "1",
"descricao": "CP SEGURADOS - CONTRIBUINTES INDIVIDUAIS -11%"
}
},
"sequencial": "1",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 133.32,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 133.32
}
],
"numeroDocumento": "7162203158376000",
"periodoApuracao": "2022-01-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "1410",
"descricao": null,
"extensaoReceita": null
},
"referencia": null,
"tipo": {
"codigo": "4",
"descricao": "DOCUMENTO DE ARRECADAÇÃO DE RECEITAS FEDERAIS",
"descricaoAbreviada": "DOCUMENTO DE ARRECADAÇÃO DE RECEITAS FEDERAIS"
},
"valorJuros": null,
"valorMulta": null,
"valorPrincipal": 133.32,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 133.32
},
{
"dataArrecadacao": "2022-01-20T00:00:00-03:00",
"dataVencimento": "2022-01-20T00:00:00-03:00",
"desmembramentos": [
{
"cib": null,
"dataVencimento": "2022-01-20T00:00:00-03:00",
"periodoApuracao": "2021-12-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "1099",
"descricao": "Contribuição Previdenciária descontada desegurados contribuintes individuais",
"extensaoReceita": {
"codigo": "1",
"descricao": "CP SEGURADOS - CONTRIBUINTES INDIVIDUAIS -11%"
}
},
"sequencial": "1",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 121,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 121
}
],
"numeroDocumento": "7162200366296000",
"periodoApuracao": "2021-12-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "1410",
"descricao": null,
"extensaoReceita": null
},
"referencia": null,
"tipo": {
"codigo": "4",
"descricao": "DOCUMENTO DE ARRECADAÇÃO DE RECEITAS FEDERAIS",
"descricaoAbreviada": "DOCUMENTO DE ARRECADAÇÃO DE RECEITAS FEDERAIS"
},
"valorJuros": null,
"valorMulta": null,
"valorPrincipal": 121,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 121
},
{
"dataArrecadacao": "2022-05-30T00:00:00-03:00",
"dataVencimento": "2022-02-21T00:00:00-03:00",
"desmembramentos": [
{
"cib": null,
"dataVencimento": "2022-02-21T00:00:00-03:00",
"periodoApuracao": "2022-01-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "151",
"descricao": "INSS - SImples Nacional - MEI",
"extensaoReceita": {
"codigo": "1",
"descricao": "INSS - SIMPLES NACIONAL - MEI"
}
},
"sequencial": "1",
"valorJuros": 1.67,
"valorMulta": 12.12,
"valorPrincipal": 60.6,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 74.39
},
{
"cib": null,
"dataVencimento": "2022-02-21T00:00:00-03:00",
"periodoApuracao": "2022-01-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "83",
"descricao": "ICMS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "1",
"descricao": "ICMS - SIMPLES NACIONAL - MEI"
}
},
"sequencial": "2",
"valorJuros": 0.03,
"valorMulta": 0.2,
"valorPrincipal": 1,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 1.23
},
{
"cib": null,
"dataVencimento": "2022-02-21T00:00:00-03:00",
"periodoApuracao": "2022-01-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "125",
"descricao": "ISS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "1",
"descricao": "ISS - SIMPLES NACIONAL - MEI"
}
},
"sequencial": "3",
"valorJuros": 0.14,
"valorMulta": 1,
"valorPrincipal": 5,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 6.14
}
],
"numeroDocumento": "7082212106300000",
"periodoApuracao": "2022-01-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "55",
"descricao": null,
"extensaoReceita": null
},
"referencia": null,
"tipo": {
"codigo": "9",
"descricao": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL",
"descricaoAbreviada": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL"
},
"valorJuros": 1.84,
"valorMulta": 13.32,
"valorPrincipal": 66.6,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 81.76
},
{
"dataArrecadacao": "2022-02-21T00:00:00-03:00",
"dataVencimento": "2022-02-21T00:00:00-03:00",
"desmembramentos": [
{
"cib": null,
"dataVencimento": "2022-02-21T00:00:00-03:00",
"periodoApuracao": "2022-01-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "1001",
"descricao": "IRPJ - Simples Nacional",
"extensaoReceita": null
},
"sequencial": "1",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 16.14,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 16.14
},
{
"cib": null,
"dataVencimento": "2022-02-21T00:00:00-03:00",
"periodoApuracao": "2022-01-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "1002",
"descricao": "CSLL - Simples Nacional",
"extensaoReceita": null
},
"sequencial": "2",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 14.12,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 14.12
},
{
"cib": null,
"dataVencimento": "2022-02-21T00:00:00-03:00",
"periodoApuracao": "2022-01-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "1004",
"descricao": "Cofins - Simples Nacional",
"extensaoReceita": null
},
"sequencial": "3",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 51.74,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 51.74
},
{
"cib": null,
"dataVencimento": "2022-02-21T00:00:00-03:00",
"periodoApuracao": "2022-01-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "1005",
"descricao": "PIS - Simples Nacional",
"extensaoReceita": null
},
"sequencial": "4",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 11.22,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 11.22
},
{
"cib": null,
"dataVencimento": "2022-02-21T00:00:00-03:00",
"periodoApuracao": "2022-01-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "1006",
"descricao": "INSS - Simples Nacional",
"extensaoReceita": null
},
"sequencial": "5",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 175.15,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 175.15
},
{
"cib": null,
"dataVencimento": "2022-02-21T00:00:00-03:00",
"periodoApuracao": "2022-01-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "1007",
"descricao": "ICMS - Simples Nacional",
"extensaoReceita": null
},
"sequencial": "6",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 71.98,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 71.98
}
],
"numeroDocumento": "7202204961360000",
"periodoApuracao": "2022-01-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "3333",
"descricao": null,
"extensaoReceita": null
},
"referencia": null,
"tipo": {
"codigo": "9",
"descricao": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL",
"descricaoAbreviada": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL"
},
"valorJuros": null,
"valorMulta": null,
"valorPrincipal": 340.35,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 340.35
},
{
"dataArrecadacao": "2022-03-21T00:00:00-03:00",
"dataVencimento": "2022-03-21T00:00:00-03:00",
"desmembramentos": [
{
"cib": null,
"dataVencimento": "2022-03-21T00:00:00-03:00",
"periodoApuracao": "2022-02-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "151",
"descricao": "INSS - SImples Nacional - MEI",
"extensaoReceita": {
"codigo": "1",
"descricao": "INSS - SIMPLES NACIONAL - MEI"
}
},
"sequencial": "1",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 60.6,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 60.6
},
{
"cib": null,
"dataVencimento": "2022-03-21T00:00:00-03:00",
"periodoApuracao": "2022-02-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "83",
"descricao": "ICMS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "1",
"descricao": "ICMS - SIMPLES NACIONAL - MEI"
}
},
"sequencial": "2",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 1,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 1
},
{
"cib": null,
"dataVencimento": "2022-03-21T00:00:00-03:00",
"periodoApuracao": "2022-02-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "125",
"descricao": "ISS - Simples Nacional - MEI",
"extensaoReceita": {
"codigo": "1",
"descricao": "ISS - SIMPLES NACIONAL - MEI"
}
},
"sequencial": "3",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 5,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 5
}
],
"numeroDocumento": "7082207696700000",
"periodoApuracao": "2022-02-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "55",
"descricao": null,
"extensaoReceita": null
},
"referencia": null,
"tipo": {
"codigo": "9",
"descricao": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL",
"descricaoAbreviada": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL"
},
"valorJuros": null,
"valorMulta": null,
"valorPrincipal": 66.6,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 66.6
},
{
"dataArrecadacao": "2022-01-20T00:00:00-03:00",
"dataVencimento": "2022-01-20T00:00:00-03:00",
"desmembramentos": [
{
"cib": null,
"dataVencimento": "2022-01-20T00:00:00-03:00",
"periodoApuracao": "2021-12-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "1001",
"descricao": "IRPJ - Simples Nacional",
"extensaoReceita": null
},
"sequencial": "1",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 32.37,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 32.37
},
{
"cib": null,
"dataVencimento": "2022-01-20T00:00:00-03:00",
"periodoApuracao": "2021-12-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "1002",
"descricao": "CSLL - Simples Nacional",
"extensaoReceita": null
},
"sequencial": "2",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 28.32,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 28.32
},
{
"cib": null,
"dataVencimento": "2022-01-20T00:00:00-03:00",
"periodoApuracao": "2021-12-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "1004",
"descricao": "Cofins - Simples Nacional",
"extensaoReceita": null
},
"sequencial": "3",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 103.73,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 103.73
},
{
"cib": null,
"dataVencimento": "2022-01-20T00:00:00-03:00",
"periodoApuracao": "2021-12-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "1005",
"descricao": "PIS - Simples Nacional",
"extensaoReceita": null
},
"sequencial": "4",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 22.49,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 22.49
},
{
"cib": null,
"dataVencimento": "2022-01-20T00:00:00-03:00",
"periodoApuracao": "2021-12-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "1006",
"descricao": "INSS - Simples Nacional",
"extensaoReceita": null
},
"sequencial": "5",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 351.16,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 351.16
},
{
"cib": null,
"dataVencimento": "2022-01-20T00:00:00-03:00",
"periodoApuracao": "2021-12-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "1007",
"descricao": "ICMS - Simples Nacional",
"extensaoReceita": null
},
"sequencial": "6",
"valorJuros": 0,
"valorMulta": 0,
"valorPrincipal": 149.07,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 149.07
}
],
"numeroDocumento": "7202201891050000",
"periodoApuracao": "2021-12-01T00:00:00-03:00",
"receitaPrincipal": {
"codigo": "3333",
"descricao": null,
"extensaoReceita": null
},
"referencia": null,
"tipo": {
"codigo": "9",
"descricao": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL",
"descricaoAbreviada": "DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL"
},
"valorJuros": null,
"valorMulta": null,
"valorPrincipal": 687.14,
"valorSaldoJuros": 0,
"valorSaldoMulta": 0,
"valorSaldoPrincipal": 0,
"valorSaldoTotal": 0,
"valorTotal": 687.14
}
]
```
