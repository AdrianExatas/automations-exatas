---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/servicos/consulta_detalhe_pagamento/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "9f80d1d05a58a949358d93b2ab680f9b23bf9eac3ecded749fc956350a88f235"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/servicos/consulta_detalhe_pagamento/).

# Consultar detalhes de pagamento na modalidade PERTMEI

Esta consulta retorna informações detalhadas de pagamento de uma parcela

PedidoDados

idSistema: PERTMEI idServico: DETPAGTOPARC225 versaoSistema: "1.0"

**Dados de Entrada**

Campo: dados

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| numeroParcelamento | Número do parcelamento que se deseja consultar mais informações | Número | SIM |
| anoMesParcela | Mês da parcela paga (AAAAMM) | Número | SIM |

**Exemplo: conteúdo body json de entrada**

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
"idSistema": "PERTMEI",
"idServico": "DETPAGTOPARC225",
"versaoSistema": "1.0",
"dados": "{ \"numeroParcelamento\": 9101, \"anoMesParcela\": 201907 }"
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Número(3) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. | Lista de Texto |
| dados | Estrutura de dados de retorno. | Texto (SCAPED Texto JSON) |

Objeto: dados

| Campo | Descrição | Tipo |
| --- | --- | --- |
| numeroDas | Número do DAS pago | Texto |
| dataVencimento | Data de vencimento do DAS | Número (AAAAMMDD) |
| paDasGerado | Período de apuração do DAS Gerado | Número |
| geradoEm | Data de geração do DAS | Texto (AAAAMMDDHHMMSS) |
| numeroParcelamento | Número do parcelamento | Texto |
| numeroParcela | Número da parcela | Texto |
| dataLimiteAcolhimento | Data limite para acolhimento | Número (AAAAMMDD) |
| pagamentoDebitos | Detalhes dos débitos | Lista de PagamentoDebito |
| dataPagamento | Data do pagamento | Número (AAAAMMDD) |
| bancoAgencia | Banco/agência do pagamento | Texto |
| valorPagoArrecadacao | Valor arrecadado | Número |

Objeto PagamentoDebito:

| Campo | Descrição | Tipo |
| --- | --- | --- |
| paDebito | Período de apuração do débito | Número (AAAAMM) |
| processo | Número do processo | Texto |
| discriminacoesDebito | Detalhes dos débitos | Lista de DiscriminacaoDebito |

Objeto DiscriminacaoDebito:

| Campo | Descrição | Tipo |
| --- | --- | --- |
| tributo | Nome do tributo | Texto |
| principal | Valor do principal | Número |
| multa | Valor da multa | Número |
| juros | Valor dos juros | Número |
| total | Valor total | Número |
| enteFederadoDestino | Discriminação do ente do destino | Texto |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: clique [aqui](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/servicos/exemplos/retorno_consulta_detalhe_pagamento/)
