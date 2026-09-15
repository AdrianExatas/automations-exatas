---
key: "PROCURACOES.OBTERPROCURACAO41"
family: "integra-procuracoes"
systemId: "PROCURACOES"
serviceId: "OBTERPROCURACAO41"
version: "1"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Obter Procuração

Obter Procuração

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PROCURACOES.OBTERPROCURACAO41` |
| Família | `integra-procuracoes` |
| Caminho físico | `POST /Consultar` |
| Versão | `1` |
| Situação oficial | 23/09/2022 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Não indicada |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto "dados": | outorgante | String (11) - CPF / String (14) - CNPJ | SIM | – | Número identificador de pessoa física ou jurídica do outorgante. |
| Dados de Entrada — Objeto "dados": | tipoOutorgante | String (1) | SIM | 1 – CPF / 2 – CNPJ | Identificador de pessoa física ou jurídica. |
| Dados de Entrada — Objeto "dados": | outorgado | String (11) - CPF / String (14) - CNPJ | SIM | – | Número identificador de pessoa física ou jurídica do procurador. |
| Dados de Entrada — Objeto "dados": | tipoOutorgado | String (1) | SIM | 1 – CPF / 2 – CNPJ | Identificador de pessoa física ou jurídica. |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number (3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array (Object Mensagem ) | — | — | Mensagens explicativas retornadas no acionamento do serviço. |
| Dados de Saída | dados | String (String escapada: Array : Object Procuracao ) | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto Mensagem : | codigo | String | — | — | Código interno do negócio, de acordo com Lista de Mensagens de Negócio . |
| Dados de Saída — Objeto Mensagem : | texto | String | — | — | Texto descritivo da mensagem. |
| Dados de Saída — Objeto Procuracao : | dtexpiracao | String (8) | — | — | Data de expiração. No formato aaaaMMdd (ano, mês e dia) |
| Dados de Saída — Objeto Procuracao : | nrsistemas | Number | — | — | Quantidade de sistemas contidos na lista |
| Dados de Saída — Objeto Procuracao : | sistemas | Array (String) | — | — | Lista de sistemas contidos na procuração. |

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
    "numero": "99999999999999",
    "tipo": 2
  },
  "contribuinte": {
    "numero": "99999999999",
    "tipo": 1
  },         
  "pedidoDados": {
    "idSistema": "PROCURACOES",
    "idServico": "OBTERPROCURACAO41",
    "versaoSistema": "1",
    "dados": "{ \"outorgante\":\"99999999999999\", \"tipoOutorgante\": \"2\"outorgado\":\"99999999999\", \"tipoOutorgado\":\"1\" }"
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
      "numero": "99999999999999",
      "tipo": 2
  },
  "contribuinte": {
      "numero": "99999999999",
      "tipo": 1
  },
  "pedidoDados": {
      "idSistema": "PROCURACOES",
      "idServico": "OBTERPROCURACAO41",
      "versaoSistema": "1",
      "dados": "{ \"outorgante\":\"99999999999\", \"tipoOutorgante\": \"1\", \"outorgado\":\"99999999999999\", \"tipoOutorgado\":\"2\" }"
  },
  "status": 200,
  "dados": "[{\"dtexpiracao\":\"20230414\", \"nrsistemas\":2,\"sistemas\":[\"Caixa Postal - Mensagens\",\"Caixa Postal - Termo de Opção pelo Domicílio Tributário Eletrônico\"]},{\"dtexpiracao\":\"20221231\", \"nrsistemas\":3,\"sistemas\":[\"Declarações - DIRPF\",\"Meu Imposto de Renda\",\"Opção de Impressão do IRPF\"]}]",
  "mensagens": [
      {
        "codigo": "[Sucesso-PROCURACOES]",
        "texto": "Requisição efetuada com sucesso."
      },
      {
        "codigo": "[Aviso-PROCURACOES-20001]",
        "texto": "Uma ou mais procurações foram retornadas com sucesso."
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
    "numero": "99999999999999",
    "tipo": 2
  },
  "contribuinte": {
    "numero": "99999999999",
    "tipo": 1
  },
  "pedidoDados": {
    "idSistema": "PROCURACOES",
    "idServico": "OBTERPROCURACAO41",
    "versaoSistema": "1",
    "dados": "{ \"outorgante\":\"99999999999\", \"tipoOutorgante\": \"1\", \"outorgado\":\"99999999999999\", \"tipoOutorgado\":\"2\" }"
  },
  "status": 200,
  "dados": "[{\"dtexpiracao\":\"20230414\", \"nrsistemas\":2,\"sistemas\":[\"Caixa Postal - Mensagens\",\"Caixa Postal - Termo de Opção pelo Domicílio Tributário Eletrônico\"]},{\"dtexpiracao\":\"20221231\", \"nrsistemas\":3,\"sistemas\":[\"Declarações - DIRPF\",\"Meu Imposto de Renda\",\"Opção de Impressão do IRPF\"]}]",
  "mensagens": [
    {
      "codigo": "[Sucesso-PROCURACOES]",
      "texto": "Requisição efetuada com sucesso."
    },
    {
      "codigo": "[Aviso-PROCURACOES-20001]",
      "texto": "Uma ou mais procurações foram retornadas com sucesso."
    }
  ]
}
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-procuracoes/procuracoes/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-procuracoes/procuracoes/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-procuracoes/procuracoes/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-procuracoes/procuracoes/dados_de_dominio/)

## Anomalias

- **warning / official-pedido-dados-invalid-json:** O envelope oficial é JSON válido, mas o JSON escapado em pedidoDados.dados é inválido. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-procuracoes/procuracoes/servicos/obter_procuracao/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-procuracoes/procuracoes/servicos/obter_procuracao/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `0712cd61dbd4962013d754fc4b838a536d4752a71776f42f899a57118f453ad2`
