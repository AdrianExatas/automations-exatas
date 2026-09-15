---
key: "AUTENTICAPROCURADOR.ENVIOXMLASSINADO81"
family: "integra-contador-gerenciador"
systemId: "AUTENTICAPROCURADOR"
serviceId: "ENVIOXMLASSINADO81"
version: "1.0"
operationPath: "Apoiar"
sourceStatus: "fetched"
---

# Envio de XML assinado com o Termo de Autorização

Envio de XML assinado digitalmente pelo procurador para receber um TOKEN de autorização do Procurador

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `AUTENTICAPROCURADOR.ENVIOXMLASSINADO81` |
| Família | `integra-contador-gerenciador` |
| Caminho físico | `POST /Apoiar` |
| Versão | `1.0` |
| Situação oficial | 23/09/2022 |
| Bilhetamento | Não bilhetado |
| Procuração | Não indicada |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada | xml | String escapada | Sim | — | Documento XML assinado previamente com certificado digital do Autor Pedido de Dados (eCPF ou eCNPJ - ICP-Brasil) nos padrões XMLDSig e codificado em base64 . |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é uma Texto de tamanho 5 que representa um código interno do negócio. |
| Dados de Saída | dados | String escapada - Object : Autentica | — | — | Estrutura de dados de retorno. |
| Dados de Saída | autenticar_procurador_token | String | — | — | Token de acesso para ser utilizado nas requisições do Integra Contador via http HEADER. |
| Dados de Saída | data_hora_expiracao | String representando a data e hora. Formato: yyyy-MM-dd'T'HH:mm:ss | — | — | Data e hora da expiração do token. |

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
       "numero": "00000000000000",
       "tipo": 2
    },
    "contribuinte": {
       "numero": "11111111111111",
       "tipo": 2
    },
    "pedidoDados": {
        "idSistema": "AUTENTICAPROCURADOR",
        "idServico": "ENVIOXMLASSINADO81",
        "versaoSistema": "1.0",
        "dados": "{\"xml\": \"<BASE64_REMOVIDO_TAMANHO_3259>\"}"
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
    "numero": "00000000000000",
    "tipo": 2
  },
  "contribuinte": {
    "numero": "11111111111111",
    "tipo": 2
  },
  "pedidoDados": {
    "idSistema": "AUTENTICAPROCURADOR",
    "idServico": "ENVIOXMLASSINADO81",
    "versaoSistema": "1.0",
    "dados": "{\"xml\": \"<BASE64_REMOVIDO_TAMANHO_3259>\"}"
  }
}
```

### Exemplo 2 — response

Fonte oficial:

```text
{
    "contratante": {
        "numero": "99999999999999",
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
        "idSistema": "AUTENTICAPROCURADOR",
        "idServico": "ENVIOXMLASSINADO81",
        "versaoSistema": "1.0",
        "dados": "{\"xml\": \"<BASE64_REMOVIDO_TAMANHO_3259>\"}"
    },
    "status": 200,
    "dados":{\"autenticar_procurador_token\":\"b06feea3-1ca8-49f4-bdb4-211ab006cb92\\"data_hora_expiracao\":\"2022-08-12T00:00:01\"}",
    "mensagens": [
        {
            "codigo": "200",
            "texto": "Sucesso na execução."
        }
    ]
}
```

### Exemplo 3 — other

Fonte oficial:

```text
{
    "autenticar_procurador_token": "b06feea3-1ca8-49f4-bdb4-211ab006cb92",
    "data_hora_expiracao": "2022-08-12T00:00:01"
}
```

Forma normalizada:

```json
{
  "autenticar_procurador_token": "b06feea3-1ca8-49f4-bdb4-211ab006cb92",
  "data_hora_expiracao": "2022-08-12T00:00:01"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-contador-gerenciador/autenticaprocurador/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/autenticaprocurador/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de Domínio](../../../generated/source/solucoes/integra-contador-gerenciador/autenticaprocurador/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/autenticaprocurador/dados_de_dominio/)

## Anomalias

- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/autenticaprocurador/servicos/envio_de_xml_assinado/))
- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/autenticaprocurador/exemplos/retorno_envio_xml_assinado/))
- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/autenticaprocurador/exemplos/retorno_envio_xml_assinado/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/autenticaprocurador/servicos/envio_de_xml_assinado/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/autenticaprocurador/exemplos/retorno_envio_xml_assinado/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `ae473f0cd782a0a7d2fb98cdde70cc58b82e9d1306028785b6a75682a7747ccb`
