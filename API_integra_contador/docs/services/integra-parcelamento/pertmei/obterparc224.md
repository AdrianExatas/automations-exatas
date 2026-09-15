---
key: "PERTMEI.OBTERPARC224"
family: "integra-parcelamento"
systemId: "PERTMEI"
serviceId: "OBTERPARC224"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar um determinado parcelamento na modalidade PERTMEI

Consultar um parcelamento específico na modalidade PERTMEI.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PERTMEI.OBTERPARC224` |
| Família | `integra-parcelamento` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 11/11/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00152, 10012) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada | numeroParcelamento | Número | SIM | — | Número do parcelamento que se deseja consultar mais informações |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Número(3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Lista de Texto | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. |
| Dados de Saída | dados | Texto (SCAPED Texto JSON) | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto: parcelamento | numero | Número | — | — | Número do parcelamento |
| Dados de Saída — Objeto: parcelamento | dataDoPedido | Número (AAAAMMDD) | — | — | Data do pedido do parcelamento |
| Dados de Saída — Objeto: parcelamento | situacao | Texto | — | — | Situação do parcelamento |
| Dados de Saída — Objeto: parcelamento | dataDaSituacao | Número (AAAAMMDD) | — | — | Data da situação |
| Dados de Saída — Objeto: parcelamento | consolidacaoOriginal | ConsolidacaoOriginal | — | — | Informações de consolidação |
| Dados de Saída — Objeto: parcelamento | consolidacoesRestanteDivida | Lista de RestanteDivida | — | — | Informações de consolidações do restante da dívida com redução |
| Dados de Saída — Objeto: parcelamento | demonstrativoPagamentos | Lista de DemonstrativoPagamento | — | — | Informações simplificadas de pagamentos |
| Dados de Saída — Objeto Consolidacao: | valorTotalConsolidadoDaEntrada | Número | — | — | Valor total consolidado de entrada |
| Dados de Saída — Objeto Consolidacao: | quantidadeParcelasDaEntrada | Número | — | — | Quantidade de parcelas |
| Dados de Saída — Objeto Consolidacao: | parcelaBasicaDaEntrada | Número | — | — | Valor da parcela de entrada |
| Dados de Saída — Objeto Consolidacao: | dataConsolidacao | Número (AAAAMMDDHHMMSS) | — | — | Data da consolidação |
| Dados de Saída — Objeto Consolidacao: | valorTotalConsolidadoDaDivida | Número | — | — | Valor total consolidado |
| Dados de Saída — Objeto Consolidacao: | detalhesConsolidacao | Lista de DetalhesConsolidacao | — | — | Detalhes da consolidação |
| Dados de Saída — Objeto DetalhesConsolidacao: | periodoApuracao | Número (AAAAMM) | — | — | Período de apuração |
| Dados de Saída — Objeto DetalhesConsolidacao: | vencimento | Número (AAAAMMDD) | — | — | Data de vencimento |
| Dados de Saída — Objeto DetalhesConsolidacao: | numeroProcesso | Texto | — | — | Número do processo |
| Dados de Saída — Objeto DetalhesConsolidacao: | saldoDevedorOriginal | Número | — | — | Valor do saldo devedor original |
| Dados de Saída — Objeto DetalhesConsolidacao: | valorAtualizado | Número | — | — | Valor atualizado |
| Dados de Saída — Objeto RestanteDivida: | valorTotalConsolidadoDivida | Número | — | — | Valor total consolidado |
| Dados de Saída — Objeto RestanteDivida: | parcelasRemanescentes | Número | — | — | Quantidade de parcelas remanescentes |
| Dados de Saída — Objeto RestanteDivida: | parcelaBasica | Número | — | — | Valor da parcela básica |
| Dados de Saída — Objeto RestanteDivida: | dataConfirmacaoConsolidacao | Número (AAAAMMDD) | — | — | Data consolidação |
| Dados de Saída — Objeto RestanteDivida: | detalhesConsolidacao | Lista de DetalhesConsolidacao | — | — | Detalhes da alteração de dívida |
| Dados de Saída — Objeto DemonstrativoPagamento: | mesDaParcela | Número (AAAAMM) | — | — | Mês da Parcela |
| Dados de Saída — Objeto DemonstrativoPagamento: | vencimentoDoDas | Número (AAAAMMDD) | — | — | Data de vencimento do DAS |
| Dados de Saída — Objeto DemonstrativoPagamento: | dataDeArrecadacao | Número (AAAAMMDD) | — | — | Data de arrecadação do DAS |
| Dados de Saída — Objeto DemonstrativoPagamento: | valorPago | Número | — | — | Valor pago |

## Exemplos oficiais e normalizados

### Exemplo 1 — request

Fonte oficial:

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
      "idServico": "OBTERPARC224",
      "versaoSistema": "1.0",   
      "dados": "{ \"numeroParcelamento\": 9001}"
    }
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
    "numero": "00000000000000",
    "tipo": 2
  },
  "contribuinte": {
    "numero": "00000000000000",
    "tipo": 2
  },
  "pedidoDados": {
    "idSistema": "PERTMEI",
    "idServico": "OBTERPARC224",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroParcelamento\": 9001}"
  }
}
```

