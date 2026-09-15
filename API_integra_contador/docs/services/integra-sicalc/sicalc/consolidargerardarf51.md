---
key: "SICALC.CONSOLIDARGERARDARF51"
family: "integra-sicalc"
systemId: "SICALC"
serviceId: "CONSOLIDARGERARDARF51"
version: "2.9"
operationPath: "Emitir"
sourceStatus: "fetched"
---

# Consolidar e emitir um Darf

Consolidar e Emitir um DARF em documento PDF

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `SICALC.CONSOLIDARGERARDARF51` |
| Família | `integra-sicalc` |
| Caminho físico | `POST /Emitir` |
| Versão | `2.9` |
| Situação oficial | 23/09/2022 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Não indicada |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada | uf | texto | Não | — | Unidade Federativa |
| Dados de Entrada | município | numérico | Não | — | Município de domicílio |
| Dados de Entrada | codigoReceita | numérico | Sim | — | Código da receita |
| Dados de Entrada | codigoReceitaExtensao | numérico | Sim | — | Código da extensão da receita |
| Dados de Entrada | numeroReferencia | numérico | Não | — | Número de referência utilizado no preenchimento do Darf |
| Dados de Entrada | tipoPA | texto | Não | — | Tipo do período de apuração |
| Dados de Entrada | dataPA | texto | Sim | — | Data do período de apuração |
| Dados de Entrada | vencimento | texto | Não | — | Data de vencimento do tributo |
| Dados de Entrada | cota | numérico | Não | — | Número da cota (para os débitos que possuem cotas) |
| Dados de Entrada | valorImposto | numérico | Sim | — | Valor do imposto |
| Dados de Entrada | valorMulta | numérico | Não | — | Valor da multa - Preenchido somente no caso de Darf manual |
| Dados de Entrada | valorJuros | numérico | Não | — | Valor dos juros - Preenchido somente no caso de Darf manual |
| Dados de Entrada | ganhoCapital | boolean | Não | — | Indicador de ganho de capital |
| Dados de Entrada | dataAlienacao | boolean | Não | — | Data da alienação referente ao ganho de capital |
| Dados de Entrada | dataConsolidacao | texto | Sim | — | Data da consolidação/arrecadação |
| Dados de Entrada | observacao | texto | Não | — | Texto adicionado ao Darf |
| Dados de Entrada | cno | numérico | Não | — | Número do cadastro nacional de obras |
| Dados de Entrada | cnpjPrestador | texto | Não | — | — |
| Dados de Entrada — Estrutura da resposta : | status | String | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Entrada — Estrutura da resposta : | mensagens | Array | — | — | Array de mensagens explicativas retornadas no acionamento do serviço. Cada mensagem contém os campos codigo (String) e texto (String). |
| Dados de Entrada — Estrutura da resposta : | dados | String | — | — | Estrutura de dados de retorno contendo os valores consolidados, PDF do Darf e número do documento. |
| Dados de Entrada — Objeto consolidado (dentro do campo dados ) : | valorPrincipalMoedaCorrente | texto | — | — | Valor principal atualizado |
| Dados de Entrada — Objeto consolidado (dentro do campo dados ) : | valorTotalConsolidado | texto | — | — | Valor total atualizado |
| Dados de Entrada — Objeto consolidado (dentro do campo dados ) : | valorMultaMora | texto | — | — | Valor de multa de mora calculada |
| Dados de Entrada — Objeto consolidado (dentro do campo dados ) : | percentualMultaMora | numérico | — | — | Percentual de multa de mora calculada |
| Dados de Entrada — Objeto consolidado (dentro do campo dados ) : | valorJuros | texto | — | — | Valor de juros calculada |
| Dados de Entrada — Objeto consolidado (dentro do campo dados ) : | percentualJuros | numérico | — | — | Percentual de juros calculado |
| Dados de Entrada — Objeto consolidado (dentro do campo dados ) : | termoInicialJuros | texto | — | — | Data em que começa a incidência de juros |
| Dados de Entrada — Objeto consolidado (dentro do campo dados ) : | dataArrecadacaoConsolidacao | texto | — | — | Data de consolidação do cálculo |
| Dados de Entrada — Objeto consolidado (dentro do campo dados ) : | dataValidadeCalculo | texto | — | — | Data limite em que o Darf pode ser pago na rede bancária |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Estrutura da resposta : | status | String | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Entrada — Estrutura da resposta : | mensagens | Array | — | — | Array de mensagens explicativas retornadas no acionamento do serviço. Cada mensagem contém os campos codigo (String) e texto (String). |
| Dados de Entrada — Estrutura da resposta : | dados | String | — | — | Estrutura de dados de retorno contendo os valores consolidados, PDF do Darf e número do documento. |

