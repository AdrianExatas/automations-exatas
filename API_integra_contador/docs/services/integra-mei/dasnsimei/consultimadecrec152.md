---
key: "DASNSIMEI.CONSULTIMADECREC152"
family: "integra-mei"
systemId: "DASNSIMEI"
serviceId: "CONSULTIMADECREC152"
version: null
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar Declaração

Consulta uma cópia da última declaração transmitida à RFB em um determinado ano-calendário.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `DASNSIMEI.CONSULTIMADECREC152` |
| Família | `integra-mei` |
| Caminho físico | `POST /Consultar` |
| Versão | Não informada |
| Situação oficial | Não informada |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00229) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada | cnpjCompleto | String (14) [AAAAAAAAAAAAAA] | SIM | — | CNPJ completo do contribuinte. Deve-se informar o CNPJ sem máscara de formatação. |
| Dados de Entrada | anoCalendario | Number (4) | SIM | — | Ano-calendário para o qual se deseja entregar a declaração. |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | String (3) | — | — | Código retornado no acionamento do serviço. |
| Dados de Saída | dados | Array de object declaracaoTransmitida | — | — | Estrutura de dados de retorno. |
| Dados de Saída | mensagens | Array de object mensagens | — | — | Mensagem explicativa retornada no acionamento do serviço. |
| Dados de Saída | cnpjCompleto | String (14) [AAAAAAAAAAAAAA] | — | — | CNPJ completo do contribuinte. |
| Dados de Saída | anoCalendario | Number (4) | — | — | Ano-calendário da declaração transmitida. |
| Dados de Saída | nomeEmpresarial | String | — | — | Razão social do contribuinte |
| Dados de Saída | ocupacaoProfissional | String | — | — | Texto informativo de ocupação profissional do contribuinte MEI TAC. |
| Dados de Saída | idDeclaracao | String (15) [AAAAAAAAYYYYSSS] | — | — | ID da declaração transmitida. |
| Dados de Saída | dataTransmissao | Datetime [yyyy-mm-dd hh:mm:ss.fff] | — | — | Data e hora da transmissão da declaração |
| Dados de Saída | codigoTipoDeclaracao | Number (1) | — | — | Tipo da declaração transmitida: 1) Original 2) Retificadora 3) Original com Situação Especial 4) Retificadora com Situação Especial 5) Retificadora automática |
| Dados de Saída | reciboEntrega | Object reciboEntrega | — | — | Estrutura para o PDF do recibo da declaração. |
| Dados de Saída | excessoReceitaBruta | Object excessoReceita | — | — | Estrutura com o detalhamento sobre o DAS de excesso de receita bruta. |
| Dados de Saída | multaAtrasoEntrega | Object multaAtrasoEntrega | — | — | Estrutura com PDF da notificação por atraso de entrega (MAED), PDF do DARF da multa e detalhamento do documento de arrecadação (DARF-MAED). |
| Dados de Saída | numeroRecibo | String (17) | — | — | Número do recibo da declaração. |
| Dados de Saída | recibo | Object arquivoPdf | — | — | Estrutura para o PDF do recibo de entrega. |
| Dados de Saída | valorLimite | Number (0 a 99999999.99) | — | — | Valor do Limite da Receita Bruta. |
| Dados de Saída | valorExcedido | Number (0 a 99999999.99) | — | — | Valor que excedeu o limite de Receita Bruta. |
| Dados de Saída | apurado | Array de object valoresApurado | — | — | Estrutura que detalha os valores apurados para o DAS de excesso de receita bruta. |
| Dados de Saída | dasExcessoReceita | Object documentoArrecadacao | — | — | Estrutura com o detalhamento do documento de arrecadação (DAS de excesso de receita bruta). |
| Dados de Saída | notificacaoMaed | Object arquivoPdf | — | — | Estrutura para o PDF da notificação MAED. |
| Dados de Saída | darf | Object documentoArrecadacao | — | — | Estrutura com o detalhamento do documento de arrecadação (DARF MAED). |
| Dados de Saída | nomeArquivo | String | — | — | Nome do arquivo para o PDF |
| Dados de Saída | pdf | String | — | — | Conteúdo do PDF codificado em base 64. |
| Dados de Saída | periodoApuracao | String (6) | — | — | Período de apuração no formato AAAAMM |
| Dados de Saída | numeroDocumento | String (17) | — | — | Número do documento de arrecadação. |
| Dados de Saída | dataVencimento | String | — | — | Data de vencimento no formato data (DD/MM/YYYY) |
| Dados de Saída | dataLimiteAcolhimento | String | — | — | Data de validade no formato data (DD/MM/YYYY) |
| Dados de Saída | observacao1 | String (50) | — | — | Campo observação 1 |
| Dados de Saída | observacao2 | String (50) | — | — | Campo observação 2 |
| Dados de Saída | observacao3 | String (50) | — | — | Campo observação 3 |
| Dados de Saída | valores | Object valores | — | — | Estrutura com os valores do documento. |
| Dados de Saída | composicao | Array de object composicao | — | — | Estrutura com as composições do documento. |
| Dados de Saída | documento | Object arquivoPdf | — | — | Estrutura para o PDF do Documento de Arrecadação. |
| Dados de Saída | valorPrincipal | Number (0 a 99999999.99) | — | — | Valor principal. |
| Dados de Saída | valorMulta | Number (0 a 99999999.99) | — | — | Valor da multa. |
| Dados de Saída | valorJuros | Number (0 a 99999999.99) | — | — | Valor dos juros. |
| Dados de Saída | valorTotal | Number (0 a 99999999.99) | — | — | Valor total. |
| Dados de Saída | valorInss | Number (0 a 99999999.99) | — | — | Valor apurado para o tributo INSS. |
| Dados de Saída | valorIcms | Number (0 a 99999999.99) | — | — | Valor apurado para o tributo ICMS |
| Dados de Saída | valorIss | Number (0 a 99999999.99) | — | — | Valor apurado para o tributo ICMS. |
| Dados de Saída | periodoApuracao | Number (6) | — | — | Período de apuração no formato AAAAMM |
| Dados de Saída | codigo | Number (4) | — | — | Código de receita. |
| Dados de Saída | denominacao | String (50) | — | — | Denominação do código de receita. |
| Dados de Saída | codigo | String | — | — | Código da mensagem. |
| Dados de Saída | texto | String | — | — | Texto da mensagem. |

