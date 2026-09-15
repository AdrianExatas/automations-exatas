---
key: "REGIMEAPURACAO.CONSULTARANOSCALENDARIOS102"
family: "integra-sn"
systemId: "REGIMEAPURACAO"
serviceId: "CONSULTARANOSCALENDARIOS102"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar Anos Calendários

Consultar todas as opções de Regime de Apuração de Receitas

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `REGIMEAPURACAO.CONSULTARANOSCALENDARIOS102` |
| Família | `integra-sn` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 24/07/2023 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00060) |

## Entrada

Nenhum campo estruturado foi extraído automaticamente; consulte a fonte oficial e as anomalias.

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto de tamanho 5 que representa um código interno do negócio. |
| Dados de Saída | dados | String | — | — | Estrutura de dados de retorno, contendo uma lista em SCAPED Texto JSON com o objeto RegimeApuracao. |
| Dados de Saída — Objeto: RegimeApuracao | anoCalendario | Number | — | — | Ano Calendário |
| Dados de Saída — Objeto: RegimeApuracao | regimeApurado | String | — | — | Texto com o regime efetivado: "COMPETENCIA" ou "CAIXA" |

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
    "idSistema": "REGIMEAPURACAO",
    "idServico": "CONSULTARANOSCALENDARIOS102",
    "versaoSistema": "1.0",
    "dados": ""
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
    "idSistema": "REGIMEAPURACAO",
    "idServico": "CONSULTARANOSCALENDARIOS102",
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
        "idSistema": "REGIMEAPURACAO",
        "idServico": "CONSULTARANOSCALENDARIOS102",
        "versaoSistema": "1.0",
        "dados": ""
    },
    "status": 200,
    "dados": "[{\"anoCalendario\":2023,\"regimeApurado\":\"CAIXA\"},{\"anoCalendario\":2017,\"regimeApurado\":\"COMPETENCIA\"},{\"anoCalendario\":2016,\"regimeApurado\":\"CAIXA\"},{\"anoCalendario\":2015,\"regimeApurado\":\"COMPETENCIA\"},{\"anoCalendario\":2014,\"regimeApurado\":\"COMPETENCIA\"},{\"anoCalendario\":2013,\"regimeApurado\":\"COMPETENCIA\"},{\"anoCalendario\":2012,\"regimeApurado\":\"COMPETENCIA\"},{\"anoCalendario\":2011,\"regimeApurado\":\"COMPETENCIA\"},{\"anoCalendario\":2010,\"regimeApurado\":\"COMPETENCIA\"}]",
    "mensagens": [
                {
     "codigo": "[Sucesso-REGIME]",
     "texto": "Requisição efetuada com sucesso."
                }
            ]
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
    "idSistema": "REGIMEAPURACAO",
    "idServico": "CONSULTARANOSCALENDARIOS102",
    "versaoSistema": "1.0",
    "dados": ""
  },
  "status": 200,
  "dados": "[{\"anoCalendario\":2023,\"regimeApurado\":\"CAIXA\"},{\"anoCalendario\":2017,\"regimeApurado\":\"COMPETENCIA\"},{\"anoCalendario\":2016,\"regimeApurado\":\"CAIXA\"},{\"anoCalendario\":2015,\"regimeApurado\":\"COMPETENCIA\"},{\"anoCalendario\":2014,\"regimeApurado\":\"COMPETENCIA\"},{\"anoCalendario\":2013,\"regimeApurado\":\"COMPETENCIA\"},{\"anoCalendario\":2012,\"regimeApurado\":\"COMPETENCIA\"},{\"anoCalendario\":2011,\"regimeApurado\":\"COMPETENCIA\"},{\"anoCalendario\":2010,\"regimeApurado\":\"COMPETENCIA\"}]",
  "mensagens": [
    {
      "codigo": "[Sucesso-REGIME]",
      "texto": "Requisição efetuada com sucesso."
    }
  ]
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Simples Nacional - REGIME](../../../generated/source/solucoes/integra-sn/regime/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-sn/regime/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/dados_de_dominio/)

## Anomalias

- Nenhuma anomalia detectada automaticamente.

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/servicos/consultar_anos_calendarios/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/exemplos/retorno_consultar_anos/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `0d44b30e9d50df47a82761415a80301fa3cef4bb10a2887050a088864ce23583`