## Exemplos oficiais e normalizados

### Exemplo 1 — other

Fonte oficial:

```text
{
  "contratante": {
    "numero": "99999999999999",
    "tipo": "2"
  },
  "autorPedidoDados": {
    "numero": "99999999999",
    "tipo": "1"
  },
  "contribuinte": {
    "numero": "99999999999",
    "tipo": "1"
  },
  "pedidoDados": {
    "idSistema": "SICALC",
    "idServico": "CONSOLIDARGERARDARF51",
    "versaoSistema": "2.9",
    "dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\": \"0190\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"ME\", \"dataPA\": \"12/2017\", \"vencimento\": \"2018-01-31T00:00:00\", \"valorImposto\": \"1000.00\", \"dataConsolidacao\": \"2022-08-08T00:00:00\", \"observacao\": \"Darf calculado\"}"
  }
}
```

Forma normalizada:

```json
{
  "contratante": {
    "numero": "99999999999999",
    "tipo": "2"
  },
  "autorPedidoDados": {
    "numero": "99999999999",
    "tipo": "1"
  },
  "contribuinte": {
    "numero": "99999999999",
    "tipo": "1"
  },
  "pedidoDados": {
    "idSistema": "SICALC",
    "idServico": "CONSOLIDARGERARDARF51",
    "versaoSistema": "2.9",
    "dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\": \"0190\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"ME\", \"dataPA\": \"12/2017\", \"vencimento\": \"2018-01-31T00:00:00\", \"valorImposto\": \"1000.00\", \"dataConsolidacao\": \"2022-08-08T00:00:00\", \"observacao\": \"Darf calculado\"}"
  }
}
```

### Exemplo 2 — other

Fonte oficial:

```text
{
  "contratante": {
    "numero": "99999999999999",
    "tipo": "2"
  },
  "autorPedidoDados": {
    "numero": "99999999999999",
    "tipo": "2"
  },
  "contribuinte": {
    "numero": "99999999999999",
    "tipo": "2"
  },
  "pedidoDados": {
    "idSistema": "SICALC",
    "idServico": "CONSOLIDARGERARDARF51",
    "versaoSistema": "2.9",
    "dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\": \"0220\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"TR\", \"dataPA\": \"04/2021\", \"cota\": \"1\", \"valorImposto\": \"1000.00\", \"dataConsolidacao\": \"2022-08-08T00:00:00\", \"observacao\": \"Darf calculado\"}"
  }
}
```

Forma normalizada:

```json
{
  "contratante": {
    "numero": "99999999999999",
    "tipo": "2"
  },
  "autorPedidoDados": {
    "numero": "99999999999999",
    "tipo": "2"
  },
  "contribuinte": {
    "numero": "99999999999999",
    "tipo": "2"
  },
  "pedidoDados": {
    "idSistema": "SICALC",
    "idServico": "CONSOLIDARGERARDARF51",
    "versaoSistema": "2.9",
    "dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\": \"0220\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"TR\", \"dataPA\": \"04/2021\", \"cota\": \"1\", \"valorImposto\": \"1000.00\", \"dataConsolidacao\": \"2022-08-08T00:00:00\", \"observacao\": \"Darf calculado\"}"
  }
}
```

### Exemplo 3 — other

Fonte oficial:

```text
{
  "contratante": {
    "numero": "99999999999999",
    "tipo": "2"
  },
  "autorPedidoDados": {
    "numero": "99999999999999",
    "tipo": "2"
  },
  "contribuinte": {
    "numero": "99999999999999",
    "tipo": "2"
  },
  "pedidoDados": {
    "idSistema": "SICALC",
    "idServico": "CONSOLIDARGERARDARF51",
    "versaoSistema": "2.9",
    "dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\": \"1162\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"ME\", \"dataPA\": \"01/2022\", \"vencimento\": \"2022-02-18T00:00:00\", \"valorImposto\": \"1000.00\", \"dataConsolidacao\": \"2022-08-08T00:00:00\", \"observacao\": \"Darf calculado\"}"
  }
}
```

Forma normalizada:

```json
{
  "contratante": {
    "numero": "99999999999999",
    "tipo": "2"
  },
  "autorPedidoDados": {
    "numero": "99999999999999",
    "tipo": "2"
  },
  "contribuinte": {
    "numero": "99999999999999",
    "tipo": "2"
  },
  "pedidoDados": {
    "idSistema": "SICALC",
    "idServico": "CONSOLIDARGERARDARF51",
    "versaoSistema": "2.9",
    "dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\": \"1162\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"ME\", \"dataPA\": \"01/2022\", \"vencimento\": \"2022-02-18T00:00:00\", \"valorImposto\": \"1000.00\", \"dataConsolidacao\": \"2022-08-08T00:00:00\", \"observacao\": \"Darf calculado\"}"
  }
}
```

### Exemplo 4 — response

Fonte oficial:

```text
{
  "status": 200,
  "dados": "{\"consolidado\": {\"valorPrincipalMoedaCorrente\": 1000.00, \"valorTotalConsolidado\": 1250.00, \"valorMultaMora\": 150.00, \"percentualMultaMora\": 15.00, \"valorJuros\": 100.00, \"percentualJuros\": 10.00, \"termoInicialJuros\": \"2018-02-01T00:00:00\", \"dataArrecadacaoConsolidacao\": \"2022-08-08T00:00:00\", \"dataValidadeCalculo\": \"2022-08-09T00:00:00\"}, \"darf\": \"JVBERi0xLjQKJeLjz9MKMy...\", \"numeroDocumento\": \"22080812345678901234\"}",
  "mensagens": [
    {
      "codigo": "[Sucesso-SICALC]",
      "texto": "Requisição efetuada com sucesso."
    }
  ]
}
```

Forma normalizada:

```json
{
  "status": 200,
  "dados": "{\"consolidado\": {\"valorPrincipalMoedaCorrente\": 1000.00, \"valorTotalConsolidado\": 1250.00, \"valorMultaMora\": 150.00, \"percentualMultaMora\": 15.00, \"valorJuros\": 100.00, \"percentualJuros\": 10.00, \"termoInicialJuros\": \"2018-02-01T00:00:00\", \"dataArrecadacaoConsolidacao\": \"2022-08-08T00:00:00\", \"dataValidadeCalculo\": \"2022-08-09T00:00:00\"}, \"darf\": \"JVBERi0xLjQKJeLjz9MKMy...\", \"numeroDocumento\": \"22080812345678901234\"}",
  "mensagens": [
    {
      "codigo": "[Sucesso-SICALC]",
      "texto": "Requisição efetuada com sucesso."
    }
  ]
}
```

### Exemplo 5 — response

Fonte oficial:

```text
{
    "contratante": {
        "numero": "99999999999999",
        "tipo": 2
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
        "idSistema": "SICALC",
        "idServico": "CONSOLIDARGERARDARF51",
        "versaoSistema": "2.9",
        "dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\"\"0190\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"ME\"\"dataPA\": \"12/2017\", \"vencimento\": \"2018-01-31T00:00:00\"\"valorImposto\": \"1000.00\", \"dataConsolidacao\"\"2022-08-08T00:00:00\", \"observacao\": \"Darf calculado\"}"
    },
    "status": 200,
    "dados": \"consolidado\": \"{\"valorPrincipalMoedaCorrente\":1000.0\"valorTotalConsolidado\":1458.30,\"valorMultaMora\":200.0\"percentualMultaMora\":20.00,\"valorJuros\":258.30,\"percentualJuros\":283,\"termoInicialJuros\":\"2018-02-01T00:00:00\",\"dataArrecadacaoConsolidacao\":\"2022-08-08T00:00:00\",\"dataValidadeCalculo\":\"2022-08-31T00:00:00\"}, \"darf\": \"<dados do Darf no formato base64>"
}
```