## Exemplos oficiais e normalizados

### Exemplo 1 — request

Fonte oficial:

```text
{
    "contratante": {
        "numero": "11111111111111",
        "tipo": 2
    },
    "autorPedidoDados": {
        "numero": "11111111111111",
        "tipo": 2
    },
    "contribuinte": {
        "numero": "11111111111111",
        "tipo": 2
    },
    "pedidoDados": {
        "idSistema": "DASNSIMEI",
        "idServico": "CONSULTIMADECREC152",
        "versaoSistema": "1.0",
        "dados": "{\"cnpjCompleto\":\"11111111111111\", anoCalendario\":\"2022\"}"
    }
}
```

### Exemplo 2 — response

Fonte oficial:

```text
{
    "contratante": {
        "numero": "11111111111111",
        "tipo": 2
    },
    "autorPedidoDados": {
        "numero": "11111111111111",
        "tipo": 2
    },
    "contribuinte": {
        "numero": "11111111111111",
        "tipo": 2
    },
    "pedidoDados": {
        "idSistema": "DASNSIMEI",
        "idServico": "CONSULTIMADECREC152",
        "versaoSistema": "1.0",
        "dados": "{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":\"2022\"}"
    },
    "status": 200,
    "responseId": "a0aaaa0a-0a0a-00a0-a0aa-00000aa00a00",
    "responseDateTime": "2026-02-23T15:06:47.053Z",
    "dados": "[{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":2022,\"nomeEmpresarial\":\"NOMEEMPRESARIAL\",\"idDeclaracao\":\"111111112022001\",\"dataTransmissao\":\"2023-01-09T10:46:17.49\",\"codigoTipoDeclaracao\":\"1\",\"reciboEntrega\":{\"numeroRecibo\":\"00000000000000000\",\"recibo\":{\"nomeArquivo\":\"DASNSIMEI-Recibo-111111112022001.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_196960>\"}}},{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":2022,\"nomeEmpresarial\":\"11.111.111NOMEEMPRESARIAL\",\"ocupacaoProfissional\":\"Transportadorautônomodecargas,nostermosdaResoluçãoCGSNnº140/2018,art.100,§1º-A,eTabelaBdoAnexoXI.\",\"idDeclaracao\":\"111111112022002\",\"dataTransmissao\":\"2024-10-23T09:26:45.17\",\"codigoTipoDeclaracao\":\"5\",\"reciboEntrega\":{\"numeroRecibo\":\"00000000000000000\",\"recibo\":{\"nomeArquivo\":\"DASNSIMEI-Recibo-111111112022002.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_185056>\"}},\"excessoReceitaBruta\":{\"valorLimite\":251600.00,\"valorExcedido\":1027.38,\"apurado\":{\"valorInss\":49.94,\"valorIss\":36.82,\"valorTotal\":86.76},\"dasExcessoReceita\":{\"periodoApuracao\":\"202212\",\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"22/02/2023\",\"dataLimiteAcolhimento\":\"29/11/2024\",\"observacao1\":\"CPF:000.000.000-00\",\"observacao2\":\"INSS:49,94ICMS:0,00ISS:36,82\",\"valores\":{\"valorPrincipal\":86.76,\"valorMulta\":17.35,\"valorJuros\":17.29,\"valorTotal\":121.40},\"composicao\":[{\"periodoApuracao\":\"202212\",\"codigo\":\"0151\",\"denominacao\":\"INSS-SIMPLESNACIONAL-MEI\",\"valores\":{\"valorPrincipal\":49.94,\"valorMulta\":9.99,\"valorJuros\":9.95,\"valorTotal\":69.88}},{\"periodoApuracao\":\"202212\",\"codigo\":\"0125\",\"denominacao\":\"ISS-SIMPLESNACIONAL-MEI\",\"valores\":{\"valorPrincipal\":36.82,\"valorMulta\":7.36,\"valorJuros\":7.34,\"valorTotal\":51.52}}]}}},{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":2022,\"nomeEmpresarial\":\"11.111.111NOMEEMPRESARIAL\",\"ocupacaoProfissional\":\"Transportadorautônomodecargas,nostermosdaResoluçãoCGSNnº140/2018,art.100,§1º-A,eTabelaBdoAnexoXI.\",\"idDeclaracao\":\"111111112022003\",\"dataTransmissao\":\"2025-04-16T10:30:19.51\",\"codigoTipoDeclaracao\":\"2\",\"reciboEntrega\":{\"numeroRecibo\":\"00000000000000000\",\"recibo\":{\"nomeArquivo\":\"DASNSIMEI-Recibo-111111112022003.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_185056>\"}},\"multaAtrasoEntrega\":{\"notificacaoMaed\":{\"nomeArquivo\":\"DASNSIMEI-Notificacao-111111112022003.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_133464>\"},\"darf\":{\"periodoApuracao\":\"20230601\",\"dataVencimento\":\"16/05/2025\",\"dataLimiteAcolhimento\":\"16/05/2025\",\"observacao1\":\"DARFválidoparapagamentoatéovencimento\",\"observacao2\":\"\",\"observacao3\":\"DASNSIMEIv2.7.4.0\",\"valores\":{\"valorPrincipal\":77.54,\"valorTotal\":77.54},\"composicao\":[{\"periodoApuracao\":\"20230601\",\"codigo\":\"1506\",\"denominacao\":\"MULTAPORATRASONAENTREGADADASN-SIMEI\",\"valores\":{\"valorPrincipal\":77.54,\"valorTotal\":77.54}}],\"documento\":{\"nomeArquivo\":\"DASNSIMEI-DARF-MAED-111111112022003.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_295644>\"}}}}]",
    "mensagens": [
        {
            "codigo": "[Aviso-DASNSIMEI-00000]",
            "texto": "Consulta declaração transmitida realizada com sucesso."
        }
    ]
}
```

