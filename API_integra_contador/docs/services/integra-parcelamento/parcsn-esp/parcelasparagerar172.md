---
key: "PARCSN-ESP.PARCELASPARAGERAR172"
family: "integra-parcelamento"
systemId: "PARCSN-ESP"
serviceId: "PARCELASPARAGERAR172"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar as parcelas disponíveis para impressão de DAS na modalidade PARCSN ESPECIAL

Consultar parcelas disponíveis para impressão (geração do DAS) na modalidade de parcelamento especial.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PARCSN-ESP.PARCELASPARAGERAR172` |
| Família | `integra-parcelamento` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 11/11/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00125) |

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
    "idSistema": "PARCSN-ESP",
    "idServico": "PARCELASPARAGERAR172",
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
    "idSistema": "PARCSN-ESP",
    "idServico": "PARCELASPARAGERAR172",
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
        "idSistema": "PARCSN-ESP",
        "idServico": "PARCELASPARAGERAR172",
        "versaoSistema": "1.0", 
        "dados": ""
    },
    "status": 200
    "mensagens": [
        {
          "codigo": "[Sucesso-PARCSN-ESP]",
          "texto": "Requisição efetuada com sucesso."
        }
    ],
    "dados": "{\"listaParcelas\":[{\"parcela\":202211,\"valor\":3469.73{\"parcela\":202212,\"valor\":3469.73},{\"parcela\":202301,\"valor\":34673},{\"parcela\":202302,\"valor\":3469.73},{\"parcela\":20230\"valor\":3469.73},{\"parcela\":202304,\"valor\":3469.73{\"parcela\":202305,\"valor\":3469.73},{\"parcela\":202306,\"valor\":34673},{\"parcela\":202307,\"valor\":3469.73},{\"parcela\":20230\"valor\":3469.73},{\"parcela\":202309,\"valor\":3469.73{\"parcela\":202310,\"valor\":3469.73}]}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Parcelamento - PARCSN ESPECIAL](../../../generated/source/solucoes/integra-parcelamento/parcsn_esp/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn_esp/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn_esp/servicos/exemplos/retorno_consulta_parcelas_impressao/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn_esp/servicos/consulta_parcelas_impressao/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn_esp/servicos/exemplos/retorno_consulta_parcelas_impressao/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `087346e24a6ebf451d6f6c6d8d18b49d0bb57fd9e5bd762dfe9fb4bf9b726644`
