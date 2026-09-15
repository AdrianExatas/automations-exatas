---
key: "PAGTOWEB.PAGAMENTOS71"
family: "integra-pagamento"
systemId: "PAGTOWEB"
serviceId: "PAGAMENTOS71"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consulta Pagamento

Consulta Pagamentos

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PAGTOWEB.PAGAMENTOS71` |
| Família | `integra-pagamento` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 23/09/2022 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00004) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto IntervaloData: | dataInicial | String | NÃO | — | Formato AAAA-MM-DD |
| Dados de Entrada — Objeto IntervaloData: | dataFinal | String | NÃO | — | Formato AAAA-MM-DD |
| Dados de Entrada — Objeto IntervaloValor: | valorInicial | Number | NÃO | — | Número com o valor inicial |
| Dados de Entrada — Objeto IntervaloValor: | valorFinal | Number | NÃO | — | Número com o valor final |
| Dados de Entrada — Objeto ParametroEmissaoComprovanteIC: | numeroDocumento | String (até 17 bytes) | NÃO | — | Número do documento. |
| Dados de Entrada — Objeto ParametroConsultaDocumentoIC: | numeroDocumentoLista | Array | NÃO | — | Lista com números de documentos, cada número tem até 17 posições. |
| Dados de Entrada — Objeto ParametroConsultaDocumentoIC: | codigoReceitaLista | Array | NÃO | — | Lista com códigos de receita. Tamanho máx. do código: 4. |
| Dados de Entrada — Objeto ParametroConsultaDocumentoIC: | intervaloDataArrecadacao | IntervaloData | NÃO | — | Intervalo de data de arrecadação a ser pesquisado. A data de arrecadação é a data contábil da efetivação do pagamento. |
| Dados de Entrada — Objeto ParametroConsultaDocumentoIC: | intervaloValorTotalDocumento | IntervaloValor | NÃO | — | Intervalo de valor total a ser pesquisado. |
| Dados de Entrada — Objeto ParametroConsultaDocumentoIC: | codigoTipoDocumentoLista | Array | NÃO | — | Tipos de documento que serão retornados. Numérico. Tamanho máx. do código: 2 |
| Dados de Entrada — Objeto ParametroConsultaDocumentoIC: | tamanhoDaPagina | Number | SIM | — | Tamanho máx.: 100 |
| Dados de Entrada — Objeto ParametroConsultaDocumentoIC: | primeiroDaPagina | Number | SIM | — | Começa em 0 |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é uma string de tamanho 5 que representa um código interno do negócio. |
| Dados de Saída | dados | String escapada Object : DocumentoArrecadacaoIC ) | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto: ExtensaoReceita | codigo | String | — | — | Código da extensão de receita |
| Dados de Saída — Objeto: ExtensaoReceita | descricao | String | — | — | Descrição da extensão de receita |
| Dados de Saída — Objeto: Receita | codigo | String | — | — | Código da receita |
| Dados de Saída — Objeto: Receita | descricao | String | — | — | Descrição da receita |
| Dados de Saída — Objeto: Receita | extensaoReceita | ExtensaoReceita | — | — | Extensão do código de receita que identifica datas de vencimentos ou aliquotas de um tributo dentro de um mesmo código de receita |
| Dados de Saída — Objeto: TipoDocumento | codigo | String | — | — | Código do tipo de documento |
| Dados de Saída — Objeto: TipoDocumento | descricao | String | — | — | Descrição do tipo de documento |
| Dados de Saída — Objeto: TipoDocumento | descricaoAbreviada | String | — | — | Descrição abreviada do tipo de documento |
| Dados de Saída — Objeto: DesmembramentoIC | sequencial | String | — | — | Sequencial do desmembramento |
| Dados de Saída — Objeto: DesmembramentoIC | receitaPrincipal | Receita | — | — | Receita principal |
| Dados de Saída — Objeto: DesmembramentoIC | periodoApuracao | String | — | — | Período de apuração do débito/tributo do desmembramento (Formato: AAAA-MM-DDTHH:MI:SSZ Exemplo: "2019-01-01T00:00:00-03:00") |
| Dados de Saída — Objeto: DesmembramentoIC | dataVencimento | String | — | — | Período de vencimento do desmembramento (Formato: AAAA-MM-DDTHH:MI:SSZ Exemplo: "2019-01-01T00:00:00-03:00") |
| Dados de Saída — Objeto: DesmembramentoIC | valorTotal | Number | — | — | Valor total do desmembramento |
| Dados de Saída — Objeto: DesmembramentoIC | valorPrincipal | Number | — | — | Valor principal do desmembramento |
| Dados de Saída — Objeto: DesmembramentoIC | valorMulta | Number | — | — | Valor multa do desmembramento |
| Dados de Saída — Objeto: DesmembramentoIC | valorJuros | Number | — | — | Valor juros do desmembramento |
| Dados de Saída — Objeto: DesmembramentoIC | valorSaldoTotal | Number | — | — | Saldo total do desmembramento |
| Dados de Saída — Objeto: DesmembramentoIC | valorSaldoPrincipal | Number | — | — | Saldo principal do desmembramento |
| Dados de Saída — Objeto: DesmembramentoIC | valorSaldoMulta | Number | — | — | Saldo multa do desmembramento |
| Dados de Saída — Objeto: DesmembramentoIC | valorSaldoJuros | Number | — | — | Saldo juros do desmembramento |
| Dados de Saída — Objeto: DesmembramentoIC | cib | String | — | — | Cadastro Imobiliário Brasileiro |
| Dados de Saída — Objeto: DocumentoArrecadacaoIC | numeroDocumento | String | — | — | Número do documento de arrecadação |
| Dados de Saída — Objeto: DocumentoArrecadacaoIC | tipo | TipoDocumento | — | — | Tipo do documento de arrecadação (DARF, DAS, DAE, DJE) |
| Dados de Saída — Objeto: DocumentoArrecadacaoIC | periodoApuracao | String | — | — | Período de apuração do débito/tributo do pagamento (Formato: AAAA-MM-DDTHH:MI:SSZ Exemplo: "2019-01-01T00:00:00-03:00") |
| Dados de Saída — Objeto: DocumentoArrecadacaoIC | dataArrecadacao | String | — | — | Data contábil da efetivação do pagamento (Formato: AAAA-MM-DDTHH:MI:SSZ Exemplo: "2019-01-01T00:00:00-03:00") |
| Dados de Saída — Objeto: DocumentoArrecadacaoIC | dataVencimento | String | — | — | Data de vencimento do pagamento (Formato: AAAA-MM-DDTHH:MI:SSZ Exemplo: "2019-01-01T00:00:00-03:00") |
| Dados de Saída — Objeto: DocumentoArrecadacaoIC | receitaPrincipal | Receita | — | — | Receita principal do pagamento |
| Dados de Saída — Objeto: DocumentoArrecadacaoIC | referencia | String | — | — | Número de referência do pagamento |
| Dados de Saída — Objeto: DocumentoArrecadacaoIC | valorTotal | Number | — | — | Valor total do pagamento |
| Dados de Saída — Objeto: DocumentoArrecadacaoIC | valorPrincipal | Number | — | — | Valor principal do pagamento |
| Dados de Saída — Objeto: DocumentoArrecadacaoIC | valorMulta | Number | — | — | Valor multa do pagamento |
| Dados de Saída — Objeto: DocumentoArrecadacaoIC | valorJuros | Number | — | — | Valor juros do pagamento |
| Dados de Saída — Objeto: DocumentoArrecadacaoIC | valorSaldoTotal | Number | — | — | Saldo total do pagamento |
| Dados de Saída — Objeto: DocumentoArrecadacaoIC | valorSaldoPrincipal | Number | — | — | Saldo principal do pagamento |
| Dados de Saída — Objeto: DocumentoArrecadacaoIC | valorSaldoMulta | Number | — | — | Saldo multa do pagamento |
| Dados de Saída — Objeto: DocumentoArrecadacaoIC | valorSaldoJuros | Number | — | — | Saldo juros do pagamento |
| Dados de Saída — Objeto: DocumentoArrecadacaoIC | desmembramentos | Array Object: DesmembramentoIC | — | — | Contém informações referentes a composição de um documento de arrecadação |

## Exemplos oficiais e normalizados

### Exemplo 1 — other

Fonte oficial:

```text
{
    "contratante": {
        "numero": "99999999999",
        "tipo": 1
    },
    "autorPedidoDados": {
        "numero": "99999999999",
        "tipo": 1
    },
    "contribuinte": {
        "numero": "99999999999",
        "tipo": 1
    },
    "pedidoDados": {
        "idSistema": "PAGTOWEB",
        "idServico": "PAGAMENTOS71",
        "dados": "{ \"intervaloDataArrecadacao\": {\"dataInicial\"\"2019-09-01\", \"dataFinal\": \"2019-11-30\"}, \"primeiroDaPagina\": \"tamanhoDaPagina\": 100}"
    }
}
```

### Exemplo 2 — other

Fonte oficial:

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
        "dados": "{\"codigoReceitaLista\": [\"9999\", \"9999\"]\"primeiroDaPagina\": 0,\"tamanhoDaPagina\": 100}"
    }
}
```

