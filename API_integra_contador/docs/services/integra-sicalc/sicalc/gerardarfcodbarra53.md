---
key: "SICALC.GERARDARFCODBARRA53"
family: "integra-sicalc"
systemId: "SICALC"
serviceId: "GERARDARFCODBARRA53"
version: "2.9"
operationPath: "Emitir"
sourceStatus: "fetched"
---

# Consolidar e emitir o código de barras do Darf calculado

Consolidar e Emitir um DARF em código de barras

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `SICALC.GERARDARFCODBARRA53` |
| Família | `integra-sicalc` |
| Caminho físico | `POST /Emitir` |
| Versão | `2.9` |
| Situação oficial | 04/12/2023 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Não indicada |

## Entrada

Nenhum campo estruturado foi extraído automaticamente; consulte a fonte oficial e as anomalias.

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Consolidar e emitir o código de barras do Darf calculado — Estrutura da resposta : | status | String | — | — | Status HTTP retornado no acionamento do serviço. |
| Consolidar e emitir o código de barras do Darf calculado — Estrutura da resposta : | mensagens | Array | — | — | Array de mensagens explicativas retornadas no acionamento do serviço. Cada mensagem contém os campos codigo (String) e texto (String). |
| Consolidar e emitir o código de barras do Darf calculado — Estrutura da resposta : | dados | String | — | — | Estrutura de dados de retorno contendo os valores consolidados, código de barras e número do documento. |

## Exemplos oficiais e normalizados

### Exemplo 1 — request

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
    "idServico": "GERARDARFCODBARRA53",
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
    "idServico": "GERARDARFCODBARRA53",
    "versaoSistema": "2.9",
    "dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\": \"1162\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"ME\", \"dataPA\": \"01/2022\", \"vencimento\": \"2022-02-18T00:00:00\", \"valorImposto\": \"1000.00\", \"dataConsolidacao\": \"2022-08-08T00:00:00\", \"observacao\": \"Darf calculado\"}"
  }
}
```

### Exemplo 2 — response

Fonte oficial:

```text
{
  "status": 200,
  "dados": "{\"consolidado\": {\"valorPrincipalMoedaCorrente\": 1000.00, \"valorTotalConsolidado\": 1150.00, \"valorMultaMora\": 100.00, \"percentualMultaMora\": 10.00, \"valorJuros\": 50.00, \"percentualJuros\": 5.00, \"termoInicialJuros\": \"2022-02-19T00:00:00\", \"dataArrecadacaoConsolidacao\": \"2022-08-08T00:00:00\", \"dataValidadeCalculo\": \"2022-08-09T00:00:00\"}, \"codigoDeBarras\": {\"codigo44\": \"11620000011500071071162019202201\", \"campo1ComDV\": \"11620.00001\", \"campo2ComDV\": \"11500.007107\", \"campo3ComDV\": \"71162.019202\", \"campo4ComDV\": \"201\"}, \"numeroDocumento\": \"22080812345678901234\"}",
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
  "dados": "{\"consolidado\": {\"valorPrincipalMoedaCorrente\": 1000.00, \"valorTotalConsolidado\": 1150.00, \"valorMultaMora\": 100.00, \"percentualMultaMora\": 10.00, \"valorJuros\": 50.00, \"percentualJuros\": 5.00, \"termoInicialJuros\": \"2022-02-19T00:00:00\", \"dataArrecadacaoConsolidacao\": \"2022-08-08T00:00:00\", \"dataValidadeCalculo\": \"2022-08-09T00:00:00\"}, \"codigoDeBarras\": {\"codigo44\": \"11620000011500071071162019202201\", \"campo1ComDV\": \"11620.00001\", \"campo2ComDV\": \"11500.007107\", \"campo3ComDV\": \"71162.019202\", \"campo4ComDV\": \"201\"}, \"numeroDocumento\": \"22080812345678901234\"}",
  "mensagens": [
    {
      "codigo": "[Sucesso-SICALC]",
      "texto": "Requisição efetuada com sucesso."
    }
  ]
}
```

### Exemplo 3 — response

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
        "idServico": "GERARDARFCODBARRA53",
        "versaoSistema": "2.9",
        "dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\"\"1394\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"ME\"\"dataPA\": \"12/2017\", \"vencimento\": \"2018-01-31T00:00:00\"\"valorImposto\": \"1000.00\", \"dataConsolidacao\"\"2022-08-08T00:00:00\", \"observacao\": \"Darf calculado\"}"
    },
    "status": 200,
    "dados": "{\"consolidado\": {\"valorPrincipalMoedaCorrente\":1000.0\"valorTotalConsolidado\":1458.30,\"valorMultaMora\":200.0\"percentualMultaMora\":20.00,\"valorJuros\":258.30,\"percentualJuros\":283,\"termoInicialJuros\":\"2018-02-01T00:00:00\",\"dataArrecadacaoConsolidacao\":\"2022-08-08T00:00:00\",\"dataValidadeCalculo\":\"2022-08-31T00:00:00\"},\"codigoDeBarras\": {\"campo1ComDV\":\"858200000104\",\"campo2ComDV\":\"000003852334\",\"campo3ComDV\":\"130701233131\",\"campo4ComDV\":\"019056427906\",\"codigo44\":\"85820000010000003852331307012331301905642790\"\"numeroDocumento\":\"9999999999999999\"}","mensagens": null
}
```

