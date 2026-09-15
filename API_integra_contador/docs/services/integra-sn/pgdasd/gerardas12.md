---
key: "PGDASD.GERARDAS12"
family: "integra-sn"
systemId: "PGDASD"
serviceId: "GERARDAS12"
version: "1.0"
operationPath: "Emitir"
sourceStatus: "fetched"
---

# Gerar DAS

Gerar DAS

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PGDASD.GERARDAS12` |
| Família | `integra-sn` |
| Caminho físico | `POST /Emitir` |
| Versão | `1.0` |
| Situação oficial | 23/09/2022 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00146) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto Dados: | periodoApuracao | String (6) | SIM | — | Período de Apuração no formato AAAAMM |
| Dados de Entrada — Objeto Dados: | dataConsolidacao | String (8) | NÃO | — | Data de consolidação no formato AAAAMMDD - Data futura |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. |
| Dados de Saída | dados | String | — | — | Estrutura de dados de retorno, contendo uma lista com o objeto Das . |
| Dados de Saída — Objeto: Das | pdf | String | — | — | Pdf do DAS no formato Texto Base 64 |
| Dados de Saída — Objeto: Das | cnpjCompleto | String | — | — | Número do cnpj sem formatação |
| Dados de Saída — Objeto: Das | detalhamento | Object | — | — | Detalhamento do DAS. Ver DetalhamentoDas . |
| Dados de Saída — Objeto: DetalhamentoDas | periodoApuracao | String (6) | — | — | Período de Apuração no formato AAAAMM |
| Dados de Saída — Objeto: DetalhamentoDas | numeroDocumento | String (17) | — | — | Número do documento gerado |
| Dados de Saída — Objeto: DetalhamentoDas | dataVencimento | String (8) | — | — | Data de vencimento no formato AAAAMMDD |
| Dados de Saída — Objeto: DetalhamentoDas | dataLimiteAcolhimento | String (8) | — | — | Data limite para acolhimento no formato AAAAMMDD |
| Dados de Saída — Objeto: DetalhamentoDas | valores | Object | — | — | Discriminação dos valores |
| Dados de Saída — Objeto: DetalhamentoDas | observacao1 | String | — | — | Observação 1 |
| Dados de Saída — Objeto: DetalhamentoDas | observacao2 | String | — | — | Observação 2 |
| Dados de Saída — Objeto: DetalhamentoDas | observacao3 | String | — | — | Observação 3 |
| Dados de Saída — Objeto: DetalhamentoDas | composicao | Array de Object Composicao | — | — | Composição do DAS gerado. |
| Dados de Saída — Objeto: Valores | principal | Number | — | — | Valor do principal |
| Dados de Saída — Objeto: Valores | multa | Number | — | — | Valor da multa |
| Dados de Saída — Objeto: Valores | juros | Number | — | — | Valor dos juros |
| Dados de Saída — Objeto: Valores | total | Number | — | — | Valor total |
| Dados de Saída — Objeto: Composicao | periodoApuracao | String (6) | — | — | Período de apuração do tributo no formato AAAAMM |
| Dados de Saída — Objeto: Composicao | codigo | String | — | — | Código do tributo |
| Dados de Saída — Objeto: Composicao | denominacao | String | — | — | Descrição do nome/destino do tributo |
| Dados de Saída — Objeto: Composicao | valores | Object | — | — | Discriminação dos valores do tributo. Ver Valores . |

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
    "idServico": "GERARDAS12",
    "versaoSistema": "1.0",
    "dados": "{ \"periodoApuracao\": \"201801\", \"dataConsolidacao\"20220831\" }"
  }
}
```