### Exemplo 3 — other

Fonte oficial:

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
        "dados": "{ \"intervaloDataArrecadacao\": {\"dataInicial\"\"2022-01-01\", \"dataFinal\": \"2022-01-31\"}\"intervaloValorTotalDocumento\": {\"valorInicial\": 600\"valorFinal\": 13000}, \"primeiroDaPagina\": 0,\"tamanhoDaPagina\": 10"
    }
}
```

### Exemplo 4 — other

Fonte oficial:

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

Forma normalizada:

```json
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

### Exemplo 5 — other

Fonte oficial:

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

Forma normalizada:

```json
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
  "desmembramentos": [
    {
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
    }
  ]
}
```

### Exemplo 6 — other

Fonte oficial:

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
    "dados": "[{\"numeroDocumento\":\"7082207696788000\",\"tipo\":{\"codigo\":\"9\"\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL\"\"descricaoAbreviada\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL\"}\"periodoApuracao\":\"2022-03-01T00:00:00-03:00\"\"dataArrecadacao\":\"2022-04-20T00:00:00-03:00\"\"dataVencimento\":\"2022-04-20T00:00:00-03:00\",\"receitaPrincipal\"{\"codigo\":\"55\",\"descricao\":null,\"extensaoReceita\":null}\"referencia\":null,\"valorTotal\":66.6,\"valorPrincipal\":66.6\"valorMulta\":null,\"valorJuros\":null,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\"{\"codigo\":\"151\",\"descricao\":\"INSS - SImples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"1\",\"descricao\":\"INSS - SIMPLES NACIONAL -MEI\"}},\"periodoApuracao\":\"2022-03-01T00:00:00-03:00\"\"dataVencimento\":\"2022-04-20T00:00:00-03:00\",\"valorTotal\":60.6\"valorPrincipal\":60.6,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null},{\"sequencial\":\"2\",\"receitaPrincipal\":{\"codigo\":\"83\"\"descricao\":\"ICMS - Simples Nacional - MEI\",\"extensaoReceita\"{\"codigo\":\"1\",\"descricao\":\"ICMS - SIMPLES NACIONAL - MEI\"}}\"periodoApuracao\":\"2022-03-01T00:00:00-03:00\"\"dataVencimento\":\"2022-04-20T00:00:00-03:00\",\"valorTotal\":1\"valorPrincipal\":1,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null},{\"sequencial\":\"3\",\"receitaPrincipal\":{\"codigo\":\"125\"\"descricao\":\"ISS - Simples Nacional - MEI\",\"extensaoReceita\"{\"codigo\":\"1\",\"descricao\":\"ISS - SIMPLES NACIONAL - MEI\"}}\"periodoApuracao\":\"2022-03-01T00:00:00-03:00\"\"dataVencimento\":\"2022-04-20T00:00:00-03:00\",\"valorTotal\":5\"valorPrincipal\":5,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null}]},{\"numeroDocumento\":\"7082226956119000\",\"tipo\"{\"codigo\":\"9\",\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\",\"descricaoAbreviada\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\"},\"periodoApuracao\":\"2022-08-01T00:00:00-03:00\"\"dataArrecadacao\":\"2022-09-26T00:00:00-03:00\"\"dataVencimento\":\"2022-09-20T00:00:00-03:00\",\"receitaPrincipal\"{\"codigo\":\"55\",\"descricao\":null,\"extensaoReceita\":null}\"referencia\":null,\"valorTotal\":154.44,\"valorPrincipal\":151.44\"valorMulta\":3,\"valorJuros\":null,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\"{\"codigo\":\"151\",\"descricao\":\"INSS - SImples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"INSS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-08-01T00:00:00-03:00\"\"dataVencimento\":\"2022-09-20T00:00:00-03:00\",\"valorTotal\":148.32\"valorPrincipal\":145.44,\"valorMulta\":2.88,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"2\",\"receitaPrincipal\"{\"codigo\":\"83\",\"descricao\":\"ICMS - Simples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"ICMS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-08-01T00:00:00-03:00\"\"dataVencimento\":\"2022-09-20T00:00:00-03:00\",\"valorTotal\":1.02\"valorPrincipal\":1,\"valorMulta\":0.02,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null},{\"sequencial\":\"3\",\"receitaPrincipal\":{\"codigo\":\"125\"\"descricao\":\"ISS - Simples Nacional - MEI\",\"extensaoReceita\"{\"codigo\":\"11\",\"descricao\":\"ISS - SIMPLES NACIONAL - MEI -CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-08-01T00:00:00-03:00\"\"dataVencimento\":\"2022-09-20T00:00:00-03:00\",\"valorTotal\":5.1\"valorPrincipal\":5,\"valorMulta\":0.1,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null}]},{\"numeroDocumento\":\"7082221013370000\",\"tipo\"{\"codigo\":\"9\",\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\",\"descricaoAbreviada\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\"},\"periodoApuracao\":\"2022-06-01T00:00:00-03:00\"\"dataArrecadacao\":\"2022-07-29T00:00:00-03:00\"\"dataVencimento\":\"2022-07-20T00:00:00-03:00\",\"receitaPrincipal\"{\"codigo\":\"55\",\"descricao\":null,\"extensaoReceita\":null}\"referencia\":null,\"valorTotal\":155.94,\"valorPrincipal\":151.44\"valorMulta\":4.5,\"valorJuros\":null,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\"{\"codigo\":\"151\",\"descricao\":\"INSS - SImples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"INSS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-06-01T00:00:00-03:00\"\"dataVencimento\":\"2022-07-20T00:00:00-03:00\",\"valorTotal\":149.76\"valorPrincipal\":145.44,\"valorMulta\":4.32,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"2\",\"receitaPrincipal\"{\"codigo\":\"83\",\"descricao\":\"ICMS - Simples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"ICMS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-06-01T00:00:00-03:00\"\"dataVencimento\":\"2022-07-20T00:00:00-03:00\",\"valorTotal\":1.03\"valorPrincipal\":1,\"valorMulta\":0.03,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null},{\"sequencial\":\"3\",\"receitaPrincipal\":{\"codigo\":\"125\"\"descricao\":\"ISS - Simples Nacional - MEI\",\"extensaoReceita\"{\"codigo\":\"11\",\"descricao\":\"ISS - SIMPLES NACIONAL - MEI -CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-06-01T00:00:00-03:00\"\"dataVencimento\":\"2022-07-20T00:00:00-03:00\",\"valorTotal\":5.15\"valorPrincipal\":5,\"valorMulta\":0.15,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null}]},{\"numeroDocumento\":\"7082220904976000\",\"tipo\"{\"codigo\":\"9\",\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\",\"descricaoAbreviada\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\"},\"periodoApuracao\":\"2022-11-01T00:00:00-03:00\"\"dataArrecadacao\":\"2022-12-19T00:00:00-03:00\"\"dataVencimento\":\"2022-12-20T00:00:00-03:00\",\"receitaPrincipal\"{\"codigo\":\"55\",\"descricao\":null,\"extensaoReceita\":null}\"referencia\":null,\"valorTotal\":151.44,\"valorPrincipal\":151.44\"valorMulta\":null,\"valorJuros\":null,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\"{\"codigo\":\"151\",\"descricao\":\"INSS - SImples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"INSS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-11-01T00:00:00-03:00\"\"dataVencimento\":\"2022-12-20T00:00:00-03:00\",\"valorTotal\":145.44\"valorPrincipal\":145.44,\"valorMulta\":0,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"2\",\"receitaPrincipal\"{\"codigo\":\"83\",\"descricao\":\"ICMS - Simples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"ICMS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-11-01T00:00:00-03:00\"\"dataVencimento\":\"2022-12-20T00:00:00-03:00\",\"valorTotal\":1\"valorPrincipal\":1,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null},{\"sequencial\":\"3\",\"receitaPrincipal\":{\"codigo\":\"125\"\"descricao\":\"ISS - Simples Nacional - MEI\",\"extensaoReceita\"{\"codigo\":\"11\",\"descricao\":\"ISS - SIMPLES NACIONAL - MEI -CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-11-01T00:00:00-03:00\"\"dataVencimento\":\"2022-12-20T00:00:00-03:00\",\"valorTotal\":5\"valorPrincipal\":5,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null}]},{\"numeroDocumento\":\"7082220904976000\",\"tipo\"{\"codigo\":\"9\",\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\",\"descricaoAbreviada\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\"},\"periodoApuracao\":\"2022-10-01T00:00:00-03:00\"\"dataArrecadacao\":\"2022-11-21T00:00:00-03:00\"\"dataVencimento\":\"2022-11-21T00:00:00-03:00\",\"receitaPrincipal\"{\"codigo\":\"55\",\"descricao\":null,\"extensaoReceita\":null}\"referencia\":null,\"valorTotal\":151.44,\"valorPrincipal\":151.44\"valorMulta\":null,\"valorJuros\":null,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\"{\"codigo\":\"151\",\"descricao\":\"INSS - SImples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"INSS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-10-01T00:00:00-03:00\"\"dataVencimento\":\"2022-11-21T00:00:00-03:00\",\"valorTotal\":145.44\"valorPrincipal\":145.44,\"valorMulta\":0,\"valorJuros\":0\"valorSaldoTotal\":0,\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0\"valorSaldoJuros\":0,\"cib\":null},{\"sequencial\":\"2\",\"receitaPrincipal\"{\"codigo\":\"83\",\"descricao\":\"ICMS - Simples Nacional - MEI\"\"extensaoReceita\":{\"codigo\":\"11\",\"descricao\":\"ICMS - SIMPLES NACIONAL- MEI - CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-10-01T00:00:00-03:00\"\"dataVencimento\":\"2022-11-21T00:00:00-03:00\",\"valorTotal\":1\"valorPrincipal\":1,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null},{\"sequencial\":\"3\",\"receitaPrincipal\":{\"codigo\":\"125\"\"descricao\":\"ISS - Simples Nacional - MEI\",\"extensaoReceita\"{\"codigo\":\"11\",\"descricao\":\"ISS - SIMPLES NACIONAL - MEI -CAMINHONEIRO\"}},\"periodoApuracao\":\"2022-10-01T00:00:00-03:00\"\"dataVencimento\":\"2022-11-21T00:00:00-03:00\",\"valorTotal\":5\"valorPrincipal\":5,\"valorMulta\":0,\"valorJuros\":0,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"cib\":null}]},{\"numeroDocumento\":\"7082220904970000\",\"tipo\"{\"codigo\":\"9\",\"descricao\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\",\"descricaoAbreviada\":\"DOCUMENTO DE ARRECADAÇÃO DO SIMPLESNACIONAL\"},\"periodoApuracao\":\"2022-09-01T00:00:00-03:00\"\"dataArrecadacao\":\"2022-10-20T00:00:00-03:00\"\"dataVencimento\":\"2022-10-20T00:00:00-03:00\",\"receitaPrincipal\"{\"codigo\":\"55\",\"descricao\":null,\"extensaoReceita\":null}\"referencia\":null,\"valorTotal\":151.44,\"valorPrincipal\":151.44\"valorMulta\":null,\"valorJuros\":null,\"valorSaldoTotal\":0\"valorSaldoPrincipal\":0,\"valorSaldoMulta\":0,\"valorSaldoJuros\":0\"desmembramentos\":[{\"sequencial\":\"1\",\"receitaPrincipal\"{\"codigo\":\"151\",\"descricao\":\"INSS - SImples Nacional - MEI\"\"extensao
<EXEMPLO_TRUNCADO_TAMANHO_ORIGINAL_32610>
```

### Exemplo 7 — other

Fonte oficial:

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
       
<EXEMPLO_TRUNCADO_TAMANHO_ORIGINAL_51976>
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-pagamento/pagtoweb/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-pagamento/pagtoweb/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/dados_de_dominio/)

## Anomalias

- **warning / official-pedido-dados-invalid-json:** O envelope oficial é JSON válido, mas o JSON escapado em pedidoDados.dados é inválido. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/servicos/consulta_pagamento/))
- **info / official-example-truncated-for-ai:** O exemplo extenso foi limitado no catálogo; a página normalizada e a fonte oficial preservam o contexto completo. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/exemplos/retorno_consulta_pagamento/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/servicos/consulta_pagamento/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/exemplos/retorno_consulta_pagamento/)

- Última atualização informada pela fonte: 10 de abril de 2026 14:58:42 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `19660bb3c20224e638a3f8d57f9d3138ba96bd81c209020064b760a4b451fa2f`
