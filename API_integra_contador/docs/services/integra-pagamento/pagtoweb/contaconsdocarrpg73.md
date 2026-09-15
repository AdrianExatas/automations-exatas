---
key: "PAGTOWEB.CONTACONSDOCARRPG73"
family: "integra-pagamento"
systemId: "PAGTOWEB"
serviceId: "CONTACONSDOCARRPG73"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Conta Consulta Pagamento

Contar Consulta Documento de Arrecadação Pago

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PAGTOWEB.CONTACONSDOCARRPG73` |
| Família | `integra-pagamento` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 23/09/2022 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00004) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto IntervaloData: | dataInicial | String | NÃO | — | Formato AAAA-MM-DD |
| Dados de Entrada — Objeto IntervaloData: | dataFinal | String | NÃO | — | Formato AAAA-MM-DD |
| Dados de Entrada — Objeto IntervaloValor: | valorInicial | Number | NÃO | — | Número com o valor inicial |
| Dados de Entrada — Objeto IntervaloValor: | valorFinal | Number | NÃO | — | Número com o valor final |
| Dados de Entrada — Objeto ParametroEmissaoComprovanteIC: | numeroDocumento | String (até 17 bytes) | NÃO | — | Número do documento. |
| Dados de Entrada — Objeto ParametroContaConsultaDocumentoIC: | numeroDocumentoLista | Array | NÃO | — | Lista com números de documentos, cada número tem até 17 posições. |
| Dados de Entrada — Objeto ParametroContaConsultaDocumentoIC: | codigoReceitaLista | Array | NÃO | — | Lista com códigos de receita. Tamanho máx. do código: 4. |
| Dados de Entrada — Objeto ParametroContaConsultaDocumentoIC: | intervaloDataArrecadacao | IntervaloData | NÃO | — | Intervalo de data de arrecadação a ser pesquisado. A data de arrecadação é a data contábil da efetivação do pagamento. |
| Dados de Entrada — Objeto ParametroContaConsultaDocumentoIC: | intervaloValorTotalDocumento | IntervaloValor | NÃO | — | Intervalo de valor total a ser pesquisado. |
| Dados de Entrada — Objeto ParametroContaConsultaDocumentoIC: | codigoTipoDocumentoLista | Array | NÃO | — | Tipos de documento que serão retornados. Numérico. Tamanho máx. do código: 2 |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é uma string de tamanho 5 que representa um código interno do negócio. |
| Dados de Saída | dados | String | — | — | Estrutura de dados de retorno. |

## Exemplos oficiais e normalizados

### Exemplo 1 — other

Fonte oficial:

```text
{
    "contratante": {
        "numero": "99999999999",
        "tipo": 1
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
        "idSistema": "PAGTOWEB",
        "idServico": "CONTACONSDOCARRPG73",
        "dados": "{ \"intervaloDataArrecadacao\": {\"dataInicial\"\"2019-09-01\", \"dataFinal\": \"2019-11-30\"}}"
    }
}
```

### Exemplo 2 — other

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
        "idSistema": "PAGTOWEB",
        "idServico": "CONTACONSDOCARRPG73",
        "dados": "{\"codigoReceitaLista\": [\"9999\", \"9999\"]}"
    }
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
    "idSistema": "PAGTOWEB",
    "idServico": "CONTACONSDOCARRPG73",
    "dados": "{\"codigoReceitaLista\": [\"9999\", \"9999\"]}"
  }
}
```

### Exemplo 3 — other

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
        "idSistema": "PAGTOWEB",
        "idServico": "CONTACONSDOCARRPG73",
        "dados": "{ \"intervaloDataArrecadacao\": {\"dataInicial\"\"2022-01-01\", \"dataFinal\": \"2022-01-31\"}\"intervaloValorTotalDocumento\": {\"valorInicial\": 600\"valorFinal\": 13000}}"
    }
}
```

### Exemplo 4 — response

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
        "idSistema": "PAGTOWEB",
        "idServico": "CONTACONSDOCARRPG73",
        "versaoSistema": "1.0",
        "dados": "{\"numeroDocumentoLista\":[\"9999999999\"]}"
    },
    "status": 200,
    "dados": "1",
    "mensagens": [
        {
            "codigo": "Sucesso-PAGTOWEB-00000",
            "texto": "Requisição efetuada com sucesso."
        }
    ]
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
    "idSistema": "PAGTOWEB",
    "idServico": "CONTACONSDOCARRPG73",
    "versaoSistema": "1.0",
    "dados": "{\"numeroDocumentoLista\":[\"9999999999\"]}"
  },
  "status": 200,
  "dados": "1",
  "mensagens": [
    {
      "codigo": "Sucesso-PAGTOWEB-00000",
      "texto": "Requisição efetuada com sucesso."
    }
  ]
}
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-pagamento/pagtoweb/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-pagamento/pagtoweb/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/dados_de_dominio/)

## Anomalias

- **warning / official-pedido-dados-invalid-json:** O envelope oficial é JSON válido, mas o JSON escapado em pedidoDados.dados é inválido. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/servicos/conta_consulta_pagamento/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/servicos/conta_consulta_pagamento/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/exemplos/retorno_conta_consulta_pagamento/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `1c16c32c4e663e16477414cc8ef2641f2b2cb418c86396df77ddb066d2adbee5`