### Exemplo 2 — response

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
        "idServico": "GERARDAS12",
        "versaoSistema": "1.0",
        "dados": "{ \"periodoApuracao\": \"201801\", \"dataConsolidacao\": \"20220831\" }"
    },
    "status": 200,
    "dados": "[{\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_209052>\",\"cnpjCompleto\":\"00000000000100\",\"detalhamentoDas\":{\"periodoApuracao\":\"201801\",\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"20180220\",\"dataLimiteAcolhimento\":\"20220831\",\"valores\":{\"principal\":40.00,\"multa\":8.00,\"juros\":10.15,\"total\":58.15},\"observacao1\":\"Esta empresa NÃO É OPTANTE pelo Simples Nacional.\",\"observacao2\":\"\",\"observacao3\":\"\",\"composicao\":[{\"periodoApuracao\":\"201801\",\"codigo\":\"1001\",\"denominacao\":\"01/2018\",\"valores\":{\"principal\":2.20,\"multa\":0.44,\"juros\":0.56,\"total\":3.20}},{\"periodoApuracao\":\"201801\",\"codigo\":\"1002\",\"denominacao\":\"01/2018\",\"valores\":{\"principal\":1.40,\"multa\":0.28,\"juros\":0.36,\"total\":2.04}},{\"periodoApuracao\":\"201801\",\"codigo\":\"1004\",\"denominacao\":\"01/2018\",\"valores\":{\"principal\":5.10,\"multa\":1.02,\"juros\":1.29,\"total\":7.41}},{\"periodoApuracao\":\"201801\",\"codigo\":\"1005\",\"denominacao\":\"01/2018\",\"valores\":{\"principal\":1.10,\"multa\":0.22,\"juros\":0.28,\"total\":1.60}},{\"periodoApuracao\":\"201801\",\"codigo\":\"1006\",\"denominacao\":\"01/2018\",\"valores\":{\"principal\":16.60,\"multa\":3.32,\"juros\":4.21,\"total\":24.13}},{\"periodoApuracao\":\"201801\",\"codigo\":\"1007\",\"denominacao\":\"SP - 01/2018\",\"valores\":{\"principal\":13.60,\"multa\":2.72,\"juros\":3.45,\"total\":19.77}}]}}]",
    "mensagens": [
        {
          "codigo": "Sucesso-PGDASD",
          "texto": "Requisição efetuada com sucesso."
        }
      ],
}
```

### Exemplo 3 — other

Fonte oficial:

```text
[{
    "pdf": "<BASE64_REMOVIDO_TAMANHO_209052>",
    "cnpjCompleto": "00000000000100",
    "detalhamentoDas": {
        "periodoApuracao": "201801",
        "numeroDocumento": "00000000000000000",
        "dataVencimento": "20180220",
        "dataLimiteAcolhimento": "20220831",
        "valores": {
            "principal": 40.00,
            "multa": 8.00,
            "juros": 10.15,
            "total": 58.15
        },
        "observacao1": "Esta empresa NÃO É OPTANTE pelo Simples Nacional.",
        "observacao2": "",
        "observacao3": "",
        "composicao": [{
            "periodoApuracao": "201801",
            "codigo": "1001",
            "denominacao": "01/2018",
            "valores": {
                "principal": 2.20,
                "multa": 0.44,
                "juros": 0.56,
                "total": 3.20
            }
        }, {
            "periodoApuracao": "201801",
            "codigo": "1002",
            "denominacao": "01/2018",
            "valores": {
                "principal": 1.40,
                "multa": 0.28,
                "juros": 0.36,
                "total": 2.04
            }
        }, {
            "periodoApuracao": "201801",
            "codigo": "1004",
            "denominacao": "01/2018",
            "valores": {
                "principal": 5.10,
                "multa": 1.02,
                "juros": 1.29,
                "total": 7.41
            }
        }, {
            "periodoApuracao": "201801",
            "codigo": "1005",
            "denominacao": "01/2018",
            "valores": {
                "principal": 1.10,
                "multa": 0.22,
                "juros": 0.28,
                "total": 1.60
            }
        }, {
            "periodoApuracao": "201801",
            "codigo": "1006",
            "denominacao": "01/2018",
            "valores": {
                "principal": 16.60,
                "multa": 3.32,
                "juros": 4.21,
                "total": 24.13
            }
        }, {
            "periodoApuracao": "201801",
            "codigo": "1007",
            "denominacao": "SP - 01/2018",
            "valores": {
                "principal": 13.60,
                "multa": 2.72,
                "juros": 3.45,
                "total": 19.77
            }
        }]
    }
}]
```

Forma normalizada:

```json
[
  {
    "pdf": "<BASE64_REMOVIDO_TAMANHO_209052>",
    "cnpjCompleto": "00000000000100",
    "detalhamentoDas": {
      "periodoApuracao": "201801",
      "numeroDocumento": "00000000000000000",
      "dataVencimento": "20180220",
      "dataLimiteAcolhimento": "20220831",
      "valores": {
        "principal": 40,
        "multa": 8,
        "juros": 10.15,
        "total": 58.15
      },
      "observacao1": "Esta empresa NÃO É OPTANTE pelo Simples Nacional.",
      "observacao2": "",
      "observacao3": "",
      "composicao": [
        {
          "periodoApuracao": "201801",
          "codigo": "1001",
          "denominacao": "01/2018",
          "valores": {
            "principal": 2.2,
            "multa": 0.44,
            "juros": 0.56,
            "total": 3.2
          }
        },
        {
          "periodoApuracao": "201801",
          "codigo": "1002",
          "denominacao": "01/2018",
          "valores": {
            "principal": 1.4,
            "multa": 0.28,
            "juros": 0.36,
            "total": 2.04
          }
        },
        {
          "periodoApuracao": "201801",
          "codigo": "1004",
          "denominacao": "01/2018",
          "valores": {
            "principal": 5.1,
            "multa": 1.02,
            "juros": 1.29,
            "total": 7.41
          }
        },
        {
          "periodoApuracao": "201801",
          "codigo": "1005",
          "denominacao": "01/2018",
          "valores": {
            "principal": 1.1,
            "multa": 0.22,
            "juros": 0.28,
            "total": 1.6
          }
        },
        {
          "periodoApuracao": "201801",
          "codigo": "1006",
          "denominacao": "01/2018",
          "valores": {
            "principal": 16.6,
            "multa": 3.32,
            "juros": 4.21,
            "total": 24.13
          }
        },
        {
          "periodoApuracao": "201801",
          "codigo": "1007",
          "denominacao": "SP - 01/2018",
          "valores": {
            "principal": 13.6,
            "multa": 2.72,
            "juros": 3.45,
            "total": 19.77
          }
        }
      ]
    }
  }
]
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Simples Nacional](../../../generated/source/solucoes/integra-sn/pgdasd/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-sn/pgdasd/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/dados_de_dominio/)

## Anomalias

- **warning / official-pedido-dados-invalid-json:** O envelope oficial é JSON válido, mas o JSON escapado em pedidoDados.dados é inválido. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/servicos/gerar_das/))
- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_gerar_das/))
- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_gerar_das/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/servicos/gerar_das/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_gerar_das/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `a958b9ba9c923e1d2e591261ca21ee290e8e57e78fffd1d1a99c9c783dcd385d`
