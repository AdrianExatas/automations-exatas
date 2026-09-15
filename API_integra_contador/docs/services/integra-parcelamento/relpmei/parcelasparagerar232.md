---
key: "RELPMEI.PARCELASPARAGERAR232"
family: "integra-parcelamento"
systemId: "RELPMEI"
serviceId: "PARCELASPARAGERAR232"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar as parcelas disponíveis para impressão de DAS na modalidade RELPMEI

Consultar parcelas disponíveis para impressão (geração do DAS) na modalidade de parcelamento RELPMEI.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `RELPMEI.PARCELASPARAGERAR232` |
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
| Dados de Saída — Objeto: listaParcela | listaParcela | Lista de Parcela | — | — | Informações da parcela |
| Dados de Saída — Objeto Parcela: | parcela | Número (AAAAMM) | — | — | Número da parcela |
| Dados de Saída — Objeto Parcela: | valor | Número | — | — | Valor da parcela |

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
    "idServico": "PARCELASPARAGERAR232",
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
    "idServico": "PARCELASPARAGERAR232",
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
        "idServico": "PARCELASPARAGERAR232",
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
    "dados": "{\"listaParcelas\":[{\"parcela\":202304,\"valor\":59.48{\"parcela\":202305,\"valor\":59.48},{\"parcela\":202306,\"valor\":59.48{\"parcela\":202307,\"valor\":59.48},{\"parcela\":202308,\"valor\":59.48{\"parcela\":202309,\"valor\":59.48},{\"parcela\":202310,\"valor\":59.48}]}"
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
    "idServico": "PARCELASPARAGERAR232",
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
  "dados": "{\"listaParcelas\":[{\"parcela\":202304,\"valor\":59.48{\"parcela\":202305,\"valor\":59.48},{\"parcela\":202306,\"valor\":59.48{\"parcela\":202307,\"valor\":59.48},{\"parcela\":202308,\"valor\":59.48{\"parcela\":202309,\"valor\":59.48},{\"parcela\":202310,\"valor\":59.48}]}"
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

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpmei/servicos/consulta_parcelas_impressao/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpmei/servicos/exemplos/retorno_consulta_parcelas_impressao/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `647241e3820e06c3a1a27c22e6af68aecc681fbfd8ac4f25a8655dfb6bc44ada`
