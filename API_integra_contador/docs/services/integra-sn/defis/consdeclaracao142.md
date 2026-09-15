---
key: "DEFIS.CONSDECLARACAO142"
family: "integra-sn"
systemId: "DEFIS"
serviceId: "CONSDECLARACAO142"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar Declarações Transmitidas na Defis

Consulta que devolve uma lista com todas os números de declarações DEFIS transmitidas à base da RFB, para um contribuinte.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `DEFIS.CONSDECLARACAO142` |
| Família | `integra-sn` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 25/09/2023 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00146) |

## Entrada

Nenhum campo estruturado foi extraído automaticamente; consulte a fonte oficial e as anomalias.

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. |
| Dados de Saída | dados | String | — | — | Estrutura de dados de retorno, contendo uma lista com o objeto Declarações. |
| Dados de Saída — Objeto: Declarações | anoCalendario | Number | — | — | Ano calendário da declaração transmitida |
| Dados de Saída — Objeto: Declarações | idDefis | String (15) | — | — | ID da Defis transmitida |
| Dados de Saída — Objeto: Declarações | tipo | String | — | — | Tipo da declaração 1-Original Normal; 2-Retificadora Normal; 3-Original de Situação Especial; 4-Retificadora de Situação Especial |
| Dados de Saída — Objeto: Declarações | dataHora | Number | — | — | Data e hora da transmissão no formato AAAAMMDDHHMMSS (24 hrs) |

## Exemplos oficiais e normalizados

### Exemplo 1 — request

Fonte oficial:

```text
{
    "Contratante": {
        "numero": "00000000000000",
        "tipo": 2
    },
    "AutorPedidoDados": {
        "Numero": "00000000000000",
        "Tipo": 2
    },
    "Contribuinte": {
        "numero": "00000000000000",
        "tipo": 2
    },
    "PedidoDados": {
        "IdSistema": "DEFIS",
        "IdServico": "CONSDECLARACAO142",
        "Dados": ""
    }
}
```

Forma normalizada:

```json
{
  "Contratante": {
    "numero": "00000000000000",
    "tipo": 2
  },
  "AutorPedidoDados": {
    "Numero": "00000000000000",
    "Tipo": 2
  },
  "Contribuinte": {
    "numero": "00000000000000",
    "tipo": 2
  },
  "PedidoDados": {
    "IdSistema": "DEFIS",
    "IdServico": "CONSDECLARACAO142",
    "Dados": ""
  }
}
```

### Exemplo 2 — response

Fonte oficial:

```text
{
    "Contratante": {
        "numero": "00000000000000",
        "tipo": 2
    },
    "AutorPedidoDados": {
        "Numero": "00000000000000",
        "Tipo": 2
    },
    "Contribuinte": {
        "numero": "00000000000000",
        "tipo": 2
    },
    "PedidoDados": {
        "IdSistema": "DEFIS",
        "IdServico": "CONSDECLARACAO142",
        "Dados": ""
    },
    "status": 200,
    "mensagens": [
    {
      "codigo": "[Sucesso-DEFIS]",
      "texto": "Requisição efetuada com sucesso."
    }
    ],
    "dados": "[{\"anoCalendario\":2019,\"idDefis\":\"000000002019001\\"tipo\":1,\"dataHora\":\"20230725102410\"},{\"anoCalendario\":201\"idDefis\":\"000000002018003\",\"tipo\":2,\"dataHora\":\"20230801145404\"{\"anoCalendario\":2018,\"idDefis\":\"000000002019002\",\"tipo\":\"dataHora\":\"20230728112244\"}]"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Simples Nacional - DEFIS](../../../generated/source/solucoes/integra-sn/defis/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-sn/defis/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/dados_de_dominio/)

## Anomalias

- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/exemplos/retorno_consultar_declaracoes/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/servicos/consultar_declaracoes/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/exemplos/retorno_consultar_declaracoes/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `9576bdaa06b84fcbe01d98bc8ea5232778336ff43f8d67278d9256aaa617ac12`
