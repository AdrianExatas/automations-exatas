---
key: "PGDASD.CONSDECLARACAO13"
family: "integra-sn"
systemId: "PGDASD"
serviceId: "CONSDECLARACAO13"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar Declarações Transmitidas por Ano-Calendário ou Período de Apuração

Consultar Declarações transmitidas

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PGDASD.CONSDECLARACAO13` |
| Família | `integra-sn` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 23/09/2022 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00146) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto Dados: | anoCalendario | String (4) | SIM | — | Ano-calendário da declaração. Quando for utilizado o ano-calendário no parâmetro da realização da consulta. |
| Dados de Entrada — Objeto Dados: | periodoApuracao | String (6) | SIM | — | Período da apuração mensal. Quando for utilizado o periodo da apuração no parâmetro da realização da consulta. |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto de tamanho 5 que representa um código interno do negócio. |
| Dados de Saída | dados | String | — | — | Estrutura de dados de retorno, contendo uma lista em SCAPED Texto JSON com o objeto DeclaracoesEntregues. |
| Dados de Saída — Objeto: DeclaracoesEntregues | anoCalendario | Number | — | — | Ano-calendário. |
| Dados de Saída — Objeto: DeclaracoesEntregues | periodos | Array de Object Periodo | — | — | Contém uma lista de declarações em um determinado período de apuração (PA). Quando for utilizado o ano-calendário no parâmetro da realização da consulta. |
| Dados de Saída — Objeto: DeclaracoesEntregues | periodo | Object | — | — | Contém apenas um período de apuração (PA). Quando for utilizado o periodo da apuração no parâmetro da realização da consulta. |
| Dados de Saída — Objeto Periodo: | periodoApuracao | Number | — | — | Período da apuração, formato AAAAMM. |
| Dados de Saída — Objeto Periodo: | operacoes | Array de Object Operacao | — | — | Lista todas as operações realizadas no período de apuração. |
| Dados de Saída — Objeto Operacao: | tipoOperacao | String (30) | — | — | Tipo da operação realizada: (Declaração Original; Declaração Retificadora; Geração de DAS; DAS Avulso, DAS Medida Judicial ou DAS Cobrança). |
| Dados de Saída — Objeto Operacao: | indiceDeclaracao | Object | — | — | Estrutura de dados da declaração.Objeto: IndiceDeclaracao indiceDas Estrutura de dados do DAS. |
| Dados de Saída — Objeto IndiceDeclaracao: | numeroDeclaracao | String (17) | — | — | Identificador único da declaração transmitida. |
| Dados de Saída — Objeto IndiceDeclaracao: | dataHoraTransmissao | Number | — | — | Data e hora da entrega à RFB. Formato yyyyMMddHHmmss. |
| Dados de Saída — Objeto IndiceDeclaracao: | malha | String (30) | — | — | Situação da malha quando aplicável: (Retida em Malha; Liberada, Intimada ou Rejeitada). A situação Liberada contempla 3 situações diferentes, liberada sem análise, liberada por alteração de parâmetros e aceita. Quando não está em Malha o campo retorna null. |
| Dados de Saída — Objeto IndiceDas: | numeroDas | String (17) | — | — | Número do DAS (Documento de Arrecadação do Simples Nacional). |
| Dados de Saída — Objeto IndiceDas: | dataHoraEmissaoDas | Number | — | — | Data e hora da emissão do DAS. Formato yyyyMMddHHmmss. |
| Dados de Saída — Objeto IndiceDas: | dasPago | Boolean | — | — | Informa se houve ou não pagamento do DAS até o momento da consulta. Pago (true) e não consta pagamento até o momento (false). |

## Exemplos oficiais e normalizados

### Exemplo 1 — request

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
    "numero": "00000000000000",
    "tipo": 2
  },         
  "pedidoDados": {
    "idSistema": "PGDASD",
    "idServico": "CONSDECLARACAO13",
    "versaoSistema": "1.0",
    "dados": "{ \"anoCalendario\": \"2018\" }"
  }
}
```

