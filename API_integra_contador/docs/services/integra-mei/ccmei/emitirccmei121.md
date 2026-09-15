---
key: "CCMEI.EMITIRCCMEI121"
family: "integra-mei"
systemId: "CCMEI"
serviceId: "EMITIRCCMEI121"
version: null
operationPath: "Emitir"
sourceStatus: "fetched"
---

# Emissão do Certificado de Condição de MEI

Emissão do Certificado de Condição de MEI em formato PDF.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `CCMEI.EMITIRCCMEI121` |
| Família | `integra-mei` |
| Caminho físico | `POST /Emitir` |
| Versão | Não informada |
| Situação oficial | 01/10/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Não indicada |

## Entrada

Nenhum campo estruturado foi extraído automaticamente; consulte a fonte oficial e as anomalias.

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number(3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array de String | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. |
| Dados de Saída | dados | String (String escapada: Object dados ) | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto: Dados | cnpj | String | — | — | Número do cnpj sem formatação |
| Dados de Saída — Objeto: Dados | pdf | String | — | — | Pdf do DAS no formato Texto Base 64 |

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
        "cpfCnpj": "00000000000000",
        "tipo": 2
    },
    "contribuinte": {
        "numero": "00000000000000",
        "tipo": 2
    },
    "pedidoDados": {
        "idSistema": "CCMEI",
        "idServico": "EMITIRCCMEI121",
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
    "cpfCnpj": "00000000000000",
    "tipo": 2
  },
  "contribuinte": {
    "numero": "00000000000000",
    "tipo": 2
  },
  "pedidoDados": {
    "idSistema": "CCMEI",
    "idServico": "EMITIRCCMEI121",
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
        "dados": "",
        "idServico": "EMITIRCCMEI121",
        "idSistema": "CCMEI"
    },
    "mensagens": [
        {
            "codigo": "[Sucesso-CCMEI-SUC-00010]",
            "texto": "Requisição efetuada com sucesso."
        }
    ],
    "status": 200,
    "dados": "[{\"cnpj\":\"00000000000000\"\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_74136>\"}]"
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
    "dados": "",
    "idServico": "EMITIRCCMEI121",
    "idSistema": "CCMEI"
  },
  "mensagens": [
    {
      "codigo": "[Sucesso-CCMEI-SUC-00010]",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "status": 200,
  "dados": "[{\"cnpj\":\"00000000000000\"\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_74136>\"}]"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-mei/ccmei/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/exemplos/retorno_emitir_ccmei/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/servicos/emitir_ccmei/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/exemplos/retorno_emitir_ccmei/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `af67aef22da29a5e81a112ddf4babfd395bafdb06cc8c4c98aed93fabb665ab9`
