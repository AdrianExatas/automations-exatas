---
key: "DASNSIMEI.GERARDASEXCESSO153"
family: "integra-mei"
systemId: "DASNSIMEI"
serviceId: "GERARDASEXCESSO153"
version: null
operationPath: "Emitir"
sourceStatus: "fetched"
---

# Emitir DAS de Excesso de Receita Bruta

Emissão do DAS de excesso de receitas.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `DASNSIMEI.GERARDASEXCESSO153` |
| Família | `integra-mei` |
| Caminho físico | `POST /Emitir` |
| Versão | Não informada |
| Situação oficial | Não informada |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00229) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada | cnpjCompleto | String (14) [AAAAAAAAAAAAAA] | SIM | — | CNPJ completo do contribuinte. Deve-se informar o CNPJ sem máscara de formatação. |
| Dados de Entrada | anoCalendario | Number (4) | SIM | — | Ano-calendário da declaração para a qual se deseja emitir o DAS de Excesso de receita bruta. |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | String (3) | — | — | Código retornado no acionamento do serviço. |
| Dados de Saída | dados | Object documentoArrecadacao | — | — | Estrutura de dados de retorno. |
| Dados de Saída | mensagens | Array de object mensagens | — | — | Mensagem explicativa retornada no acionamento do serviço. |
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
| Dados de Saída | periodoApuracao | Number (6) | — | — | Período de apuração no formato AAAAMM |
| Dados de Saída | codigo | Number (4) | — | — | Código de receita. |
| Dados de Saída | denominacao | String (50) | — | — | Denominação do código de receita. |
| Dados de Saída | nomeArquivo | String | — | — | Nome do arquivo para o PDF |
| Dados de Saída | pdf | String | — | — | Conteúdo do PDF codificado em base 64. |
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
        "idServico": "GERARDASEXCESSO153",
        "versaoSistema": "1.0",
        "dados": "{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":\"2022\"}"
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
    "idServico": "GERARDASEXCESSO153",
    "versaoSistema": "1.0",
    "dados": "{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":\"2022\"}"
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
        "idServico": "GERARDASEXCESSO153",
        "versaoSistema": "1.0",
        "dados": "{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":\"2022\"}"
    },
    "status": 200,
    "responseId": "a0aaaa0a-0a0a-00a0-a0aa-00000aa00a00",
    "responseDateTime": "2025-12-19T15:59:05.356Z",
    "dados": "{\"periodoApuracao\":\"202212\",\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"22/02/2023\",\"dataLimiteAcolhimento\":\"30/12/2025\",\"observacao1\":\"CPF: 000.000.000-00\",\"observacao2\":\"INSS: 2.352,63 ICMS: 0,00 ISS: 1.734,66\",\"observacao3\":\"\",\"valores\":{\"valorPrincipal\":4087.29,\"valorMulta\":817.46,\"valorJuros\":1385.59,\"valorTotal\":6290.34},\"composicao\":[{\"periodoApuracao\":\"202212\",\"codigo\":\"0151\",\"denominacao\":\"INSS - SIMPLES NACIONAL - MEI\",\"valores\":{\"valorPrincipal\":2352.63,\"valorMulta\":470.53,\"valorJuros\":797.54,\"valorTotal\":3620.70}},{\"periodoApuracao\":\"202212\",\"codigo\":\"0125\",\"denominacao\":\"ISS - SIMPLES NACIONAL - MEI\",\"valores\":{\"valorPrincipal\":1734.66,\"valorMulta\":346.93,\"valorJuros\":588.05,\"valorTotal\":2669.64}}],\"documento\":{\"nomeArquivo\":\"DAS-DASNSIMEI-00000000000000000.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_291020>\"}}",
    "mensagens": [
        {
            "codigo": "[Aviso-DASNSIMEI-00000]",
            "texto": "Emissão de DAS de excesso de receita realizada com sucesso."
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
    "idServico": "GERARDASEXCESSO153",
    "versaoSistema": "1.0",
    "dados": "{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":\"2022\"}"
  },
  "status": 200,
  "responseId": "a0aaaa0a-0a0a-00a0-a0aa-00000aa00a00",
  "responseDateTime": "2025-12-19T15:59:05.356Z",
  "dados": "{\"periodoApuracao\":\"202212\",\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"22/02/2023\",\"dataLimiteAcolhimento\":\"30/12/2025\",\"observacao1\":\"CPF: 000.000.000-00\",\"observacao2\":\"INSS: 2.352,63 ICMS: 0,00 ISS: 1.734,66\",\"observacao3\":\"\",\"valores\":{\"valorPrincipal\":4087.29,\"valorMulta\":817.46,\"valorJuros\":1385.59,\"valorTotal\":6290.34},\"composicao\":[{\"periodoApuracao\":\"202212\",\"codigo\":\"0151\",\"denominacao\":\"INSS - SIMPLES NACIONAL - MEI\",\"valores\":{\"valorPrincipal\":2352.63,\"valorMulta\":470.53,\"valorJuros\":797.54,\"valorTotal\":3620.70}},{\"periodoApuracao\":\"202212\",\"codigo\":\"0125\",\"denominacao\":\"ISS - SIMPLES NACIONAL - MEI\",\"valores\":{\"valorPrincipal\":1734.66,\"valorMulta\":346.93,\"valorJuros\":588.05,\"valorTotal\":2669.64}}],\"documento\":{\"nomeArquivo\":\"DAS-DASNSIMEI-00000000000000000.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_291020>\"}}",
  "mensagens": [
    {
      "codigo": "[Aviso-DASNSIMEI-00000]",
      "texto": "Emissão de DAS de excesso de receita realizada com sucesso."
    }
  ]
}
```

### Exemplo 3 — other

Fonte oficial:

```text
{
    "periodoApuracao": "202212",
    "numeroDocumento": "00000000000000000",
    "dataVencimento": "22/02/2023",
    "dataLimiteAcolhimento": "30/12/2025",
    "observacao1": "CPF: 000.000.000-00",
    "observacao2": "INSS: 2.352,63 ICMS: 0,00 ISS: 1.734,66",
    "observacao3": "",
    "valores": {
        "valorPrincipal": 4087.29,
        "valorMulta": 817.46,
        "valorJuros": 1385.59,
        "valorTotal": 6290.34
    },
    "composicao": [
        {
            "periodoApuracao": "202212",
            "codigo": "0151",
            "denominacao": "INSS - SIMPLES NACIONAL - MEI",
            "valores": {
                "valorPrincipal": 2352.63,
                "valorMulta": 470.53,
                "valorJuros": 797.54,
                "valorTotal": 3620.70
            }
        },
        {
            "periodoApuracao": "202212",
            "codigo": "0125",
            "denominacao": "ISS - SIMPLES NACIONAL - MEI",
            "valores": {
                "valorPrincipal": 1734.66,
                "valorMulta": 346.93,
                "valorJuros": 588.05,
                "valorTotal": 2669.64
            }
        }
    ],
    "documento": {
        "nomeArquivo": "DAS-DASNSIMEI-00000000000000000.pdf",
        "pdf": "<BASE64_REMOVIDO_TAMANHO_291020>"
    }
}
```

Forma normalizada:

```json
{
  "periodoApuracao": "202212",
  "numeroDocumento": "00000000000000000",
  "dataVencimento": "22/02/2023",
  "dataLimiteAcolhimento": "30/12/2025",
  "observacao1": "CPF: 000.000.000-00",
  "observacao2": "INSS: 2.352,63 ICMS: 0,00 ISS: 1.734,66",
  "observacao3": "",
  "valores": {
    "valorPrincipal": 4087.29,
    "valorMulta": 817.46,
    "valorJuros": 1385.59,
    "valorTotal": 6290.34
  },
  "composicao": [
    {
      "periodoApuracao": "202212",
      "codigo": "0151",
      "denominacao": "INSS - SIMPLES NACIONAL - MEI",
      "valores": {
        "valorPrincipal": 2352.63,
        "valorMulta": 470.53,
        "valorJuros": 797.54,
        "valorTotal": 3620.7
      }
    },
    {
      "periodoApuracao": "202212",
      "codigo": "0125",
      "denominacao": "ISS - SIMPLES NACIONAL - MEI",
      "valores": {
        "valorPrincipal": 1734.66,
        "valorMulta": 346.93,
        "valorJuros": 588.05,
        "valorTotal": 2669.64
      }
    }
  ],
  "documento": {
    "nomeArquivo": "DAS-DASNSIMEI-00000000000000000.pdf",
    "pdf": "<BASE64_REMOVIDO_TAMANHO_291020>"
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

- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/exemplos/retorno_emitir_das_excesso/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/servicos/emitir_das_excesso/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/exemplos/retorno_emitir_das_excesso/)

- Última atualização informada pela fonte: 5 de maio de 2026 19:36:11 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `f7c7def4eebed83d6a75dcfc7c108f9ff921f789ccd0b51bb0b2081c9c95eaea`
