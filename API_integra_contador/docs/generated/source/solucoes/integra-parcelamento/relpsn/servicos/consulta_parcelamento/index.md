---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpsn/servicos/consulta_parcelamento/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "d77f955c630d57ecf1598d28753c699cd12a01ca9a2a2fef6957e57e9a717522"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpsn/servicos/consulta_parcelamento/).

# Consultar um determinado parcelamento na modalidade RELPSN

Esta consulta retorna informações de um parcelamento específico.

PedidoDados

idSistema: RELPSN idServico: OBTERPARC194 versaoSistema: "1.0"

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
"idSistema": "RELPSN",
"idServico": "OBTERPARC174",
"versaoSistema": "1.0",
"dados": "{ \"numeroParcelamento\": 9131}"
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
| dataDaSituacao | Data da situação do parcelamento | Número (AAAAMMDD) |
| consolidacaoOriginal | Informações de consolidação | ConsolidacaoOriginal |
| alteracoesDivida | Informações de alterações de dívida | Lista de AlteracaoDivida |
| demonstrativoPagamentos | Informações simplificadas de pagamentos | Lista de DemonstrativoPagamento |

Objeto Consolidacao:

| Campo | Descrição | Tipo |
| --- | --- | --- |
| valorTotalConsolidadoDaEntrada | Valor total consolidado | Número |
| dataConsolidacao | Data da consolidação | Número (AAAAMMDDHHMMSS) |
| parcelaDeEntrada | Valor da parcela básica de entrada | Número |
| quantidadeParcelasDeEntrada | Quantidade de parcelas | Número |
| valorConsolidadoDivida | Valor consolidado | Número |
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
| dataAlteracaoDivida | Data da alteração de dívida | Número (AAAAMMDDHHMM) |
| identificadorConsolidacao | 1=Consolidação do restante da dívida; 2=Reconsolidação por alteração de débitos no sistema de cobrança. | Número |
| saldoDevedorOriginalSemReducoes | Saldo devedor original sem reduções | Número |
| valorRemanescenteComReducoes | Valor remanescente com reduções | Número |
| partePrevidenciaria | Valor dos débitos previdenciários | Número |
| demaisDebitos | Valor dos demais débitos (exceto previdenciários) | Número |
| detalhesConsolidacao | Detalhes da consolidação | Lista de DetalhesConsolidacao |
| parcelasAlteracao | Detalhes de alteração de parcela | Lista de ParcelaAlteracao |

Objeto ParcelaAlteracao:

| Campo | Descrição | Tipo |
| --- | --- | --- |
| faixaParcelas | Faixa do número de parcelas. | Texto |
| parcelaInicial | Data da parcela inicial | Número (AAAAMM) |
| vencimentoInicial | Data de vencimento inicial | Número (AAAAMMDD) |
| parcelaBasica | Valor da parcela básica | Número |

Objeto DemonstrativoPagamento:

| Campo | Descrição | Tipo |
| --- | --- | --- |
| mesDaParcela | Mês da Parcela | Número (AAAAMM) |
| vencimentoDoDas | Data de vencimento do DAS | Número (AAAAMMDD) |
| dataDeArrecadacao | Data de arrecadação do DAS | Número (AAAAMMDD) |
| valorPago | Valor pago | Número |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: clique [aqui](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpsn/servicos/exemplos/retorno_consulta_parcelamento/)
