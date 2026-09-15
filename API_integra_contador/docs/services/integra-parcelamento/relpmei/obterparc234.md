---
key: "RELPMEI.OBTERPARC234"
family: "integra-parcelamento"
systemId: "RELPMEI"
serviceId: "OBTERPARC234"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar um determinado parcelamento na modalidade RELPMEI

Consultar um parcelamento específico na modalidade RELPMEI.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `RELPMEI.OBTERPARC234` |
| Família | `integra-parcelamento` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 11/11/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00209, 10035) |

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
| Dados de Saída — Objeto: parcelamento | alteracoesDividas | Lista de AlteracaoDivida | — | — | Informações de alterações de dívidas |
| Dados de Saída — Objeto: parcelamento | demonstrativoPagamentos | Lista de DemonstrativoPagamento | — | — | Informações simplificadas de pagamentos |
| Dados de Saída — Objeto Consolidacao: | valorTotalConsolidadoDeEntrada | Número | — | — | Valor total consolidado de entrada |
| Dados de Saída — Objeto Consolidacao: | quantidadeParcelasDeEntrada | Número | — | — | Quantidade de parcelas de entrada |
| Dados de Saída — Objeto Consolidacao: | parcelaDeEntrada | Número | — | — | Valor da parcela de entrada |
| Dados de Saída — Objeto Consolidacao: | dataConsolidacao | Número (AAAAMMDDHHMMSS) | — | — | Data da consolidação |
| Dados de Saída — Objeto Consolidacao: | detalhesConsolidacao | Lista de DetalhesConsolidacao | — | — | Detalhes da consolidação |
| Dados de Saída — Objeto DetalhesConsolidacao: | periodoApuracao | Número (AAAAMM) | — | — | Período de apuração |
| Dados de Saída — Objeto DetalhesConsolidacao: | vencimento | Número (AAAAMMDD) | — | — | Data de vencimento |
| Dados de Saída — Objeto DetalhesConsolidacao: | numeroProcesso | Texto | — | — | Número do processo |
| Dados de Saída — Objeto DetalhesConsolidacao: | saldoDevedorOriginal | Número | — | — | Valor do saldo devedor original |
| Dados de Saída — Objeto DetalhesConsolidacao: | valorAtualizado | Número | — | — | Valor atualizado |
| Dados de Saída — Objeto AlteracaoDivida: | dataAlteracaoDivida | Número (AAAAMMDDHHMM) | — | — | Data de alteração |
| Dados de Saída — Objeto AlteracaoDivida: | identificadorConsolidacao | Texto | — | — | 1-Consolidação do restante da dívida. 2 Reconsolidação por alteração de débitos no sistema de cobrança. |
| Dados de Saída — Objeto AlteracaoDivida: | saldoDevedorOriginalSemReducoes | Número | — | — | Saldo devedor original sem reduções |
| Dados de Saída — Objeto AlteracaoDivida: | valorRemanescenteComReducoes | Número | — | — | Valor remanescente com reduções |
| Dados de Saída — Objeto AlteracaoDivida: | partePrevidenciaria | Número | — | — | Valor da parte previdenciária |
| Dados de Saída — Objeto AlteracaoDivida: | demaisDebitos | Número | — | — | Valor dos demais débitos (exceto previdenciário) |
| Dados de Saída — Objeto AlteracaoDivida: | detalhesConsolidacao | Lista de DetalhesConsolidacao | — | — | Detalhes da consolidação |
| Dados de Saída — Objeto AlteracaoDivida: | parcelasAlteracao | Lista de ParcelaAlteracao | — | — | Detalhes de alteração de parcela |
| Dados de Saída — Objeto ParcelaAlteracao: | faixaParcelas | Texto | — | — | Faixa do número de parcelas. |
| Dados de Saída — Objeto ParcelaAlteracao: | parcelaInicial | Número (AAAAMM) | — | — | Data da parcela inicial |
| Dados de Saída — Objeto ParcelaAlteracao: | vencimentoInicial | Número | — | — | Data de vencimento inicial (AAAAMMDD) |
| Dados de Saída — Objeto ParcelaAlteracao: | parcelaBasica | Número | — | — | Valor da parcela básica |
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
          "idSistema": "RELPMEI",
            "idServico": "OBTERPARC234",
            "versaoSistema": "1.0", 
            "dados": "{ \"numeroParcelamento\": 9131}"
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
    "idSistema": "RELPMEI",
    "idServico": "OBTERPARC234",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroParcelamento\": 9131}"
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
        "idSistema": "RELPMEI",
        "idServico": "OBTERPARC234",
        "versaoSistema": "1.0", 
        "dados": "{ \"numeroParcelamento\": 9131}"
    },
    "status": 200,
    "mensagens": [
     {
      "codigo": "[Sucesso-RELPMEI]",
      "texto": "Requisição efetuada com sucesso."
     }
    ],
     "dados": "{\"numero\":9131,\"dataDoPedido\":20220519,\"situacao\":\"Em parcelamento\",\"dataDaSituacao\":20230406,\"consolidacaoOriginal\":{\"valorTotalConsolidadoDeEntrada\":453.85,\"quantidadeParcelasDeEntrada\":8,\"parcelaDeEntrada\":56.73,\"dataConsolidacao\":20220519143508,\"detalhesConsolidacao\":[{\"periodoApuracao\":201607,\"vencimento\":20160822,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":39.45,\"valorAtualizado\":61.99},{\"periodoApuracao\":201608,\"vencimento\":20160920,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":50.00,\"valorAtualizado\":78.03},{\"periodoApuracao\":201609,\"vencimento\":20161020,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":50.00,\"valorAtualizado\":77.51},{\"periodoApuracao\":201610,\"vencimento\":20161121,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":50.00,\"valorAtualizado\":77.00},{\"periodoApuracao\":201611,\"vencimento\":20161220,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":50.00,\"valorAtualizado\":76.42},{\"periodoApuracao\":201612,\"vencimento\":20170120,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":50.00,\"valorAtualizado\":75.87},{\"periodoApuracao\":201701,\"vencimento\":20170220,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":79.74},{\"periodoApuracao\":201702,\"vencimento\":20170320,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":79.19},{\"periodoApuracao\":201703,\"vencimento\":20170420,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":78.78},{\"periodoApuracao\":201704,\"vencimento\":20170522,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":78.28},{\"periodoApuracao\":201705,\"vencimento\":20170620,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":77.85},{\"periodoApuracao\":201706,\"vencimento\":20170720,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":77.43},{\"periodoApuracao\":201707,\"vencimento\":20170821,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":77.00},{\"periodoApuracao\":201708,\"vencimento\":20170920,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":76.67},{\"periodoApuracao\":201709,\"vencimento\":20171020,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":76.33},{\"periodoApuracao\":201710,\"vencimento\":20171120,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":76.03},{\"periodoApuracao\":201711,\"vencimento\":20171220,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":75.74},{\"periodoApuracao\":201712,\"vencimento\":20180122,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":75.43},{\"periodoApuracao\":201801,\"vencimento\":20180220,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":76.40},{\"periodoApuracao\":201802,\"vencimento\":20180320,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":76.11},{\"periodoApuracao\":201803,\"vencimento\":20180420,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":75.84},{\"periodoApuracao\":201804,\"vencimento\":20180521,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":75.55},{\"periodoApuracao\":201805,\"vencimento\":20180620,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":75.29},{\"periodoApuracao\":201806,\"vencimento\":20180720,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":74.99},{\"periodoApuracao\":201807,\"vencimento\":20180820,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":74.69},{\"periodoApuracao\":201808,\"vencimento\":20180920,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":74.43},{\"periodoApuracao\":201809,\"vencimento\":20181022,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":74.14},{\"periodoApuracao\":201810,\"vencimento\":20181120,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":73.88},{\"periodoApuracao\":201811,\"vencimento\":20181220,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":73.62},{\"periodoApuracao\":201812,\"vencimento\":20190121,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":73.32},{\"periodoApuracao\":201901,\"vencimento\":20190220,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":55.90,\"valorAtualizado\":76.06},{\"periodoApuracao\":201902,\"vencimento\":20190320,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":55.90,\"valorAtualizado\":75.79},{\"periodoApuracao\":201903,\"vencimento\":20190422,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":55.90,\"valorAtualizado\":75.50},{\"periodoApuracao\":201904,\"vencimento\":20190520,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":55.90,\"valorAtualizado\":75.20},{\"periodoApuracao\":201905,\"vencimento\":20190621,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":55.90,\"valorAtualizado\":74.94},{\"periodoApuracao\":201906,\"vencimento\":20190722,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":55.90,\"valorAtualizado\":74.62},{\"periodoApuracao\":201907,\"vencimento\":20190820,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":55.90,\"valorAtualizado\":74.35},{\"periodoApuracao\":201908,\"vencimento\":20190920,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":55.90,\"valorAtualizado\":74.08},{\"periodoApuracao\":201909,\"vencimento\":20191021,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":55.90,\"valorAtualizado\":73.82},{\"periodoApuracao\":201910,\"vencimento\":20191120,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":55.90,\"valorAtualizado\":73.60},{\"periodoApuracao\":201911,\"vencimento\":20191220,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":55.90,\"valorAtualizado\":73.39},{\"periodoApuracao\":201912,\"vencimento\":20200120,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":55.90,\"valorAtualizado\":73.17},{\"periodoApuracao\":202012,\"vencimento\":20210120,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":58.25,\"valorAtualizado\":74.81},{\"periodoApuracao\":202101,\"vencimento\":20210226,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":61.00,\"valorAtualizado\":78.26},{\"periodoApuracao\":202102,\"vencimento\":20210322,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":61.00,\"valorAtualizado\":78.14},{\"periodoApuracao\":202106,\"vencimento\":20210720,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":61.00,\"valorAtualizado\":77.43},{\"periodoApuracao\":202107,\"vencimento\":20210820,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":61.00,\"valorAtualizado\":77.17},{\"periodoApuracao\":202108,\"vencimento\":20210920,\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":61.00,\"valorAtualizado\":76.91}]},\"alteracoesDividas\":[{\"dataAlteracaoDivida\":202304061518,\"identificadorConsolidacao\":1,\"saldoDevedorOriginalSemReducoes\":2565.66,\"valorRemanescenteComReducoes\":2918.27,\"partePrevidenciaria\":2597.11,\"demaisDebitos\":321.16,\"detalhesConsolidacao\":[{\"periodoApuracao\":201607,\"vencimento\":20160822,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":3.01,\"valorAtualizado\":3.61},{\"periodoApuracao\":201608,\"vencimento\":20160920,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":50.00,\"valorAtualizado\":59.82},{\"periodoApuracao\":201609,\"vencimento\":20161020,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":50.00,\"valorAtualizado\":59.62},{\"periodoApuracao\":201610,\"vencimento\":20161121,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":50.00,\"valorAtualizado\":59.46},{\"periodoApuracao\":201611,\"vencimento\":20161220,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":50.00,\"valorAtualizado\":59.26},{\"periodoApuracao\":201612,\"vencimento\":20170120,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":50.00,\"valorAtualizado\":59.06},{\"periodoApuracao\":201701,\"vencimento\":20170220,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":62.26},{\"periodoApuracao\":201702,\"vencimento\":20170320,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":62.06},{\"periodoApuracao\":201703,\"vencimento\":20170420,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":61.91},{\"periodoApuracao\":201704,\"vencimento\":20170522,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":61.74},{\"periodoApuracao\":201705,\"vencimento\":20170620,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":61.60},{\"periodoApuracao\":201706,\"vencimento\":20170720,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":61.44},{\"periodoApuracao\":201707,\"vencimento\":20170821,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":61.30},{\"periodoApuracao\":201708,\"vencimento\":20170920,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":61.18},{\"periodoApuracao\":201709,\"vencimento\":20171020,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":61.07},{\"periodoApuracao\":201710,\"vencimento\":20171120,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":60.96},{\"periodoApuracao\":201711,\"vencimento\":20171220,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":60.86},{\"periodoApuracao\":201712,\"vencimento\":20180122,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":52.85,\"valorAtualizado\":60.75},{\"periodoApuracao\":201801,\"vencimento\":20180220,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":61.64},{\"periodoApuracao\":201802,\"vencimento\":20180320,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":61.54},{\"periodoApuracao\":201803,\"vencimento\":20180420,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":61.43},{\"periodoApuracao\":201804,\"vencimento\":20180521,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":61.34},{\"periodoApuracao\":201805,\"vencimento\":20180620,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":61.24},{\"periodoApuracao\":201806,\"vencimento\":20180720,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":61.14},{\"periodoApuracao\":201807,\"vencimento\":20180820,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":61.04},{\"periodoApuracao\":201808,\"vencimento\":20180920,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":60.96},{\"periodoApuracao\":201809,\"vencimento\":20181022,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":60.85},{\"periodoApuracao\":201810,\"vencimento\":20181120,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":60.76},{\"periodoApuracao\":201811,\"vencimento\":20181220,\"numeroProcesso\":\"19614763101202219\",\"saldoDevedorOriginal\":53.70,\"valorAtualizado\":60.66},{\"periodoApuracao\":201812,\"vencime
<EXEMPLO_TRUNCADO_TAMANHO_ORIGINAL_16093>
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Parcelamento - RELPMEI](../../../generated/source/solucoes/integra-parcelamento/relpmei/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpmei/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- **info / official-example-truncated-for-ai:** O exemplo extenso foi limitado no catálogo; a página normalizada e a fonte oficial preservam o contexto completo. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpmei/servicos/exemplos/retorno_consulta_parcelamento/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpmei/servicos/consulta_parcelamento/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpmei/servicos/exemplos/retorno_consulta_parcelamento/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `a7d5bc24532b86a13cfd16e2c49a501272eb45b195f18feb0544f1e3a68b45d0`
