---
key: "PARCSN.PEDIDOSPARC163"
family: "integra-parcelamento"
systemId: "PARCSN"
serviceId: "PEDIDOSPARC163"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar todos os pedidos de parcelamento na modalidade PARCSN ORDINÁRIO para um contribuinte

Consultar todos os pedidos de parcelamentos existentes na modalidade PARCSN ordinário.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PARCSN.PEDIDOSPARC163` |
| Família | `integra-parcelamento` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 11/11/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00076, 00188) |

## Entrada

Nenhum campo estruturado foi extraído automaticamente; consulte a fonte oficial e as anomalias.

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Número(3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Lista de Texto | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. |
| Dados de Saída | dados | Texto (SCAPED Texto JSON) | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto: parcelamentos | parcelamentos | Lista de Parcelamento | — | — | Lista dos parcelamentos |
| Dados de Saída — Objeto Parcelamento: | numero | Número | — | — | Número do parcelamento |
| Dados de Saída — Objeto Parcelamento: | dataDoPedido | Número (AAAAMMDD) | — | — | Data do pedido do parcelamento |
| Dados de Saída — Objeto Parcelamento: | situacao | Texto | — | — | Situação do parcelamento |
| Dados de Saída — Objeto Parcelamento: | dataDaSituacao | Número (AAAAMMDD) | — | — | Data da situação do parcelamento |

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
    "idSistema": "PARCSN",
    "idServico": "PEDIDOSPARC163",
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
    "idSistema": "PARCSN",
    "idServico": "PEDIDOSPARC163",
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
        "idSistema": "PARCSN",
        "idServico": "PEDIDOSPARC163",
        "versaoSistema": "1.0", 
        "dados": ""
    },
  "status": 200,
  "mensagens": [
    {
      "codigo": "[Sucesso-PARCSN]",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
   "dados": "{\"parcelamentos\":[{\"numero\":1,\"dataDoPedido\":20160211,\"situacao\":\"Encerrado a Pedido do Contribuinte\",\"dataDaSituacao\":20170125},{\"numero\":2,\"dataDoPedido\":20170126,\"situacao\":\"Encerrado a Pedido do Contribuinte\",\"dataDaSituacao\":20180108},{\"numero\":3,\"dataDoPedido\":20180109,\"situacao\":\"Encerrado a Pedido do Contribuinte\",\"dataDaSituacao\":20180625},{\"numero\":4,\"dataDoPedido\":20190102,\"situacao\":\"Encerrado a Pedido do Contribuinte\",\"dataDaSituacao\":20220511},{\"numero\":5,\"dataDoPedido\":20220929,\"situacao\":\"Encerrado a Pedido do Contribuinte\",\"dataDaSituacao\":20230117},{\"numero\":6,\"dataDoPedido\":20230131,\"situacao\":\"Encerrado a Pedido do Contribuinte\",\"dataDaSituacao\":20230209}]}"
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
    "idSistema": "PARCSN",
    "idServico": "PEDIDOSPARC163",
    "versaoSistema": "1.0",
    "dados": ""
  },
  "status": 200,
  "mensagens": [
    {
      "codigo": "[Sucesso-PARCSN]",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "{\"parcelamentos\":[{\"numero\":1,\"dataDoPedido\":20160211,\"situacao\":\"Encerrado a Pedido do Contribuinte\",\"dataDaSituacao\":20170125},{\"numero\":2,\"dataDoPedido\":20170126,\"situacao\":\"Encerrado a Pedido do Contribuinte\",\"dataDaSituacao\":20180108},{\"numero\":3,\"dataDoPedido\":20180109,\"situacao\":\"Encerrado a Pedido do Contribuinte\",\"dataDaSituacao\":20180625},{\"numero\":4,\"dataDoPedido\":20190102,\"situacao\":\"Encerrado a Pedido do Contribuinte\",\"dataDaSituacao\":20220511},{\"numero\":5,\"dataDoPedido\":20220929,\"situacao\":\"Encerrado a Pedido do Contribuinte\",\"dataDaSituacao\":20230117},{\"numero\":6,\"dataDoPedido\":20230131,\"situacao\":\"Encerrado a Pedido do Contribuinte\",\"dataDaSituacao\":20230209}]}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Parcelamento - PARCSN](../../../generated/source/solucoes/integra-parcelamento/parcsn/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- Nenhuma anomalia detectada automaticamente.

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn/servicos/consulta_pedidos/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn/servicos/exemplos/retorno_consulta_pedidos/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `36247b187ab5cd7cdfa050f3c3233e4de0baefb9712c2a599153acd0e46ca4e5`
