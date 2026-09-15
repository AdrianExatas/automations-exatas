---
key: "PGMEI.GERARDASCODBARRA22"
family: "integra-mei"
systemId: "PGMEI"
serviceId: "GERARDASCODBARRA22"
version: null
operationPath: "Emitir"
sourceStatus: "fetched"
---

# Gerar DAS com Código de Barras e sem PDF

Gerar DAS em código de barras

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PGMEI.GERARDASCODBARRA22` |
| Família | `integra-mei` |
| Caminho físico | `POST /Emitir` |
| Versão | Não informada |
| Situação oficial | 23/09/2022 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Não indicada |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto Dados: | periodoApuracao | String | SIM | — | Período de apuração no formato AAAAMM |
| Dados de Entrada — Objeto Dados: | dataConsolidacao | String | NÃO | — | Data de consolidação no formato AAAAMMDD |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number(3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array de String | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. |
| Dados de Saída | dados | String (String escapada: Array de Object Das ) | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto: Das | cnpjCompleto | String | — | — | Número do cnpj sem formatação |
| Dados de Saída — Objeto: Das | detalhamento | Object DetalhamentoDas | — | — | Detalhamento do DAS |
| Dados de Saída — Objeto: DetalhamentoDas | periodoApuracao | String(8) | — | — | Período de Apuração no formato AAAAMM ou "Diversos" no caso de mais de um período acumulado. |
| Dados de Saída — Objeto: DetalhamentoDas | numeroDocumento | String(17) | — | — | Número do documento gerado |
| Dados de Saída — Objeto: DetalhamentoDas | dataVencimento | String(8) | — | — | Data de vencimento no formato AAAAMMDD |
| Dados de Saída — Objeto: DetalhamentoDas | dataLimiteAcolhimento | String(8) | — | — | Data limite para acolhimento no formato AAAAMMDD |
| Dados de Saída — Objeto: DetalhamentoDas | valores | Object Valores | — | — | Discriminação dos valores |
| Dados de Saída — Objeto: DetalhamentoDas | codigoDeBarras | Array de String | — | — | Lista de códigos de barras gerados. Cada item representa um conjunto de números do código de barras |
| Dados de Saída — Objeto: DetalhamentoDas | observacao1 | String | — | — | Observação 1 |
| Dados de Saída — Objeto: DetalhamentoDas | observacao2 | String | — | — | Observação 2 |
| Dados de Saída — Objeto: DetalhamentoDas | observacao3 | String | — | — | Observação 3 |
| Dados de Saída — Objeto: DetalhamentoDas | composicao | Array de Object Composicao | — | — | Composição do DAS gerado |
| Dados de Saída — Objeto: Valores | principal | Number | — | — | Valor do principal |
| Dados de Saída — Objeto: Valores | multa | Number | — | — | Valor da multa |
| Dados de Saída — Objeto: Valores | juros | Number | — | — | Valor dos juros |
| Dados de Saída — Objeto: Valores | total | Number | — | — | Valor total |
| Dados de Saída — Objeto: Composicao | periodoApuracao | String(6) | — | — | Período de apuração do tributo no formato AAAAMM |
| Dados de Saída — Objeto: Composicao | codigo | String | — | — | Código do tributo |
| Dados de Saída — Objeto: Composicao | denominacao | String | — | — | Descrição do nome/destino do tributo |
| Dados de Saída — Objeto: Composicao | valores | Object Valores | — | — | Discriminação dos valores do tributo |

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
        "idSistema": "PGMEI",
        "idServico": "GERARDASCODBARRA22",
        "dados": "{ \"periodoApuracao\": \"201901\" }"
    }
}
```

Forma normalizada:

```json
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
    "idSistema": "PGMEI",
    "idServico": "GERARDASCODBARRA22",
    "dados": "{ \"periodoApuracao\": \"201901\" }"
  }
}
```

