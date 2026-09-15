---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/servicos/consultar_divida_ativa/"
sourceUpdatedAt: "25 de junho de 2026 20:49:14 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "53bda99313ed39972c505d26fdf2745f8588d6ea44dc79fcda81b6a8bd47adc9"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/servicos/consultar_divida_ativa/).

# Consultar Dívida Ativa

Este serviço consulta a informação se o contribuinte está em dívida ativa

Identificação no Pedido de Dados

idSistema: PGMEI idServico: DIVIDAATIVA24

**Dados de Entrada**

Objeto Dados:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| anoCalendario | Ano calendário no formato AAAA | String | SIM |

**Exemplo: conteúdo body json de entrada**

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

**Dados de Saída**

São retornados os dados dos períodos onde há inscrição em Dívida Ativa.

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number(3) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. | Array de String |
| dados | Estrutura de dados de retorno. | String (String escapada: Array de Object Debito) |

Objeto: Debito

| Campo | Descrição | Tipo |
| --- | --- | --- |
| periodoApuracao | Período de apuração em formato AAAAMM | String |
| tributo | Nome do tributo com débito em Dívida Ativa. Exemplo: "INSS" | String |
| valor | Valor do tributo | Number |
| enteFederado | Nome do ente federado onde há o débito. Exemplo: "União" | String |
| situacaoDebito | Texto descrevendo a situação da dívida do tributo. Exemplo: "Enviado à PFN" | String |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno Consultar Dívida Ativa](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/exemplos/retorno_consultar_divida_ativa/)