### Exemplo 4 — other

Fonte oficial:

```text
{
    "dados": {
        "consolidado": {
            "valorPrincipalMoedaCorrente": 1000.00,
            "valorTotalConsolidado": 1458.30,
            "valorMultaMora": 200.00,
            "percentualMultaMora": 20.00,
            "valorJuros": 258.30,
            "percentualJuros": 25.83,
            "termoInicialJuros": "2018-02-01T00:00:00",
            "dataArrecadacaoConsolidacao": "2022-08-08T00:00:00",
            "dataValidadeCalculo": "2022-08-31T00:00:00"
        },
        "codigoDeBarras": {
            "campo1ComDV":"858200000104",
            "campo2ComDV":"000003852334",
            "campo3ComDV":"130701233131",
            "campo4ComDV":"019056427906",
            "codigo44":"85820000010000003852331307012331301905642790"
        },
        "numeroDocumento":"9999999999999999"
    }
}
```

Forma normalizada:

```json
{
  "dados": {
    "consolidado": {
      "valorPrincipalMoedaCorrente": 1000,
      "valorTotalConsolidado": 1458.3,
      "valorMultaMora": 200,
      "percentualMultaMora": 20,
      "valorJuros": 258.3,
      "percentualJuros": 25.83,
      "termoInicialJuros": "2018-02-01T00:00:00",
      "dataArrecadacaoConsolidacao": "2022-08-08T00:00:00",
      "dataValidadeCalculo": "2022-08-31T00:00:00"
    },
    "codigoDeBarras": {
      "campo1ComDV": "858200000104",
      "campo2ComDV": "000003852334",
      "campo3ComDV": "130701233131",
      "campo4ComDV": "019056427906",
      "codigo44": "85820000010000003852331307012331301905642790"
    },
    "numeroDocumento": "9999999999999999"
  }
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

- **warning / official-pedido-dados-invalid-json:** O envelope oficial é JSON válido, mas o JSON escapado em pedidoDados.dados é inválido. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_consolidar_emitir_um_darf_codbarras/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/servicos/consolidar_emitir_codbarras/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_consolidar_emitir_um_darf_codbarras/)

- Última atualização informada pela fonte: 24 de junho de 2026 13:59:00 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `810e6e33a66775dc1d436172d445fc8baa7ab0b226e1947b3be105ec0e5e32a2`
