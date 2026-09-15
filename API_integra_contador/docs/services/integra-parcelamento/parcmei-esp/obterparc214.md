---
key: "PARCMEI-ESP.OBTERPARC214"
family: "integra-parcelamento"
systemId: "PARCMEI-ESP"
serviceId: "OBTERPARC214"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar um determinado parcelamento na modalidade PARCMEI ESPECIAL

Consultar um parcelamento específico na modalidade PARCMEI especial.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PARCMEI-ESP.OBTERPARC214` |
| Família | `integra-parcelamento` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 11/11/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00133) |

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
| Dados de Saída — Objeto: parcelamento | alteracoesDivida | Lista de AlteracaoDivida | — | — | Informações de alterações de dívida |
| Dados de Saída — Objeto: parcelamento | demonstrativoPagamentos | Lista de DemonstrativoPagamento | — | — | Informações simplificadas de pagamentos |
| Dados de Saída — Objeto Consolidacao: | valorTotalConsolidado | Número | — | — | Valor total consolidado |
| Dados de Saída — Objeto Consolidacao: | quantidadeParcelas | Número | — | — | Quantidade de parcelas |
| Dados de Saída — Objeto Consolidacao: | primeiraParcela | Número | — | — | Valor da primeira parcela |
| Dados de Saída — Objeto Consolidacao: | parcelaBasica | Número | — | — | Valor da parcela básica |
| Dados de Saída — Objeto Consolidacao: | dataConsolidacao | Número (AAAAMMDDHHMMSS) | — | — | Data da consolidação |
| Dados de Saída — Objeto Consolidacao: | detalhesConsolidacao | Lista de DetalhesConsolidacao | — | — | Detalhes da consolidação |
| Dados de Saída — Objeto DetalhesConsolidacao: | periodoApuracao | Número (AAAAMM) | — | — | Período de apuração |
| Dados de Saída — Objeto DetalhesConsolidacao: | vencimento | Número (AAAAMMDD) | — | — | Data de vencimento |
| Dados de Saída — Objeto DetalhesConsolidacao: | numeroProcesso | Texto | — | — | Número do processo |
| Dados de Saída — Objeto DetalhesConsolidacao: | saldoDevedorOriginal | Número | — | — | Valor do saldo devedor original |
| Dados de Saída — Objeto DetalhesConsolidacao: | valorAtualizado | Número | — | — | Valor atualizado |
| Dados de Saída — Objeto AlteracaoDivida: | valorTotalConsolidado | Número | — | — | Valor total consolidado |
| Dados de Saída — Objeto AlteracaoDivida: | parcelasRemanescentes | Número | — | — | Quantidade de parcelas remanescentes |
| Dados de Saída — Objeto AlteracaoDivida: | parcelaBasica | Número | — | — | Valor da parcela básica |
| Dados de Saída — Objeto AlteracaoDivida: | dataAlteracaoDivida | Número (AAAAMMDD) | — | — | Data de alteração de dívida |
| Dados de Saída — Objeto AlteracaoDivida: | detalhesAlteracaoDivida | Lista de DetalhesAlteracaoDivida | — | — | Detalhes da alteração de dívida |
| Dados de Saída — Objeto DetalhesAlteracaoDivida: | periodoApuracao | Número (AAAAMM) | — | — | Período inicial |
| Dados de Saída — Objeto DetalhesAlteracaoDivida: | vencimento | Número (AAAAMMDD) | — | — | Data de vencimento |
| Dados de Saída — Objeto DetalhesAlteracaoDivida: | numeroProcesso | Texto | — | — | Número do processo |
| Dados de Saída — Objeto DetalhesAlteracaoDivida: | saldoDevedorOriginal | Número | — | — | Valor do saldo devedor |
| Dados de Saída — Objeto DetalhesAlteracaoDivida: | valorAtualizado | Número | — | — | Valor atualizado |
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
      "idSistema": "PARCMEI-ESP",
      "idServico": "OBTERPARC214",
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
    "idSistema": "PARCMEI-ESP",
    "idServico": "OBTERPARC214",
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
        "idSistema": "PARCMEI-ESP",
        "idServico": "OBTERPARC214",
        "versaoSistema": "1.0", 
        "dados": "{ \"numeroParcelamento\": 9001}"
    },
    "status": 200,
    "mensagens": [
     {
      "codigo": "[Sucesso-PARCMEI-ESP]",
      "texto": "Requisição efetuada com sucesso."
     }
    ],
    "dados": "{\"numero\":9001,\"dataDoPedido\":20171002,\"situacao\":\"Em parcelamento\",\"dataDaSituacao\":20171007,\"consolidacaoOriginal\":{\"valorTotalConsolidado\":3524.16,\"quantidadeParcelas\":70,\"primeiraParcela\":50.35,\"parcelaBasica\":50.35,\"dataConsolidacao\":20171002112724,\"detalhesConsolidacao\":[{\"periodoApuracao\":201105,\"vencimento\":20110620,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":28.25,\"valorAtualizado\":52.71},{\"periodoApuracao\":201106,\"vencimento\":20110720,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":28.25,\"valorAtualizado\":52.44},{\"periodoApuracao\":201107,\"vencimento\":20110822,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":28.25,\"valorAtualizado\":52.14},{\"periodoApuracao\":201108,\"vencimento\":20110920,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":28.25,\"valorAtualizado\":51.87},{\"periodoApuracao\":201109,\"vencimento\":20111020,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":28.25,\"valorAtualizado\":51.62},{\"periodoApuracao\":201110,\"vencimento\":20111121,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":28.25,\"valorAtualizado\":51.38},{\"periodoApuracao\":201111,\"vencimento\":20111220,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":28.25,\"valorAtualizado\":51.13},{\"periodoApuracao\":201112,\"vencimento\":20120120,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":28.25,\"valorAtualizado\":50.88},{\"periodoApuracao\":201201,\"vencimento\":20120222,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":32.10,\"valorAtualizado\":57.57},{\"periodoApuracao\":201202,\"vencimento\":20120320,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":32.10,\"valorAtualizado\":57.30},{\"periodoApuracao\":201203,\"vencimento\":20120420,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":32.10,\"valorAtualizado\":57.07},{\"periodoApuracao\":201204,\"vencimento\":20120521,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":32.10,\"valorAtualizado\":56.84},{\"periodoApuracao\":201205,\"vencimento\":20120620,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":32.10,\"valorAtualizado\":56.63},{\"periodoApuracao\":201206,\"vencimento\":20120720,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":32.10,\"valorAtualizado\":56.41},{\"periodoApuracao\":201207,\"vencimento\":20120820,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":32.10,\"valorAtualizado\":56.20},{\"periodoApuracao\":201208,\"vencimento\":20120920,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":32.10,\"valorAtualizado\":56.02},{\"periodoApuracao\":201209,\"vencimento\":20121022,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":32.10,\"valorAtualizado\":55.82},{\"periodoApuracao\":201210,\"vencimento\":20121120,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":32.10,\"valorAtualizado\":55.65},{\"periodoApuracao\":201211,\"vencimento\":20121220,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":32.10,\"valorAtualizado\":55.47},{\"periodoApuracao\":201212,\"vencimento\":20130121,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":32.10,\"valorAtualizado\":55.28},{\"periodoApuracao\":201301,\"vencimento\":20130220,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":34.90,\"valorAtualizado\":59.93},{\"periodoApuracao\":201302,\"vencimento\":20130320,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":34.90,\"valorAtualizado\":59.74},{\"periodoApuracao\":201303,\"vencimento\":20130422,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":34.90,\"valorAtualizado\":59.53},{\"periodoApuracao\":201304,\"vencimento\":20130520,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":34.90,\"valorAtualizado\":59.31},{\"periodoApuracao\":201305,\"vencimento\":20130620,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":34.90,\"valorAtualizado\":59.10},{\"periodoApuracao\":201306,\"vencimento\":20130722,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":34.90,\"valorAtualizado\":58.85},{\"periodoApuracao\":201307,\"vencimento\":20130820,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":34.90,\"valorAtualizado\":58.60},{\"periodoApuracao\":201308,\"vencimento\":20130920,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":34.90,\"valorAtualizado\":58.36},{\"periodoApuracao\":201309,\"vencimento\":20131021,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":34.90,\"valorAtualizado\":58.07},{\"periodoApuracao\":201310,\"vencimento\":20131120,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":34.90,\"valorAtualizado\":57.82},{\"periodoApuracao\":201311,\"vencimento\":20131220,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":34.90,\"valorAtualizado\":57.54},{\"periodoApuracao\":201312,\"vencimento\":20140120,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":34.90,\"valorAtualizado\":57.25},{\"periodoApuracao\":201401,\"vencimento\":20140220,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":37.20,\"valorAtualizado\":60.73},{\"periodoApuracao\":201402,\"vencimento\":20140320,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":37.20,\"valorAtualizado\":60.44},{\"periodoApuracao\":201403,\"vencimento\":20140422,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":37.20,\"valorAtualizado\":60.14},{\"periodoApuracao\":201404,\"vencimento\":20140520,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":37.20,\"valorAtualizado\":59.81},{\"periodoApuracao\":201405,\"vencimento\":20140620,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":37.20,\"valorAtualizado\":59.52},{\"periodoApuracao\":201406,\"vencimento\":20140721,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":37.20,\"valorAtualizado\":59.16},{\"periodoApuracao\":201407,\"vencimento\":20140820,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":37.20,\"valorAtualizado\":58.84},{\"periodoApuracao\":201408,\"vencimento\":20140922,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":37.20,\"valorAtualizado\":58.50},{\"periodoApuracao\":201409,\"vencimento\":20141020,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":37.20,\"valorAtualizado\":58.14},{\"periodoApuracao\":201410,\"vencimento\":20141120,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":37.20,\"valorAtualizado\":57.83},{\"periodoApuracao\":201411,\"vencimento\":20141222,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":37.20,\"valorAtualizado\":57.47},{\"periodoApuracao\":201412,\"vencimento\":20150120,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":37.20,\"valorAtualizado\":57.12},{\"periodoApuracao\":201501,\"vencimento\":20150220,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":40.40,\"valorAtualizado\":61.70},{\"periodoApuracao\":201502,\"vencimento\":20150320,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":40.40,\"valorAtualizado\":61.28},{\"periodoApuracao\":201503,\"vencimento\":20150420,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":40.40,\"valorAtualizado\":60.90},{\"periodoApuracao\":201504,\"vencimento\":20150520,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":40.40,\"valorAtualizado\":60.50},{\"periodoApuracao\":201505,\"vencimento\":20150622,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":40.40,\"valorAtualizado\":60.07},{\"periodoApuracao\":201506,\"vencimento\":20150720,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":40.40,\"valorAtualizado\":59.59},{\"periodoApuracao\":201507,\"vencimento\":20150820,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":40.40,\"valorAtualizado\":59.14},{\"periodoApuracao\":201508,\"vencimento\":20150921,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":40.40,\"valorAtualizado\":58.70},{\"periodoApuracao\":201509,\"vencimento\":20151020,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":40.40,\"valorAtualizado\":58.25},{\"periodoApuracao\":201510,\"vencimento\":20151120,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":40.40,\"valorAtualizado\":57.82},{\"periodoApuracao\":201511,\"vencimento\":20151221,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":40.40,\"valorAtualizado\":57.35},{\"periodoApuracao\":201512,\"vencimento\":20160120,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":40.40,\"valorAtualizado\":56.92},{\"periodoApuracao\":201601,\"vencimento\":20160222,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":45.00,\"valorAtualizado\":62.95},{\"periodoApuracao\":201602,\"vencimento\":20160321,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":45.00,\"valorAtualizado\":62.43},{\"periodoApuracao\":201603,\"vencimento\":20160420,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":45.00,\"valorAtualizado\":61.95},{\"periodoApuracao\":201604,\"vencimento\":20160520,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":45.00,\"valorAtualizado\":61.45},{\"periodoApuracao\":201605,\"vencimento\":20160620,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":45.00,\"valorAtualizado\":60.93}]},\"alteracoesDivida\":[],\"demonstrativoPagamentos\":[{\"mesDaParcela\":201710,\"vencimentoDoDas\":20171004,\"dataDeArrecadacao\":20171004,\"valorPago\":50.35},{\"mesDaParcela\":201711,\"vencimentoDoDas\":20171130,\"dataDeArrecadacao\":20171128,\"valorPago\":50.85},{\"mesDaParcela\":201712,\"vencimentoDoDas\":20171228,\"dataDeArrecadacao\":20171227,\"valorPago\":51.14},{\"mesDaParcela\":201801,\"vencimentoDoDas\":20180131,\"dataDeArrecadacao\":20180220,\"valorPago\":51.70},{\"mesDaParcela\":201802,\"vencimentoDoDas\":20180228,\"dataDeArrecadacao\":20180427,\"valorPago\":52.20},{\"mesDaParcela\":201803,\"vencimentoDoDas\":20180329,\"dataDeArrecadacao\":20180427,\"valorPago\":52.20},{\"mesDaParcela\":201804,\"vencimentoDoDas\":20180430,\"dataDeArrecadacao\":20180530,\"valorPago\":52.46},{\"mesDaParcela\":201805,\"vencimentoDoDas\":20180530,\"dataDeArrecadacao\":20180530,\"valorPago\":52.46},{\"mesDaParcela\":201806,\"vencimentoDoDas\":20180629,\"dataDeArrecadacao\":20180730,\"valorPago\":52.99},{\"mesDaParcela\":201807,\"vencimentoDoDas\":20180731,\"dataDeArrecadacao\":20180730,\"valorPago\":52.99},{\"mesDaParcela\":201808,\"vencimentoDoDas\":20180831,\"dataDeArrecadacao\":20180831,\"valorPago\":53.26},{\"mesDaParcela\":201809,\"vencimentoDoDas\":20180928,\"dataDeArrecadacao\":20180928,\"valorPago\":53.55},{\"mesDaParcela\":201810,\"vencimentoDoDas\":20181031,\"dataDeArrecadacao\":20181031,\"valorPago\":53.78},{\"mesDaParcela\":201811,\"vencimentoDoDas\":20181130,\"dataDeArrecadacao\":20181130,\"valorPago\":54.06},{\"mesDaParcela\":201812,\"vencimentoDoDas\":20181228,\"dataDeArrecadacao\":20181228,\"valorPago\":54.30},{\"mesDaParcela\":201901,\"vencimentoDoDas\":20190131,\"dataDeArrecadacao\":20190214,\"valorPago\":54.82},{\"mesDaParcela\":201902,\"vencimentoDoDas\":20190228,\"dataDeArrecadacao\":20190329,\"valorPago\":55.07},{\"mesDaParcela\":201903,\"vencimentoDoDas\":20190329,\"dataDeArrecadacao\":20190329,\"valorPago\":55.07},{\"mesDaParcela\":201904,\"vencimentoDoDas\":20190430,\"dataDeArrecadacao\":20190430,\"valorPago\":55.30},{\"mesDaParcela\":201905,\"vencimentoDoDas\":20190531,\"dataDeArrecadacao\":20190531,\"valorPago\":55.57},{\"mesDaParcela\":201906,\"vencimentoDoDas\":20190628,\"dataDeArrecadacao\":20190628,\"valorPago\":55.84},{\"mesDaParcela\":201907,\"vencimentoDoDas\":20190731,\"dataDeArrecadacao\":20190731,\"valorPago\":56.07},{\"mesDaParcela\":201908,\"vencimentoDoDas\":20190830,\"dataDeArrecadacao\":20190830,\"valorPago\":56.36},{\"mesDaParcela\":201909,\"vencimentoDoDas\":20190930,\"dataDeArrecadacao\":20190927,\"valorPago\":56.61},{\"mesDaParcela\":201910,\"vencimentoDoDas\":20191031,\"dataDeArrecadacao\":20191021,\"valorPago\":56.85},{\"mesDaParcela\":201911,\"vencimentoDoDas\":20191129,\"dataDeArrecadacao\":20191128,\"valorPago\":57.09},{\"mesDaParcela\":201912,\"vencimentoDoDas\":20191230,\"dataDeArrecadacao\":20191230,\"valorPago\":57.28},{\"m
<EXEMPLO_TRUNCADO_TAMANHO_ORIGINAL_14756>
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Parcelamento - PARCMEI ESPECIAL](../../../generated/source/solucoes/integra-parcelamento/parcmei_esp/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei_esp/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- **info / official-example-truncated-for-ai:** O exemplo extenso foi limitado no catálogo; a página normalizada e a fonte oficial preservam o contexto completo. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei_esp/servicos/exemplos/retorno_consulta_parcelamento/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei_esp/servicos/consulta_parcelamento/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei_esp/servicos/exemplos/retorno_consulta_parcelamento/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `0435d1a5efa5dc5b34dcd08df1e62c040448d6dfd17e436a46207cde0679d1c3`
