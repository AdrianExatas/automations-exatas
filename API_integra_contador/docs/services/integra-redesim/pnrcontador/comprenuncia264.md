---
key: "PNRCONTADOR.COMPRENUNCIA264"
family: "integra-redesim"
systemId: "PNRCONTADOR"
serviceId: "COMPRENUNCIA264"
version: null
operationPath: "Emitir"
sourceStatus: "fetched"
---

# Emitir Comprovante

Emitir Comprovante de Renúncia.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PNRCONTADOR.COMPRENUNCIA264` |
| Família | `integra-redesim` |
| Caminho físico | `POST /Emitir` |
| Versão | Não informada |
| Situação oficial | 2/12/2025 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Não indicada |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto Dados: | idRenuncia | Número | SIM | — | ID da renúncia para emissão de comprovante. Pode ser recuperada com o serviço de Consultar Renúncias . Deve ser uma renúncia do contribuinte informado. |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Número(3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Lista de Texto | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. |
| Dados de Saída | dados | Texto | — | — | PDF do comprovante codificado em Base64 |

## Exemplos oficiais e normalizados

### Exemplo 1 — request

Fonte oficial:

```text
{
    "contratante": {
        "numero": "00000000000100",
        "tipo": 2
    },
    "autorPedidoDados": {
        "numero": "00000000000100",
        "tipo": 2
    },
    "contribuinte": {
        "numero": "00000000000100",
        "tipo": 2
    },
    "pedidoDados": {
        "idSistema": "PNRCONTADOR",
        "idServico": "COMPRENUNCIA264",
        "versaoSistema": "1.0",
        "dados": "{ \"idRenuncia\": 2558 }"
    }
}
```

Forma normalizada:

```json
{
  "contratante": {
    "numero": "00000000000100",
    "tipo": 2
  },
  "autorPedidoDados": {
    "numero": "00000000000100",
    "tipo": 2
  },
  "contribuinte": {
    "numero": "00000000000100",
    "tipo": 2
  },
  "pedidoDados": {
    "idSistema": "PNRCONTADOR",
    "idServico": "COMPRENUNCIA264",
    "versaoSistema": "1.0",
    "dados": "{ \"idRenuncia\": 2558 }"
  }
}
```

### Exemplo 2 — response

Fonte oficial:

```text
{
    "contratante": {
        "numero": "00000000000100",
        "tipo": 2
    },
    "autorPedidoDados": {
        "numero": "00000000000100",
        "tipo": 2
    },
    "contribuinte": {
        "numero": "00000000000100",
        "tipo": 2
    },
    "pedidoDados": {
        "idSistema": "PNRCONTADOR",
        "idServico": "COMPRENUNCIA264",
        "versaoSistema": "1.0",
        "dados": "{ \"idRenuncia\": 2558 }"
    }
    "status": 200,
    "mensagens": [
        {
            "codigo": "Sucesso-PNRCONTADOR",
            "texto": "Requisição efetuada com sucesso."
        }
    ],
    "dados": "<BASE64_REMOVIDO_TAMANHO_25080>"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-redesim/pnrcontador/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-redesim/pnrcontador/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/dados_de_dominio/)

## Anomalias

- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_emitir_comprovante/))
- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_emitir_comprovante/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/servicos/emitir_comprovante/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_emitir_comprovante/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `3b9ab2534d4caf3fa5e5551cf57a5c44432f756f8985f29afb9002ad6bf4bcf8`
