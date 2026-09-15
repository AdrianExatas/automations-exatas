---
key: "PGMEI.GERARDASPDF21"
family: "integra-mei"
systemId: "PGMEI"
serviceId: "GERARDASPDF21"
version: null
operationPath: "Emitir"
sourceStatus: "fetched"
---

# Gerar DAS

Gerar DAS em PDF

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PGMEI.GERARDASPDF21` |
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
| Dados de Saída | dados | String (String escapada: Array de Object Das ) | — | — | Estrutura de lista de dados de retorno. |
| Dados de Saída — Objeto: Das | pdf | String | — | — | Pdf do DAS no formato Texto Base 64 |
| Dados de Saída — Objeto: Das | cnpjCompleto | String | — | — | Número do cnpj sem formatação |
| Dados de Saída — Objeto: Das | detalhamento | Object DetalhamentoDas | — | — | Detalhamento do DAS |
| Dados de Saída — Objeto: DetalhamentoDas | periodoApuracao | String(8) | — | — | Período de Apuração no formato AAAAMM ou "Diversos" no caso de mais de um período acumulado. |
| Dados de Saída — Objeto: DetalhamentoDas | numeroDocumento | String(17) | — | — | Número do documento gerado |
| Dados de Saída — Objeto: DetalhamentoDas | dataVencimento | String(8) | — | — | Data de vencimento no formato AAAAMMDD |
| Dados de Saída — Objeto: DetalhamentoDas | dataLimiteAcolhimento | String(8) | — | — | Data limite para acolhimento no formato AAAAMMDD |
| Dados de Saída — Objeto: DetalhamentoDas | valores | Object Valores | — | — | Discriminação dos valores |
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
| Dados de Saída — Objeto: Composicao | valores | Array de Object Valores | — | — | Discriminação dos valores do tributo |

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
        "idServico": "GERARDASPDF21",
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
    "idServico": "GERARDASPDF21",
    "dados": "{ \"periodoApuracao\": \"201901\" }"
  }
}
```

### Exemplo 2 — response

Fonte oficial:

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
      "idSistema": "PGMEI",
      "idServico": "GERARDASPDF21",
      "dados": "{ \"periodoApuracao\": \"201901\" }"
    },
      "status": 200,
      "mensagens": [
            {
              "codigo": "Sucesso-PGMEI",
              "texto": "Requisição efetuada com sucesso."
            }
    ],
    "dados": "[{\"cnpjCompleto\":\"00000000000100\",\"razaoSocial\":\"EXEMPLO\"\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_209706>\"\"detalhamento\":[{\"periodoApuracao\":\"201901\"\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"20190220\"\"dataLimiteAcolhimento\":\"20220831\",\"valores\":{\"principal\":55.90\"multa\":11.18,\"juros\":10.71,\"total\":77.79},\"observacao1\":\"CPF: 000.000000-00\",\"observacao2\":\"Tributos (R$): INSS 49,90 ICMS 1,00 ISS 5,00\"\"observacao3\":\"PGMEI(Versao:3.8.0)\",\"composicao\"[{\"periodoApuracao\":201901,\"codigo\":\"0151\",\"denominacao\":\"INSS -SIMPLES NACIONAL - MEI - 01/2019\",\"valores\":{\"principal\":49.90,\"multa\":998,\"juros\":9.56,\"total\":69.44}},{\"periodoApuracao\":201901\"codigo\":\"0083\",\"denominacao\":\"ICMS - SIMPLES NACIONAL - MEI - PB - 012019\",\"valores\":{\"principal\":1.00,\"multa\":0.20,\"juros\":0.19,\"total\":139}},{\"periodoApuracao\":201901,\"codigo\":\"0125\",\"denominacao\":\"ISS -SIMPLES NACIONAL - MEI - SUME (PB) - 01/2019\",\"valores\":{\"principal\":5.00\"multa\":1.00,\"juros\":0.96,\"total\":6.96}}]}]}]"
}
```

Forma normalizada:

```json
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
    "idSistema": "PGMEI",
    "idServico": "GERARDASPDF21",
    "dados": "{ \"periodoApuracao\": \"201901\" }"
  },
  "status": 200,
  "mensagens": [
    {
      "codigo": "Sucesso-PGMEI",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "[{\"cnpjCompleto\":\"00000000000100\",\"razaoSocial\":\"EXEMPLO\"\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_209706>\"\"detalhamento\":[{\"periodoApuracao\":\"201901\"\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"20190220\"\"dataLimiteAcolhimento\":\"20220831\",\"valores\":{\"principal\":55.90\"multa\":11.18,\"juros\":10.71,\"total\":77.79},\"observacao1\":\"CPF: 000.000000-00\",\"observacao2\":\"Tributos (R$): INSS 49,90 ICMS 1,00 ISS 5,00\"\"observacao3\":\"PGMEI(Versao:3.8.0)\",\"composicao\"[{\"periodoApuracao\":201901,\"codigo\":\"0151\",\"denominacao\":\"INSS -SIMPLES NACIONAL - MEI - 01/2019\",\"valores\":{\"principal\":49.90,\"multa\":998,\"juros\":9.56,\"total\":69.44}},{\"periodoApuracao\":201901\"codigo\":\"0083\",\"denominacao\":\"ICMS - SIMPLES NACIONAL - MEI - PB - 012019\",\"valores\":{\"principal\":1.00,\"multa\":0.20,\"juros\":0.19,\"total\":139}},{\"periodoApuracao\":201901,\"codigo\":\"0125\",\"denominacao\":\"ISS -SIMPLES NACIONAL - MEI - SUME (PB) - 01/2019\",\"valores\":{\"principal\":5.00\"multa\":1.00,\"juros\":0.96,\"total\":6.96}}]}]}]"
}
```

### Exemplo 3 — other

Fonte oficial:

```text
[{
    "cnpjCompleto": "00000000000100",
    "razaoSocial": "EXEMPLO",
    "pdf""<BASE64_REMOVIDO_TAMANHO_206141>",
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

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-mei/pgmei/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-mei/pgmei/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/dados_de_dominio/)

## Anomalias

- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/exemplos/retorno_gerar_das/))
- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/exemplos/retorno_gerar_das/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/servicos/gerar_das/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/exemplos/retorno_gerar_das/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `945324156ba7332a1d4b2c445e9e75f28fd01ba5ee5e204b2b42b4439aacf9e3`
