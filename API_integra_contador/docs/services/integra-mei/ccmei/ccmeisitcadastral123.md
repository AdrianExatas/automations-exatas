---
key: "CCMEI.CCMEISITCADASTRAL123"
family: "integra-mei"
systemId: "CCMEI"
serviceId: "CCMEISITCADASTRAL123"
version: null
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consulta a situação cadastral dos CNPJ MEI vinculados ao CPF

Consulta a situação cadastral dos CNPJ MEI vinculados ao CPF.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `CCMEI.CCMEISITCADASTRAL123` |
| Família | `integra-mei` |
| Caminho físico | `POST /Consultar` |
| Versão | Não informada |
| Situação oficial | 01/10/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Não conclusivo |

## Entrada

Nenhum campo estruturado foi extraído automaticamente; consulte a fonte oficial e as anomalias.

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number(3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array de String | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. |
| Dados de Saída | dados | String (String escapada: Array de Object dados ) | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto: Lista de Objeto | cnpj | String | — | — | Número do cnpj sem formatação |
| Dados de Saída — Objeto: Lista de Objeto | situacao | String | — | — | Atual situação cadastral do CNPJ |
| Dados de Saída — Objeto: Lista de Objeto | enquadradoMei | Boolean | — | — | Atual situação de enquadramento MEI |

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
        "idSistema": "CCMEI",
        "idServico": "CCMEISITCADASTRAL123",
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
    "idSistema": "CCMEI",
    "idServico": "CCMEISITCADASTRAL123",
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
        "idSistema": "CCMEI",
        "idServico": "CCMEISITCADASTRAL123",
        "versaoSistema": "1.0",
        "dados": ""
    },          
    "status": 200,
      "mensagens": [
        {
          "codigo": "[Sucesso-CCMEI-SUC-00010]",
          "texto": "Requisição efetuada com sucesso."
        }
      ],
    "dados": "[{\"cnpj\":\"00000000000000\",\"situacao\":\"BAIXADA\",\"enquadradoMei\":true},{\"cnpj\":\"11111111111111\",\"situacao\":\"ATIVA\",\"enquadradoMei\":true}]]"     
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
    "idSistema": "CCMEI",
    "idServico": "CCMEISITCADASTRAL123",
    "versaoSistema": "1.0",
    "dados": ""
  },
  "status": 200,
  "mensagens": [
    {
      "codigo": "[Sucesso-CCMEI-SUC-00010]",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "[{\"cnpj\":\"00000000000000\",\"situacao\":\"BAIXADA\",\"enquadradoMei\":true},{\"cnpj\":\"11111111111111\",\"situacao\":\"ATIVA\",\"enquadradoMei\":true}]]"
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

- Nenhuma anomalia detectada automaticamente.

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/servicos/consultar_situacao_cadastral_ccmei/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/exemplos/retorno_consultar_situacao_cadastral_ccmei/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `b78b41b4a104de0fe73caadf07ea2c5ef96108fa499359e35fe095f1403ee3fe`
