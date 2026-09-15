---
key: "PGMEI.ATUBENEFICIO23"
family: "integra-mei"
systemId: "PGMEI"
serviceId: "ATUBENEFICIO23"
version: null
operationPath: "Emitir"
sourceStatus: "fetched"
---

# Atualizar Benefício

Atualizar Benefício

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PGMEI.ATUBENEFICIO23` |
| Família | `integra-mei` |
| Caminho físico | `POST /Emitir` |
| Versão | Não informada |
| Situação oficial | 23/09/2022 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Não indicada |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto Dados: | anoCalendario | Number | SIM | — | Ano calendário no formato AAAA |
| Dados de Entrada — Objeto Dados: | infoBeneficio | Array de Object Beneficio | SIM | — | Informação sobre o benefício |
| Dados de Entrada — Objeto: Beneficio | periodoApuracao | String | SIM | — | Período de apuração no formato AAAAMM |
| Dados de Entrada — Objeto: Beneficio | indicadorBeneficio | Boolean | SIM | — | Indica se houve benefício |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number(3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array de String | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. |
| Dados de Saída | dados | String (String escapada: Array de Object AtualizarBeneficioIntegraMei ) | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto: AtualizarBeneficioIntegraMei | paOriginal | String | — | — | Período de apuração original |
| Dados de Saída — Objeto: AtualizarBeneficioIntegraMei | indicadorBeneficio | Boolean | — | — | Indica se há benefício no período |
| Dados de Saída — Objeto: AtualizarBeneficioIntegraMei | paAgrupado | String | — | — | PA que possui os períodos agrupados para emissão de DAS. Formato AAAAMM |

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
        "idServico": "ATUBENEFICIO23",
        "versaoSistema": "1.0",
        "dados": "{\"anoCalendario\":2026,\"infoBeneficio\":[{\"periodoApuracao\":\"202601\",\"indicadorBeneficio\":true},{\"periodoApuracao\":\"202602\",\"indicadorBeneficio\":true}]}"
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
    "idServico": "ATUBENEFICIO23",
    "versaoSistema": "1.0",
    "dados": "{\"anoCalendario\":2026,\"infoBeneficio\":[{\"periodoApuracao\":\"202601\",\"indicadorBeneficio\":true},{\"periodoApuracao\":\"202602\",\"indicadorBeneficio\":true}]}"
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
        "idServico": "ATUBENEFICIO23",
        "versaoSistema": "1.0",
        "dados": "{\"anoCalendario\":2026,\"infoBeneficio\":[{\"periodoApuracao\":\"202601\",\"indicadorBeneficio\":true},{\"periodoApuracao\":\"202602\",\"indicadorBeneficio\":true}]}"
    },          
    "status": 200,
      "mensagens": [
        {
          "codigo": "Sucesso-PGMEI",
          "texto": "Requisição efetuada com sucesso."
        }
      ],
    "dados": "[{\"paOriginal\":\"202601\",\"indicadorBeneficio\":true,\"paAgrupado\":\"202602\"},{\"paOriginal\":\"202602\",\"indicadorBeneficio\":true,\"paAgrupado\":\"202601\"}]"        
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
    "idServico": "ATUBENEFICIO23",
    "versaoSistema": "1.0",
    "dados": "{\"anoCalendario\":2026,\"infoBeneficio\":[{\"periodoApuracao\":\"202601\",\"indicadorBeneficio\":true},{\"periodoApuracao\":\"202602\",\"indicadorBeneficio\":true}]}"
  },
  "status": 200,
  "mensagens": [
    {
      "codigo": "Sucesso-PGMEI",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "[{\"paOriginal\":\"202601\",\"indicadorBeneficio\":true,\"paAgrupado\":\"202602\"},{\"paOriginal\":\"202602\",\"indicadorBeneficio\":true,\"paAgrupado\":\"202601\"}]"
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

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/servicos/atualizar_beneficio/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/exemplos/retorno_atualizar_beneficio/)

- Última atualização informada pela fonte: 25 de junho de 2026 20:41:22 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `a71682b5a7657e3724fa153fe0dccfc108f7ddb08aff368baca69a65aaedbfda`
