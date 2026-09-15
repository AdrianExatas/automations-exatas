---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/servicos/gerar_das/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "28d9a2220bd4e1804c5a7258fbffb335d477a851ca57db16e6e189cb311f8956"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/servicos/gerar_das/).

# Gerar DAS

Este serviço permite a geração de DAS para um contribuinte MEI.

Identificação no Pedido de Dados

idSistema: PGMEI idServico: GERARDASPDF21

**Dados de Entrada**

Objeto Dados:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| periodoApuracao | Período de apuração no formato AAAAMM | String | SIM |
| dataConsolidacao | Data de consolidação no formato AAAAMMDD | String | NÃO |

**Exemplo: conteúdo body json de entrada**

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
"idSistema": "PGMEI",
"idServico": "GERARDASPDF21",
"dados": "{ \"periodoApuracao\": \"201901\" }"
}
}
```

**Dados de Saída**

São retornados os dados do DAS emitido.

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number(3) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. | Array de String |
| dados | Estrutura de lista de dados de retorno. | String (String escapada: Array de Object Das ) |

Objeto: Das

| Campo | Descrição | Tipo |
| --- | --- | --- |
| pdf | Pdf do DAS no formato Texto Base 64 | String |
| cnpjCompleto | Número do cnpj sem formatação | String |
| detalhamento | Detalhamento do DAS | Object DetalhamentoDas |

Objeto: DetalhamentoDas

| Campo | Descrição | Tipo |
| --- | --- | --- |
| periodoApuracao | Período de Apuração no formato AAAAMM ou "Diversos" no caso de mais de um período acumulado. | String(8) |
| numeroDocumento | Número do documento gerado | String(17) |
| dataVencimento | Data de vencimento no formato AAAAMMDD | String(8) |
| dataLimiteAcolhimento | Data limite para acolhimento no formato AAAAMMDD | String(8) |
| valores | Discriminação dos valores | Object Valores |
| observacao1 | Observação 1 | String |
| observacao2 | Observação 2 | String |
| observacao3 | Observação 3 | String |
| composicao | Composição do DAS gerado | Array de Object Composicao |

Objeto: Valores

| Campo | Descrição | Tipo |
| --- | --- | --- |
| principal | Valor do principal | Number |
| multa | Valor da multa | Number |
| juros | Valor dos juros | Number |
| total | Valor total | Number |

Objeto: Composicao

| Campo | Descrição | Tipo |
| --- | --- | --- |
| periodoApuracao | Período de apuração do tributo no formato AAAAMM | String(6) |
| codigo | Código do tributo | String |
| denominacao | Descrição do nome/destino do tributo | String |
| valores | Discriminação dos valores do tributo | Array de Object Valores |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno gerar DAS](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/exemplos/retorno_gerar_das/)
