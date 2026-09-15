---
key: "PERTSN.PARCELASPARAGERAR182"
family: "integra-parcelamento"
systemId: "PERTSN"
serviceId: "PARCELASPARAGERAR182"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar as parcelas disponíveis para impressão de DAS na modalidade PERTSN

Consultar parcelas disponíveis para impressão (geração do DAS) na modalidade de parcelamento PERTSN.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PERTSN.PARCELASPARAGERAR182` |
| Família | `integra-parcelamento` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 11/11/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00149, 10011) |

## Entrada

Nenhum campo estruturado foi extraído automaticamente; consulte a fonte oficial e as anomalias.

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Número(3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Lista de Texto | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. |
| Dados de Saída | dados | Texto (SCAPED Texto JSON) | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto: listaParcela | listaParcela | Lista de Parcela | — | — | Informações da parcela |
| Dados de Saída — Objeto Parcela: | parcela | Número (AAAAMM) | — | — | Número da parcela |
| Dados de Saída — Objeto Parcela: | valor | Número | — | — | Valor da parcela |

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
    "idSistema": "PERTSN",
    "idServico": "PARCELASPARAGERAR182",
    "versaoSistema": "1.0",
    "dados":""
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
    "idSistema": "PERTSN",
    "idServico": "PARCELASPARAGERAR182",
    "versaoSistema": "1.0",
    "dados": ""
  }
}
```

