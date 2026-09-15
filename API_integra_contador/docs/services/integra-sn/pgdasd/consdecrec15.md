---
key: "PGDASD.CONSDECREC15"
family: "integra-sn"
systemId: "PGDASD"
serviceId: "CONSDECREC15"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar Declaração/Recibo

Consultar Declaração/Recibo

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PGDASD.CONSDECREC15` |
| Família | `integra-sn` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 23/09/2022 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00146) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada | numeroDeclaracao | String (17) | SIM | — | Número identificador único da declaração. |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto de tamanho 5 que representa um código interno do negócio. |
| Dados de Saída | dados | String | — | — | Estrutura de dados de retorno, contendo uma lista em SCAPED Texto JSON com o objeto Declaracao. |
| Dados de Saída — Objeto Declaracao: | numeroDeclaracao | String (17) | — | — | Identificador único da declaração transmitida. |
| Dados de Saída — Objeto Declaracao: | recibo | Object | — | — | Estrutura de dados do Recibo de entrega da declaração. A saída é um PDF. |
| Dados de Saída — Objeto Declaracao: | declaracao | Object | — | — | Estrutura de dados completa da declaração entregue. A saída é um PDF |
| Dados de Saída — Objeto Declaracao: | maed | Object | — | — | Nos casos de declaração original entregue fora do prazo, o PGDAS-D gera uma MAED. Essa estrutura representa os documentos de Notificação e DARF da MAED. |
| Dados de Saída — Objeto ArquivoRecibo: | nomeArquivo | String (28) | — | — | Nome do arquivo do recibo para ser utilizado no processo de decodificação do base64. Ex. “recibo-pgdasd-{numeroDeclaracao}.pdf” |
| Dados de Saída — Objeto ArquivoRecibo: | pdf | String | — | — | Obtém o arquivo em base 64 para conversão em PDF. |
| Dados de Saída — Objeto ArquivoDeclaracao: | nomeArquivo | String (25) | — | — | Nome do arquivo da declaracao para ser utilizado no processo de decodificação do base64. Ex. “dec-pgdasd-{numeroDeclaracao}.pdf” |
| Dados de Saída — Objeto ArquivoDeclaracao: | pdf | String | — | — | Obtém o arquivo em base 64 para conversão em PDF. |
| Dados de Saída — Objeto ArquivoMaed: | nomeArquivoNotificacao | String (50) | — | — | Nome do arquivo da notificação da multa da declaracao entregue em atraso. para ser utilizado no processo de decodificação do base64. Ex. “notificacao-maed-pgdasd-{numeroDeclaracao}.pdf” |
| Dados de Saída — Objeto ArquivoMaed: | pdfNotificacao | String | — | — | Obtém o arquivo em base 64 para conversão em PDF da notificação da MAED. |
| Dados de Saída — Objeto ArquivoMaed: | nomeArquivoDarf | String (50) | — | — | Nome do arquivo do DARF da multa da declaracao entregue em atraso. para ser utilizado no processo de decodificação do base64. Ex. “darf-maed-pgdasd-{numeroDeclaracao}.pdf” |
| Dados de Saída — Objeto ArquivoMaed: | pdfDarf | String | — | — | Obtém o arquivo em base 64 para conversão em PDF da DARF da MAED. |

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
    "idServico": "CONSDECREC15",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroDeclaracao\": \"00000000201801001\" }"
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
    "idServico": "CONSDECREC15",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroDeclaracao\": \"00000000201801001\" }"
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
        "idServico": "CONSDECREC15",
        "versaoSistema": "1.0",
        "dados": "{ \"numeroDeclaracao\": \"00000000201801001\" }"
    },
    "status": 200,
    "mensagens": [
        {
            "codigo": "Sucesso-PGDASD",
            "texto": "Requisição efetuada com sucesso."
        }
    ]
    "dados": "{\"numeroDeclaracao\": \"00000000201801001\", \"recibo\": {\"nomeArquivo\": \"PGDASD-RECIBO-00000000201801001.pdf\", \"pdf\": \"<BASE64_REMOVIDO_TAMANHO_423040>\"},\"declaracao\": {\"nomeArquivo\": \"PGDASD-DECLARACAO-00000000201801001.pdf\", \"pdf\": \"<BASE64_REMOVIDO_TAMANHO_494476>\" },\"maed\": {\"nomeArquivoNotificacao\": \"PGDASD-NOTIFICACAO-MAED-00000000201801001.pdf\", \"pdfNotificacao\": \"<BASE64_REMOVIDO_TAMANHO_250936>\", \"nomeArquivoDarf\": \"PGDASD-DARF-MAED-00000000201801001.pdf\", \"pdfDarf\": \"<BASE64_REMOVIDO_TAMANHO_282328>\"}}"
}
```

### Exemplo 3 — other

Fonte oficial:

```text
{
    "numeroDeclaracao": "00000000201801001",
    "recibo": {
    "nomeArquivo": "PGDASD-RECIBO-00000000201801001.pdf",
    "pdf": "<BASE64_REMOVIDO_TAMANHO_423040>"
    },
    "declaracao": {
     "nomeArquivo": "PGDASD-DECLARACAO-00000000201801001.pdf",
     "pdf": "<BASE64_REMOVIDO_TAMANHO_494476>"
    },
    "maed": {
     "nomeArquivoNotificacao": "PGDASD-NOTIFICACAO-MAED-00000000201801001.pdf",
     "pdfNotificacao": "<BASE64_REMOVIDO_TAMANHO_250936>",
     "nomeArquivoDarf": "PGDASD-DARF-MAED-00000000201801001.pdf",
     "pdfDarf": "<BASE64_REMOVIDO_TAMANHO_282328>"
    }
}
```

Forma normalizada:

```json
{
  "numeroDeclaracao": "00000000201801001",
  "recibo": {
    "nomeArquivo": "PGDASD-RECIBO-00000000201801001.pdf",
    "pdf": "<BASE64_REMOVIDO_TAMANHO_423040>"
  },
  "declaracao": {
    "nomeArquivo": "PGDASD-DECLARACAO-00000000201801001.pdf",
    "pdf": "<BASE64_REMOVIDO_TAMANHO_494476>"
  },
  "maed": {
    "nomeArquivoNotificacao": "PGDASD-NOTIFICACAO-MAED-00000000201801001.pdf",
    "pdfNotificacao": "<BASE64_REMOVIDO_TAMANHO_250936>",
    "nomeArquivoDarf": "PGDASD-DARF-MAED-00000000201801001.pdf",
    "pdfDarf": "<BASE64_REMOVIDO_TAMANHO_282328>"
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

- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_consultar_declaracao_recibo/))
- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_consultar_declaracao_recibo/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/servicos/consultar_declaracao_recibo/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_consultar_declaracao_recibo/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `b2f633128e7eba045f827cf3ae2b2745449c93f21b40e50acbc76151bad3db1a`