Forma normalizada:

```json
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
    "idSistema": "PGDASD",
    "idServico": "CONSDECLARACAO13",
    "versaoSistema": "1.0",
    "dados": "{ \"anoCalendario\": \"2018\" }"
  }
}
```

### Exemplo 2 — request

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
    "numero": "00000000000000",
    "tipo": 2
  },          
  "pedidoDados": {
    "idSistema": "PGDASD",
    "idServico": "CONSDECLARACAO13",
    "versaoSistema": "1.0",
    "dados": "{ \"periodoApuracao\": \"201801\" }"
  }
}
```

Forma normalizada:

```json
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
    "idSistema": "PGDASD",
    "idServico": "CONSDECLARACAO13",
    "versaoSistema": "1.0",
    "dados": "{ \"periodoApuracao\": \"201801\" }"
  }
}
```

### Exemplo 3 — response

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
        "numero": "00000000000000",
        "tipo": 2
    },
    "pedidoDados": {
        "idSistema": "PGDASD",
        "idServico": "CONSDECLARACAO13",
        "versaoSistema": "1.0",
        "dados": "{ \"anoCalendario\": \"2018\" }"
    },
    "status": 200,
    "dados": "{\"anoCalendario\":2018,\"periodos\":[{\"periodoApuracao\":20180\"operacoes\":[{\"tipoOperacao\":\"Original\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201801001\\"dataHoraTransmissao\":\"20220331032512\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Geração de DAS\\"indiceDeclaracao\":null,\"indiceDas\":{\"numeroDas\":\"07202215764027873\\"datahoraEmissaoDas\":\"20220606033456\",\"dasPago\":false}}]{\"periodoApuracao\":201802,\"operacoes\":[{\"tipoOperacao\":\"Original\\"indiceDeclaracao\":{\"numeroDeclaracao\":\"00000000201802001\\"dataHoraTransmissao\":\"20220331032533\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201802002\\"dataHoraTransmissao\":\"20220606033046\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Geração de DAS\\"indiceDeclaracao\":null,\"indiceDas\":{\"numeroDas\":\"07202215964030940\\"datahoraEmissaoDas\":\"20220608111510\",\"dasPago\":false}{\"tipoOperacao\":\"Geração de DAS\",\"indiceDeclaracao\":null,\"indiceDas\{\"numeroDas\":\"07202215964031106\\"datahoraEmissaoDas\":\"20220608112922\",\"dasPago\":false}}]{\"periodoApuracao\":201803,\"operacoes\":[{\"tipoOperacao\":\"Original\\"indiceDeclaracao\":{\"numeroDeclaracao\":\"00000000201803001\\"dataHoraTransmissao\":\"20220331032551\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201803002\\"dataHoraTransmissao\":\"20220606033107\",\"malha\":\"\"\"indiceDas\":null}]},{\"periodoApuracao\":201804,\"operacoes\[{\"tipoOperacao\":\"Original\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201804001\\"dataHoraTransmissao\":\"20220331032613\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201804002\\"dataHoraTransmissao\":\"20220606033124\",\"malha\":\"\"\"indiceDas\":null}]},{\"periodoApuracao\":201805,\"operacoes\[{\"tipoOperacao\":\"Original\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201805001\\"dataHoraTransmissao\":\"20220331033215\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201805002\\"dataHoraTransmissao\":\"20220606033145\",\"malha\":\"\"\"indiceDas\":null}]},{\"periodoApuracao\":201806,\"operacoes\[{\"tipoOperacao\":\"Original\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201806001\\"dataHoraTransmissao\":\"20220331033333\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201806002\\"dataHoraTransmissao\":\"20220606033206\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Geração de DAS\\"indiceDeclaracao\":null,\"indiceDas\":{\"numeroDas\":\"07202215964032307\\"datahoraEmissaoDas\":\"20220608020457\",\"dasPago\":false}}]{\"periodoApuracao\":201807,\"operacoes\":[{\"tipoOperacao\":\"Original\\"indiceDeclaracao\":{\"numeroDeclaracao\":\"00000000201807001\\"dataHoraTransmissao\":\"20220331033354\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201807002\\"dataHoraTransmissao\":\"20220606033230\",\"malha\":\"\"\"indiceDas\":null}]},{\"periodoApuracao\":201808,\"operacoes\[{\"tipoOperacao\":\"Original\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201808001\\"dataHoraTransmissao\":\"20220331033413\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201808002\\"dataHoraTransmissao\":\"20220606033248\",\"malha\":\"\"\"indiceDas\":null}]},{\"periodoApuracao\":201809,\"operacoes\[{\"tipoOperacao\":\"Original\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201809001\\"dataHoraTransmissao\":\"20220331033430\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201809002\\"dataHoraTransmissao\":\"20220606033305\",\"malha\":\"\"\"indiceDas\":null}]},{\"periodoApuracao\":201810,\"operacoes\[{\"tipoOperacao\":\"Original\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201810001\\"dataHoraTransmissao\":\"20220331033444\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201810002\\"dataHoraTransmissao\":\"20220606033329\",\"malha\":\"\"\"indiceDas\":null}]},{\"periodoApuracao\":201811,\"operacoes\[{\"tipoOperacao\":\"Original\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201811001\\"dataHoraTransmissao\":\"20220331033458\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201811002\\"dataHoraTransmissao\":\"20220606033349\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Geração de DAS\\"indiceDeclaracao\":null,\"indiceDas\":{\"numeroDas\":\"07202215964032170\\"datahoraEmissaoDas\":\"20220608020204\",\"dasPago\":false}}]{\"periodoApuracao\":201812,\"operacoes\":[{\"tipoOperacao\":\"Original\\"indiceDeclaracao\":{\"numeroDeclaracao\":\"00000000201812001\\"dataHoraTransmissao\":\"20220331033515\",\"malha\":\"\"\"indiceDas\":null},{\"tipoOperacao\":\"Retificadora\",\"indiceDeclaracao\{\"numeroDeclaracao\":\"00000000201812002\\"dataHoraTransmissao\":\"20220606033407\",\"malha\":\"\"\"indiceDas\":null}]}],\"mensagens\":null}",
    "mensagens": [
        {
            "codigo": "Sucesso-PGDASD",
            "texto": "Requisição efetuada com sucesso."
        }
    ]
}
```

