---
key: "SITFIS.SOLICITARPROTOCOLO91"
family: "integra-sitfis"
systemId: "SITFIS"
serviceId: "SOLICITARPROTOCOLO91"
version: "2.0"
operationPath: "Apoiar"
sourceStatus: "fetched"
---

# Solicitar protocolo do relatório de situação fiscal

Solicitação de geração de protocolo para baixar o relatório de Situação Fiscal de forma assíncrona

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `SITFIS.SOLICITARPROTOCOLO91` |
| Família | `integra-sitfis` |
| Caminho físico | `POST /Apoiar` |
| Versão | `2.0` |
| Situação oficial | 01/09/2023 |
| Bilhetamento | Não bilhetado |
| Procuração | Obrigatória (00002) |

## Entrada

Nenhum campo estruturado foi extraído automaticamente; consulte a fonte oficial e as anomalias.

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Número(3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Lista de Texto | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto de tamanho 5 que representa um código interno do negócio. |
| Dados de Saída | dados | Texto (SCAPED Texto JSON) | — | — | Estrutura de dados de retorno. |
| Dados de Saída | protocoloRelatorio | Texto | — | — | Protocolo que deve ser utilizado para recuperar o relatório de situação fiscal. Este campo é retornado quando o status é 200 e mensagens contendo o aviso Aviso-Sitfis-AV01 . |
| Dados de Saída | tempoEspera | Inteiro | — | — | Tempo de espera em milissegundos (ms) estimado para acionar o serviço para obter o relatório. Este campo é retornado quando o status é 200 ou 503. |

## Exemplos oficiais e normalizados

### Exemplo 1 — other

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
    "numero": "99999999999",
    "tipo": 1
  },
  "pedidoDados": {
    "idSistema": "SITFIS",
    "idServico": "SOLICITARPROTOCOLO91",
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
    "numero": "99999999999",
    "tipo": 1
  },
  "pedidoDados": {
    "idSistema": "SITFIS",
    "idServico": "SOLICITARPROTOCOLO91",
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
        "idSistema": "SITFIS",
        "idServico": "SOLICITARPROTOCOLO91",
        "versaoSistema": "2.0",
        "dados": ""
    },
    "status": 200,
    "dados": "{\"protocoloRelatorio\":+S7N6c04XNZUVzmxWT7SzpkZA4xeDQC9Z2T2GBJ5usn8LyouyWXbsy6mKsLyEImRkDjF4NAL25KiSXOLjnzAaZu/FC+G1pYOtTMYqokKYYr/yZ6aqUiCuWPfujDQ2/udw+Dyh56GSe28B5Ev25jDnzpvVJPhiebO5hpy1YESP5gnEhaP3bocCiZZrYG26F8avRRBJhRTsfv3op+bxvYJZsVym270eO8oZTDIr3OJj==\", \"tempoEspera\":30}",
    "mensagens":  
    [{
        "codigo": "[Sucesso-Sitfis-SC01]",
        "texto": "A requisição foi efetuada com sucesso"
    }]
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
    "idSistema": "SITFIS",
    "idServico": "SOLICITARPROTOCOLO91",
    "versaoSistema": "2.0",
    "dados": ""
  },
  "status": 200,
  "dados": "{\"protocoloRelatorio\":+S7N6c04XNZUVzmxWT7SzpkZA4xeDQC9Z2T2GBJ5usn8LyouyWXbsy6mKsLyEImRkDjF4NAL25KiSXOLjnzAaZu/FC+G1pYOtTMYqokKYYr/yZ6aqUiCuWPfujDQ2/udw+Dyh56GSe28B5Ev25jDnzpvVJPhiebO5hpy1YESP5gnEhaP3bocCiZZrYG26F8avRRBJhRTsfv3op+bxvYJZsVym270eO8oZTDIr3OJj==\", \"tempoEspera\":30}",
  "mensagens": [
    {
      "codigo": "[Sucesso-Sitfis-SC01]",
      "texto": "A requisição foi efetuada com sucesso"
    }
  ]
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Sitfis](../../../generated/source/solucoes/integra-sitfis/sitfis/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sitfis/sitfis/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- Nenhuma anomalia detectada automaticamente.

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sitfis/sitfis/servicos/apoiar_relatorio/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sitfis/sitfis/exemplos/retorno_apoiar_relatorio/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `29f5debe956103a8e02643e2b0c1808520d08f67661f5c5749622257d87a3f81`
