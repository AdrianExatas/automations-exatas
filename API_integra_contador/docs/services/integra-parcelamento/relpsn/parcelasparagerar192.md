---
key: "RELPSN.PARCELASPARAGERAR192"
family: "integra-parcelamento"
systemId: "RELPSN"
serviceId: "PARCELASPARAGERAR192"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar as parcelas disponíveis para impressão de DAS na modalidade RELPSN

Consultar parcelas disponíveis para impressão (geração do DAS) na modalidade de parcelamento RELPSN.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `RELPSN.PARCELASPARAGERAR192` |
| Família | `integra-parcelamento` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 11/11/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00210, 10036) |

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
    "idSistema": "RELPSN",
    "idServico": "PARCELASPARAGERAR192",
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
    "idSistema": "RELPSN",
    "idServico": "PARCELASPARAGERAR192",
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
        "idSistema": "RELPSN",
        "idServico": "PARCELASPARAGERAR192",
        "versaoSistema": "1.0", 
        "dados": ""
    },
    "status": 200,
    "mensagens": [
        {
          "codigo": "[Sucesso-RELPSN]",
          "texto": "Requisição efetuada com sucesso."
        }
    ],
    "dados": "{\"listaParcelas\":[{\"parcela\":\"202308\",\"valor\":788.26{\"parcela\":\"202309\",\"valor\":788.26},{\"parcela\":\"202310\\"valor\":788.26}]}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Parcelamento - RELPSN](../../../generated/source/solucoes/integra-parcelamento/relpsn/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpsn/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpsn/servicos/exemplos/retorno_consulta_parcelas_impressao/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpsn/servicos/consulta_parcelas_impressao/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpsn/servicos/exemplos/retorno_consulta_parcelas_impressao/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `4bcef9b228fd4d0125b52ba41060d6a4b3d97ea0b7678c2d5e37039d5191ab9a`