### Exemplo 2 — response

Fonte oficial:

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
        "idServico": "OBTERPARC224",
        "versaoSistema": "1.0", 
        "dados": "{ \"numeroParcelamento\": 9101}"
    },
    "status": 200
    "mensagens": [
     {
      "codigo": "[Sucesso-PERTMEI]",
      "texto": "Requisição efetuada com sucesso."
     }
    ],
    "dados": "{\"numero\":9101,\"dataDoPedido\":20180623,\"situacao\":\"Eparcelamento\",\"dataDaSituacao\":20181106,\"consolidacaoOriginal\{\"valorTotalConsolidadoDaEntrada\":211.48,\"quantidadeParcelasDaEntrada\":\"parcelaBasicaDaEntrada\":52.87,\"dataConsolidacao\":2018062312135\"valorTotalConsolidadoDaDivida\":4229.59,\"detalhesConsolidacao\[{\"periodoApuracao\":201208,\"vencimento\":20120920,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":31.10,\"valorAtualizado\":55.64{\"periodoApuracao\":201209,\"vencimento\":20121022,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":31.10,\"valorAtualizado\":55.45{\"periodoApuracao\":201210,\"vencimento\":20121121,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":31.10,\"valorAtualizado\":55.28{\"periodoApuracao\":201211,\"vencimento\":20121220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":31.10,\"valorAtualizado\":55.11{\"periodoApuracao\":201212,\"vencimento\":20130121,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":31.10,\"valorAtualizado\":54.92{\"periodoApuracao\":201301,\"vencimento\":20130220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":68.50{\"periodoApuracao\":201302,\"vencimento\":20130320,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":68.28{\"periodoApuracao\":201303,\"vencimento\":20130422,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":68.05{\"periodoApuracao\":201304,\"vencimento\":20130520,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":67.81{\"periodoApuracao\":201305,\"vencimento\":20130620,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":67.58{\"periodoApuracao\":201306,\"vencimento\":20130722,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":67.30{\"periodoApuracao\":201307,\"vencimento\":20130820,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":67.02{\"periodoApuracao\":201308,\"vencimento\":20130920,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":66.75{\"periodoApuracao\":201309,\"vencimento\":20131021,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":66.44{\"periodoApuracao\":201310,\"vencimento\":20131121,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":66.15{\"periodoApuracao\":201311,\"vencimento\":20131220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":65.84{\"periodoApuracao\":201312,\"vencimento\":20140120,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":65.52{\"periodoApuracao\":201401,\"vencimento\":20140220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":41.20,\"valorAtualizado\":69.06{\"periodoApuracao\":201402,\"vencimento\":20140320,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":41.20,\"valorAtualizado\":68.75{\"periodoApuracao\":201403,\"vencimento\":20140422,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":41.20,\"valorAtualizado\":68.41{\"periodoApuracao\":201404,\"vencimento\":20140520,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":41.20,\"valorAtualizado\":68.04{\"periodoApuracao\":201405,\"vencimento\":20140620,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":41.20,\"valorAtualizado\":67.71{\"periodoApuracao\":201406,\"vencimento\":20140721,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":41.20,\"valorAtualizado\":67.32{\"periodoApuracao\":201407,\"vencimento\":20140820,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":41.20,\"valorAtualizado\":66.96{\"periodoApuracao\":201408,\"vencimento\":20140922,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":41.20,\"valorAtualizado\":66.59{\"periodoApuracao\":201409,\"vencimento\":20141020,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":41.20,\"valorAtualizado\":66.19{\"periodoApuracao\":201410,\"vencimento\":20141121,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":41.20,\"valorAtualizado\":65.85{\"periodoApuracao\":201411,\"vencimento\":20141222,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":41.20,\"valorAtualizado\":65.45{\"periodoApuracao\":201412,\"vencimento\":20150120,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":41.20,\"valorAtualizado\":65.06{\"periodoApuracao\":201501,\"vencimento\":20150220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":44.40,\"valorAtualizado\":69.75{\"periodoApuracao\":201502,\"vencimento\":20150320,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":44.40,\"valorAtualizado\":69.29{\"periodoApuracao\":201503,\"vencimento\":20150420,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":44.40,\"valorAtualizado\":68.87{\"periodoApuracao\":201504,\"vencimento\":20150520,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":44.40,\"valorAtualizado\":68.43{\"periodoApuracao\":201505,\"vencimento\":20150622,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":44.40,\"valorAtualizado\":67.96{\"periodoApuracao\":201506,\"vencimento\":20150720,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":44.40,\"valorAtualizado\":67.43{\"periodoApuracao\":201507,\"vencimento\":20150820,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":44.40,\"valorAtualizado\":66.94{\"periodoApuracao\":201508,\"vencimento\":20150921,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":44.40,\"valorAtualizado\":66.45{\"periodoApuracao\":201509,\"vencimento\":20151020,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":44.40,\"valorAtualizado\":65.95{\"periodoApuracao\":201510,\"vencimento\":20151123,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":44.40,\"valorAtualizado\":65.48{\"periodoApuracao\":201511,\"vencimento\":20151221,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":44.40,\"valorAtualizado\":64.97{\"periodoApuracao\":201512,\"vencimento\":20160120,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":44.40,\"valorAtualizado\":64.50{\"periodoApuracao\":201601,\"vencimento\":20160222,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":49.00,\"valorAtualizado\":70.69{\"periodoApuracao\":201602,\"vencimento\":20160321,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":49.00,\"valorAtualizado\":70.12{\"periodoApuracao\":201603,\"vencimento\":20160420,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":49.00,\"valorAtualizado\":69.61{\"periodoApuracao\":201604,\"vencimento\":20160520,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":49.00,\"valorAtualizado\":69.06{\"periodoApuracao\":201605,\"vencimento\":20160620,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":49.00,\"valorAtualizado\":68.50{\"periodoApuracao\":201606,\"vencimento\":20160720,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":49.00,\"valorAtualizado\":67.95{\"periodoApuracao\":201607,\"vencimento\":20160822,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":49.00,\"valorAtualizado\":67.35{\"periodoApuracao\":201608,\"vencimento\":20160920,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":49.00,\"valorAtualizado\":66.80{\"periodoApuracao\":201609,\"vencimento\":20161020,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":49.00,\"valorAtualizado\":66.29{\"periodoApuracao\":201610,\"vencimento\":20161121,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":49.00,\"valorAtualizado\":65.78{\"periodoApuracao\":201611,\"vencimento\":20161220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":49.00,\"valorAtualizado\":65.23{\"periodoApuracao\":201612,\"vencimento\":20170120,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":49.00,\"valorAtualizado\":64.70{\"periodoApuracao\":201701,\"vencimento\":20170220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":51.85,\"valorAtualizado\":68.01{\"periodoApuracao\":201702,\"vencimento\":20170320,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":51.85,\"valorAtualizado\":67.47{\"periodoApuracao\":201703,\"vencimento\":20170420,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":51.85,\"valorAtualizado\":67.06{\"periodoApuracao\":201704,\"vencimento\":20170522,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":51.85,\"valorAtualizado\":66.58{\"periodoApuracao\":201705,\"vencimento\":20170620,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":51.85,\"valorAtualizado\":66.16{\"periodoApuracao\":201706,\"vencimento\":20170720,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":51.85,\"valorAtualizado\":65.75{\"periodoApuracao\":201707,\"vencimento\":20170821,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":51.85,\"valorAtualizado\":65.33{\"periodoApuracao\":201708,\"vencimento\":20170920,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":51.85,\"valorAtualizado\":64.99{\"periodoApuracao\":201709,\"vencimento\":20171020,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":51.85,\"valorAtualizado\":64.66{\"periodoApuracao\":201710,\"vencimento\":20171121,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":51.85,\"valorAtualizado\":64.36{\"periodoApuracao\":201711,\"vencimento\":20171220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":51.85,\"valorAtualizado\":64.09}]\"consolidacoesRestanteDivida\":[{\"valorTotalConsolidadoDivida\":3145.5\"parcelasRemanescentes\":62,\"parcelaBasica\":50.7\"dataConfirmacaoConsolidacao\":20181119,\"detalhesConsolidacao\[{\"periodoApuracao\":201211,\"vencimento\":20121220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":24.85,\"valorAtualizado\":30.17{\"periodoApuracao\":201212,\"vencimento\":20130121,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":36.10,\"valorAtualizado\":43.80{\"periodoApuracao\":201301,\"vencimento\":20130220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":47.15{\"periodoApuracao\":201302,\"vencimento\":20130320,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":47.12{\"periodoApuracao\":201303,\"vencimento\":20130422,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":47.07{\"periodoApuracao\":201304,\"vencimento\":20130520,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":47.01{\"periodoApuracao\":201305,\"vencimento\":20130620,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":46.97{\"periodoApuracao\":201306,\"vencimento\":20130722,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":46.91{\"periodoApuracao\":201307,\"vencimento\":20130820,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":46.86{\"periodoApuracao\":201308,\"vencimento\":20130920,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":46.81{\"periodoApuracao\":201309,\"vencimento\":20131021,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":46.74{\"periodoApuracao\":201310,\"vencimento\":20131121,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":46.68{\"periodoApuracao\":201311,\"vencimento\":20131220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":46.62{\"periodoApuracao\":201312,\"vencimento\":20140120,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":38.90,\"valorAtualizado\":46.55{\"periodoApuracao\":201401,\"vencimento\":20140220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":41.20,\"valorAtualizado\":49.25{\"periodoApuracao\":201402,\"vencimento\":20140320,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":41.20,\"valorAtualizado\":49.18{\"periodoApuracao\":201403,\"vencimento\":20140422,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":41.20,\"valorAtualizado\":49.11{\"periodoApuracao\":201404,\"vencimento\":20140520,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":41.20,\"valorAtualizado\":49.04{\"periodoApuracao\":201405,\"vencimento\":20140620,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":41.20,\"valorAtualizado\":48.97{\"periodoApuracao\":201406,\"vencimento\":20140721,\"numeroProcesso\":\"\\"saldoDevedorOrigi
<EXEMPLO_TRUNCADO_TAMANHO_ORIGINAL_32245>
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Parcelamento - PERTMEI](../../../generated/source/solucoes/integra-parcelamento/pertmei/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- **info / official-example-truncated-for-ai:** O exemplo extenso foi limitado no catálogo; a página normalizada e a fonte oficial preservam o contexto completo. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/servicos/exemplos/retorno_consulta_parcelamento/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/servicos/consulta_parcelamento/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/servicos/exemplos/retorno_consulta_parcelamento/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `60eb465c0e8d7947314b36a5d091169034da78e4349a8cd63a439dbdc027b1a3`
