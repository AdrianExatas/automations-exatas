---
key: "DASNSIMEI.TRANSDECLARACAO151"
family: "integra-mei"
systemId: "DASNSIMEI"
serviceId: "TRANSDECLARACAO151"
version: null
operationPath: "Declarar"
sourceStatus: "fetched"
---

# Entregar Declaração

Permite a entrega da declaração anual do MEI (DASN-SIMEI).

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `DASNSIMEI.TRANSDECLARACAO151` |
| Família | `integra-mei` |
| Caminho físico | `POST /Declarar` |
| Versão | Não informada |
| Situação oficial | Não informada |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Não indicada |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada | cnpjCompleto | String (14) [AAAAAAAAAAAAAA] | SIM | — | CNPJ completo do contribuinte. Deve-se informar o CNPJ sem máscara de formatação. |
| Dados de Entrada | anoCalendario | Number (4) | SIM | — | Ano-calendário para o qual se deseja entregar a declaração. |
| Dados de Entrada | declaracao | Object declaracaoEntrega | SIM | — | Estrutura com os dados da declaração |
| Dados de Entrada | valorReceitaComercio | Number (0 a 99999999.99) | SIM | — | Valor da receita bruta anual para comércio, indústria, receitas de transporte intermunicipal e interestadual e fornecimento de refeições. |
| Dados de Entrada | valorReceitaServico | Number (0 a 99999999.99) | SIM | — | Valor da receita bruta anual para prestação de serviços, locação e demais receitas da atividade sem incidência de ICMS e ISS, exceto transporte intermunicipal e interestadual. |
| Dados de Entrada | indicadorEmpregado | Boolean | SIM | — | Indica se possuiu empregado durante o período abrangido pela declaração. |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | String (3) | — | — | Código retornado no acionamento do serviço. |
| Dados de Saída | dados | Object declaracaoTransmitida | — | — | Estrutura de dados de retorno. |
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
        "idServico": "TRANSDECLARACAO151",
        "versaoSistema": "1.0",
        "dados": "{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":\"2025\",\"declaracao\":{\"valorReceitaComercio\":82000.0,\"valorReceitaServico\":0.0,\"indicadorEmpregado\":false}}"
    }
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
    "idServico": "TRANSDECLARACAO151",
    "versaoSistema": "1.0",
    "dados": "{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":\"2025\",\"declaracao\":{\"valorReceitaComercio\":82000.0,\"valorReceitaServico\":0.0,\"indicadorEmpregado\":false}}"
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
        "idServico": "TRANSDECLARACAO151",
        "versaoSistema": "1.0",
        "dados": "{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":\"2025\",\"declaracao\":{\"valorReceitaComercio\":82000.0,\"valorReceitaServico\":0.0,\"indicadorEmpregado\":false}}"
    },
    "status": 200,
    "responseId": "a0aaaa0a-0a0a-00a0-a0aa-00000aa00a00",
    "responseDateTime": "2026-02-23T16:04:44.402Z",
    "dados": "{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":2025,\"nomeEmpresarial\":\"11.111.111NOMEEMPRESARIAL\",\"ocupacaoProfissional\":\"Transportadorautônomodecargas,nostermosdaResoluçãoCGSNnº140/2018,art.100,§1º-A,eTabelaBdoAnexoXI.\",\"idDeclaracao\":\"111111112025001\",\"dataTransmissao\":\"2026-08-26T12:03:22.7191485-03:00\",\"codigoTipoDeclaracao\":\"1\",\"reciboEntrega\":{\"numeroRecibo\":\"00000000000000000\",\"recibo\":{\"nomeArquivo\":\"DASNSIMEI-Recibo-111111112025001.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_174252>\"}},\"multaAtrasoEntrega\":{\"notificacaoMaed\":{\"nomeArquivo\":\"DASNSIMEI-Notificacao-111111112025001.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_135712>\"},\"darf\":{\"periodoApuracao\":\"20260601\",\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"24/09/2026\",\"dataLimiteAcolhimento\":\"24/09/2026\",\"observacao1\":\"Válidoparapagamentocomreduçãoaté24/09/2026\",\"observacao2\":\"\",\"observacao3\":\"\",\"valores\":{\"valorPrincipal\":25.4,\"valorTotal\":25.4},\"composicao\":[{\"periodoApuracao\":\"20260601\",\"codigo\":\"1506\",\"denominacao\":\"MULTAPORATRASONAENTREGADADASN-SIMEI\",\"valores\":{\"valorPrincipal\":25.4,\"valorTotal\":25.4}}],\"documento\":{\"nomeArquivo\":\"DASNSIMEI-DARF-MAED-111111112025001.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_295816>\"}}}}"
    "mensagens": [
        {
            "codigo": "[Aviso-DASNSIMEI-00000]",
            "texto": "Declaração transmitida com sucesso."
        }
    ]
}
```

### Exemplo 3 — other

Fonte oficial:

```text
{
    "cnpjCompleto": "11111111111111",
    "anoCalendario": 2025,
    "nomeEmpresarial": "11.111.111 NOME EMPRESARIAL",
    "ocupacaoProfissional": "Transportador autônomo de cargas, nos termos da Resolução CGSN nº 140/2018, art. 100, §1º-A, e Tabela B do Anexo XI.",
    "idDeclaracao": "111111112025001",
    "dataTransmissao": "2026-08-26T12:03:22.7191485-03:00",
    "codigoTipoDeclaracao": "1",
    "reciboEntrega": {
        "numeroRecibo": "00000000000000000",
        "recibo": {
            "nomeArquivo": "DASNSIMEI-Recibo-111111112025001.pdf",
            "pdf": "<BASE64_REMOVIDO_TAMANHO_174252>"
        }
    },
    "multaAtrasoEntrega": {
        "notificacaoMaed": {
            "nomeArquivo": "DASNSIMEI-Notificacao-111111112025001.pdf",
            "pdf": "<BASE64_REMOVIDO_TAMANHO_135712>"
        },
        "darf": {
            "periodoApuracao": "20260601",
            "numeroDocumento": "00000000000000000",
            "dataVencimento": "24/09/2026",
            "dataLimiteAcolhimento": "24/09/2026",
            "observacao1": "Válido para pagamento com redução até 24/09/2026",
            "observacao2": "",
            "observacao3": "",
            "valores": {
                "valorPrincipal": 25.4,
                "valorTotal": 25.4
            },
            "composicao": [
                {
                    "periodoApuracao": "20260601",
                    "codigo": "1506",
                    "denominacao": "MULTA POR ATRASO NA ENTREGA DA DASN - SIMEI",
                    "valores": {
                        "valorPrincipal": 25.4,
                        "valorTotal": 25.4
                    }
                }
            ],
            "documento": {
                "nomeArquivo": "DASNSIMEI-DARF-MAED-111111112025001.pdf",
                "pdf": "<BASE64_REMOVIDO_TAMANHO_295816>"
            }
        }
    }
}
```

Forma normalizada:

```json
{
  "cnpjCompleto": "11111111111111",
  "anoCalendario": 2025,
  "nomeEmpresarial": "11.111.111 NOME EMPRESARIAL",
  "ocupacaoProfissional": "Transportador autônomo de cargas, nos termos da Resolução CGSN nº 140/2018, art. 100, §1º-A, e Tabela B do Anexo XI.",
  "idDeclaracao": "111111112025001",
  "dataTransmissao": "2026-08-26T12:03:22.7191485-03:00",
  "codigoTipoDeclaracao": "1",
  "reciboEntrega": {
    "numeroRecibo": "00000000000000000",
    "recibo": {
      "nomeArquivo": "DASNSIMEI-Recibo-111111112025001.pdf",
      "pdf": "<BASE64_REMOVIDO_TAMANHO_174252>"
    }
  },
  "multaAtrasoEntrega": {
    "notificacaoMaed": {
      "nomeArquivo": "DASNSIMEI-Notificacao-111111112025001.pdf",
      "pdf": "<BASE64_REMOVIDO_TAMANHO_135712>"
    },
    "darf": {
      "periodoApuracao": "20260601",
      "numeroDocumento": "00000000000000000",
      "dataVencimento": "24/09/2026",
      "dataLimiteAcolhimento": "24/09/2026",
      "observacao1": "Válido para pagamento com redução até 24/09/2026",
      "observacao2": "",
      "observacao3": "",
      "valores": {
        "valorPrincipal": 25.4,
        "valorTotal": 25.4
      },
      "composicao": [
        {
          "periodoApuracao": "20260601",
          "codigo": "1506",
          "denominacao": "MULTA POR ATRASO NA ENTREGA DA DASN - SIMEI",
          "valores": {
            "valorPrincipal": 25.4,
            "valorTotal": 25.4
          }
        }
      ],
      "documento": {
        "nomeArquivo": "DASNSIMEI-DARF-MAED-111111112025001.pdf",
        "pdf": "<BASE64_REMOVIDO_TAMANHO_295816>"
      }
    }
  }
}
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-mei/dasnsimei/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-mei/dasnsimei/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/dados_de_dominio/)

## Anomalias

- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/exemplos/retorno_entregar_declaracao/))
- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/exemplos/retorno_entregar_declaracao/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/servicos/entregar_declaracao/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/exemplos/retorno_entregar_declaracao/)

- Última atualização informada pela fonte: 26 de agosto de 2026 19:58:59 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `a460af91ab6b17dadc7d23d308ad18d8ce7ec6d2b8aa27cf5abc878063f88693`