### Exemplo 2 — response

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
        "idSistema": "PERTSN",
        "idServico": "PARCELASPARAGERAR182",
        "versaoSistema": "1.0", 
        "dados": ""
    },
    "status": 200,
    "mensagens": [
        {
          "codigo": "[Sucesso-PERTSN]",
          "texto": "Requisição efetuada com sucesso."
        }
    ],
    "dados": "{\"listaParcelas\":[{\"parcela\":201811,\"valor\":429.71{\"parcela\":201812,\"valor\":429.71},{\"parcela\":201901,\"valor\":429.71{\"parcela\":201902,\"valor\":429.71},{\"parcela\":201903,\"valor\":429.71{\"parcela\":201904,\"valor\":429.71},{\"parcela\":201905,\"valor\":429.71{\"parcela\":201906,\"valor\":429.71},{\"parcela\":201907,\"valor\":429.71{\"parcela\":201908,\"valor\":429.71},{\"parcela\":201909,\"valor\":429.71{\"parcela\":201910,\"valor\":429.71},{\"parcela\":201911,\"valor\":429.71{\"parcela\":201912,\"valor\":429.71},{\"parcela\":202001,\"valor\":429.71{\"parcela\":202002,\"valor\":429.71},{\"parcela\":202003,\"valor\":429.71{\"parcela\":202004,\"valor\":429.71},{\"parcela\":202005,\"valor\":429.71{\"parcela\":202006,\"valor\":429.71},{\"parcela\":202007,\"valor\":429.71{\"parcela\":202008,\"valor\":429.71},{\"parcela\":202009,\"valor\":429.71{\"parcela\":202010,\"valor\":429.71},{\"parcela\":202011,\"valor\":429.71{\"parcela\":202012,\"valor\":429.71},{\"parcela\":202101,\"valor\":429.71{\"parcela\":202102,\"valor\":429.71},{\"parcela\":202103,\"valor\":429.71{\"parcela\":202104,\"valor\":429.71},{\"parcela\":202105,\"valor\":429.71{\"parcela\":202106,\"valor\":429.71},{\"parcela\":202107,\"valor\":429.71{\"parcela\":202108,\"valor\":429.71},{\"parcela\":202109,\"valor\":429.71{\"parcela\":202110,\"valor\":429.71},{\"parcela\":202111,\"valor\":429.71{\"parcela\":202112,\"valor\":429.71},{\"parcela\":202201,\"valor\":429.71{\"parcela\":202202,\"valor\":429.71},{\"parcela\":202203,\"valor\":429.71{\"parcela\":202204,\"valor\":429.71},{\"parcela\":202205,\"valor\":429.71{\"parcela\":202206,\"valor\":429.71},{\"parcela\":202207,\"valor\":429.71{\"parcela\":202208,\"valor\":429.71},{\"parcela\":202209,\"valor\":429.71{\"parcela\":202210,\"valor\":429.71},{\"parcela\":202211,\"valor\":429.71{\"parcela\":202212,\"valor\":429.71},{\"parcela\":202301,\"valor\":429.71{\"parcela\":202302,\"valor\":429.71},{\"parcela\":202303,\"valor\":429.71{\"parcela\":202304,\"valor\":429.71},{\"parcela\":202305,\"valor\":429.71{\"parcela\":202306,\"valor\":429.71},{\"parcela\":202307,\"valor\":429.71{\"parcela\":202308,\"valor\":429.71},{\"parcela\":202309,\"valor\":429.71{\"parcela\":202310,\"valor\":429.71}]}"
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
    "idSistema": "PERTSN",
    "idServico": "PARCELASPARAGERAR182",
    "versaoSistema": "1.0",
    "dados": ""
  },
  "status": 200,
  "mensagens": [
    {
      "codigo": "[Sucesso-PERTSN]",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "{\"listaParcelas\":[{\"parcela\":201811,\"valor\":429.71{\"parcela\":201812,\"valor\":429.71},{\"parcela\":201901,\"valor\":429.71{\"parcela\":201902,\"valor\":429.71},{\"parcela\":201903,\"valor\":429.71{\"parcela\":201904,\"valor\":429.71},{\"parcela\":201905,\"valor\":429.71{\"parcela\":201906,\"valor\":429.71},{\"parcela\":201907,\"valor\":429.71{\"parcela\":201908,\"valor\":429.71},{\"parcela\":201909,\"valor\":429.71{\"parcela\":201910,\"valor\":429.71},{\"parcela\":201911,\"valor\":429.71{\"parcela\":201912,\"valor\":429.71},{\"parcela\":202001,\"valor\":429.71{\"parcela\":202002,\"valor\":429.71},{\"parcela\":202003,\"valor\":429.71{\"parcela\":202004,\"valor\":429.71},{\"parcela\":202005,\"valor\":429.71{\"parcela\":202006,\"valor\":429.71},{\"parcela\":202007,\"valor\":429.71{\"parcela\":202008,\"valor\":429.71},{\"parcela\":202009,\"valor\":429.71{\"parcela\":202010,\"valor\":429.71},{\"parcela\":202011,\"valor\":429.71{\"parcela\":202012,\"valor\":429.71},{\"parcela\":202101,\"valor\":429.71{\"parcela\":202102,\"valor\":429.71},{\"parcela\":202103,\"valor\":429.71{\"parcela\":202104,\"valor\":429.71},{\"parcela\":202105,\"valor\":429.71{\"parcela\":202106,\"valor\":429.71},{\"parcela\":202107,\"valor\":429.71{\"parcela\":202108,\"valor\":429.71},{\"parcela\":202109,\"valor\":429.71{\"parcela\":202110,\"valor\":429.71},{\"parcela\":202111,\"valor\":429.71{\"parcela\":202112,\"valor\":429.71},{\"parcela\":202201,\"valor\":429.71{\"parcela\":202202,\"valor\":429.71},{\"parcela\":202203,\"valor\":429.71{\"parcela\":202204,\"valor\":429.71},{\"parcela\":202205,\"valor\":429.71{\"parcela\":202206,\"valor\":429.71},{\"parcela\":202207,\"valor\":429.71{\"parcela\":202208,\"valor\":429.71},{\"parcela\":202209,\"valor\":429.71{\"parcela\":202210,\"valor\":429.71},{\"parcela\":202211,\"valor\":429.71{\"parcela\":202212,\"valor\":429.71},{\"parcela\":202301,\"valor\":429.71{\"parcela\":202302,\"valor\":429.71},{\"parcela\":202303,\"valor\":429.71{\"parcela\":202304,\"valor\":429.71},{\"parcela\":202305,\"valor\":429.71{\"parcela\":202306,\"valor\":429.71},{\"parcela\":202307,\"valor\":429.71{\"parcela\":202308,\"valor\":429.71},{\"parcela\":202309,\"valor\":429.71{\"parcela\":202310,\"valor\":429.71}]}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Parcelamento - PERTSN](../../../generated/source/solucoes/integra-parcelamento/pertsn/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertsn/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- Nenhuma anomalia detectada automaticamente.

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertsn/servicos/consulta_parcelas_impressao/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertsn/servicos/exemplos/retorno_consulta_parcelas_impressao/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `4394fd5a1a5ec99cf1960d82268e5a713b17c13a0d9952a2e7f4cba1f3936fc1`
