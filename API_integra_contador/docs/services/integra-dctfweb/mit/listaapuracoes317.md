---
key: "MIT.LISTAAPURACOES317"
family: "integra-dctfweb"
systemId: "MIT"
serviceId: "LISTAAPURACOES317"
version: null
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar apuração por ano ou mês

Consultar Apurações MIT por ano ou mês. Permite listar todas as apurações MIT por ano ou mês.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `MIT.LISTAAPURACOES317` |
| Família | `integra-dctfweb` |
| Caminho físico | `POST /Consultar` |
| Versão | Não informada |
| Situação oficial | 28/03/2025 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Não conclusivo |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto dados: | anoApuracao | Number | S | — | Ano da apuração para o qual se deseja consultar todas apurações MIT. |
| Dados de Entrada — Objeto dados: | mesApuracao | Number | N | — | Mês da apuração. Se este campo for informado serão consultados apenas as apurações referentes a este ano e mês. |
| Dados de Entrada — Objeto dados: | situacaoApuracao | Number | N | — | Situação da apuração. |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | String | — | — | Código HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array de Object | — | — | Mensagens retornadas no acionamento do serviço. É um array de objetos compostos de código e texto da mensagem. |
| Dados de Saída | dados | String | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Estrutura do objeto dados: | Apuracoes | Array de Object | — | — | Lista as apurações do período consultado. |
| Dados de Saída — Estrutura do objeto dados: | periodoApuracao | String | — | — | Período da apuração (AAAAMM). |
| Dados de Saída — Estrutura do objeto dados: | idApuracao | Number | — | — | Identificador da apuração fornecido no serviço de encerramento ( identEFD ). |
| Dados de Saída — Estrutura do objeto dados: | situacao | Number | — | — | Situação da apuração. |
| Dados de Saída — Estrutura do objeto dados: | dataEncerramento | String | — | — | Data de encerramento da apuração (AAAAMMDD). |
| Dados de Saída — Estrutura do objeto dados: | eventoEspecial | Boolean | — | — | Existência ou não de evento especial na apuração. |
| Dados de Saída — Estrutura do objeto dados: | valorTotalApurado | Number | — | — | Valor do total apurado. |

## Exemplos oficiais e normalizados

### Exemplo 1 — other

Fonte oficial:

```text
"dados": "{\"mesApuracao\":2,\"anoApuracao\":2025,\"situacaoApuracao\":3}"
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
       "idServico": "LISTAAPURACOES317",
       "dados": "{\"mesApuracao\":2,\"anoApuracao\":2025,\"situacaoApuracao\":3}"
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
    "idServico": "LISTAAPURACOES317",
    "dados": "{\"mesApuracao\":2,\"anoApuracao\":2025,\"situacaoApuracao\":3}"
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
        "idServico": "LISTAAPURACOES317",
        "versaoSistema": "1.0",
        "dados":"{\"mesApuracao\":2,\"anoApuracao\":2025,\"situacaoApuracao\":3}"
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
    "dados": "{\"Apuracoes\": [{\"periodoApuracao\":202512,\"idApuracao\":0,\"situacao\":3,\"dataEncerramento\":\"20250218\",\"eventoEspecial\":false,\"valorTotalApurado\":1000.0},{\"periodoApuracao\":202512,\"idApuracao\":1,\"situacao\":3,\"dataEncerramento\":\"20250219\",\"eventoEspecial\":false,\"valorTotalApurado\":1500.0}]}"
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
    "idServico": "LISTAAPURACOES317",
    "versaoSistema": "1.0",
    "dados": "{\"mesApuracao\":2,\"anoApuracao\":2025,\"situacaoApuracao\":3}"
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
  "dados": "{\"Apuracoes\": [{\"periodoApuracao\":202512,\"idApuracao\":0,\"situacao\":3,\"dataEncerramento\":\"20250218\",\"eventoEspecial\":false,\"valorTotalApurado\":1000.0},{\"periodoApuracao\":202512,\"idApuracao\":1,\"situacao\":3,\"dataEncerramento\":\"20250219\",\"eventoEspecial\":false,\"valorTotalApurado\":1500.0}]}"
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

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/mit/servicos/consultar_apuracao_ano_mes/)

- Última atualização informada pela fonte: 10 de abril de 2026 14:58:42 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `76b02791fef057ddb369abcef6c13894545fc4303fb2cc45c4809b5722c15f06`
