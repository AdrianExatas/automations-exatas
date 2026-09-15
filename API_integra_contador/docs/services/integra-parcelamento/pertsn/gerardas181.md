---
key: "PERTSN.GERARDAS181"
family: "integra-parcelamento"
systemId: "PERTSN"
serviceId: "GERARDAS181"
version: "1.0"
operationPath: "Emitir"
sourceStatus: "fetched"
---

# Emitir documento de arrecadação na modalidade PERTSN

Emitir documento de arrecadação na modalidade PERTSN.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PERTSN.GERARDAS181` |
| Família | `integra-parcelamento` |
| Caminho físico | `POST /Emitir` |
| Versão | `1.0` |
| Situação oficial | 11/11/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00149, 10011) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada | parcelaParaEmitir | Número (AAAAMM) | SIM | — | Ano e mês da parcela para emitir o DAS |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Número(3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Lista de Texto | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. |
| Dados de Saída | dados | Texto (SCAPED Texto JSON) | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto: dados | docArrecadacaoPdfB64 | Texto | — | — | PDF DAS em formato base 64 |

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
    "idSistema": "PERTSN",
    "idServico": "GERARDAS181",
    "versaoSistema": "1.0", 
    "dados": "{ \"parcelaParaEmitir\": 202301 }"
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
    "idSistema": "PERTSN",
    "idServico": "GERARDAS181",
    "versaoSistema": "1.0",
    "dados": "{ \"parcelaParaEmitir\": 202301 }"
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
        "idSistema": "PERTSN",
        "idServico": "GERARDAS181",
        "versaoSistema": "1.0", 
        "dados": "{ \"parcelaParaEmitir\": 202301 }"
    },
  "status": 200,
  "mensagens": [
    {
      "codigo": "[Sucesso-PERTSN]",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "{\"docArrecadacaoPdfB64\":\"<BASE64_REMOVIDO_TAMANHO_183616>\"}"
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
    "idSistema": "PERTSN",
    "idServico": "GERARDAS181",
    "versaoSistema": "1.0",
    "dados": "{ \"parcelaParaEmitir\": 202301 }"
  },
  "status": 200,
  "mensagens": [
    {
      "codigo": "[Sucesso-PERTSN]",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "{\"docArrecadacaoPdfB64\":\"<BASE64_REMOVIDO_TAMANHO_183616>\"}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Parcelamento - PERTSN](../../../generated/source/solucoes/integra-parcelamento/pertsn/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertsn/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertsn/servicos/exemplos/retorno_emite_das/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertsn/servicos/emite_das/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertsn/servicos/exemplos/retorno_emite_das/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `d09825a799682300406644b2cded3ac2c794680421c27faee7afc22ff8344db1`