Forma normalizada:

```json
{
  "contratante": {
    "numero": "11111111111111",
    "tipo": 2
  },
  "autorPedidoDados": {
    "numero": "11111111111111",
    "tipo": 2
  },
  "contribuinte": {
    "numero": "11111111111111",
    "tipo": 2
  },
  "pedidoDados": {
    "idSistema": "DASNSIMEI",
    "idServico": "CONSULTIMADECREC152",
    "versaoSistema": "1.0",
    "dados": "{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":\"2022\"}"
  },
  "status": 200,
  "responseId": "a0aaaa0a-0a0a-00a0-a0aa-00000aa00a00",
  "responseDateTime": "2026-02-23T15:06:47.053Z",
  "dados": "[{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":2022,\"nomeEmpresarial\":\"NOMEEMPRESARIAL\",\"idDeclaracao\":\"111111112022001\",\"dataTransmissao\":\"2023-01-09T10:46:17.49\",\"codigoTipoDeclaracao\":\"1\",\"reciboEntrega\":{\"numeroRecibo\":\"00000000000000000\",\"recibo\":{\"nomeArquivo\":\"DASNSIMEI-Recibo-111111112022001.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_196960>\"}}},{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":2022,\"nomeEmpresarial\":\"11.111.111NOMEEMPRESARIAL\",\"ocupacaoProfissional\":\"Transportadorautônomodecargas,nostermosdaResoluçãoCGSNnº140/2018,art.100,§1º-A,eTabelaBdoAnexoXI.\",\"idDeclaracao\":\"111111112022002\",\"dataTransmissao\":\"2024-10-23T09:26:45.17\",\"codigoTipoDeclaracao\":\"5\",\"reciboEntrega\":{\"numeroRecibo\":\"00000000000000000\",\"recibo\":{\"nomeArquivo\":\"DASNSIMEI-Recibo-111111112022002.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_185056>\"}},\"excessoReceitaBruta\":{\"valorLimite\":251600.00,\"valorExcedido\":1027.38,\"apurado\":{\"valorInss\":49.94,\"valorIss\":36.82,\"valorTotal\":86.76},\"dasExcessoReceita\":{\"periodoApuracao\":\"202212\",\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"22/02/2023\",\"dataLimiteAcolhimento\":\"29/11/2024\",\"observacao1\":\"CPF:000.000.000-00\",\"observacao2\":\"INSS:49,94ICMS:0,00ISS:36,82\",\"valores\":{\"valorPrincipal\":86.76,\"valorMulta\":17.35,\"valorJuros\":17.29,\"valorTotal\":121.40},\"composicao\":[{\"periodoApuracao\":\"202212\",\"codigo\":\"0151\",\"denominacao\":\"INSS-SIMPLESNACIONAL-MEI\",\"valores\":{\"valorPrincipal\":49.94,\"valorMulta\":9.99,\"valorJuros\":9.95,\"valorTotal\":69.88}},{\"periodoApuracao\":\"202212\",\"codigo\":\"0125\",\"denominacao\":\"ISS-SIMPLESNACIONAL-MEI\",\"valores\":{\"valorPrincipal\":36.82,\"valorMulta\":7.36,\"valorJuros\":7.34,\"valorTotal\":51.52}}]}}},{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":2022,\"nomeEmpresarial\":\"11.111.111NOMEEMPRESARIAL\",\"ocupacaoProfissional\":\"Transportadorautônomodecargas,nostermosdaResoluçãoCGSNnº140/2018,art.100,§1º-A,eTabelaBdoAnexoXI.\",\"idDeclaracao\":\"111111112022003\",\"dataTransmissao\":\"2025-04-16T10:30:19.51\",\"codigoTipoDeclaracao\":\"2\",\"reciboEntrega\":{\"numeroRecibo\":\"00000000000000000\",\"recibo\":{\"nomeArquivo\":\"DASNSIMEI-Recibo-111111112022003.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_185056>\"}},\"multaAtrasoEntrega\":{\"notificacaoMaed\":{\"nomeArquivo\":\"DASNSIMEI-Notificacao-111111112022003.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_133464>\"},\"darf\":{\"periodoApuracao\":\"20230601\",\"dataVencimento\":\"16/05/2025\",\"dataLimiteAcolhimento\":\"16/05/2025\",\"observacao1\":\"DARFválidoparapagamentoatéovencimento\",\"observacao2\":\"\",\"observacao3\":\"DASNSIMEIv2.7.4.0\",\"valores\":{\"valorPrincipal\":77.54,\"valorTotal\":77.54},\"composicao\":[{\"periodoApuracao\":\"20230601\",\"codigo\":\"1506\",\"denominacao\":\"MULTAPORATRASONAENTREGADADASN-SIMEI\",\"valores\":{\"valorPrincipal\":77.54,\"valorTotal\":77.54}}],\"documento\":{\"nomeArquivo\":\"DASNSIMEI-DARF-MAED-111111112022003.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_295644>\"}}}}]",
  "mensagens": [
    {
      "codigo": "[Aviso-DASNSIMEI-00000]",
      "texto": "Consulta declaração transmitida realizada com sucesso."
    }
  ]
}
```

