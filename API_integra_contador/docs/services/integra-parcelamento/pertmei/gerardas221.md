---
key: "PERTMEI.GERARDAS221"
family: "integra-parcelamento"
systemId: "PERTMEI"
serviceId: "GERARDAS221"
version: "1.0"
operationPath: "Emitir"
sourceStatus: "fetched"
---

# Emitir documento de arrecadação na modalidade PERTMEI

Emitir documento de arrecadação na modalidade PERTMEI.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PERTMEI.GERARDAS221` |
| Família | `integra-parcelamento` |
| Caminho físico | `POST /Emitir` |
| Versão | `1.0` |
| Situação oficial | 11/11/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00152, 10012) |

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
    "idSistema": "PERTMEI",
    "idServico": "GERARDAS221",
    "versaoSistema": "1.0", 
    "dados": "{ \"parcelaParaEmitir\": 202306 }"
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
    "idSistema": "PERTMEI",
    "idServico": "GERARDAS221",
    "versaoSistema": "1.0",
    "dados": "{ \"parcelaParaEmitir\": 202306 }"
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
        "idSistema": "PERTMEI",
        "idServico": "GERARDAS221",
        "versaoSistema": "1.0", 
        "dados": "{ \"parcelaParaEmitir\": 202306 }"
    },
    "status": 200,
    "mensagens": [
    {
      "codigo": "[Sucesso-PERTMEI]",
      "texto": "Requisição efetuada com sucesso."
    }
    ],
    "dados": "{\"docArrecadacaoPdfB64\":\"<BASE64_REMOVIDO_TAMANHO_182028>\"}"
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
    "idSistema": "PERTMEI",
    "idServico": "GERARDAS221",
    "versaoSistema": "1.0",
    "dados": "{ \"parcelaParaEmitir\": 202306 }"
  },
  "status": 200,
  "mensagens": [
    {
      "codigo": "[Sucesso-PERTMEI]",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "{\"docArrecadacaoPdfB64\":\"<BASE64_REMOVIDO_TAMANHO_182028>\"}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Parcelamento - PERTMEI](../../../generated/source/solucoes/integra-parcelamento/pertmei/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/servicos/exemplos/retorno_emite_das/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/servicos/emite_das/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/servicos/exemplos/retorno_emite_das/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `c63b31082afd478c69b74fb9e5e86c0773e2b8eea20938bdce810e09bd81bcf2`
