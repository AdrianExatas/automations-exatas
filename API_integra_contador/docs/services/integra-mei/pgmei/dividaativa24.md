---
key: "PGMEI.DIVIDAATIVA24"
family: "integra-mei"
systemId: "PGMEI"
serviceId: "DIVIDAATIVA24"
version: null
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar Dívida Ativa

Consultar Dívida Ativa

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PGMEI.DIVIDAATIVA24` |
| Família | `integra-mei` |
| Caminho físico | `POST /Consultar` |
| Versão | Não informada |
| Situação oficial | 23/09/2022 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Não indicada |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto Dados: | anoCalendario | String | SIM | — | Ano calendário no formato AAAA |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number(3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array de String | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. |
| Dados de Saída | dados | String (String escapada: Array de Object Debito) | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto: Debito | periodoApuracao | String | — | — | Período de apuração em formato AAAAMM |
| Dados de Saída — Objeto: Debito | tributo | String | — | — | Nome do tributo com débito em Dívida Ativa. Exemplo: "INSS" |
| Dados de Saída — Objeto: Debito | valor | Number | — | — | Valor do tributo |
| Dados de Saída — Objeto: Debito | enteFederado | String | — | — | Nome do ente federado onde há o débito. Exemplo: "União" |
| Dados de Saída — Objeto: Debito | situacaoDebito | String | — | — | Texto descrevendo a situação da dívida do tributo. Exemplo: "Enviado à PFN" |

## Exemplos oficiais e normalizados

### Exemplo 1 — request

Fonte oficial:

```text
{
    "contratante": {
        "numero": "00000000000101",
        "tipo": 2
    },
    "autorPedidoDados": {
        "numero": "00000000000101",
        "tipo": 2
    },
    "contribuinte": {
        "numero": "00000000000101",
        "tipo": 2
    },
    "pedidoDados": {
        "idSistema": "PGMEI",
        "idServico": "DIVIDAATIVA24",
        "versaoSistema": "1.0",
        "dados": "{ \"anoCalendario\": \"2019\" }"
    }
}
```

Forma normalizada:

```json
{
  "contratante": {
    "numero": "00000000000101",
    "tipo": 2
  },
  "autorPedidoDados": {
    "numero": "00000000000101",
    "tipo": 2
  },
  "contribuinte": {
    "numero": "00000000000101",
    "tipo": 2
  },
  "pedidoDados": {
    "idSistema": "PGMEI",
    "idServico": "DIVIDAATIVA24",
    "versaoSistema": "1.0",
    "dados": "{ \"anoCalendario\": \"2019\" }"
  }
}
```

### Exemplo 2 — response

Fonte oficial:

```text
{
    "contratante": {
        "numero": "00000000000101",
        "tipo": 2
    },
    "autorPedidoDados": {
        "numero": "00000000000101",
        "tipo": 2
    },
    "contribuinte": {
        "numero": "00000000000101",
        "tipo": 2
    },
    "pedidoDados": {
        "idSistema": "PGMEI",
        "idServico": "DIVIDAATIVA24",
        "versaoSistema": "1.0",
        "dados": "{ \"anoCalendario\": \"2019\" }"
       },           
    "status": 200,
      "mensagens": [
        {
          "codigo": "Sucesso-PGMEI",
          "texto": "Requisição efetuada com sucesso."
        }
    ],
    "dados": "[{\"periodoApuracao\":\"201901\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201902\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201903\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201904\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201905\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201906\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201907\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201908\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201909\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201910\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201911\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201912\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"}]"        
}
```

Forma normalizada:

```json
{
  "contratante": {
    "numero": "00000000000101",
    "tipo": 2
  },
  "autorPedidoDados": {
    "numero": "00000000000101",
    "tipo": 2
  },
  "contribuinte": {
    "numero": "00000000000101",
    "tipo": 2
  },
  "pedidoDados": {
    "idSistema": "PGMEI",
    "idServico": "DIVIDAATIVA24",
    "versaoSistema": "1.0",
    "dados": "{ \"anoCalendario\": \"2019\" }"
  },
  "status": 200,
  "mensagens": [
    {
      "codigo": "Sucesso-PGMEI",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "[{\"periodoApuracao\":\"201901\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201902\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201903\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201904\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201905\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201906\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201907\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201908\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201909\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201910\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201911\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201912\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"}]"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-mei/pgmei/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-mei/pgmei/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/dados_de_dominio/)

## Anomalias

- Nenhuma anomalia detectada automaticamente.

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/servicos/consultar_divida_ativa/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/exemplos/retorno_consultar_divida_ativa/)

- Última atualização informada pela fonte: 25 de junho de 2026 20:49:14 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `f9ee96f356580575926684398532f6a38beffb4b605e46c17fbd6a7a79acbc6d`
