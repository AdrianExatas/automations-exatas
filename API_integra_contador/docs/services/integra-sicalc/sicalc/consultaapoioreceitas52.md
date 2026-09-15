---
key: "SICALC.CONSULTAAPOIORECEITAS52"
family: "integra-sicalc"
systemId: "SICALC"
serviceId: "CONSULTAAPOIORECEITAS52"
version: null
operationPath: "Apoiar"
sourceStatus: "fetched"
---

# Consultar código receita sicalc

Apoio de consulta Receitas do Sicalc

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `SICALC.CONSULTAAPOIORECEITAS52` |
| Família | `integra-sicalc` |
| Caminho físico | `POST /Apoiar` |
| Versão | Não informada |
| Situação oficial | 23/09/2022 |
| Bilhetamento | Não bilhetado |
| Procuração | Não indicada |

## Entrada

Nenhum campo estruturado foi extraído automaticamente; consulte a fonte oficial e as anomalias.

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Consultar código receita sicalc — Estrutura da resposta : | status | String | — | — | Status HTTP retornado no acionamento do serviço. |
| Consultar código receita sicalc — Estrutura da resposta : | mensagens | Array | — | — | Array de mensagens explicativas retornadas no acionamento do serviço. Cada mensagem contém os campos codigo (String) e texto (String). |
| Consultar código receita sicalc — Estrutura da resposta : | dados | String | — | — | Estrutura de dados de retorno contendo as informações da receita. |

## Exemplos oficiais e normalizados

### Exemplo 1 — request

Fonte oficial:

```text
{
  "contratante": {
    "numero": "00000000000000",
    "tipo": "2"
  },
  "autorPedidoDados": {
    "numero": "00000000000",
    "tipo": "1"
  },
  "contribuinte": {
    "numero": "00000000000",
    "tipo": "1"
  },
  "pedidoDados": {
    "idSistema": "SICALC",
    "idServico": "CONSULTAAPOIORECEITAS52",
    "versaoSistema": "2.9",
    "dados": "{\"codigoReceita\": \"6106\"}"
  }
}
```

Forma normalizada:

```json
{
  "contratante": {
    "numero": "00000000000000",
    "tipo": "2"
  },
  "autorPedidoDados": {
    "numero": "00000000000",
    "tipo": "1"
  },
  "contribuinte": {
    "numero": "00000000000",
    "tipo": "1"
  },
  "pedidoDados": {
    "idSistema": "SICALC",
    "idServico": "CONSULTAAPOIORECEITAS52",
    "versaoSistema": "2.9",
    "dados": "{\"codigoReceita\": \"6106\"}"
  }
}
```

### Exemplo 2 — response

Fonte oficial:

```text
{
  "status": 200,
  "dados": "{\"receita\": {\"codigoReceita\": \"6106\", \"descricaoReceita\": \"IRPF - Ganhos de Capital\", \"extensoes\": [{\"obrigatorios\": {\"codigoReceita\": true, \"codigoReceitaExtensao\": true, \"dataPA\": true, \"valorImposto\": true, \"dataConsolidacao\": true}}, {\"opcionais\": {\"dataAlienacao\": true, \"ganhoCapital\": true, \"observacao\": true}}, {\"informacoes\": {\"calculado\": true, \"codigoBarras\": true, \"pf\": true, \"pj\": false}}]}}",
  "mensagens": [
    {
      "codigo": "[Sucesso-SICALC]",
      "texto": "Requisição efetuada com sucesso."
    }
  ]
}
```

Forma normalizada:

```json
{
  "status": 200,
  "dados": "{\"receita\": {\"codigoReceita\": \"6106\", \"descricaoReceita\": \"IRPF - Ganhos de Capital\", \"extensoes\": [{\"obrigatorios\": {\"codigoReceita\": true, \"codigoReceitaExtensao\": true, \"dataPA\": true, \"valorImposto\": true, \"dataConsolidacao\": true}}, {\"opcionais\": {\"dataAlienacao\": true, \"ganhoCapital\": true, \"observacao\": true}}, {\"informacoes\": {\"calculado\": true, \"codigoBarras\": true, \"pf\": true, \"pj\": false}}]}}",
  "mensagens": [
    {
      "codigo": "[Sucesso-SICALC]",
      "texto": "Requisição efetuada com sucesso."
    }
  ]
}
```