### Exemplo 3 — other

Fonte oficial:

```text
[
    {
        "cnpjCompleto": "11111111111111",
        "anoCalendario": 2022,
        "nomeEmpresarial": "NOME EMPRESARIAL",
        "idDeclaracao": "111111112022001",
        "dataTransmissao": "2023-01-09T10:46:17.49",
        "codigoTipoDeclaracao": "1",
        "reciboEntrega": {
            "numeroRecibo": "00000000000000000",
            "recibo": {
                "nomeArquivo": "DASNSIMEI-Recibo-111111112022001.pdf",
                "pdf": "<BASE64_REMOVIDO_TAMANHO_196960>"
            }
        }
    },
    {
        "cnpjCompleto": "11111111111111",
        "anoCalendario": 2022,
        "nomeEmpresarial": "11.111.111 NOME EMPRESARIAL",
        "ocupacaoProfissional": "Transportador autônomo de cargas, nos termos da Resolução CGSN nº 140/2018, art. 100, §1º-A, e Tabela B do Anexo XI.",
        "idDeclaracao": "111111112022002",
        "dataTransmissao": "2024-10-23T09:26:45.17",
        "codigoTipoDeclaracao": "5",
        "reciboEntrega": {
            "numeroRecibo": "00000000000000000",
            "recibo": {
                "nomeArquivo": "DASNSIMEI-Recibo-111111112022002.pdf",
                "pdf": "<BASE64_REMOVIDO_TAMANHO_185056>"
            }
        },
        "excessoReceitaBruta": {
            "valorLimite": 251600.00,
            "valorExcedido": 1027.38,
            "apurado": {
                "valorInss": 49.94,
                "valorIss": 36.82,
                "valorTotal": 86.76
            },
            "dasExcessoReceita": {
                "periodoApuracao": "202212",
                "numeroDocumento": "00000000000000000",
                "dataVencimento": "22/02/2023",
                "dataLimiteAcolhimento": "29/11/2024",
                "observacao1": "CPF: 000.000.000-00",
                "observacao2": "INSS: 49,94 ICMS: 0,00 ISS: 36,82",
                "valores": {
                    "valorPrincipal": 86.76,
                    "valorMulta": 17.35,
                    "valorJuros": 17.29,
                    "valorTotal": 121.40
                },
                "composicao": [
                    {
                        "periodoApuracao": "202212",
                        "codigo": "0151",
                        "denominacao": "INSS - SIMPLES NACIONAL - MEI",
                        "valores": {
                            "valorPrincipal": 49.94,
                            "valorMulta": 9.99,
                            "valorJuros": 9.95,
                            "valorTotal": 69.88
                        }
                    },
                    {
                        "periodoApuracao": "202212",
                        "codigo": "0125",
                        "denominacao": "ISS - SIMPLES NACIONAL - MEI",
                        "valores": {
                            "valorPrincipal": 36.82,
                            "valorMulta": 7.36,
                            "valorJuros": 7.34,
                            "valorTotal": 51.52
                        }
                    }
                ]
            }
        }
    },
    {
        "cnpjCompleto": "11111111111111",
        "anoCalendario": 2022,
        "nomeEmpresarial": "11.111.111 NOME EMPRESARIAL",
        "ocupacaoProfissional": "Transportador autônomo de cargas, nos termos da Resolução CGSN nº 140/2018, art. 100, §1º-A, e Tabela B do Anexo XI.",
        "idDeclaracao": "111111112022003",
        "dataTransmissao": "2025-04-16T10:30:19.51",
        "codigoTipoDeclaracao": "2",
        "reciboEntrega": {
            "numeroRecibo": "00000000000000000",
            "recibo": {
                "nomeArquivo": "DASNSIMEI-Recibo-111111112022003.pdf",
                "pdf": "<BASE64_REMOVIDO_TAMANHO_185056>"
            }
        },
        "multaAtrasoEntrega": {
            "notificacaoMaed": {
                "nomeArquivo": "DASNSIMEI-Notificacao-111111112022003.pdf",
                "pdf": "<BASE64_REMOVIDO_TAMANHO_133464>"
            },
            "darf": {
                "periodoApuracao": "20230601",
                "dataVencimento": "16/05/2025",
                "dataLimiteAcolhimento": "16/05/2025",
                "observacao1": "DARF válido para pagamento até o vencimento",
                "observacao2": "",
                "observacao3": "DASNSIMEI v2.7.4.0",
                "valores": {
                    "valorPrincipal": 77.54,
                    "valorTotal": 77.54
                },
                "composicao": [
                    {
                        "periodoApuracao": "20230601",
                        "codigo": "1506",
                        "denominacao": "MULTA POR ATRASO NA ENTREGA DA DASN - SIMEI",
                        "valores": {
                            "valorPrincipal": 77.54,
                            "valorTotal": 77.54
                        }
                    }
                ],
                "documento": {
                    "nomeArquivo": "DASNSIMEI-DARF-MAED-111111112022003.pdf",
                    "pdf": "<BASE64_REMOVIDO_TAMANHO_295644>"
                }
            }
        }
    }
]
```