### Exemplo 4 — other

Fonte oficial:

```text
{
 "anocalendario": 2018,
 "periodos": [{
  "periodoApuracao": 201801,
  "operacoes": [{
   "tipoOperacao": "Original",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201801001",
    "dataHoraTransmissao": "20220331032512",
    "malha": ""
   },
   "indiceDas": null
  }, {
   "tipoOperacao": "Geração de DAS",
   "indiceDeclaracao": null,
   "indiceDas": {
    "numeroDas": "07202219799007800",
    "datahoraEmissaoDas": "20220606033456",
    "dasPago": false
   }
  }]
 }, {
  "periodoApuracao": 201802,
  "operacoes": [{
   "tipoOperacao": "Original",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201802001",
    "dataHoraTransmissao": "20220331032533",
    "malha": ""
   },
   "indiceDas": null
  }, {
   "tipoOperacao": "Retificadora",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201802002",
    "dataHoraTransmissao": "20220606033046",
    "malha": ""
   },
   "indiceDas": null
  }, {
   "tipoOperacao": "Geração de DAS",
   "indiceDeclaracao": null,
   "indiceDas": {
    "numeroDas": "07202215999990940",
    "datahoraEmissaoDas": "20220608111510",
    "dasPago": false
   }
  }, {
   "tipoOperacao": "Geração de DAS",
   "indiceDeclaracao": null,
   "indiceDas": {
    "numeroDas": "07202215999991106",
    "datahoraEmissaoDas": "20220608112922",
    "dasPago": false
   }
  }]
 }, {
  "periodoApuracao": 201803,
  "operacoes": [{
   "tipoOperacao": "Original",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201803001",
    "dataHoraTransmissao": "20220331032551",
    "malha": ""
   },
   "indiceDas": null
  }, {
   "tipoOperacao": "Retificadora",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201803002",
    "dataHoraTransmissao": "20220606033107",
    "malha": ""
   },
   "indiceDas": null
  }]
 }, {
  "periodoApuracao": 201804,
  "operacoes": [{
   "tipoOperacao": "Original",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201804001",
    "dataHoraTransmissao": "20220331032613",
    "malha": ""
   },
   "indiceDas": null
  }, {
   "tipoOperacao": "Retificadora",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201804002",
    "dataHoraTransmissao": "20220606033124",
    "malha": ""
   },
   "indiceDas": null
  }]
 }, {
  "periodoApuracao": 201805,
  "operacoes": [{
   "tipoOperacao": "Original",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000990201805001",
    "dataHoraTransmissao": "20220331033215",
    "malha": ""
   },
   "indiceDas": null
  }, {
   "tipoOperacao": "Retificadora",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201805002",
    "dataHoraTransmissao": "20220606033145",
    "malha": ""
   },
   "indiceDas": null
  }]
 }, {
  "periodoApuracao": 201806,
  "operacoes": [{
   "tipoOperacao": "Original",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201806001",
    "dataHoraTransmissao": "20220331033333",
    "malha": ""
   },
   "indiceDas": null
  }, {
   "tipoOperacao": "Retificadora",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201806002",
    "dataHoraTransmissao": "20220606033206",
    "malha": ""
   },
   "indiceDas": null
  }, {
   "tipoOperacao": "Geração de DAS",
   "indiceDeclaracao": null,
   "indiceDas": {
    "numeroDas": "07202219999992307",
    "datahoraEmissaoDas": "20220608020457",
    "dasPago": false
   }
  }]
 }, {
  "periodoApuracao": 201807,
  "operacoes": [{
   "tipoOperacao": "Original",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201807001",
    "dataHoraTransmissao": "20220331033354",
    "malha": ""
   },
   "indiceDas": null
  }, {
   "tipoOperacao": "Retificadora",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201807002",
    "dataHoraTransmissao": "20220606033230",
    "malha": ""
   },
   "indiceDas": null
  }]
 }, {
  "periodoApuracao": 201808,
  "operacoes": [{
   "tipoOperacao": "Original",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201808001",
    "dataHoraTransmissao": "20220331033413",
    "malha": ""
   },
   "indiceDas": null
  }, {
   "tipoOperacao": "Retificadora",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201808002",
    "dataHoraTransmissao": "20220606033248",
    "malha": ""
   },
   "indiceDas": null
  }]
 }, {
  "periodoApuracao": 201809,
  "operacoes": [{
   "tipoOperacao": "Original",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201809001",
    "dataHoraTransmissao": "20220331033430",
    "malha": ""
   },
   "indiceDas": null
  }, {
   "tipoOperacao": "Retificadora",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201809002",
    "dataHoraTransmissao": "20220606033305",
    "malha": ""
   },
   "indiceDas": null
  }]
 }, {
  "periodoApuracao": 201810,
  "operacoes": [{
   "tipoOperacao": "Original",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201810001",
    "dataHoraTransmissao": "20220331033444",
    "malha": ""
   },
   "indiceDas": null
  }, {
   "tipoOperacao": "Retificadora",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201810002",
    "dataHoraTransmissao": "20220606033329",
    "malha": ""
   },
   "indiceDas": null
  }]
 }, {
  "periodoApuracao": 201811,
  "operacoes": [{
   "tipoOperacao": "Original",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201811001",
    "dataHoraTransmissao": "20220331033458",
    "malha": ""
   },
   "indiceDas": null
  }, {
   "tipoOperacao": "Retificadora",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201811002",
    "dataHoraTransmissao": "20220606033349",
    "malha": ""
   },
   "indiceDas": null
  }, {
   "tipoOperacao": "Geração de DAS",
   "indiceDeclaracao": null,
   "indiceDas": {
    "numeroDas": "07202215999999170",
    "datahoraEmissaoDas": "20220608020204",
    "dasPago": false
   }
  }]
 }, {
  "periodoApuracao": 201812,
  "operacoes": [{
   "tipoOperacao": "Original",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201812001",
    "dataHoraTransmissao": "20220331033515",
    "malha": ""
   },
   "indiceDas": null
  }, {
   "tipoOperacao": "Retificadora",
   "indiceDeclaracao": {
    "numeroDeclaracao": "00000000201812002",
    "dataHoraTransmissao": "20220606033407",
    "malha": ""
   },
   "indiceDas": null
  }]
 }]
}
```

