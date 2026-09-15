---
key: "PGDASD.TRANSDECLARACAO11"
family: "integra-sn"
systemId: "PGDASD"
serviceId: "TRANSDECLARACAO11"
version: "1.0"
operationPath: "Declarar"
sourceStatus: "fetched"
---

# Entregar declaração mensal - Orientações para os dados de Entrada

Entregar declaração mensal

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PGDASD.TRANSDECLARACAO11` |
| Família | `integra-sn` |
| Caminho físico | `POST /Declarar` |
| Versão | `1.0` |
| Situação oficial | 23/09/2022 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00146) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto Dados: | cnpjCompleto | String (14) | SIM | — | Cnpj completo sem formatação |
| Dados de Entrada — Objeto Dados: | pa | Number | SIM | — | Período de apuração da declaração em formato AAAAMM |
| Dados de Entrada — Objeto Dados: | indicadorTransmissao | Boolean | SIM | — | Indica se a declaração deve ser transmitida. No caso de "false", serão devolvidos os valores devidos sem transmissão |
| Dados de Entrada — Objeto Dados: | indicadorComparacao | Boolean | SIM | — | Indica se há a necessidade de comparação dos valoresParaComparacao enviados na entrada com os valores calculados antes da transmissão. Ver regra . |
| Dados de Entrada — Objeto Dados: | declaracao | Object | SIM | — | Objeto contendo os dados da declaração. Ver declaracao . |
| Dados de Entrada — Objeto Dados: | valoresParaComparacao | Array de Object valorDevido | NÃO | — | Valores para comparação com o valor apurado pelo sistema. Obrigatório, exceto quando não há valor devido. Ver regra . |
| Dados de Entrada — Objeto Declaracao: | tipoDeclaracao | Number | SIM | — | Tipo da declaração |
| Dados de Entrada — Objeto Declaracao: | receitaPaCompetenciaInterno | Number | SIM | — | Receita do mercado interno no pa de regime de competência |
| Dados de Entrada — Objeto Declaracao: | receitaPaCompetenciaExterno | Number | SIM | — | Receita do mercado externo no pa de regime de competência |
| Dados de Entrada — Objeto Declaracao: | receitaPaCaixaInterno | Number | NÃO | — | Receita do mercado interno no pa de regime de caixa |
| Dados de Entrada — Objeto Declaracao: | receitaPaCaixaExterno | Number | NÃO | — | Receita do mercado externo no pa de regime de caixa |
| Dados de Entrada — Objeto Declaracao: | valorFixoIcms | Number | NÃO | — | Valor fixo de ICMS, deve ser maior que zero e obedecer às regras de negócio |
| Dados de Entrada — Objeto Declaracao: | valorFixoIss | Number | NÃO | — | valor fixo de ISS, deve ser maior que zero e obedecer às regras de negócio |
| Dados de Entrada — Objeto Declaracao: | receitasBrutasAnteriores | Array de Object ReceitaBrutaAnterior | NÃO | — | Lista de receita bruta anterior. Ver regra . |
| Dados de Entrada — Objeto Declaracao: | folhasSalario | Array de Object FolhaSalario | NÃO | — | Valores de folha de salário. |
| Dados de Entrada — Objeto Declaracao: | naoOptante | Object | NÃO | — | Informações de não optante |
| Dados de Entrada — Objeto Declaracao: | estabelecimentos | Array de Object Estabelecimento | SIM | — | Estabelecimentos da declaração. Deve conter todos os estabelecimentos vigentes à época do período de apuração da declaração. |
| Dados de Entrada — Objeto ReceitaBrutaAnterior: | pa | Number | SIM | — | Período de Apuração em formato AAAAMM |
| Dados de Entrada — Objeto ReceitaBrutaAnterior: | valorInterno | Number | SIM | — | Valor no mercado interno |
| Dados de Entrada — Objeto ReceitaBrutaAnterior: | valorExterno | Number | SIM | — | Valor no mercado externo |
| Dados de Entrada — Objeto FolhaSalario: | pa | Number | SIM | — | Período de Apuração em formato AAAAMM |
| Dados de Entrada — Objeto FolhaSalario: | valor | Number | SIM | — | Valor |
| Dados de Entrada — Objeto NaoOptante: | esferaAdm | String (1) | SIM | — | 1 = Federal, 2= Distrital, 3 = Estadual, 4 = Municipal |
| Dados de Entrada — Objeto NaoOptante: | uf | String (2) | SIM | — | Uf do processo |
| Dados de Entrada — Objeto NaoOptante: | codMunicipio | String (4) | SIM | — | Código do município do processo |
| Dados de Entrada — Objeto NaoOptante: | processo | String | SIM | — | Número do processo sem formatação |
| Dados de Entrada — Objeto Estabelecimento: | cnpjCompleto | String (14) | SIM | — | Cnpj do estabelecimento sem formatação |
| Dados de Entrada — Objeto Estabelecimento: | atividades | Array de Object Atividade | NÃO | — | Atividades do estabelecimento. Se não houve atividade para o estabelecimento, não enviar esta lista. |
| Dados de Entrada — Objeto Atividade: | idAtividade | Number | SIM | — | Id da atividade |
| Dados de Entrada — Objeto Atividade: | valorAtividade | Number | SIM | — | Valor da atividade |
| Dados de Entrada — Objeto Atividade: | receitasAtividade | Array de Object ReceitaAtividade | SIM | — | Parcela de receita da atividade. |
| Dados de Entrada — Objeto ReceitaAtividade: | valor | Number | SIM | — | Valor da parcela |
| Dados de Entrada — Objeto ReceitaAtividade: | codigoOutroMunicipio | String | NÃO | — | Código do município no caso de atividade em outro município |
| Dados de Entrada — Objeto ReceitaAtividade: | outraUf | String | NÃO | — | UF no caso de atividade em outro município/UF |
| Dados de Entrada — Objeto ReceitaAtividade: | isencoes | Array de Object Isencao | NÃO | — | Informações de Isencao. |
| Dados de Entrada — Objeto ReceitaAtividade: | reducoes | Array de Object Reducao | NÃO | — | Informações de Reducao. |
| Dados de Entrada — Objeto ReceitaAtividade: | qualificacoesTributarias | Array de Object qualificacao | NÃO | — | Informações de qualificacao. |
| Dados de Entrada — Objeto ReceitaAtividade: | exigibilidadesSuspensas | Array de Object Exigibilidade Suspensa | NÃO | — | Informações de Exigibilidade Suspensa. |
| Dados de Entrada — Objeto Isencao: | codTributo | Number | SIM | — | Código do tributo |
| Dados de Entrada — Objeto Isencao: | valor | Number | SIM | — | Valor da isenção |
| Dados de Entrada — Objeto Isencao: | identificador | Number | SIM | — | Identificador do tipo de isenção |
| Dados de Entrada — Objeto Reducao: | codTributo | Number | SIM | — | Código do tributo |
| Dados de Entrada — Objeto Reducao: | valor | Number | SIM | — | Valor da redução |
| Dados de Entrada — Objeto Reducao: | percentualReducao | Number | SIM | — | Percentual da redução |
| Dados de Entrada — Objeto Reducao: | identificador | Number | SIM | — | Identificador do tipo de redução |
| Dados de Entrada — Objeto Qualificação Tributária: | codigoTributo | Number | SIM | — | Código do tributo |
| Dados de Entrada — Objeto Qualificação Tributária: | id | Number | SIM | — | Id da qualificacao |
| Dados de Entrada — Objeto Exigibilidade Suspensa: | codTributo | Number | SIM | — | Código do tributo |
| Dados de Entrada — Objeto Exigibilidade Suspensa: | numeroProcesso | Number | SIM | — | Número do processo da exigibilidade suspensa |
| Dados de Entrada — Objeto Exigibilidade Suspensa: | codMunicipio | String | NÃO | — | Código de município da exigibilidade suspensa |
| Dados de Entrada — Objeto Exigibilidade Suspensa: | uf | String | SIM | — | Uf da exigibilidade suspensa |
| Dados de Entrada — Objeto Exigibilidade Suspensa: | vara | String | SIM | — | Vara do processo da exigibilidade suspensa |
| Dados de Entrada — Objeto Exigibilidade Suspensa: | existeDeposito | Boolean | SIM | — | Indicador de existência de depósito |
| Dados de Entrada — Objeto Exigibilidade Suspensa: | motivo | Number | SIM | — | Motivo da exigibilidade suspensa |
| Dados de Entrada — Objeto ValorDevido: | codigoTributo | Number | — | — | Código do tributo |
| Dados de Entrada — Objeto ValorDevido: | valor | Number | — | — | Valor devido do tributo |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array | — | — | Mensagem explicativa retornada no acionamento do serviço. |
| Dados de Saída | dados | String | — | — | Estrutura de dados de retorno, contendo uma lista com o objeto DeclaracaoTransmitida . |
| Dados de Saída — Objeto DeclaraçãoTransmitida: | idDeclaracao | String | — | — | Id da Declaração que foi transmitida |
| Dados de Saída — Objeto DeclaraçãoTransmitida: | dataHoraTransmissao | String | — | — | Data e hora da transmissão no formato AAAAMMDDHHmmSS |
| Dados de Saída — Objeto DeclaraçãoTransmitida: | valoresDevidos | Array de object ValorDevido | — | — | Valor devidos calculados pelo sistema. |
| Dados de Saída — Objeto DeclaraçãoTransmitida: | declaracao | String | — | — | PDF da declaração no formato Base64 |
| Dados de Saída — Objeto DeclaraçãoTransmitida: | recibo | String | — | — | PDF do recibo no formato Base64 |
| Dados de Saída — Objeto DeclaraçãoTransmitida: | notificacaoMaed | String | — | — | PDF da notificação MAED. No caso de não ter MAED este campo é nulo |
| Dados de Saída — Objeto DeclaraçãoTransmitida: | darf | String | — | — | PDF do DARF. No caso de não ter MAED este campo é nulo |
| Dados de Saída — Objeto DeclaraçãoTransmitida: | detalhamentoDarfMaed | Object | — | — | Detalhamento dos valores do Darf. Ver Detalhamento . |
| Dados de Saída — Objeto ValorDevido: | codigoTributo | Number | — | — | Código do tributo |
| Dados de Saída — Objeto ValorDevido: | valor | Number | — | — | Valor devido do tributo |
| Dados de Saída — Objeto Detalhamento: | periodoApuracao | String (6) | — | — | Período de Apuração no formato AAAAMM |
| Dados de Saída — Objeto Detalhamento: | numeroDocumento | String (17) | — | — | Número do documento gerado |
| Dados de Saída — Objeto Detalhamento: | dataVencimento | String (8) | — | — | Data de vencimento no formato AAAAMMDD |
| Dados de Saída — Objeto Detalhamento: | dataLimiteAcolhimento | String (8) | — | — | Data limite para acolhimento no formato AAAAMMDD |
| Dados de Saída — Objeto Detalhamento: | valores | Object | — | — | Discriminação dos valores contidos no DARF. Ver Valores . |
| Dados de Saída — Objeto Detalhamento: | observacao1 | String | — | — | Observação 1 |
| Dados de Saída — Objeto Detalhamento: | observacao2 | String | — | — | Observação 2 |
| Dados de Saída — Objeto Detalhamento: | observacao3 | String | — | — | Observação 3 |
| Dados de Saída — Objeto Detalhamento: | composicao | Null | — | — | Por se tratar de DARF, este campo não possui informação |
| Dados de Saída — Objeto: Valores | principal | Number | — | — | Valor do principal |
| Dados de Saída — Objeto: Valores | multa | Number | — | — | Valor da multa |
| Dados de Saída — Objeto: Valores | juros | Number | — | — | Valor dos juros |
| Dados de Saída — Objeto: Valores | total | Number | — | — | Valor total |

## Exemplos oficiais e normalizados

### Exemplo 1 — request

Fonte oficial:

```text
{
    "contratante": {
        "numero": "00000000000100",
        "tipo": 2
    },
    "autorPedidoDados": {
        "numero": "00000000000100",
        "tipo": 2
    },
    "contribuinte": {
        "numero": "00000000000100",
        "tipo": 2
    },
    "pedidoDados": {
        "idSistema": "PGDASD",
        "idServico": "TRANSDECLARACAO11",
        "versaoSistema": "1.0",
        "dados": "{\"cnpjCompleto\":\"00000000000100\",\"pa\":20210\"indicadorTransmissao\":true,\"indicadorComparacao\":tru\"declaracao\":{\"tipoDeclaracao\":\"receitaPaCompetenciaInterno\":10000.0\"receitaPaCompetenciaExterno\":0.00,\"receitaPaCaixaInterno\":nul\"receitaPaCaixaExterno\":null,\"valorFixoIcms\":100.0\"valorFixoIss\":null,\"receitasBrutasAnteriores\":[{\"pa\":20200\"valorInterno\":100.00,\"valorExterno\":200.00},{\"pa\":20200\"valorInterno\":300.00,\"valorExterno\":0.00},{\"pa\":20200\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":20200\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":20200\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":20200\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":20200\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":20200\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":20200\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":20201\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":20201\"valorInterno\":0.00,\"valorExterno\":0.00},{\"pa\":20201\"valorInterno\":0.00,\"valorExterno\":0.00}],\"folhasSalario\[{\"pa\":202001,\"valor\":2000.00},{\"pa\":202002,\"valor\":2000.00{\"pa\":202003,\"valor\":2000.00},{\"pa\":202004,\"valor\":2000.00{\"pa\":202005,\"valor\":0.00},{\"pa\":202006,\"valor\":0.00{\"pa\":202007,\"valor\":0.00},{\"pa\":202008,\"valor\":0.00{\"pa\":202009,\"valor\":0.00},{\"pa\":202010,\"valor\":0.00{\"pa\":202011,\"valor\":0.00},{\"pa\":202012,\"valor\":0.00}\"naoOptante\":null,\"estabelecimentos\[{\"cnpjCompleto\":\"0000000000100\",\"atividades\":[{\"idAtividade\":\"valorAtividade\":4000.00,\"receitasAtividade\":[{\"valor\":4000.0\"codigoOutroMunicipio\":null,\"outraUf\":null,\"isencoes\[{\"codTributo\":1007,\"valor\":100.00,\"identificador\":1}\"reducoes\":[{\"codTributo\":1007,\"valor\":1500.0\"percentualReducao\":50.00,\"identificador\":1}\"qualificacoesTributarias\":[],\"exigibilidadesSuspensas\":null}]{\"idAtividade\":10,\"valorAtividade\":6000.00,\"receitasAtividade\[{\"valor\":6000.00,\"codigoOutroMunicipio\":9701,\"outraUf\":\"DF\\"isencoes\":null,\"reducoes\":null,\"qualificacoesTributarias\":nul\"exigibilidadesSuspensas\":null}]}]}]},\"valoresParaComparacao\[{\"codigoTributo\":1001,\"valor\":23.20},{\"codigoTributo\":100\"valor\":18.20},{\"codigoTributo\":1004,\"valor\":66.53{\"codigoTributo\":1005,\"valor\":14.43},{\"codigoTributo\":100\"valor\":222.64},{\"codigoTributo\":1007,\"valor\":100.00{\"codigoTributo\":1010,\"valor\":120.60}]}"
    }
}
```

### Exemplo 2 — request

Fonte oficial:

```text
{
    "cnpjCompleto": "00000000000100",
    "pa": 202101,
    "indicadorTransmissao": true,
    "indicadorComparacao": true,
    "declaracao": {
        "tipoDeclaracao": 1,
        "receitaPaCompetenciaInterno": 10000.00,
        "receitaPaCompetenciaExterno": 0.00,
        "receitaPaCaixaInterno": null,
        "receitaPaCaixaExterno": null,
        "valorFixoIcms": 100.00,
        "valorFixoIss": null,
        "receitasBrutasAnteriores": [{
            "pa": 202001,
            "valorInterno": 100.00,
            "valorExterno": 200.00
    }, {
            "pa": 202002,
            "valorInterno": 300.00,
            "valorExterno": 0.00
        }, {
            "pa": 202003,
            "valorInterno": 0.00,
            "valorExterno": 0.00
        }, {
            "pa": 202004,
            "valorInterno": 0.00,
            "valorExterno": 0.00
        }, {
            "pa": 202005,
            "valorInterno": 0.00,
            "valorExterno": 0.00
        }, {
            "pa": 202006,
            "valorInterno": 0.00,
            "valorExterno": 0.00
        }, {
            "pa": 202007,
            "valorInterno": 0.00,
            "valorExterno": 0.00
        }, {
            "pa": 202008,
            "valorInterno": 0.00,
            "valorExterno": 0.00
        }, {
            "pa": 202009,
            "valorInterno": 0.00,
            "valorExterno": 0.00
        }, {
            "pa": 202010,
            "valorInterno": 0.00,
            "valorExterno": 0.00
        }, {
            "pa": 202011,
            "valorInterno": 0.00,
            "valorExterno": 0.00
        }, {
            "pa": 202012,
            "valorInterno": 0.00,
            "valorExterno": 0.00
        }],
        "folhasSalario": [{
            "pa": 202001,
            "valor": 2000.00
            }, {
            "pa": 202002,
            "valor": 2000.00
            }, {
            "pa": 202003,
            "valor": 2000.00
            }, {
            "pa": 202004,
            "valor": 2000.00
            }, {
            "pa": 202005,
            "valor": 0.00
            }, {
            "pa": 202006,
            "valor": 0.00
            }, {
            "pa": 202007,
            "valor": 0.00
            }, {
            "pa": 202008,
            "valor": 0.00
            }, {
            "pa": 202009,
            "valor": 0.00
            }, {
            "pa": 202010,
            "valor": 0.00
            }, {
            "pa": 202011,
            "valor": 0.00
            }, {
            "pa": 202012,
            "valor": 0.00
        }],
        "naoOptante": null,
        "estabelecimentos": [{
            "cnpjCompleto": "0000000000100",
            "atividades": [{
                "idAtividade": 1,
                "valorAtividade": 4000.00,
                "receitasAtividade": [{
                    "valor": 4000.00,
                    "codigoOutroMunicipio": null,
                    "outraUf": null,
                    "isencoes": [{
                        "codTributo": 1007,
                        "valor": 100.00,
                        "identificador": 1
                    }],
                    "reducoes": [{
                        "codTributo": 1007,
                        "valor": 1500.00,
                        "percentualReducao": 50.00,
                        "identificador": 1
                    }],
                    "qualificacoesTributarias": [],
                    "exigibilidadesSuspensas": null
                }]
            }, {
                "idAtividade": 10,
                "valorAtividade": 6000.00,
                "receitasAtividade": [{
                    "valor": 6000.00,
                    "codigoOutroMunicipio": 9701,
                    "outraUf": "DF",
                    "isencoes": null,
                    "reducoes": null,
                    "qualificacoesTributarias": null,
                    "exigibilidadesSuspensas": null
                }]
            }]
        }]
    },
    "valoresParaComparacao": [{
        "codigoTributo": 1001,
        "valor": 23.20
    }, {
        "codigoTributo": 1002,
        "valor": 18.20
    }, {
        "codigoTributo": 1004,
        "valor": 66.53
    }, {
        "codigoTributo": 1005,
        "valor": 14.43
    }, {
        "codigoTributo": 1006,
        "valor": 222.64
    }, {
        "codigoTributo": 1007,
        "valor": 100.00
    }, {
        "codigoTributo": 1010,
        "valor": 120.60
    }]
}
```

Forma normalizada:

```json
{
  "cnpjCompleto": "00000000000100",
  "pa": 202101,
  "indicadorTransmissao": true,
  "indicadorComparacao": true,
  "declaracao": {
    "tipoDeclaracao": 1,
    "receitaPaCompetenciaInterno": 10000,
    "receitaPaCompetenciaExterno": 0,
    "receitaPaCaixaInterno": null,
    "receitaPaCaixaExterno": null,
    "valorFixoIcms": 100,
    "valorFixoIss": null,
    "receitasBrutasAnteriores": [
      {
        "pa": 202001,
        "valorInterno": 100,
        "valorExterno": 200
      },
      {
        "pa": 202002,
        "valorInterno": 300,
        "valorExterno": 0
      },
      {
        "pa": 202003,
        "valorInterno": 0,
        "valorExterno": 0
      },
      {
        "pa": 202004,
        "valorInterno": 0,
        "valorExterno": 0
      },
      {
        "pa": 202005,
        "valorInterno": 0,
        "valorExterno": 0
      },
      {
        "pa": 202006,
        "valorInterno": 0,
        "valorExterno": 0
      },
      {
        "pa": 202007,
        "valorInterno": 0,
        "valorExterno": 0
      },
      {
        "pa": 202008,
        "valorInterno": 0,
        "valorExterno": 0
      },
      {
        "pa": 202009,
        "valorInterno": 0,
        "valorExterno": 0
      },
      {
        "pa": 202010,
        "valorInterno": 0,
        "valorExterno": 0
      },
      {
        "pa": 202011,
        "valorInterno": 0,
        "valorExterno": 0
      },
      {
        "pa": 202012,
        "valorInterno": 0,
        "valorExterno": 0
      }
    ],
    "folhasSalario": [
      {
        "pa": 202001,
        "valor": 2000
      },
      {
        "pa": 202002,
        "valor": 2000
      },
      {
        "pa": 202003,
        "valor": 2000
      },
      {
        "pa": 202004,
        "valor": 2000
      },
      {
        "pa": 202005,
        "valor": 0
      },
      {
        "pa": 202006,
        "valor": 0
      },
      {
        "pa": 202007,
        "valor": 0
      },
      {
        "pa": 202008,
        "valor": 0
      },
      {
        "pa": 202009,
        "valor": 0
      },
      {
        "pa": 202010,
        "valor": 0
      },
      {
        "pa": 202011,
        "valor": 0
      },
      {
        "pa": 202012,
        "valor": 0
      }
    ],
    "naoOptante": null,
    "estabelecimentos": [
      {
        "cnpjCompleto": "0000000000100",
        "atividades": [
          {
            "idAtividade": 1,
            "valorAtividade": 4000,
            "receitasAtividade": [
              {
                "valor": 4000,
                "codigoOutroMunicipio": null,
                "outraUf": null,
                "isencoes": [
                  {
                    "codTributo": 1007,
                    "valor": 100,
                    "identificador": 1
                  }
                ],
                "reducoes": [
                  {
                    "codTributo": 1007,
                    "valor": 1500,
                    "percentualReducao": 50,
                    "identificador": 1
                  }
                ],
                "qualificacoesTributarias": [],
                "exigibilidadesSuspensas": null
              }
            ]
          },
          {
            "idAtividade": 10,
            "valorAtividade": 6000,
            "receitasAtividade": [
              {
                "valor": 6000,
                "codigoOutroMunicipio": 9701,
                "outraUf": "DF",
                "isencoes": null,
                "reducoes": null,
                "qualificacoesTributarias": null,
                "exigibilidadesSuspensas": null
              }
            ]
          }
        ]
      }
    ]
  },
  "valoresParaComparacao": [
    {
      "codigoTributo": 1001,
      "valor": 23.2
    },
    {
      "codigoTributo": 1002,
      "valor": 18.2
    },
    {
      "codigoTributo": 1004,
      "valor": 66.53
    },
    {
      "codigoTributo": 1005,
      "valor": 14.43
    },
    {
      "codigoTributo": 1006,
      "valor": 222.64
    },
    {
      "codigoTributo": 1007,
      "valor": 100
    },
    {
      "codigoTributo": 1010,
      "valor": 120.6
    }
  ]
}
```

### Exemplo 3 — response

Fonte oficial:

```text
{
  "contratante": {
   "numero": "00000000000100",
   "tipo": 2
  },
  "autorPedidoDados": {
   "numero": "00000000000100",
   "tipo": 2
  },
  "contribuinte": {
   "numero": "00000000000100",
   "tipo": 2
  },
  "pedidoDados": {
   "idSistema": "PGDASD",
   "idServico": "TRANSDECLARACAO11",
   "versaoSistema": "1.0",
   "dados": "{\"cnpjCompleto\":\"00000000000100\",\"pa\":202\"indicadorTransmissao\":true,\"indicadorComparacao\":true,\"declaraca{\"tipoDeclaracao\":1,\"receitaPaCompetenciaInterno\":10000\"receitaPaCompetenciaExterno\":0.00,\"receitaPaCaixaInterno\":n\"receitaPaCaixaExterno\":null,\"valorFixoIcms\":100.00,\"valorFixoIss\":n\"receitasBrutasAnteriores\":[{\"pa\":202001,\"valorInterno\":100\"valorExterno\":200.00},{\"pa\":202002,\"valorInterno\":300\"valorExterno\":0.00},{\"pa\":202003,\"valorInterno\":0\"valorExterno\":0.00},{\"pa\":202004,\"valorInterno\":0\"valorExterno\":0.00},{\"pa\":202005,\"valorInterno\":0\"valorExterno\":0.00},{\"pa\":202006,\"valorInterno\":0\"valorExterno\":0.00},{\"pa\":202007,\"valorInterno\":0\"valorExterno\":0.00},{\"pa\":202008,\"valorInterno\":0\"valorExterno\":0.00},{\"pa\":202009,\"valorInterno\":0\"valorExterno\":0.00},{\"pa\":202010,\"valorInterno\":0\"valorExterno\":0.00},{\"pa\":202011,\"valorInterno\":0\"valorExterno\":0.00},{\"pa\":202012,\"valorInterno\":0\"valorExterno\":0.00}],\"folhasSalario\":[{\"pa\":202001,\"valor\":2000.{\"pa\":202002,\"valor\":2000.00},{\"pa\":202003,\"valor\":2000.{\"pa\":202004,\"valor\":2000.00},{\"pa\":202005,\"valor\":0.{\"pa\":202006,\"valor\":0.00},{\"pa\":202007,\"valor\":0.00},{\"pa\":202\"valor\":0.00},{\"pa\":202009,\"valor\":0.00},{\"pa\":202010,\"valor\":0.{\"pa\":202011,\"valor\":0.00},{\"pa\":202012,\"valor\":0.0\"naoOptante\":null,\"estabelecimentos\":[{\"cnpjCompleto\":\"000000000010\"atividades\":[{\"idAtividade\":1,\"valorAtividade\":4000\"receitasAtividade\":[{\"valor\":4000.00,\"codigoOutroMunicipio\":n\"outraUf\":null,\"isencoes\":[{\"codTributo\":1007,\"valor\":100\"identificador\":1}],\"reducoes\":[{\"codTributo\":1007,\"valor\":1500\"percentualReducao\":50.00,\"identificador\":\"qualificacoesTributarias\":[],\"exigibilidadesSuspensas\":null{\"idAtividade\":10,\"valorAtividade\":6000.00,\"receitasAtividad[{\"valor\":6000.00,\"codigoOutroMunicipio\":9701,\"outraUf\":\"D\"isencoes\":null,\"reducoes\":null,\"qualificacoesTributarias\":n\"exigibilidadesSuspensas\":null}]}]}]},\"valoresParaComparaca[{\"codigoTributo\":1001,\"valor\":23.20},{\"codigoTributo\":1\"valor\":18.20},{\"codigoTributo\":1004,\"valor\":66.{\"codigoTributo\":1005,\"valor\":14.43},{\"codigoTributo\":1\"valor\":222.64},{\"codigoTributo\":1007,\"valor\":100.{\"codigoTributo\":1010,\"valor\":120.60}]}"
  },
   "status": 200,
   "mensagens": [
    {
    "codigo": "Sucesso-PGDASD",
    "texto": "Requisição efetuada com sucesso."
  },
  {
    "codigo": "Aviso-PGDASD-MSG_ISN_034",
    "texto": "A declaração do período 04/2021 da empresa TESTE, CNPJ 00.000.0001-00 foi transmitida com sucesso. Entretanto, foi entregue fora do prao que ensejou a aplicação de multa. "
  }
   ],
  "dados": "{\"idDeclaracao\":\"00000000202104001\",\"dataHoraTransmissao\":\"20220803044803\",\"valoresDevidos\":[{\"codigoTributo\":1001,\"valor\":44.00},{\"codigoTributo\":1002,\"valor\":28.00},{\"codigoTributo\":1004,\"valor\":101.92},{\"codigoTributo\":1005,\"valor\":22.08},{\"codigoTributo\":1006,\"valor\":332.00},{\"codigoTributo\":1007,\"valor\":272.00}],\"declaracao\":\"<BASE64_REMOVIDO_TAMANHO_17520>\",\"recibo\":\"<BASE64_REMOVIDO_TAMANHO_10448>\",\"notificacaoMaed\":\"<BASE64_REMOVIDO_TAMANHO_13544>\",\"darf\":\"<BASE64_REMOVIDO_TAMANHO_105164>\",\"detalhamentoDarfMaed\":{\"periodoApuracao\":\"20210601\",\"numeroDocumento\":null,\"dataVencimento\":\"20220902\",\"dataLimiteAcolhimento\":\"20220902\",\"valores\":{\"principal\":25.00,\"multa\":0.00,\"juros\":0.00,\"total\":25.00},\"observacao1\":\"DARF válido para pagamento até o vencimento\",\"observacao2\":\"PGDAS-D v2.1.6\",\"observacao3\":null,\"composicao\":null}}"
}
```

### Exemplo 4 — other

Fonte oficial:

```text
{
  "idDeclaracao": "00000000202104001",
  "dataHoraTransmissao": "20220803044803",
  "valoresDevidos": [
   {
    "codigoTributo": 1001,
    "valor": 44.0
   },
   {
    "codigoTributo": 1002,
    "valor": 28.0
   },
   {
    "codigoTributo": 1004,
    "valor": 101.92
   },
   {
    "codigoTributo": 1005,
    "valor": 22.08
   },
   {
    "codigoTributo": 1006,
    "valor": 332.0
   },
   {
    "codigoTributo": 1007,
    "valor": 272.0
   }
  ],
  "declaracao": "<BASE64_REMOVIDO_TAMANHO_17520>",
  "recibo": "<BASE64_REMOVIDO_TAMANHO_10448>",
  "notificacaoMaed": "<BASE64_REMOVIDO_TAMANHO_13544>",
  "darf": "<BASE64_REMOVIDO_TAMANHO_105164>",
  "detalhamentoDarfMaed": {
   "periodoApuracao": "20210601",
   "numeroDocumento": null,
   "dataVencimento": "20220902",
   "dataLimiteAcolhimento": "20220902",
   "valores": {
    "principal": 25.0,
    "multa": 0.0,
    "juros": 0.0,
    "total": 25.0
   },
   "observacao1": "DARF válido para pagamento até o vencimento",
   "observacao2": "PGDAS-D v2.1.6",
   "observacao3": null,
   "composicao": null
  }
}
```

Forma normalizada:

```json
{
  "idDeclaracao": "00000000202104001",
  "dataHoraTransmissao": "20220803044803",
  "valoresDevidos": [
    {
      "codigoTributo": 1001,
      "valor": 44
    },
    {
      "codigoTributo": 1002,
      "valor": 28
    },
    {
      "codigoTributo": 1004,
      "valor": 101.92
    },
    {
      "codigoTributo": 1005,
      "valor": 22.08
    },
    {
      "codigoTributo": 1006,
      "valor": 332
    },
    {
      "codigoTributo": 1007,
      "valor": 272
    }
  ],
  "declaracao": "<BASE64_REMOVIDO_TAMANHO_17520>",
  "recibo": "<BASE64_REMOVIDO_TAMANHO_10448>",
  "notificacaoMaed": "<BASE64_REMOVIDO_TAMANHO_13544>",
  "darf": "<BASE64_REMOVIDO_TAMANHO_105164>",
  "detalhamentoDarfMaed": {
    "periodoApuracao": "20210601",
    "numeroDocumento": null,
    "dataVencimento": "20220902",
    "dataLimiteAcolhimento": "20220902",
    "valores": {
      "principal": 25,
      "multa": 0,
      "juros": 0,
      "total": 25
    },
    "observacao1": "DARF válido para pagamento até o vencimento",
    "observacao2": "PGDAS-D v2.1.6",
    "observacao3": null,
    "composicao": null
  }
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

- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/servicos/entregar_declaracao_mensal_entrada/))
- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_entregar_declaracao/))
- **warning / official-pedido-dados-invalid-json:** O envelope oficial é JSON válido, mas o JSON escapado em pedidoDados.dados é inválido. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_entregar_declaracao/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/servicos/entregar_declaracao_mensal_entrada/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/servicos/entregar_declaracao_mensal_saida/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_entregar_declaracao/)

- Última atualização informada pela fonte: 22 de dezembro de 2025 13:26:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `f59ddee98411202f4ffcd08c61ab9b0b28e0da8e6010ae716985513de6e6689d`
