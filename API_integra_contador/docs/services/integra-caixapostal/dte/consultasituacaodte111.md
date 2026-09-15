---
key: "DTE.CONSULTASITUACAODTE111"
family: "integra-caixapostal"
systemId: "DTE"
serviceId: "CONSULTASITUACAODTE111"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Obter Indicador DTE

Consulta a situação do contribuinte quanto a adesão ao Caixa Postal do Simples Nacional e eCAC

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `DTE.CONSULTASITUACAODTE111` |
| Família | `integra-caixapostal` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 01/09/2023 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00050) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada | -- | -- | -- | -- | -- |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number(3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array of String | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é uma string de tamanho 5 que representa um código interno do negócio. |
| Dados de Saída | dados | String (SCAPED STRING JSON: Dados) | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto: Dados | indicadorEnquadramento | Number (1) | — | -2: NI inválido. -1: NI Não optante. 0: NI Optante DTE. 1: NI Optante Simples. 2: NI Optante DTE e Simples. | Indicador de enquadramento do NI consultado. |
| Dados de Saída — Objeto: Dados | statusEnquadramento | String (300) | — | -- | Texto do status de enquadramento do NI consultado. |

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
    "idSistema": "DTE",
    "idServico": "CONSULTASITUACAODTE111",
    "versaoSistema": "1.0",
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
    "numero": "00000000000000",
    "tipo": 2
  },
  "contribuinte": {
    "numero": "00000000000000",
    "tipo": 2
  },
  "pedidoDados": {
    "idSistema": "DTE",
    "idServico": "CONSULTASITUACAODTE111",
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
    "numero": "99999999999",
    "tipo": 1
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
    "idSistema": "DTE",
    "idServico": "CONSULTASITUACAODTE111",
    "versaoSistema": "1.0",
    "dados": ""
  },
  "status": 200,
  "dados": "{\"indicadorEnquadramento\":0,\"statusEnquadramento\":\"CNPJ OptaDTE\"}",
  "mensagens": [
    {
      "codigo": "Sucesso-DTE-00",
      "texto": "Requisição efetuada com sucesso."
    }
  ]
}
```

Forma normalizada:

```json
{
  "contratante": {
    "numero": "99999999999",
    "tipo": 1
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
    "idSistema": "DTE",
    "idServico": "CONSULTASITUACAODTE111",
    "versaoSistema": "1.0",
    "dados": ""
  },
  "status": 200,
  "dados": "{\"indicadorEnquadramento\":0,\"statusEnquadramento\":\"CNPJ OptaDTE\"}",
  "mensagens": [
    {
      "codigo": "Sucesso-DTE-00",
      "texto": "Requisição efetuada com sucesso."
    }
  ]
}
```

### Exemplo 3 — other

Fonte oficial:

```text
{
    "codigo": "00",
    "conteudo": [{
      "indicadorEnquadramento": 0,
      "indicadorEnquadramento": "CNPJ Optante DTE"
    }]
}
```

Forma normalizada:

```json
{
  "codigo": "00",
  "conteudo": [
    {
      "indicadorEnquadramento": "CNPJ Optante DTE"
    }
  ]
}
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-caixapostal/dte/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/dte/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-caixapostal/dte/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/dte/dados_de_dominio/)

## Anomalias

- Nenhuma anomalia detectada automaticamente.

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/dte/servicos/obter_indicador_dte/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/dte/exemplos/retorno_obter_indicador_dte/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `453d7f3985d478d0befafa5e8faab8ce2732751000d76aa7ec190f794194d632`
