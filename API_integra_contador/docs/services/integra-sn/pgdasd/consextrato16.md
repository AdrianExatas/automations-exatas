---
key: "PGDASD.CONSEXTRATO16"
family: "integra-sn"
systemId: "PGDASD"
serviceId: "CONSEXTRATO16"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar Extrato do DAS

Consultar Extrato do DAS

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PGDASD.CONSEXTRATO16` |
| Família | `integra-sn` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 23/09/2022 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00146) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada | numeroDas | String (17) | SIM | — | Número do DAS que se deseja fazer a consulta do Extrato. |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto de tamanho 5 que representa um código interno do negócio. |
| Dados de Saída | dados | String | — | — | Estrutura de dados de retorno, contendo uma lista em SCAPED Texto JSON com o objeto ExtratoDas. |
| Dados de Saída — Objeto: ExtratoDas | numeroDas | String (17) | — | — | Número do DAS (Documento de Arrecadação do Simples Nacional). |
| Dados de Saída — Objeto: ExtratoDas | extrato | Object | — | — | Estrutura de dados do Extrato do DAS. A saída é um PDF. |
| Dados de Saída — Objeto: ArquivoExtrato | nomeArquivo | String (50) | — | — | Nome do arquivo do extrato para ser utilizado no processo de decodificação do base64. Ex. “extrato-pgdasd-{numeroDeclaracao}.pdf”. |
| Dados de Saída — Objeto: ArquivoExtrato | pdf | String | — | — | Obtém o arquivo em base 64 para conversão em PDF. |

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
    "idSistema": "PGDASD",
    "idServico": "CONSEXTRATO16",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroDas\": \"07202136999997159\" }"
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
    "idSistema": "PGDASD",
    "idServico": "CONSEXTRATO16",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroDas\": \"07202136999997159\" }"
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
        "idSistema": "PGDASD",
        "idServico": "CONSEXTRATO16",
        "versaoSistema": "1.0",
        "dados": "{ \"numeroDas\": \"07202136999997159\" }"
    },
    "status": 200,
    "dados": "{\"numeroDas\":\"07202136999997159\",\"extrato\":{\"nomeArquivo\":\"PGDASD-EXTRATO-07202136999997159.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_273348>\"}}",
    "mensagens": [
        {
            "codigo": "Sucesso-PGDASD",
            "texto": "Requisição efetuada com sucesso."
        }
    ]
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
    "idSistema": "PGDASD",
    "idServico": "CONSEXTRATO16",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroDas\": \"07202136999997159\" }"
  },
  "status": 200,
  "dados": "{\"numeroDas\":\"07202136999997159\",\"extrato\":{\"nomeArquivo\":\"PGDASD-EXTRATO-07202136999997159.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_273348>\"}}",
  "mensagens": [
    {
      "codigo": "Sucesso-PGDASD",
      "texto": "Requisição efetuada com sucesso."
    }
  ]
}
```

### Exemplo 3 — other

Fonte oficial:

```text
{
    "numeroDas": "07202136999997159",
    "extrato": {
    "nomeArquivo": "PGDASD-EXTRATO-07202136999997159.pdf",
    "pdf": "<BASE64_REMOVIDO_TAMANHO_273348>"
    }
}
```

Forma normalizada:

```json
{
  "numeroDas": "07202136999997159",
  "extrato": {
    "nomeArquivo": "PGDASD-EXTRATO-07202136999997159.pdf",
    "pdf": "<BASE64_REMOVIDO_TAMANHO_273348>"
  }
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Simples Nacional](../../../generated/source/solucoes/integra-sn/pgdasd/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-sn/pgdasd/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/dados_de_dominio/)

## Anomalias

- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_consultar_extrato_do_das/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/servicos/consultar_extrato_do_das/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_consultar_extrato_do_das/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `ac3fff48f3d69f0ee405bf5c63bf7f50c1d50d323646ce35619315670b2a9d27`
