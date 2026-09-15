---
key: "MIT.SITUACAOENC315"
family: "integra-dctfweb"
systemId: "MIT"
serviceId: "SITUACAOENC315"
version: null
operationPath: "Apoiar"
sourceStatus: "fetched"
---

# Consultar situação encerramento

Consultar Situação Encerramento MIT.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `MIT.SITUACAOENC315` |
| Família | `integra-dctfweb` |
| Caminho físico | `POST /Apoiar` |
| Versão | Não informada |
| Situação oficial | 28/03/2025 |
| Bilhetamento | Não bilhetado |
| Procuração | Não conclusivo |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto Dados: | protocoloEncerramento | String | S | — | Protocolo de encerramento da apuração fornecido no serviço Encerrar Apuração . |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | String | — | — | Código HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array de Object | — | — | Mensagens retornadas no acionamento do serviço. É um array de objetos compostos de código e texto da mensagem. |
| Dados de Saída | dados | String | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto dados: | idApuracao | Number | — | — | Identificador da apuração. |
| Dados de Saída — Objeto dados: | situacaoApuracao | Number | — | — | Número de situação da apuração. |
| Dados de Saída — Objeto dados: | textoSituacao | String | — | — | Situação da apuração. |
| Dados de Saída — Objeto dados: | avisosDctf | Array de String | — | — | Mensagens retornadas pela DCTFWeb no momento do encerramento. |
| Dados de Saída — Objeto dados: | dataEncerramento | String | — | — | Data do encerramento no formato AAAAMMDD. |

## Exemplos oficiais e normalizados

### Exemplo 1 — other

Fonte oficial:

```text
"Dados": "{\"protocoloEncerramento\":\"2fc4NTscrGXWTl4xbCX9rw==\"}"
```

### Exemplo 2 — request

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
        "idSistema": "MIT",
        "idServico": "SITUACAOENC315",
        "dados": "{\"protocoloEncerramento\":\"2fc4NTscrGXWTl4xbCX9rw==\"}"
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
    "idSistema": "MIT",
    "idServico": "SITUACAOENC315",
    "dados": "{\"protocoloEncerramento\":\"2fc4NTscrGXWTl4xbCX9rw==\"}"
  }
}
```

### Exemplo 3 — response

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
        "idSistema": "MIT",
        "idServico": "SITUACAOENC315",
        "versaoSistema": "1.0",
        "dados": "{\"protocoloEncerramento\":\"2fc4NTscrGXWTl4xbCX9rw==\"}"
    },
    "status": 200,
    "responseId": "8f770ff8-6079-4765-b430-c7fd65t7e8c1",
    "responseDateTime": "2025-03-27T19:07:02.925Z",
    "mensagens": [
        {
            "codigo": "[Sucesso-MIT]",
            "texto": "Requisição efetuada com sucesso."
        }
    ],
    "dados": "{\"idApuracao\":0,\"situacaoApuracao\":3,\"textoSituacao\":\"ENCERRADA\",\"avisosDctf\":null,\"dataEncerramento\":\"20250305\"}"
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
    "idSistema": "MIT",
    "idServico": "SITUACAOENC315",
    "versaoSistema": "1.0",
    "dados": "{\"protocoloEncerramento\":\"2fc4NTscrGXWTl4xbCX9rw==\"}"
  },
  "status": 200,
  "responseId": "8f770ff8-6079-4765-b430-c7fd65t7e8c1",
  "responseDateTime": "2025-03-27T19:07:02.925Z",
  "mensagens": [
    {
      "codigo": "[Sucesso-MIT]",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "{\"idApuracao\":0,\"situacaoApuracao\":3,\"textoSituacao\":\"ENCERRADA\",\"avisosDctf\":null,\"dataEncerramento\":\"20250305\"}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens Integra-DCTFWeb: MIT](../../../generated/source/solucoes/integra-dctfweb/mit/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/mit/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-dctfweb/mit/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/mit/dados_de_dominio/)

## Anomalias

- Nenhuma anomalia detectada automaticamente.

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/mit/servicos/consultar_situacao_encerramento/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `d4626b20be3028deaa308055933b531c1bcbc89edb8e99c72b5704dc0d4e559e`