### Exemplo 6 — response

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
        "idSistema": "SICALC",
        "idServico": "CONSOLIDARGERARDARF51",
        "versaoSistema": "2.9",
        "dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\":\"0220\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"TR\", \"dataPA\":\"04/2021\", \"cota\": \"1\", \"valorImposto\": \"1000.00\",\"dataConsolidacao\": \"2022-08-08T00:00:00\", \"observacao\": \"Darfcalculado\"}"
    },
    "status": 200,
    "dados": "{\"consolidado\": {\"valorPrincipalMoedaCorrente\":1000.00\"valorTotalConsolidado\":1266.00,\"valorMultaMora\":200.00\"percentualMultaMora\":20.00,\"valorJuros\":66.00,\"percentualJuros\":6.60\"termoInicialJuros\":\"2022-02-01T00:00:00\"\"dataArrecadacaoConsolidacao\":\"2022-08-08T00:00:00\"\"dataValidadeCalculo\":\"2022-08-31T00:00:00\"}, \"darf\": \"<dados do Darf noformato base64>\"}"
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
    "idSistema": "SICALC",
    "idServico": "CONSOLIDARGERARDARF51",
    "versaoSistema": "2.9",
    "dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\":\"0220\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"TR\", \"dataPA\":\"04/2021\", \"cota\": \"1\", \"valorImposto\": \"1000.00\",\"dataConsolidacao\": \"2022-08-08T00:00:00\", \"observacao\": \"Darfcalculado\"}"
  },
  "status": 200,
  "dados": "{\"consolidado\": {\"valorPrincipalMoedaCorrente\":1000.00\"valorTotalConsolidado\":1266.00,\"valorMultaMora\":200.00\"percentualMultaMora\":20.00,\"valorJuros\":66.00,\"percentualJuros\":6.60\"termoInicialJuros\":\"2022-02-01T00:00:00\"\"dataArrecadacaoConsolidacao\":\"2022-08-08T00:00:00\"\"dataValidadeCalculo\":\"2022-08-31T00:00:00\"}, \"darf\": \"<dados do Darf noformato base64>\"}"
}
```

### Exemplo 7 — response

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
       "idSistema": "SICALC",
       "idServico": "CONSOLIDARGERARDARF51",
       "versaoSistema": "2.9",
       "dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\": \"1162\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"ME\", \"dataPA\": \"01/2022\", \"vencimento\": \"2022-02-18T00:00:00\", \"valorImposto\": \"1000.00\", \"dataConsolidacao\": \"2022-08-08T00:00:00\", \"observacao\": \"Darf calculado\"}"
   },
   "status": 200,
   "dados": "{\"consolidado\": {\"valorPrincipalMoedaCorrente\":1000.00,\"valorTotalConsolidado\":1258.40,\"valorMultaMora\":200.00,\"percentualMultaMora\":20.00,\"valorJuros\":58.40,\"percentualJuros\":5.84,\"termoInicialJuros\":\"2022-03-01T00:00:00\",\"dataArrecadacaoConsolidacao\":\"2022-08-08T00:00:00\",\"dataValidadeCalculo\":\"2022-08-31T00:00:00\"}, \"darf\": \"<dados do Darf no formato base64>","numeroDocumento\":\"9999999999999999\"}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-sicalc/sicalc/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-sicalc/sicalc/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/dados_de_dominio/)

## Anomalias

- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_consolidar_emitir_um_darf_pf/))
- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_consolidar_emitir_um_darf_pj_qrcode/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/servicos/consolidar_emitir_um_darf/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_consolidar_emitir_um_darf_pf/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_consolidar_emitir_um_darf_pj/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_consolidar_emitir_um_darf_pj_qrcode/)

- Última atualização informada pela fonte: 24 de junho de 2026 13:59:00 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `d2449f3ad35ac52387c282912760f980c73c2bfa8d64d3df3254e1dc30cfad07`
