---
key: "EPROCESSO.CONSPROCPORINTER271"
family: "integra-e-processo"
systemId: "EPROCESSO"
serviceId: "CONSPROCPORINTER271"
version: "2.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar Processos por Interessado

Consultar Processos por Interessado.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `EPROCESSO.CONSPROCPORINTER271` |
| Família | `integra-e-processo` |
| Caminho físico | `POST /Consultar` |
| Versão | `2.0` |
| Situação oficial | 10/11/2025 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00051) |

## Entrada

Nenhum campo estruturado foi extraído automaticamente; consulte a fonte oficial e as anomalias.

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | String (3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array Mensagem | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de código e texto da mensagem. O campo código é um texto que representa um código interno do negócio. |
| Dados de Saída | dados | String (String escapada: Array de Processo | — | — | Estrutura de dados de retorno, contendo uma lista com o objeto processo. |
| Dados de Saída | codigo | Texto | — | — | Código da mensagem retornada pelo serviço. |
| Dados de Saída | texto | Texto | — | — | Texto explicativo da mensagem. |
| Dados de Saída | numeroDoProcesso | String | — | — | Número do processo. |
| Dados de Saída | relacaoDoInteressadoComOProcesso | String | — | — | Tipo de relação do interessado com o processo |
| Dados de Saída | dataDeProtocolo | String | — | — | Data de protocolo do processo no formato data (DD/MM/YYYY) |
| Dados de Saída | tipoDoProcesso | String | — | — | Tipo do processo. |
| Dados de Saída | subtipoDoProcesso | String | — | — | Subtipo do processo. |
| Dados de Saída | localizacao | String | — | — | Localização do processo |
| Dados de Saída | situacao | String | — | — | Situação do processo |
| Dados de Saída | ultimoEncaminhamentoExterno | String | — | — | Último encaminhamento externo do processo. |

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
        "idSistema": "EPROCESSO",
        "idServico": "CONSPROCPORINTER271",
        "versaoSistema": "2.0",
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
    "idSistema": "EPROCESSO",
    "idServico": "CONSPROCPORINTER271",
    "versaoSistema": "2.0",
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
    "idSistema": "EPROCESSO",
    "idServico": "CONSPROCPORINTER271",
    "versaoSistema": "2.0",
    "dados": "{}"
  },    
  "status": 200,
  "mensagens": [
      {
        "codigo": "[Sucesso-EPROCESSO-SC_001]",
        "texto": "Requisição efetuada com sucesso."
      }
    ],
    "dados": [
      {
        "numeroDoProcesso": "00000000000000001",
        "relacaoDoInteressadoComOProcesso": "INTERESSADO",
        "dataDeProtocolo": "01/01/2020",
        "tipoDoProcesso": "AÇÃO FISCAL",
        "subtipoDoProcesso": "MEMORIAL",
        "localizacao": "DRJ",
        "situacao": "CONFIRMADO",
        "ultimoEncaminhamentoExterno": null
      },{
        "numeroDoProcesso": "00000000000000002",
        "relacaoDoInteressadoComOProcesso": "INTERESSADO",
        "dataDeProtocolo": "01/01/2020",
        "tipoDoProcesso": "AÇÃO FISCAL",
        "subtipoDoProcesso": "MEMORIAL",
        "localizacao": "CARF",
        "situacao": "CONFIRMADO",
        "ultimoEncaminhamentoExterno": null
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
    "idSistema": "EPROCESSO",
    "idServico": "CONSPROCPORINTER271",
    "versaoSistema": "2.0",
    "dados": "{}"
  },
  "status": 200,
  "mensagens": [
    {
      "codigo": "[Sucesso-EPROCESSO-SC_001]",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": [
    {
      "numeroDoProcesso": "00000000000000001",
      "relacaoDoInteressadoComOProcesso": "INTERESSADO",
      "dataDeProtocolo": "01/01/2020",
      "tipoDoProcesso": "AÇÃO FISCAL",
      "subtipoDoProcesso": "MEMORIAL",
      "localizacao": "DRJ",
      "situacao": "CONFIRMADO",
      "ultimoEncaminhamentoExterno": null
    },
    {
      "numeroDoProcesso": "00000000000000002",
      "relacaoDoInteressadoComOProcesso": "INTERESSADO",
      "dataDeProtocolo": "01/01/2020",
      "tipoDoProcesso": "AÇÃO FISCAL",
      "subtipoDoProcesso": "MEMORIAL",
      "localizacao": "CARF",
      "situacao": "CONFIRMADO",
      "ultimoEncaminhamentoExterno": null
    }
  ]
}
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-e-processo/eprocesso/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-e-processo/eprocesso/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de Domínio](../../../generated/source/solucoes/integra-e-processo/eprocesso/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-e-processo/eprocesso/dados_de_dominio/)

## Anomalias

- Nenhuma anomalia detectada automaticamente.

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-e-processo/eprocesso/servicos/consultar_processos/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-e-processo/eprocesso/exemplos/retorno_consultar_processos/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `d6d9a1d73079255154e1bc37225399adb2f7f524a1ac8f72d5433d7d632daf22`