### Exemplo 3 — response

Fonte oficial:

```text
{
    "contratante": {
        "numero": "00000000000000",
        "tipo": 2
    },
    "autorPedidoDados": {
        "numero": "00000000000",
        "tipo": 1
    },
    "contribuinte": {
        "numero": "00000000000",
        "tipo": 1
    },
    "pedidoDados": {
        "idSistema": "SICALC",
        "idServico": "CONSULTAAPOIORECEITAS52",
        "versaoSistema": "2.9",
        "dados": "{\"codigoReceita\": \"6106\"}"
    },
    "status": 200,
    "dados": "{\"receita\": {\"codigoReceita\":6106,\"descricaoReceita\":\"Simples - Pagamento de Micro Empresa e Empresa de Pequeno Porte\",\"extensoes\":[{\"obrigatorios\":{\"codigoReceita\":true,\"codigoReceitaExtensao\":true,\"cota\":false,\"dataConsolidacao\":true,\"dataPA\":true,\"referencia\":false,\"tipoPA\":true,\"valorImposto\":true,\"vencimento\":false},\"informacoes\":{\"calculado\":true,\"codigoBarras\":true,\"codigoReceitaExtensao\":1,\"criacao\":\"1997-01-01T00:00:00\",\"descricaoReceitaExtensao\":\"SIMPLES - PAGAMENTO ME/EPP\",\"descricaoReferencia\":\"SEM REFERÊNCIA\",\"exigeMatriz\":true,\"extincao\":\"2007-06-30T00:00:00\",\"manual\":false,\"pf\":false,\"pj\":false,\"tipoPeriodoApuracao\":\"ME\",\"vedaValor\":true},\"opcionais\":{\"cno\":false,\"cnpjPrestador\":false,\"municipio\":true,\"observacao\":true,\"referencia\":true,\"uf\":true,\"valorJuros\":false,\"valorMulta\":false}},{\"obrigatorios\":{\"codigoReceita\":true,\"codigoReceitaExtensao\":true,\"cota\":false,\"dataConsolidacao\":true,\"dataPA\":true,\"referencia\":false,\"tipoPA\":true,\"valorImposto\":true,\"vencimento\":true},\"informacoes\":{\"calculado\":true,\"codigoBarras\":true,\"codigoReceitaExtensao\":2,\"criacao\":\"2006-07-01T00:00:00\",\"descricaoReceitaExtensao\":\"SIMPLES - PAGAMENTO ME-EPP\",\"descricaoReferencia\":\"SEM REFERÊNCIA\",\"exigeMatriz\":true,\"extincao\":\"2007-06-30T00:00:00\",\"manual\":false,\"pf\":false,\"pj\":false,\"tipoPeriodoApuracao\":\"ME\",\"vedaValor\":true},\"opcionais\":{\"cno\":false,\"cnpjPrestador\":false,\"municipio\":true,\"observacao\":true,\"referencia\":true,\"uf\":true,\"valorJuros\":false,\"valorMulta\":false}}]}}",
    "mensagens":[{
        "codigo":"[Sucesso-SICALC]",
        "texto":"Requisição efetuada com sucesso."
    }]
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
    "numero": "00000000000",
    "tipo": 1
  },
  "contribuinte": {
    "numero": "00000000000",
    "tipo": 1
  },
  "pedidoDados": {
    "idSistema": "SICALC",
    "idServico": "CONSULTAAPOIORECEITAS52",
    "versaoSistema": "2.9",
    "dados": "{\"codigoReceita\": \"6106\"}"
  },
  "status": 200,
  "dados": "{\"receita\": {\"codigoReceita\":6106,\"descricaoReceita\":\"Simples - Pagamento de Micro Empresa e Empresa de Pequeno Porte\",\"extensoes\":[{\"obrigatorios\":{\"codigoReceita\":true,\"codigoReceitaExtensao\":true,\"cota\":false,\"dataConsolidacao\":true,\"dataPA\":true,\"referencia\":false,\"tipoPA\":true,\"valorImposto\":true,\"vencimento\":false},\"informacoes\":{\"calculado\":true,\"codigoBarras\":true,\"codigoReceitaExtensao\":1,\"criacao\":\"1997-01-01T00:00:00\",\"descricaoReceitaExtensao\":\"SIMPLES - PAGAMENTO ME/EPP\",\"descricaoReferencia\":\"SEM REFERÊNCIA\",\"exigeMatriz\":true,\"extincao\":\"2007-06-30T00:00:00\",\"manual\":false,\"pf\":false,\"pj\":false,\"tipoPeriodoApuracao\":\"ME\",\"vedaValor\":true},\"opcionais\":{\"cno\":false,\"cnpjPrestador\":false,\"municipio\":true,\"observacao\":true,\"referencia\":true,\"uf\":true,\"valorJuros\":false,\"valorMulta\":false}},{\"obrigatorios\":{\"codigoReceita\":true,\"codigoReceitaExtensao\":true,\"cota\":false,\"dataConsolidacao\":true,\"dataPA\":true,\"referencia\":false,\"tipoPA\":true,\"valorImposto\":true,\"vencimento\":true},\"informacoes\":{\"calculado\":true,\"codigoBarras\":true,\"codigoReceitaExtensao\":2,\"criacao\":\"2006-07-01T00:00:00\",\"descricaoReceitaExtensao\":\"SIMPLES - PAGAMENTO ME-EPP\",\"descricaoReferencia\":\"SEM REFERÊNCIA\",\"exigeMatriz\":true,\"extincao\":\"2007-06-30T00:00:00\",\"manual\":false,\"pf\":false,\"pj\":false,\"tipoPeriodoApuracao\":\"ME\",\"vedaValor\":true},\"opcionais\":{\"cno\":false,\"cnpjPrestador\":false,\"municipio\":true,\"observacao\":true,\"referencia\":true,\"uf\":true,\"valorJuros\":false,\"valorMulta\":false}}]}}",
  "mensagens": [
    {
      "codigo": "[Sucesso-SICALC]",
      "texto": "Requisição efetuada com sucesso."
    }
  ]
}
```

