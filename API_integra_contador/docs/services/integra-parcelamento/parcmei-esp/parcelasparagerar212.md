---
key: "PARCMEI-ESP.PARCELASPARAGERAR212"
family: "integra-parcelamento"
systemId: "PARCMEI-ESP"
serviceId: "PARCELASPARAGERAR212"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar as parcelas disponíveis para impressão de DAS na modalidade PARCMEI ESPECIAL

Consultar parcelas disponíveis para impressão (geração do DAS) na modalidade de parcelamento PARCMEI especial.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PARCMEI-ESP.PARCELASPARAGERAR212` |
| Família | `integra-parcelamento` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 11/11/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00133) |

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
    "idSistema": "PARCMEI-ESP",
    "idServico": "PARCELASPARAGERAR212",
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
    "idSistema": "PARCMEI-ESP",
    "idServico": "PARCELASPARAGERAR212",
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
        "idSistema": "PARCMEI-ESP",
        "idServico": "PARCELASPARAGERAR212",
        "versaoSistema": "1.0", 
        "dados": ""
    },
    "status": 200,
    "mensagens": [
        {
          "codigo": "[Sucesso-PARCMEI-ESP]",
          "texto": "Requisição efetuada com sucesso."
        }
    ],
    "dados": "{\"listaParcelas\":[{\"parcela\":202203,\"valor\":71.71{\"parcela\":202204,\"valor\":71.71},{\"parcela\":202205,\"valor\":71.71{\"parcela\":202206,\"valor\":71.71},{\"parcela\":202207,\"valor\":71.71{\"parcela\":202208,\"valor\":71.71},{\"parcela\":202209,\"valor\":71.71{\"parcela\":202210,\"valor\":71.71},{\"parcela\":202211,\"valor\":71.71{\"parcela\":202212,\"valor\":71.71},{\"parcela\":202301,\"valor\":16.14}]}"
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
    "idSistema": "PARCMEI-ESP",
    "idServico": "PARCELASPARAGERAR212",
    "versaoSistema": "1.0",
    "dados": ""
  },
  "status": 200,
  "mensagens": [
    {
      "codigo": "[Sucesso-PARCMEI-ESP]",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "{\"listaParcelas\":[{\"parcela\":202203,\"valor\":71.71{\"parcela\":202204,\"valor\":71.71},{\"parcela\":202205,\"valor\":71.71{\"parcela\":202206,\"valor\":71.71},{\"parcela\":202207,\"valor\":71.71{\"parcela\":202208,\"valor\":71.71},{\"parcela\":202209,\"valor\":71.71{\"parcela\":202210,\"valor\":71.71},{\"parcela\":202211,\"valor\":71.71{\"parcela\":202212,\"valor\":71.71},{\"parcela\":202301,\"valor\":16.14}]}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Parcelamento - PARCMEI ESPECIAL](../../../generated/source/solucoes/integra-parcelamento/parcmei_esp/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei_esp/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- Nenhuma anomalia detectada automaticamente.

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei_esp/servicos/consulta_parcelas_impressao/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei_esp/servicos/exemplos/retorno_consulta_parcelas_impressao/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `46e8fe149df6982ccb33b0c7a530e46aef2e5c762fdd1f9e26558f63bf884201`