### Exemplo 2 — other

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
        "idSistema": "PGMEI",
        "idServico": "GERARDASCODBARRA22",
        "dados": "{ \"periodoApuracao\": \"201901\" }"
    },
    "status": 200,
    "mensagens": [
        {
          "codigo": "Sucesso-PGMEI",
          "texto": "Requisição efetuada com sucesso."
        }
      ],
    "dados": "[{\"cnpjCompleto\":\"00000000000100\",\"razaoSocial\":\"EXEMPLO\",\"detalhamento\":[{\"periodoApuracao\":\"201901\",\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"20190220\",\"dataLimiteAcolhimento\":\"20220831\",\"valores\":{\"principal\":55.90,\"multa\":11.18,\"juros\":10.71,\"total\":77.79},\"codigoDeBarras\":[\"000000000000\",\"000000000000\",\"000000000000\",\"000000000000\"],\"observacao1\":\"CPF: 000.000.000-00\",\"observacao2\":\"Tributos (R$): INSS 49,90 ICMS 1,00 ISS 5,00\",\"observacao3\":\"PGMEI(Versao:3.8.0)\",\"composicao\":[{\"periodoApuracao\":201901,\"codigo\":\"0151\",\"denominacao\":\"INSS - SIMPLES NACIONAL - MEI - 01/2019\",\"valores\":{\"principal\":49.90,\"multa\":9.98,\"juros\":9.56,\"total\":69.44}},{\"periodoApuracao\":201901,\"codigo\":\"0083\",\"denominacao\":\"ICMS - SIMPLES NACIONAL - MEI - PB - 01/2019\",\"valores\":{\"principal\":1.00,\"multa\":0.20,\"juros\":0.19,\"total\":1.39}},{\"periodoApuracao\":201901,\"codigo\":\"0125\",\"denominacao\":\"ISS - SIMPLES NACIONAL - MEI - SUME (PB) - 01/2019\",\"valores\":{\"principal\":5.00,\"multa\":1.00,\"juros\":0.96,\"total\":6.96}}]}]}]"
}
```

Forma normalizada:

```json
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
    "idSistema": "PGMEI",
    "idServico": "GERARDASCODBARRA22",
    "dados": "{ \"periodoApuracao\": \"201901\" }"
  },
  "status": 200,
  "mensagens": [
    {
      "codigo": "Sucesso-PGMEI",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "[{\"cnpjCompleto\":\"00000000000100\",\"razaoSocial\":\"EXEMPLO\",\"detalhamento\":[{\"periodoApuracao\":\"201901\",\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"20190220\",\"dataLimiteAcolhimento\":\"20220831\",\"valores\":{\"principal\":55.90,\"multa\":11.18,\"juros\":10.71,\"total\":77.79},\"codigoDeBarras\":[\"000000000000\",\"000000000000\",\"000000000000\",\"000000000000\"],\"observacao1\":\"CPF: 000.000.000-00\",\"observacao2\":\"Tributos (R$): INSS 49,90 ICMS 1,00 ISS 5,00\",\"observacao3\":\"PGMEI(Versao:3.8.0)\",\"composicao\":[{\"periodoApuracao\":201901,\"codigo\":\"0151\",\"denominacao\":\"INSS - SIMPLES NACIONAL - MEI - 01/2019\",\"valores\":{\"principal\":49.90,\"multa\":9.98,\"juros\":9.56,\"total\":69.44}},{\"periodoApuracao\":201901,\"codigo\":\"0083\",\"denominacao\":\"ICMS - SIMPLES NACIONAL - MEI - PB - 01/2019\",\"valores\":{\"principal\":1.00,\"multa\":0.20,\"juros\":0.19,\"total\":1.39}},{\"periodoApuracao\":201901,\"codigo\":\"0125\",\"denominacao\":\"ISS - SIMPLES NACIONAL - MEI - SUME (PB) - 01/2019\",\"valores\":{\"principal\":5.00,\"multa\":1.00,\"juros\":0.96,\"total\":6.96}}]}]}]"
}
```

### Exemplo 3 — other

Fonte oficial:

```text
[{
    "cnpjCompleto": "00000000000100",
    "razaoSocial": "EXEMPLO",
    "detalhamento": [{
        "periodoApuracao": "201901",
        "numeroDocumento": "00000000000000000",
        "dataVencimento": "20190220",
        "dataLimiteAcolhimento": "20220831",
        "valores": {
            "principal": 55.90,
            "multa": 11.18,
            "juros": 10.71,
            "total": 77.79
        },
        "codigoDeBarras": ["000000000000", "000000000000", "000000000000""000000000000"],
        "observacao1": "CPF: 000.000.000-00",
        "observacao2": "Tributos (R$): INSS 49,90 ICMS 1,00 ISS 5,00",
        "observacao3": "PGMEI(Versao:3.8.0)",
        "composicao": [{
            "periodoApuracao": 201901,
            "codigo": "0151",
            "denominacao": "INSS - SIMPLES NACIONAL - MEI - 01/2019",
            "valores": {
                "principal": 49.90,
                "multa": 9.98,
                "juros": 9.56,
                "total": 69.44
            }
        }, {
            "periodoApuracao": 201901,
            "codigo": "0083",
            "denominacao": "ICMS - SIMPLES NACIONAL - MEI - PB - 01/2019",
            "valores": {
                "principal": 1.00,
                "multa": 0.20,
                "juros": 0.19,
                "total": 1.39
            }
        }, {
            "periodoApuracao": 201901,
            "codigo": "0125",
            "denominacao": "ISS - SIMPLES NACIONAL - MEI - SUME (PB) - 01/2019",
            "valores": {
                "principal": 5.00,
                "multa": 1.00,
                "juros": 0.96,
                "total": 6.96
            }
        }]
    }]
}]
```

### Exemplo 4 — other

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
        "idSistema": "PGMEI",
        "idServico": "GERARDASCODBARRA22",
        "versaoSistema": "1.0",
        "dados": "{ \"periodoApuracao\": \"202601\" }"
    },
    "status": 200,
    "responseId": "e9da1ea7-6c3b-4f22-a57e-7a90b9c41b01",
    "responseDateTime": "2026-03-13T07:55:09.121Z",
    "dados": "[{\"cnpjCompleto\":\"11111111111111\",\"razaoSocial\":\"AAUVAAAIWWAA 00000000000\",\"detalhamento\":[{\"periodoApuracao\":\"202601\\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"20260220\\"dataLimiteAcolhimento\":\"20260313\",\"valores\":{\"principal\":86.0\"multa\":5.39,\"juros\":0.86,\"total\":92.30},\"codigoDeBarras\[\"000000000000\",\"000000000000\",\"000000000000\",\"000000000000\"\"observacao1\":\"CPF: 000.000.000-00\",\"observacao2\":\"Tributos (R$)INSS 81,05 ICMS 0,00 ISS 5,00\",\"observacao3\":\"PGMEI(Versao:3.16.2)\\"composicao\":[{\"periodoApuracao\":202601,\"codigo\":\"0151\\"denominacao\":\"INSS - SIMPLES NACIONAL - MEI - 01/2026\",\"valores\{\"principal\":81.05,\"multa\":5.08,\"juros\":0.81,\"total\":86.94}{\"periodoApuracao\":202601,\"codigo\":\"0125\",\"denominacao\":\"ISS SIMPLES NACIONAL - MEI - LUCAS DO RIO VERDE (MT) - 01/2026\",\"valores\{\"principal\":5.00,\"multa\":0.31,\"juros\":0.05,\"total\":5.36}}]}]}]",
    "mensagens": [
        {
            "codigo": "[Sucesso-PGMEI]",
            "texto": "Requisição efetuada com sucesso."
        }
    ]
}
```

### Exemplo 5 — other

Fonte oficial:

```text
[
    {
        "cnpjCompleto": "11111111111111",
        "razaoSocial": "AAUVAA AAIWWAA",
        "detalhamento": [
            {
                "periodoApuracao": "202601",
                "valores": {
                    "juros": 0.86,
                    "multa": 5.39,
                    "principal": 86.05,
                    "total": 92.3
                },
                "dataLimiteAcolhimento": "20260313",
                "dataVencimento": "20260220",
                "numeroDocumento": "00000000000000000",
                "codigoDeBarras": [
                    "000000000000",
                    "000000000000",
                    "000000000000",
                    "000000000000"
                ],
                "observacao1": "CPF: 000.000.000-00",
                "observacao2": "Tributos (R$): INSS 81,05 ICMS 0,00 ISS 5,00",
                "observacao3": "PGMEI(Versao:3.16.2)",
                "composicao": [
                    {
                        "codigo": "0151",
                        "denominacao": "INSS - SIMPLES NACIONAL - MEI - 01/2026",
                        "periodoApuracao": 202601,
                        "valores": {
                            "juros": 0.81,
                            "multa": 5.08,
                            "principal": 81.05,
                            "total": 86.94
                        }
                    },
                    {
                        "codigo": "0125",
                        "denominacao": "ISS - SIMPLES NACIONAL - MEI - LUCAS DRIO VERDE (MT) - 01/2026",
                        "periodoApuracao": 202601,
                        "valores": {
                            "juros": 0.05,
                            "multa": 0.31,
                            "principal": 5.0,
                            "total": 5.36
                        }
                    }
                ]               
            }
        ]
    }
]
```

Forma normalizada:

```json
[
  {
    "cnpjCompleto": "11111111111111",
    "razaoSocial": "AAUVAA AAIWWAA",
    "detalhamento": [
      {
        "periodoApuracao": "202601",
        "valores": {
          "juros": 0.86,
          "multa": 5.39,
          "principal": 86.05,
          "total": 92.3
        },
        "dataLimiteAcolhimento": "20260313",
        "dataVencimento": "20260220",
        "numeroDocumento": "00000000000000000",
        "codigoDeBarras": [
          "000000000000",
          "000000000000",
          "000000000000",
          "000000000000"
        ],
        "observacao1": "CPF: 000.000.000-00",
        "observacao2": "Tributos (R$): INSS 81,05 ICMS 0,00 ISS 5,00",
        "observacao3": "PGMEI(Versao:3.16.2)",
        "composicao": [
          {
            "codigo": "0151",
            "denominacao": "INSS - SIMPLES NACIONAL - MEI - 01/2026",
            "periodoApuracao": 202601,
            "valores": {
              "juros": 0.81,
              "multa": 5.08,
              "principal": 81.05,
              "total": 86.94
            }
          },
          {
            "codigo": "0125",
            "denominacao": "ISS - SIMPLES NACIONAL - MEI - LUCAS DRIO VERDE (MT) - 01/2026",
            "periodoApuracao": 202601,
            "valores": {
              "juros": 0.05,
              "multa": 0.31,
              "principal": 5,
              "total": 5.36
            }
          }
        ]
      }
    ]
  }
]
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
        "idSistema": "PGMEI",
        "idServico": "GERARDASCODBARRA22",
        "versaoSistema": "1.0",
        "dados": "{ \"periodoApuracao\": \"202602\" }"
    },
    "status": 200,
    "responseId": "114f5398-a75e-4cb4-9235-bea779cf317f",
    "responseDateTime": "2026-03-13T08:10:27.751Z",
    "dados": "[{\"cnpjCompleto\":\"11111111111111\",\"razaoSocial\":\"AAUVAAAIWWAA\",\"detalhamento\":[{\"periodoApuracao\":\"202602\\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"20260320\\"dataLimiteAcolhimento\":\"20260320\",\"valores\":{\"principal\":86.0\"multa\":0.0,\"juros\":0.0,\"total\":86.05},\"codigoDeBarras\[\"000000000000\",\"000000000000\",\"000000000000\",\"000000000000\"\"observacao1\":\"CPF: 000.000.000-00\",\"observacao2\":\"Tributos (R$)INSS 81,05 ICMS 0,00 ISS 5,00\",\"observacao3\":\"PGMEI(Versao:3.16.2)\\"composicao\":[{\"periodoApuracao\":202602,\"codigo\":\"0151\\"denominacao\":\"INSS - SIMPLES NACIONAL - MEI - 02/2026\",\"valores\{\"principal\":81.05,\"multa\":0.0,\"juros\":0.0,\"total\":81.05}{\"periodoApuracao\":202602,\"codigo\":\"0125\",\"denominacao\":\"ISS SIMPLES NACIONAL - MEI - LUCAS DO RIO VERDE (MT) - 02/2026\",\"valores\{\"principal\":5.00,\"multa\":0.0,\"juros\":0.0,\"total\":5.00}}]}]}]",
    "mensagens": [
        {
            "codigo": "[Sucesso-PGMEI]",
            "texto": "Requisição efetuada com sucesso."
        }
    ]
}
```

### Exemplo 7 — other

Fonte oficial:

```text
[
    {
        "cnpjCompleto": "11111111111111",
        "razaoSocial": "AAUVAA AAIWWAA"
        "detalhamento": [
            {
                "periodoApuracao": "202602",
                "dataLimiteAcolhimento": "20260320",
                "dataVencimento": "20260320",
                "numeroDocumento": "00000000000000000",
                "valores": {
                    "juros": 0.0,
                    "multa": 0.0,
                    "principal": 86.05,
                    "total": 86.05
                },
                "observacao1": "CPF: 000.000.000-00",
                "observacao2": "Tributos (R$): INSS 81,05 ICMS 0,00 ISS 5,00",
                "observacao3": "PGMEI(Versao:3.16.2)",
                "codigoDeBarras": [
                    "000000000000",
                    "000000000000",
                    "000000000000",
                    "000000000000"
                ],
                "composicao": [
                    {
                        "codigo": "0151",
                        "denominacao": "INSS - SIMPLES NACIONAL - MEI - 02/2026",
                        "periodoApuracao": 202602,
                        "valores": {
                            "juros": 0.0,
                            "multa": 0.0,
                            "principal": 81.05,
                            "total": 81.05
                        }
                    },
                    {
                        "codigo": "0125",
                        "denominacao": "ISS - SIMPLES NACIONAL - MEI - LUCAS DRIO VERDE (MT) - 02/2026",
                        "periodoApuracao": 202602,
                        "valores": {
                            "juros": 0.0,
                            "multa": 0.0,
                            "principal": 5.0,
                            "total": 5.0
                        }
                    }
                ]
            }
        ]
    }
]
```

### Exemplo 8 — other

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
        "idSistema": "PGMEI",
        "idServico": "GERARDASCODBARRA22",
        "versaoSistema": "1.0",
        "dados": "{ \"periodoApuracao\": \"202603\" }"
    },
    "status": 200,
    "responseId": "143fb23f-0f8b-4590-9920-9ceed24d0df1",
    "responseDateTime": "2026-03-13T08:12:53.370Z",
    "dados": "[{\"cnpjCompleto\":\"11111111111111\",\"razaoSocial\":\"AAUVAAAIWWAA 00000000000\",\"detalhamento\":[{\"periodoApuracao\":\"202603\\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"20260420\\"dataLimiteAcolhimento\":\"20260420\",\"valores\":{\"principal\":86.0\"multa\":0.0,\"juros\":0.0,\"total\":86.05},\"codigoDeBarras\[\"000000000000\",\"000000000000\",\"000000000000\",\"000000000000\"\"observacao1\":\"CPF: 000.000.000-00\",\"observacao2\":\"Tributos (R$)INSS 81,05 ICMS 0,00 ISS 5,00\",\"observacao3\":\"PGMEI(Versao:3.16.2)\\"composicao\":[{\"periodoApuracao\":202603,\"codigo\":\"0151\\"denominacao\":\"INSS - SIMPLES NACIONAL - MEI - 03/2026\",\"valores\{\"principal\":81.05,\"multa\":0.0,\"juros\":0.0,\"total\":81.05}{\"periodoApuracao\":202603,\"codigo\":\"0125\",\"denominacao\":\"ISS SIMPLES NACIONAL - MEI - LUCAS DO RIO VERDE (MT) - 03/2026\",\"valores\{\"principal\":5.00,\"multa\":0.0,\"juros\":0.0,\"total\":5.00}}]}]}]",
    "mensagens": [
        {
            "codigo": "[Sucesso-PGMEI]",
            "texto": "Requisição efetuada com sucesso."
        }
    ]
}
```

### Exemplo 9 — other

Fonte oficial:

```text
[
    {
        "cnpjCompleto": "11111111111111",
        "razaoSocial": "AAUVAA AAIWWAA"
        "detalhamento": [
            {
                "periodoApuracao": "202603",
                "dataLimiteAcolhimento": "20260420",
                "dataVencimento": "20260420",
                "numeroDocumento": "00000000000000000",
                "valores": {
                    "juros": 0.0,
                    "multa": 0.0,
                    "principal": 86.05,
                    "total": 86.05
                },
                "codigoDeBarras": [
                    "000000000000",
                    "000000000000",
                    "000000000000",
                    "000000000000"
                ],
                "observacao1": "CPF: 000.000.000-00",
                "observacao2": "Tributos (R$): INSS 81,05 ICMS 0,00 ISS 5,00",
                "observacao3": "PGMEI(Versao:3.16.2)",
                "composicao": [
                    {
                        "codigo": "0151",
                        "denominacao": "INSS - SIMPLES NACIONAL - MEI - 03/2026",
                        "periodoApuracao": 202603,
                        "valores": {
                            "juros": 0.0,
                            "multa": 0.0,
                            "principal": 81.05,
                            "total": 81.05
                        }
                    },
                    {
                        "codigo": "0125",
                        "denominacao": "ISS - SIMPLES NACIONAL - MEI - LUCAS DRIO VERDE (MT) - 03/2026",
                        "periodoApuracao": 202603,
                        "valores": {
                            "juros": 0.0,
                            "multa": 0.0,
                            "principal": 5.0,
                            "total": 5.0
                        }
                    }
                ]
            }
        ]
    }
]
```

### Exemplo 10 — other

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
        "idSistema": "PGMEI",
        "idServico": "GERARDASCODBARRA22",
        "versaoSistema": "1.0",
        "dados": "{ \"periodoApuracao\": \"202701\" }"
    },
    "status": 400,
    "responseId": "200967e9-9519-45e8-a30c-00eca70539ea",
    "responseDateTime": "2026-03-13T08:39:44.237Z",
    "dados": "",
    "mensagens": [
        {
            "codigo": "[EntradaIncorreta-PGMEI-MSG_23030]",
            "texto": "Parâmetro de entrada inválido. Período de Apuração futuro."
        }
    ]
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
    "numero": "11111111111111",
    "tipo": 2
  },
  "pedidoDados": {
    "idSistema": "PGMEI",
    "idServico": "GERARDASCODBARRA22",
    "versaoSistema": "1.0",
    "dados": "{ \"periodoApuracao\": \"202701\" }"
  },
  "status": 400,
  "responseId": "200967e9-9519-45e8-a30c-00eca70539ea",
  "responseDateTime": "2026-03-13T08:39:44.237Z",
  "dados": "",
  "mensagens": [
    {
      "codigo": "[EntradaIncorreta-PGMEI-MSG_23030]",
      "texto": "Parâmetro de entrada inválido. Período de Apuração futuro."
    }
  ]
}
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-mei/pgmei/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-mei/pgmei/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/dados_de_dominio/)

## Anomalias

- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/exemplos/retorno_gerar_das_cod_barras/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/servicos/gerar_das_cod_barras/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/exemplos/retorno_gerar_das_cod_barras/)

- Última atualização informada pela fonte: 10 de abril de 2026 14:58:42 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `b7f2e8ba3f60d87cf00a18b2b0435de940dbae3c984f6c16dd1febb728e2e028`