### Exemplo 4 — other

Fonte oficial:

```text
{
    "dados":{
        "receita":{
            "codigoReceita":6106,
            "descricaoReceita":"Simples - Pagamento de Micro Empresa e Empresa de Pequeno Porte",
            "extensoes":[
                {
                    "obrigatorios":{
                        "codigoReceita":true,
                        "codigoReceitaExtensao":true,
                        "cota":false,
                        "dataConsolidacao":true,
                        "dataPA":true,
                        "referencia":false,
                        "tipoPA":true,
                        "valorImposto":true,
                        "vencimento":false
                    },
                    "informacoes":{
                        "calculado":true,
                        "codigoBarras":true,
                        "codigoReceitaExtensao":1,
                        "criacao":"1997-01-01T00:00:00",
                        "descricaoReceitaExtensao":"SIMPLES - PAGAMENTO ME/EPP",
                        "descricaoReferencia":"SEM REFERÊNCIA",
                        "exigeMatriz":true,
                        "extincao":"2007-06-30T00:00:00",
                        "manual":false,
                        "pf":false,
                        "pj":false,
                        "tipoPeriodoApuracao":"ME",
                        "vedaValor":true
                    },
                    "opcionais":{
                        "cno":false,
                        "cnpjPrestador":false,
                        "municipio":true,
                        "observacao":true,
                        "referencia":true,
                        "uf":true,
                        "valorJuros":false,
                        "valorMulta":false
                    }
                },
                {
                    "obrigatorios":{
                        "codigoReceita":true,
                        "codigoReceitaExtensao":true,
                        "cota":false,
                        "dataConsolidacao":true,
                        "dataPA":true,
                        "referencia":false,
                        "tipoPA":true,
                        "valorImposto":true,
                        "vencimento":true
                    },
                    "informacoes":{
                        "calculado":true,
                        "codigoBarras":true,
                        "codigoReceitaExtensao":2,
                        "criacao":"2006-07-01T00:00:00",
                        "descricaoReceitaExtensao":"SIMPLES - PAGAMENTO ME-EPP",
                        "descricaoReferencia":"SEM REFERÊNCIA",
                        "exigeMatriz":true,
                        "extincao":"2007-06-30T00:00:00",
                        "manual":false,
                        "pf":false,
                        "pj":false,
                        "tipoPeriodoApuracao":"ME",
                        "vedaValor":true
                    },
                    "opcionais":{
                        "cno":false,
                        "cnpjPrestador":false,
                        "municipio":true,
                        "observacao":true,
                        "referencia":true,
                        "uf":true,
                        "valorJuros":false,
                        "valorMulta":false
                    }
                }
            ]
        }
    }
}
```

