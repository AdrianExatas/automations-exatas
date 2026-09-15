---
key: "PARCMEI.GERARDAS201"
family: "integra-parcelamento"
systemId: "PARCMEI"
serviceId: "GERARDAS201"
version: "1.0"
operationPath: "Emitir"
sourceStatus: "fetched"
---

# Emitir documento de arrecadação na modalidade PARCMEI

Emitir documento de arrecadação na modalidade PARCMEI convencional.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PARCMEI.GERARDAS201` |
| Família | `integra-parcelamento` |
| Caminho físico | `POST /Emitir` |
| Versão | `1.0` |
| Situação oficial | 11/11/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00134) |

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
    "idSistema": "PARCMEI",
    "idServico": "GERARDAS201",
    "versaoSistema": "1.0", 
    "dados": "{ \"parcelaParaEmitir\": 202107 }"
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
    "idSistema": "PARCMEI",
    "idServico": "GERARDAS201",
    "versaoSistema": "1.0",
    "dados": "{ \"parcelaParaEmitir\": 202107 }"
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
        "idSistema": "PARCMEI",
        "idServico": "GERARDAS201",
        "versaoSistema": "1.0", 
        "dados": "{ \"parcelaParaEmitir\": 202107 }"
    },
  "status": 200,
  "mensagens": [
    {
      "codigo": "[Sucesso-PARCMEI]",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados":{\"docArrecadacaoPdfB64\":\"<BASE64_REMOVIDO_TAMANHO_177681>\"}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Parcelamento - PARCMEI](../../../generated/source/solucoes/integra-parcelamento/parcmei/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/servicos/exemplos/retorno_emite_das/))
- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/servicos/exemplos/retorno_emite_das/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/servicos/emite_das/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/servicos/exemplos/retorno_emite_das/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `3e6e953d4ca1c726edd483886f44ea0a811e1abdba67aa0d6211f9d7287fb5f1`
