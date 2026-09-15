---
key: "PERTMEI.PEDIDOSPARC223"
family: "integra-parcelamento"
systemId: "PERTMEI"
serviceId: "PEDIDOSPARC223"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar todos os pedidos de parcelamento na modalidade PERTMEI para um contribuinte

Consultar todos os pedidos de parcelamentos existentes na modalidade de parcelamento PERTMEI.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PERTMEI.PEDIDOSPARC223` |
| Família | `integra-parcelamento` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 11/11/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00152, 10012) |

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
    "idSistema": "PERTMEI",
    "idServico": "PEDIDOSPARC223",
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
    "idSistema": "PERTMEI",
    "idServico": "PEDIDOSPARC223",
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
        "idSistema": "PERTMEI",
        "idServico": "PEDIDOSPARC223",
        "versaoSistema": "1.0", 
        "dados": ""
    },
  "status": 200,
  "mensagens": [
    {
      "codigo": "[Sucesso-PERTMEI]",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "{\"parcelamentos\":[{\"numero\":9101,\"dataDoPedido\":2018062\"situacao\":\"Em parcelamento\",\"dataDaSituacao\":20181106}]}"
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
    "idSistema": "PERTMEI",
    "idServico": "PEDIDOSPARC223",
    "versaoSistema": "1.0",
    "dados": ""
  },
  "status": 200,
  "mensagens": [
    {
      "codigo": "[Sucesso-PERTMEI]",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "{\"parcelamentos\":[{\"numero\":9101,\"dataDoPedido\":2018062\"situacao\":\"Em parcelamento\",\"dataDaSituacao\":20181106}]}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Parcelamento - PERTMEI](../../../generated/source/solucoes/integra-parcelamento/pertmei/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- Nenhuma anomalia detectada automaticamente.

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/servicos/consulta_pedidos/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/servicos/exemplos/retorno_consulta_pedidos/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `9aa2d0e5043487691f2b30cda31566719eaa6474e71ce8a3c19da64fa399f9c1`