Forma normalizada:

```json
{
  "anocalendario": 2018,
  "periodos": [
    {
      "periodoApuracao": 201801,
      "operacoes": [
        {
          "tipoOperacao": "Original",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201801001",
            "dataHoraTransmissao": "20220331032512",
            "malha": ""
          },
          "indiceDas": null
        },
        {
          "tipoOperacao": "Geração de DAS",
          "indiceDeclaracao": null,
          "indiceDas": {
            "numeroDas": "07202219799007800",
            "datahoraEmissaoDas": "20220606033456",
            "dasPago": false
          }
        }
      ]
    },
    {
      "periodoApuracao": 201802,
      "operacoes": [
        {
          "tipoOperacao": "Original",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201802001",
            "dataHoraTransmissao": "20220331032533",
            "malha": ""
          },
          "indiceDas": null
        },
        {
          "tipoOperacao": "Retificadora",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201802002",
            "dataHoraTransmissao": "20220606033046",
            "malha": ""
          },
          "indiceDas": null
        },
        {
          "tipoOperacao": "Geração de DAS",
          "indiceDeclaracao": null,
          "indiceDas": {
            "numeroDas": "07202215999990940",
            "datahoraEmissaoDas": "20220608111510",
            "dasPago": false
          }
        },
        {
          "tipoOperacao": "Geração de DAS",
          "indiceDeclaracao": null,
          "indiceDas": {
            "numeroDas": "07202215999991106",
            "datahoraEmissaoDas": "20220608112922",
            "dasPago": false
          }
        }
      ]
    },
    {
      "periodoApuracao": 201803,
      "operacoes": [
        {
          "tipoOperacao": "Original",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201803001",
            "dataHoraTransmissao": "20220331032551",
            "malha": ""
          },
          "indiceDas": null
        },
        {
          "tipoOperacao": "Retificadora",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201803002",
            "dataHoraTransmissao": "20220606033107",
            "malha": ""
          },
          "indiceDas": null
        }
      ]
    },
    {
      "periodoApuracao": 201804,
      "operacoes": [
        {
          "tipoOperacao": "Original",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201804001",
            "dataHoraTransmissao": "20220331032613",
            "malha": ""
          },
          "indiceDas": null
        },
        {
          "tipoOperacao": "Retificadora",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201804002",
            "dataHoraTransmissao": "20220606033124",
            "malha": ""
          },
          "indiceDas": null
        }
      ]
    },
    {
      "periodoApuracao": 201805,
      "operacoes": [
        {
          "tipoOperacao": "Original",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000990201805001",
            "dataHoraTransmissao": "20220331033215",
            "malha": ""
          },
          "indiceDas": null
        },
        {
          "tipoOperacao": "Retificadora",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201805002",
            "dataHoraTransmissao": "20220606033145",
            "malha": ""
          },
          "indiceDas": null
        }
      ]
    },
    {
      "periodoApuracao": 201806,
      "operacoes": [
        {
          "tipoOperacao": "Original",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201806001",
            "dataHoraTransmissao": "20220331033333",
            "malha": ""
          },
          "indiceDas": null
        },
        {
          "tipoOperacao": "Retificadora",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201806002",
            "dataHoraTransmissao": "20220606033206",
            "malha": ""
          },
          "indiceDas": null
        },
        {
          "tipoOperacao": "Geração de DAS",
          "indiceDeclaracao": null,
          "indiceDas": {
            "numeroDas": "07202219999992307",
            "datahoraEmissaoDas": "20220608020457",
            "dasPago": false
          }
        }
      ]
    },
    {
      "periodoApuracao": 201807,
      "operacoes": [
        {
          "tipoOperacao": "Original",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201807001",
            "dataHoraTransmissao": "20220331033354",
            "malha": ""
          },
          "indiceDas": null
        },
        {
          "tipoOperacao": "Retificadora",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201807002",
            "dataHoraTransmissao": "20220606033230",
            "malha": ""
          },
          "indiceDas": null
        }
      ]
    },
    {
      "periodoApuracao": 201808,
      "operacoes": [
        {
          "tipoOperacao": "Original",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201808001",
            "dataHoraTransmissao": "20220331033413",
            "malha": ""
          },
          "indiceDas": null
        },
        {
          "tipoOperacao": "Retificadora",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201808002",
            "dataHoraTransmissao": "20220606033248",
            "malha": ""
          },
          "indiceDas": null
        }
      ]
    },
    {
      "periodoApuracao": 201809,
      "operacoes": [
        {
          "tipoOperacao": "Original",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201809001",
            "dataHoraTransmissao": "20220331033430",
            "malha": ""
          },
          "indiceDas": null
        },
        {
          "tipoOperacao": "Retificadora",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201809002",
            "dataHoraTransmissao": "20220606033305",
            "malha": ""
          },
          "indiceDas": null
        }
      ]
    },
    {
      "periodoApuracao": 201810,
      "operacoes": [
        {
          "tipoOperacao": "Original",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201810001",
            "dataHoraTransmissao": "20220331033444",
            "malha": ""
          },
          "indiceDas": null
        },
        {
          "tipoOperacao": "Retificadora",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201810002",
            "dataHoraTransmissao": "20220606033329",
            "malha": ""
          },
          "indiceDas": null
        }
      ]
    },
    {
      "periodoApuracao": 201811,
      "operacoes": [
        {
          "tipoOperacao": "Original",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201811001",
            "dataHoraTransmissao": "20220331033458",
            "malha": ""
          },
          "indiceDas": null
        },
        {
          "tipoOperacao": "Retificadora",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201811002",
            "dataHoraTransmissao": "20220606033349",
            "malha": ""
          },
          "indiceDas": null
        },
        {
          "tipoOperacao": "Geração de DAS",
          "indiceDeclaracao": null,
          "indiceDas": {
            "numeroDas": "07202215999999170",
            "datahoraEmissaoDas": "20220608020204",
            "dasPago": false
          }
        }
      ]
    },
    {
      "periodoApuracao": 201812,
      "operacoes": [
        {
          "tipoOperacao": "Original",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201812001",
            "dataHoraTransmissao": "20220331033515",
            "malha": ""
          },
          "indiceDas": null
        },
        {
          "tipoOperacao": "Retificadora",
          "indiceDeclaracao": {
            "numeroDeclaracao": "00000000201812002",
            "dataHoraTransmissao": "20220606033407",
            "malha": ""
          },
          "indiceDas": null
        }
      ]
    }
  ]
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Simples Nacional](../../../generated/source/solucoes/integra-sn/pgdasd/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-sn/pgdasd/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/dados_de_dominio/)

## Anomalias

- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_consultar_declaracao_por_ac_pa/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/servicos/consultar_declaracao_por_ano_pa/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_consultar_declaracao_por_ac_pa/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `3bcb66c8554fd0edf765132cb86ea86c372e1812d1486f723b4d960853674d5b`