Forma normalizada:

```json
[
  {
    "cnpjCompleto": "11111111111111",
    "anoCalendario": 2022,
    "nomeEmpresarial": "NOME EMPRESARIAL",
    "idDeclaracao": "111111112022001",
    "dataTransmissao": "2023-01-09T10:46:17.49",
    "codigoTipoDeclaracao": "1",
    "reciboEntrega": {
      "numeroRecibo": "00000000000000000",
      "recibo": {
        "nomeArquivo": "DASNSIMEI-Recibo-111111112022001.pdf",
        "pdf": "<BASE64_REMOVIDO_TAMANHO_196960>"
      }
    }
  },
  {
    "cnpjCompleto": "11111111111111",
    "anoCalendario": 2022,
    "nomeEmpresarial": "11.111.111 NOME EMPRESARIAL",
    "ocupacaoProfissional": "Transportador autônomo de cargas, nos termos da Resolução CGSN nº 140/2018, art. 100, §1º-A, e Tabela B do Anexo XI.",
    "idDeclaracao": "111111112022002",
    "dataTransmissao": "2024-10-23T09:26:45.17",
    "codigoTipoDeclaracao": "5",
    "reciboEntrega": {
      "numeroRecibo": "00000000000000000",
      "recibo": {
        "nomeArquivo": "DASNSIMEI-Recibo-111111112022002.pdf",
        "pdf": "<BASE64_REMOVIDO_TAMANHO_185056>"
      }
    },
    "excessoReceitaBruta": {
      "valorLimite": 251600,
      "valorExcedido": 1027.38,
      "apurado": {
        "valorInss": 49.94,
        "valorIss": 36.82,
        "valorTotal": 86.76
      },
      "dasExcessoReceita": {
        "periodoApuracao": "202212",
        "numeroDocumento": "00000000000000000",
        "dataVencimento": "22/02/2023",
        "dataLimiteAcolhimento": "29/11/2024",
        "observacao1": "CPF: 000.000.000-00",
        "observacao2": "INSS: 49,94 ICMS: 0,00 ISS: 36,82",
        "valores": {
          "valorPrincipal": 86.76,
          "valorMulta": 17.35,
          "valorJuros": 17.29,
          "valorTotal": 121.4
        },
        "composicao": [
          {
            "periodoApuracao": "202212",
            "codigo": "0151",
            "denominacao": "INSS - SIMPLES NACIONAL - MEI",
            "valores": {
              "valorPrincipal": 49.94,
              "valorMulta": 9.99,
              "valorJuros": 9.95,
              "valorTotal": 69.88
            }
          },
          {
            "periodoApuracao": "202212",
            "codigo": "0125",
            "denominacao": "ISS - SIMPLES NACIONAL - MEI",
            "valores": {
              "valorPrincipal": 36.82,
              "valorMulta": 7.36,
              "valorJuros": 7.34,
              "valorTotal": 51.52
            }
          }
        ]
      }
    }
  },
  {
    "cnpjCompleto": "11111111111111",
    "anoCalendario": 2022,
    "nomeEmpresarial": "11.111.111 NOME EMPRESARIAL",
    "ocupacaoProfissional": "Transportador autônomo de cargas, nos termos da Resolução CGSN nº 140/2018, art. 100, §1º-A, e Tabela B do Anexo XI.",
    "idDeclaracao": "111111112022003",
    "dataTransmissao": "2025-04-16T10:30:19.51",
    "codigoTipoDeclaracao": "2",
    "reciboEntrega": {
      "numeroRecibo": "00000000000000000",
      "recibo": {
        "nomeArquivo": "DASNSIMEI-Recibo-111111112022003.pdf",
        "pdf": "<BASE64_REMOVIDO_TAMANHO_185056>"
      }
    },
    "multaAtrasoEntrega": {
      "notificacaoMaed": {
        "nomeArquivo": "DASNSIMEI-Notificacao-111111112022003.pdf",
        "pdf": "<BASE64_REMOVIDO_TAMANHO_133464>"
      },
      "darf": {
        "periodoApuracao": "20230601",
        "dataVencimento": "16/05/2025",
        "dataLimiteAcolhimento": "16/05/2025",
        "observacao1": "DARF válido para pagamento até o vencimento",
        "observacao2": "",
        "observacao3": "DASNSIMEI v2.7.4.0",
        "valores": {
          "valorPrincipal": 77.54,
          "valorTotal": 77.54
        },
        "composicao": [
          {
            "periodoApuracao": "20230601",
            "codigo": "1506",
            "denominacao": "MULTA POR ATRASO NA ENTREGA DA DASN - SIMEI",
            "valores": {
              "valorPrincipal": 77.54,
              "valorTotal": 77.54
            }
          }
        ],
        "documento": {
          "nomeArquivo": "DASNSIMEI-DARF-MAED-111111112022003.pdf",
          "pdf": "<BASE64_REMOVIDO_TAMANHO_295644>"
        }
      }
    }
  }
]
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-mei/dasnsimei/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-mei/dasnsimei/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/dados_de_dominio/)

## Anomalias

- **warning / official-pedido-dados-invalid-json:** O envelope oficial é JSON válido, mas o JSON escapado em pedidoDados.dados é inválido. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/servicos/consultar_declaracao/))
- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/exemplos/retorno_consultar_declaracao/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/servicos/consultar_declaracao/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/exemplos/retorno_consultar_declaracao/)

- Última atualização informada pela fonte: 7 de maio de 2026 12:28:23 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `13fdd27ee269881a831d7522a34079b616de05fd4ca5920d1965dc7315aebfb2`
