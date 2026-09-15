---
key: "PAGTOWEB.COMPARRECADACAO72"
family: "integra-pagamento"
systemId: "PAGTOWEB"
serviceId: "COMPARRECADACAO72"
version: "1.0"
operationPath: "Emitir"
sourceStatus: "fetched"
---

# Emite Comprovante Pagamento

Emitir Comprovante de Arrecadação

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PAGTOWEB.COMPARRECADACAO72` |
| Família | `integra-pagamento` |
| Caminho físico | `POST /Emitir` |
| Versão | `1.0` |
| Situação oficial | 23/09/2022 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00004) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto ParametroEmissaoComprovanteIC: | numeroDocumento | String (até 17 bytes) | SIM | — | Número do documento. |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é uma string de tamanho 5 que representa um código interno do negócio. |
| Dados de Saída | dados | String | — | — | PDF codificado em Base64 |

## Exemplos oficiais e normalizados

### Exemplo 1 — request

Fonte oficial:

```text
{
    "contratante": {
        "numero": "99999999999999",
        "tipo": 2
    },
    "autorPedidoDados": {
        "numero": "99999999999",
        "tipo": 1    },
    "contribuinte": {
        "numero": "99999999999",
        "tipo": 1    },
    "pedidoDados": {
        "idSistema": "PAGTOWEB",
        "idServico": "COMPARRECADACAO72",
        "dados": "{\"numeroDocumento\": \"99999999999999999\"}"
    }
}
```

Forma normalizada:

```json
{
  "contratante": {
    "numero": "99999999999999",
    "tipo": 2
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
    "idSistema": "PAGTOWEB",
    "idServico": "COMPARRECADACAO72",
    "dados": "{\"numeroDocumento\": \"99999999999999999\"}"
  }
}
```

### Exemplo 2 — other

Fonte oficial:

```text
{
    "contratante": {
        "numero": "99999999999999",
        "tipo": 2
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
        "idSistema": "PAGTOWEB",
        "idServico": "COMPARRECADACAO72",
        "versaoSistema": "1.0",
        "dados": "{\"numeroDocumento\": \"99999999999999999\"}"
    },
    "status": 200,
    "dados": {\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_102889>\"}",
    "mensagens": [
        {
            "codigo": "Sucesso-PAGTOWEB-00000",
            "texto": "Requisição efetuada com sucesso."
        }
    ]
}
```

### Exemplo 3 — other

Fonte oficial:

```text
{
     "pdf":"<BASE64_REMOVIDO_TAMANHO_102868>"
}
```

Forma normalizada:

```json
{
  "pdf": "<BASE64_REMOVIDO_TAMANHO_102868>"
}
```

### Exemplo 4 — other

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
        "numero": "11111111111111",
        "tipo": 2
    },
    "pedidoDados": {
        "idSistema": "PAGTOWEB",
        "idServico": "COMPARRECADACAO72",
        "versaoSistema": "1.0",
        "dados": "{\"numeroDocumento\": \"07082216654265000\"}"
    },
    "status": 200,
    "responseId": "70c8b0eb-87c7-4263-9079-e58f1e88eb1e",
    "responseDateTime": "2026-03-13T11:36:22.811Z",
    "dados": {\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_81471>\"}",
    "mensagens": [
        {
        "codigo": "Sucesso-PAGTOWEB-00000",
        "texto": "Requisição efetuada com sucesso."
        }
    ]
}
```

### Exemplo 5 — other

Fonte oficial:

```text
{
     "pdf":"<BASE64_REMOVIDO_TAMANHO_81458>"
}
```

Forma normalizada:

```json
{
  "pdf": "<BASE64_REMOVIDO_TAMANHO_81458>"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-pagamento/pagtoweb/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-pagamento/pagtoweb/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/dados_de_dominio/)

## Anomalias

- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/exemplos/retorno_emite_comprovante_pagamento/))
- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/exemplos/retorno_emite_comprovante_pagamento/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/servicos/emite_comprovante_pagamento/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/exemplos/retorno_emite_comprovante_pagamento/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `9322509e56a234e2c25f7c7f24da487086f51855daaa69ef2e559b467902cf46`