Forma normalizada:

```json
{
  "dados": {
    "receita": {
      "codigoReceita": 6106,
      "descricaoReceita": "Simples - Pagamento de Micro Empresa e Empresa de Pequeno Porte",
      "extensoes": [
        {
          "obrigatorios": {
            "codigoReceita": true,
            "codigoReceitaExtensao": true,
            "cota": false,
            "dataConsolidacao": true,
            "dataPA": true,
            "referencia": false,
            "tipoPA": true,
            "valorImposto": true,
            "vencimento": false
          },
          "informacoes": {
            "calculado": true,
            "codigoBarras": true,
            "codigoReceitaExtensao": 1,
            "criacao": "1997-01-01T00:00:00",
            "descricaoReceitaExtensao": "SIMPLES - PAGAMENTO ME/EPP",
            "descricaoReferencia": "SEM REFERÊNCIA",
            "exigeMatriz": true,
            "extincao": "2007-06-30T00:00:00",
            "manual": false,
            "pf": false,
            "pj": false,
            "tipoPeriodoApuracao": "ME",
            "vedaValor": true
          },
          "opcionais": {
            "cno": false,
            "cnpjPrestador": false,
            "municipio": true,
            "observacao": true,
            "referencia": true,
            "uf": true,
            "valorJuros": false,
            "valorMulta": false
          }
        },
        {
          "obrigatorios": {
            "codigoReceita": true,
            "codigoReceitaExtensao": true,
            "cota": false,
            "dataConsolidacao": true,
            "dataPA": true,
            "referencia": false,
            "tipoPA": true,
            "valorImposto": true,
            "vencimento": true
          },
          "informacoes": {
            "calculado": true,
            "codigoBarras": true,
            "codigoReceitaExtensao": 2,
            "criacao": "2006-07-01T00:00:00",
            "descricaoReceitaExtensao": "SIMPLES - PAGAMENTO ME-EPP",
            "descricaoReferencia": "SEM REFERÊNCIA",
            "exigeMatriz": true,
            "extincao": "2007-06-30T00:00:00",
            "manual": false,
            "pf": false,
            "pj": false,
            "tipoPeriodoApuracao": "ME",
            "vedaValor": true
          },
          "opcionais": {
            "cno": false,
            "cnpjPrestador": false,
            "municipio": true,
            "observacao": true,
            "referencia": true,
            "uf": true,
            "valorJuros": false,
            "valorMulta": false
          }
        }
      ]
    }
  }
}
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-sicalc/sicalc/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-sicalc/sicalc/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/dados_de_dominio/)

## Anomalias

- Nenhuma anomalia detectada automaticamente.

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/servicos/apoio_consulta_receitas_do_sicalc/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_apoio_consulta_receitas_do_sicalc/)

- Última atualização informada pela fonte: 24 de junho de 2026 13:59:00 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `fdd9527c0858bdf0c316147b438998c92d7ac6f9085aade42fb936a870361cec`
