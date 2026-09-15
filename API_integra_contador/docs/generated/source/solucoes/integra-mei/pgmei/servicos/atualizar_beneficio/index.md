---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/servicos/atualizar_beneficio/"
sourceUpdatedAt: "25 de junho de 2026 20:41:22 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "844004a025b8b3896038942b2e75fd14a987e07cc9382cb4f8fb4fd86579155c"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/servicos/atualizar_beneficio/).

# Atualizar Benefício

Este serviço permite que seja registrado benefício para determinada apuração do PGMEI.

Identificação no Pedido de Dados

idSistema: PGMEI idServico: ATUBENEFICIO23

**Dados de Entrada**

Objeto Dados:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| anoCalendario | Ano calendário no formato AAAA | Number | SIM |
| infoBeneficio | Informação sobre o benefício | Array de Object Beneficio | SIM |

Objeto: Beneficio

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| periodoApuracao | Período de apuração no formato AAAAMM | String | SIM |
| indicadorBeneficio | Indica se houve benefício | Boolean | SIM |

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
"idServico": "ATUBENEFICIO23",
"versaoSistema": "1.0",
"dados": "{\"anoCalendario\":2026,\"infoBeneficio\":[{\"periodoApuracao\":\"202601\",\"indicadorBeneficio\":true},{\"periodoApuracao\":\"202602\",\"indicadorBeneficio\":true}]}"
}
}
```

**Dados de Saída**

O retorno é a confirmação que os benefícios foram inseridos com sucesso.

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number(3) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. | Array de String |
| dados | Estrutura de dados de retorno. | String (String escapada: Array de Object AtualizarBeneficioIntegraMei ) |

Objeto: AtualizarBeneficioIntegraMei

| Campo | Descrição | Tipo |
| --- | --- | --- |
| paOriginal | Período de apuração original | String |
| indicadorBeneficio | Indica se há benefício no período | Boolean |
| paAgrupado | PA que possui os períodos agrupados para emissão de DAS. Formato AAAAMM | String |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno Atualizar Benefício](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/exemplos/retorno_atualizar_beneficio/)
