---
key: "EVENTOSATUALIZACAO.OBTEREVENTOSPJ134"
family: "integra-contador-gerenciador"
systemId: "EVENTOSATUALIZACAO"
serviceId: "OBTEREVENTOSPJ134"
version: "1.0"
operationPath: "Monitorar"
sourceStatus: "fetched"
---

# Consultar Eventos PJ

Consulta para obter os últimos eventos de atualização de Pessoa Jurídica de forma assíncrona solicitado em lote.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `EVENTOSATUALIZACAO.OBTEREVENTOSPJ134` |
| Família | `integra-contador-gerenciador` |
| Caminho físico | `POST /Monitorar` |
| Versão | `1.0` |
| Situação oficial | 01/04/2024 |
| Bilhetamento | Não bilhetado |
| Procuração | Obrigatória (código não informado) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada | protocolo | String (36 bytes) | SIM | — | Identificador exclusivo obtido da solicitação de eventos. |
| Dados de Entrada | evento | String | SIM | — | valor de identificação do evento |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto de que representa um código interno do negócio. |
| Dados de Saída | dados | String escapada Object : Matriz de Eventos | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto: Matriz de Eventos | elementos | Array de Arrays, onde cada linha pode conter no máx 1.000 linhas | — | — | cada linha é representado por duas colunas com valores com o NI do contribuinte e a data do evento de atualização (formato AAMMDD). Quando um contribuinte não recebeu nenhuma atualização o resultado é uma string vazia. Quando não tem procuração outorgada é apresentado um caractere xis "x", onde o acesso foi negado e não houve consulta ao evento desse Contribuinte. |

## Exemplos oficiais e normalizados

### Exemplo 1 — request

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
       "numero": "",
       "tipo": 4
    },
    "pedidoDados": {
        "idSistema": "EVENTOSATUALIZACAO",
        "idServico": "OBTEREVENTOSPJ134",
        "versaoSistema": "1.0",
        "dados": "{\"protocolo\":\"q90n3455-fa91-419c-c0ad-a4ms50215acl\",\"evento\":\"E0301\"}"
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
    "numero": "",
    "tipo": 4
  },
  "pedidoDados": {
    "idSistema": "EVENTOSATUALIZACAO",
    "idServico": "OBTEREVENTOSPJ134",
    "versaoSistema": "1.0",
    "dados": "{\"protocolo\":\"q90n3455-fa91-419c-c0ad-a4ms50215acl\",\"evento\":\"E0301\"}"
  }
}
```

### Exemplo 2 — other

Fonte oficial:

```text
[
    ["00000000000000",""],
    ["11111111111111","230417"], 
    ["22222222222222","230428"], 
    ["33333333333333","x"]
]
```

Forma normalizada:

```json
[
  [
    "00000000000000",
    ""
  ],
  [
    "11111111111111",
    "230417"
  ],
  [
    "22222222222222",
    "230428"
  ],
  [
    "33333333333333",
    "x"
  ]
]
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
        "numero": "99999999999999",
        "tipo": 2
    },
    "contribuinte": {
        "numero": "",
        "tipo": 4
    },
    "pedidoDados": {
        "idSistema": "EVENTOSATUALIZACAO",
        "idServico": "OBTEREVENTOSPJ134",
        "versaoSistema": "1.0",
        "dados": "{\"protocolo\":\"q90n3455-fa91-419c-c0ad-a4ms50215acl\",\"evento\":\"E0301\"}"
    },
    "status": 200,
    "dados": "[[\"00000000000000\",\"\"],[\"11111111111111\",\"230327\"][\"22222222222222\",\"230328\"], [\"33333333333333\",\"x\"]]",
    "responseId": "565f3455-fa91-419b-b0ad-c4ac50695abf",
    "mensagens":[
        {
        "codigo": "[Sucesso-EVENTOSATUALIZACAO]",
        "texto": "Requisição efetuada com sucesso."
        },
        {
        "codigo": "[Aviso-EVENTOSATUALIZACAO-001]",
        "texto": "195 requisições restantes para consultas de eventos do tipE0301 para PF."
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
    "numero": "",
    "tipo": 4
  },
  "pedidoDados": {
    "idSistema": "EVENTOSATUALIZACAO",
    "idServico": "OBTEREVENTOSPJ134",
    "versaoSistema": "1.0",
    "dados": "{\"protocolo\":\"q90n3455-fa91-419c-c0ad-a4ms50215acl\",\"evento\":\"E0301\"}"
  },
  "status": 200,
  "dados": "[[\"00000000000000\",\"\"],[\"11111111111111\",\"230327\"][\"22222222222222\",\"230328\"], [\"33333333333333\",\"x\"]]",
  "responseId": "565f3455-fa91-419b-b0ad-c4ac50695abf",
  "mensagens": [
    {
      "codigo": "[Sucesso-EVENTOSATUALIZACAO]",
      "texto": "Requisição efetuada com sucesso."
    },
    {
      "codigo": "[Aviso-EVENTOSATUALIZACAO-001]",
      "texto": "195 requisições restantes para consultas de eventos do tipE0301 para PF."
    }
  ]
}
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-contador-gerenciador/eventosatualizacao/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/mensagens/)

### Limites

- [Limites](../../../generated/source/solucoes/integra-contador-gerenciador/eventosatualizacao/limites/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/limites/)

### Dados de domínio

- [Dados de Domínio](../../../generated/source/solucoes/integra-contador-gerenciador/eventosatualizacao/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/dados_de_dominio/)

## Anomalias

- Nenhuma anomalia detectada automaticamente.

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/servicos/obter_eventos_pj/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/exemplos/retorno_monitorar_obter_eventos_pj/)

- Última atualização informada pela fonte: 17 de junho de 2026 18:10:56 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `07fd1db0a8036f2152938068e00b970bea000eba030a7a78215661eb3065df23`
