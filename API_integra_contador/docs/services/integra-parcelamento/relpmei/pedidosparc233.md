---
key: "RELPMEI.PEDIDOSPARC233"
family: "integra-parcelamento"
systemId: "RELPMEI"
serviceId: "PEDIDOSPARC233"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar todos os pedidos de parcelamento na modalidade RELPMEI para um contribuinte

Consultar todos os pedidos de parcelamentos existentes na modalidade de parcelamento RELPMEI.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `RELPMEI.PEDIDOSPARC233` |
| Família | `integra-parcelamento` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 11/11/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00209, 10035) |

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
    "idSistema": "RELPMEI",
    "idServico": "PEDIDOSPARC233",
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
    "idSistema": "RELPMEI",
    "idServico": "PEDIDOSPARC233",
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
        "idSistema": "RELPMEI",
        "idServico": "PEDIDOSPARC233",
        "versaoSistema": "1.0", 
        "dados": ""
    },
  "status": 200,
  "mensagens": [
    {
      "codigo": "[Sucesso-RELPMEI]",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "{\"parcelamentos\":[{\"numero\":9131,\"dataDoPedido\":2022052\"situacao\":\"Em parcelamento\",\"dataDaSituacao\":20220602}]}"
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
    "idSistema": "RELPMEI",
    "idServico": "PEDIDOSPARC233",
    "versaoSistema": "1.0",
    "dados": ""
  },
  "status": 200,
  "mensagens": [
    {
      "codigo": "[Sucesso-RELPMEI]",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "{\"parcelamentos\":[{\"numero\":9131,\"dataDoPedido\":2022052\"situacao\":\"Em parcelamento\",\"dataDaSituacao\":20220602}]}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Parcelamento - RELPMEI](../../../generated/source/solucoes/integra-parcelamento/relpmei/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpmei/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- Nenhuma anomalia detectada automaticamente.

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpmei/servicos/consulta_pedidos/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpmei/servicos/exemplos/retorno_consulta_pedidos/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `dbef8b5f49d085bf7ad7536715fd5dc36a27203b48f9a632ff5743d8289ab7b3`
