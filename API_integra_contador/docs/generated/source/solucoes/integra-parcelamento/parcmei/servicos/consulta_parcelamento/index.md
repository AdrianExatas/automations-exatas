---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/servicos/consulta_parcelamento/"
sourceUpdatedAt: "10 de abril de 2026 14:58:42 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "e3400ccc3696929163ee90073a7a793f4409cfbc0822dbc08c2a0cf4c8213ceb"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/servicos/consulta_parcelamento/).

# Consultar um determinado parcelamento na modalidade PARCMEI

Esta consulta retorna informações de um parcelamento específico.

PedidoDados

idSistema: PARCMEI idServico: OBTERPARC204 versaoSistema: "1.0"

**Dados de Entrada**

Campo: dados

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| numeroParcelamento | Número do parcelamento que se deseja consultar mais informações | Número | SIM |

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
"idSistema": "PARCMEI",
"idServico": "OBTERPARC204",
"versaoSistema": "1.0",
"dados": "{ \"numeroParcelamento\": 1}"
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Número(3) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. | Lista de Texto |
| dados | Estrutura de dados de retorno. | Texto (SCAPED Texto JSON) |

Objeto: parcelamento

| Campo | Descrição | Tipo |
| --- | --- | --- |
| numero | Número do parcelamento | Número |
| dataDoPedido | Data do pedido do parcelamento | Número (AAAAMMDD) |
| situacao | Situação do parcelamento | Texto |
| dataDaSituacao | Data da situação | Número (AAAAMMDD) |
| consolidacaoOriginal | Informações de consolidação | ConsolidacaoOriginal |
| alteracoesDivida | Informações de alterações de dívida | Lista de AlteracaoDivida |
| demonstrativoPagamentos | Informações simplificadas de pagamentos | Lista de DemonstrativoPagamento |

Objeto Consolidacao:

| Campo | Descrição | Tipo |
| --- | --- | --- |
| valorTotalConsolidado | Valor total consolidado | Número |
| quantidadeParcelas | Quantidade de parcelas | Número |
| primeiraParcela | Valor da primeira parcela | Número |
| parcelaBasica | Valor da parcela básica | Número |
| dataConsolidacao | Data da consolidação | Número (AAAAMMDDHHMMSS) |
| detalhesConsolidacao | Detalhes da consolidação | Lista de DetalhesConsolidacao |

Objeto DetalhesConsolidacao:

| Campo | Descrição | Tipo |
| --- | --- | --- |
| periodoApuracao | Período de apuração | Número (AAAAMM) |
| vencimento | Data de vencimento | Número (AAAAMMDD) |
| numeroProcesso | Número do processo | Texto |
| saldoDevedorOriginal | Valor do saldo devedor original | Número |
| valorAtualizado | Valor atualizado | Número |

Objeto AlteracaoDivida:

| Campo | Descrição | Tipo |
| --- | --- | --- |
| valorTotalConsolidado | Valor total consolidado | Número |
| parcelasRemanescentes | Quantidade de parcelas remanescentes | Número |
| parcelaBasica | Valor da parcela básica | Número |
| dataAlteracaoDivida | Data de alteração de dívida | Número (AAAAMMDD) |
| detalhesAlteracaoDivida | Detalhes da alteração de dívida | Lista de DetalhesAlteracaoDivida |

Objeto DetalhesAlteracaoDivida:

| Campo | Descrição | Tipo |
| --- | --- | --- |
| periodoApuracao | Período inicial | Número (AAAAMM) |
| vencimento | Data de vencimento | Número (AAAAMMDD) |
| numeroProcesso | Número do processo | Texto |
| saldoDevedorOriginal | Valor do saldo devedor | Número |
| valorAtualizado | Valor atualizado | Número |

Objeto DemonstrativoPagamento:

| Campo | Descrição | Tipo |
| --- | --- | --- |
| mesDaParcela | Mês da Parcela | Número (AAAAMM) |
| vencimentoDoDas | Data de vencimento do DAS | Número (AAAAMMDD) |
| dataDeArrecadacao | Data de arrecadação do DAS | Número (AAAAMMDD) |
| valorPago | Valor pago | Número |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: clique [aqui](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/servicos/exemplos/retorno_consulta_parcelamento/)
