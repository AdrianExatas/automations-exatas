---
key: "CAIXAPOSTAL.INNOVAMSG63"
family: "integra-caixapostal"
systemId: "CAIXAPOSTAL"
serviceId: "INNOVAMSG63"
version: "1.0"
operationPath: "Monitorar"
sourceStatus: "fetched"
---

# Obter Indicador de Novas Mensagens

Obter Indicador de novas mensagens

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `CAIXAPOSTAL.INNOVAMSG63` |
| Família | `integra-caixapostal` |
| Caminho físico | `POST /Monitorar` |
| Versão | `1.0` |
| Situação oficial | 23/09/2022 |
| Bilhetamento | Não bilhetado |
| Procuração | Obrigatória (00006) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada | -- | -- | -- | -- | -- |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number(3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array of String | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é uma string de tamanho 5 que representa um código interno do negócio. |
| Dados de Saída | dados | String (SCAPED STRING JSON: Dados) | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto: Dados | codigo | Number (2) | — | Tabela: Lista códigos de retorno | Resultado da Requisição. |
| Dados de Saída — Objeto: Dados | indicadorMensagensNovas | Number (1) | — | 0 – Contribuinte não possui mensagens novas. 1 – Contribuinte possui uma mensagem nova. 2 – Contribuinte possui mensagens novas. | Indicador de mensagens novas. |

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
    "idSistema": "CAIXAPOSTAL",
    "idServico": "INNOVAMSG63",
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
    "idSistema": "CAIXAPOSTAL",
    "idServico": "INNOVAMSG63",
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
    "numero": "99999999999",
    "tipo": 1
  },
  "autorPedidoDados": {
    "numero": "99999999999",
    "tipo": 1
  },
  "contribuinte": {
    "numero": "99999999999",
    "tipo": 1
  },
  "pedidoDados": {
    "idSistema": "CAIXAPOSTAL",
    "idServico": "INNOVAMSG63",
    "versaoSistema": "1.0",
    "dados": ""
  },
  "status": 200,
  "dados": "{\"codigo\":\"00\",\"conteudo\":[{\"indicadorMensagensNovas\":\"2\"}]}",
  "mensagens": [
    {
      "codigo": "00",
      "texto": "Operação realizada com sucesso."
    }
  ]
}
```

Forma normalizada:

```json
{
  "contratante": {
    "numero": "99999999999",
    "tipo": 1
  },
  "autorPedidoDados": {
    "numero": "99999999999",
    "tipo": 1
  },
  "contribuinte": {
    "numero": "99999999999",
    "tipo": 1
  },
  "pedidoDados": {
    "idSistema": "CAIXAPOSTAL",
    "idServico": "INNOVAMSG63",
    "versaoSistema": "1.0",
    "dados": ""
  },
  "status": 200,
  "dados": "{\"codigo\":\"00\",\"conteudo\":[{\"indicadorMensagensNovas\":\"2\"}]}",
  "mensagens": [
    {
      "codigo": "00",
      "texto": "Operação realizada com sucesso."
    }
  ]
}
```

### Exemplo 3 — other

Fonte oficial:

```text
{
    "codigo": "00",
    "conteudo": [{
      "indicadorMensagensNovas": "2"
    }]
}
```

Forma normalizada:

```json
{
  "codigo": "00",
  "conteudo": [
    {
      "indicadorMensagensNovas": "2"
    }
  ]
}
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-caixapostal/caixapostal/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- Nenhuma anomalia detectada automaticamente.

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/servicos/obter_indicador_de_novas_mensagens/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/exemplos/retorno_obter_indicador_de_novas_mensagens/)

- Última atualização informada pela fonte: 10 de abril de 2026 14:58:42 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `3c5d97f48d889ce0267d648467b7ee3f944f859e6b51648f37078540510c356b`
