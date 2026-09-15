---
key: "EVENTOSATUALIZACAO.SOLICEVENTOSPJ132"
family: "integra-contador-gerenciador"
systemId: "EVENTOSATUALIZACAO"
serviceId: "SOLICEVENTOSPJ132"
version: "1.0"
operationPath: "Monitorar"
sourceStatus: "fetched"
---

# Consultar Eventos PJ

Solicita de forma assíncrona os últimos eventos de atualização em lote de Pessoa Jurídica, tudo de acordo com os eventos pré-definidos no catálogo de eventos.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `EVENTOSATUALIZACAO.SOLICEVENTOSPJ132` |
| Família | `integra-contador-gerenciador` |
| Caminho físico | `POST /Monitorar` |
| Versão | `1.0` |
| Situação oficial | 01/04/2024 |
| Bilhetamento | Não bilhetado |
| Procuração | Obrigatória (código não informado) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada | eventValue | String escapada | SIM | — | valor de identificação do evento |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto de que representa um código interno do negócio. |
| Dados de Saída | dados | String escapada Object : Matriz de Eventos | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto: Protocolo | protocolo | String (36 bytes) | — | — | Identificador exclusivo da solicitação de eventos. |
| Dados de Saída — Objeto: Protocolo | TempoEsperaMedioEmMs | Number | — | — | Tempo médio de espera em milissegundos (ms). Aguarde esse tempo para que seja finalizado o processamento da solicitação do lote. Após esse tempo de espera é possível obter os eventos. Esse tempo é calculado utilizado um média móvel dos processamentos, caso a obtenção seja invocada antes, pode ocorrer de não ter finalizado o processamento do lote. |
| Dados de Saída — Objeto: Protocolo | TempoLimiteEmMin | Number | — | — | Tempo Limite em minutos (min). Esse tempo indica o tempo máximo que a solicitação do protocolo ficará disponível para obtenção. |

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
       "numero": "00000000000000,11111111111111,22222222222222,33333333333333",
       "tipo": 4
    },
    "pedidoDados": {
        "idSistema": "EVENTOSATUALIZACAO",
        "idServico": "SOLICEVENTOSPJ132",
        "versaoSistema": "1.0",
        "dados": "{\"evento\": \"E0301\"}"
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
    "numero": "00000000000000,11111111111111,22222222222222,33333333333333",
    "tipo": 4
  },
  "pedidoDados": {
    "idSistema": "EVENTOSATUALIZACAO",
    "idServico": "SOLICEVENTOSPJ132",
    "versaoSistema": "1.0",
    "dados": "{\"evento\": \"E0301\"}"
  }
}
```

### Exemplo 2 — response

Fonte oficial:

```text
{
    "protocolo": "q90n3455-fa91-419c-c0ad-a4ms50215acl", 
    "TempoEsperaMedioEmMs": 354,
    "TempoLimiteEmMin": 5
}
```

Forma normalizada:

```json
{
  "protocolo": "q90n3455-fa91-419c-c0ad-a4ms50215acl",
  "TempoEsperaMedioEmMs": 354,
  "TempoLimiteEmMin": 5
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
        "numero": "99999999999999",
        "tipo": 2
    },
    "contribuinte": {
        "numero": "00000000000000,11111111111111,22222222222222,33333333333333",
        "tipo": 4
    },
    "pedidoDados": {
        "idSistema": "EVENTOSATUALIZACAO",
        "idServico": "SOLICEVENTOSPJ132",
        "versaoSistema": "1.0",
        "dados": "{\"evento\": \"E0301\"}"
    },
    "status": 200,
    "dados": "{\"protocolo\":\"q90n3455-fa91-419c-c0ad-a4ms50215acl\"TempoEsperaMedioEmMs\":3000,\"TempoLimiteEmMin\":20}",
    "responseId": "a66rq456-ma85-419v-v0az-r6bm50695ufo",
    "mensagens":[
        {
            "codigo": "[Sucesso-EVENTOSATUALIZACAO]",
            "texto": "Requisição efetuada com sucesso."
        },
        {
            "codigo": "[Aviso-EVENTOSATUALIZACAO-001]",
            "texto": "209 requisições restantes para consultas de eventos dtipo E0301 para PJ."
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
    "numero": "00000000000000,11111111111111,22222222222222,33333333333333",
    "tipo": 4
  },
  "pedidoDados": {
    "idSistema": "EVENTOSATUALIZACAO",
    "idServico": "SOLICEVENTOSPJ132",
    "versaoSistema": "1.0",
    "dados": "{\"evento\": \"E0301\"}"
  },
  "status": 200,
  "dados": "{\"protocolo\":\"q90n3455-fa91-419c-c0ad-a4ms50215acl\"TempoEsperaMedioEmMs\":3000,\"TempoLimiteEmMin\":20}",
  "responseId": "a66rq456-ma85-419v-v0az-r6bm50695ufo",
  "mensagens": [
    {
      "codigo": "[Sucesso-EVENTOSATUALIZACAO]",
      "texto": "Requisição efetuada com sucesso."
    },
    {
      "codigo": "[Aviso-EVENTOSATUALIZACAO-001]",
      "texto": "209 requisições restantes para consultas de eventos dtipo E0301 para PJ."
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

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/servicos/solicitar_eventos_pj/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/exemplos/retorno_monitorar_solicitar_eventos_pj/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `54de6c95eb104c721e75d5299d4ae8aa0c90c14d409d6952a21c0666262d5253`
