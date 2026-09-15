---
key: "PERTSN.OBTERPARC184"
family: "integra-parcelamento"
systemId: "PERTSN"
serviceId: "OBTERPARC184"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar um determinado parcelamento na modalidade PERTSN

Consultar um parcelamento específico na modalidade PERTSN.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PERTSN.OBTERPARC184` |
| Família | `integra-parcelamento` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 11/11/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00149, 10011) |

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
| Dados de Saída — Objeto: parcelamento | dataDaSituacao | Número (AAAAMMDD) | — | — | Data da situação do parcelamento |
| Dados de Saída — Objeto: parcelamento | consolidacaoOriginal | ConsolidacaoOriginal | — | — | Informações de consolidação |
| Dados de Saída — Objeto: parcelamento | alteracoesDivida | Lista de AlteracaoDivida | — | — | Informações de alterações de dívida |
| Dados de Saída — Objeto: parcelamento | demonstrativoPagamentos | Lista de DemonstrativoPagamento | — | — | Informações simplificadas de pagamentos |
| Dados de Saída — Objeto Consolidacao: | valorTotalConsolidadoDaEntrada | Número | — | — | Valor total consolidado |
| Dados de Saída — Objeto Consolidacao: | parcelasRemanescentes | Número | — | — | Quantidade de parcelas |
| Dados de Saída — Objeto Consolidacao: | parcelaBasicaDaEntrada | Número | — | — | Valor da parcela básica de entrada |
| Dados de Saída — Objeto Consolidacao: | dataConsolidacao | Número (AAAAMMDDHHMMSS) | — | — | Data da consolidação |
| Dados de Saída — Objeto Consolidacao: | valorConsolidadoDaDivida | Número | — | — | Valor consolidado |
| Dados de Saída — Objeto Consolidacao: | detalhesConsolidacao | Lista de DetalhesConsolidacao | — | — | Detalhes da consolidação |
| Dados de Saída — Objeto DetalhesConsolidacao: | periodoApuracao | Número (AAAAMM) | — | — | Período de apuração |
| Dados de Saída — Objeto DetalhesConsolidacao: | vencimento | Número (AAAAMMDD) | — | — | Data de vencimento |
| Dados de Saída — Objeto DetalhesConsolidacao: | numeroProcesso | Texto | — | — | Número do processo |
| Dados de Saída — Objeto DetalhesConsolidacao: | saldoDevedorOriginal | Número | — | — | Valor do saldo devedor original |
| Dados de Saída — Objeto DetalhesConsolidacao: | valorAtualizado | Número | — | — | Valor atualizado |
| Dados de Saída — Objeto AlteracaoDivida: | totalConsolidado | Número | — | — | Valor total consolidado |
| Dados de Saída — Objeto AlteracaoDivida: | parcelasRemanescentes | Número | — | — | Quantidade de parcelas remanescentes |
| Dados de Saída — Objeto AlteracaoDivida: | parcelaBasica | Número | — | — | Valor da parcela básica |
| Dados de Saída — Objeto AlteracaoDivida: | dataAlteracaoDivida | Número (AAAAMMDDHHMM) | — | — | Data de alteração de dívida |
| Dados de Saída — Objeto AlteracaoDivida: | valorConsolidadoPrincipal | Número | — | — | Valor do principal |
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
      "idSistema": "PERTSN",
      "idServico": "OBTERPARC184",
      "versaoSistema": "1.0",   
      "dados": "{ \"numeroParcelamento\": 9102}"
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
    "idSistema": "PERTSN",
    "idServico": "OBTERPARC184",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroParcelamento\": 9102}"
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
        "idSistema": "PERTSN",
        "idServico": "OBTERPARC184",
        "versaoSistema": "1.0", 
        "dados": "{ \"numeroParcelamento\": 9102}"
    },
    "status": 200,
    "mensagens": [
     {
      "codigo": "[Sucesso-PERTSN]",
      "texto": "Requisição efetuada com sucesso."
     }
    ],
    "dados": "{\"numero\":9102,\"dataDoPedido\":20180619,\"situacao\":\"Eparcelamento\",\"dataDaSituacao\":20230831,\"consolidacaoOriginal\{\"valorTotalConsolidadoDaEntrada\":2687.1\"quantidadeParcelasDeEntrada\":5,\"parcelaDeEntrada\":537.4\"dataConsolidacao\":20180619155825,\"valorConsolidadoDaDivida\":53742.9\"detalhesConsolidacao\":[{\"periodoApuracao\":20151\"vencimento\":20151221,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":3156.80,\"valorAtualizado\":4619.91{\"periodoApuracao\":201607,\"vencimento\":20160822,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":3343.62,\"valorAtualizado\":4596.40{\"periodoApuracao\":201612,\"vencimento\":20170120,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":4338.52,\"valorAtualizado\":5729.41{\"periodoApuracao\":201707,\"vencimento\":20170821,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":5419.66,\"valorAtualizado\":6829.25{\"periodoApuracao\":201708,\"vencimento\":20170921,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":7767.86,\"valorAtualizado\":9738.50{\"periodoApuracao\":201709,\"vencimento\":20171020,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":8037.84,\"valorAtualizado\":10025.52{\"periodoApuracao\":201710,\"vencimento\":20171120,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":5347.95,\"valorAtualizado\":6639.95{\"periodoApuracao\":201711,\"vencimento\":20171220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":4500.95,\"valorAtualizado\":5564.01}]\"alteracoesDivida\":[{\"totalConsolidado\":45089.0\"parcelasRemanescentes\":145,\"parcelaBasica\":310.9\"dataAlteracaoDivida\":202308311053,\"valorConsolidadoPrincipal\":40435.4\"detalhesAlteracaoDivida\":[{\"periodoApuracao\":20151\"vencimento\":20151221,\"numeroProcesso\":\"12376094286201915\\"saldoDevedorOriginal\":1679.07,\"valorAtualizado\":1935.42{\"periodoApuracao\":201607,\"vencimento\":2016082\"numeroProcesso\":\"12376094286201915\",\"saldoDevedorOriginal\":3343.6\"valorAtualizado\":3794.66},{\"periodoApuracao\":20161\"vencimento\":20170120,\"numeroProcesso\":\"12376094286201915\\"saldoDevedorOriginal\":4338.52,\"valorAtualizado\":4876.91{\"periodoApuracao\":201707,\"vencimento\":2017082\"numeroProcesso\":\"12376094286201915\",\"saldoDevedorOriginal\":5419.6\"valorAtualizado\":6026.62},{\"periodoApuracao\":20170\"vencimento\":20170921,\"numeroProcesso\":\"12376094286201915\\"saldoDevedorOriginal\":7767.86,\"valorAtualizado\":8627.74{\"periodoApuracao\":201709,\"vencimento\":2017102\"numeroProcesso\":\"12376094286201915\",\"saldoDevedorOriginal\":8037.8\"valorAtualizado\":8917.15},{\"periodoApuracao\":20171\"vencimento\":20171120,\"numeroProcesso\":\"12376094286201915\\"saldoDevedorOriginal\":5347.95,\"valorAtualizado\":5927.11{\"periodoApuracao\":201711,\"vencimento\":2017122\"numeroProcesso\":\"12376094286201915\",\"saldoDevedorOriginal\":4500.9\"valorAtualizado\":4983.43}]}],\"demonstrativoPagamentos\[{\"mesDaParcela\":201806,\"vencimentoDoDas\":2018062\"dataDeArrecadacao\":20180629,\"valorPago\":537.43{\"mesDaParcela\":201807,\"vencimentoDoDas\":2018073\"dataDeArrecadacao\":20180731,\"valorPago\":542.80{\"mesDaParcela\":201808,\"vencimentoDoDas\":2018083\"dataDeArrecadacao\":20180829,\"valorPago\":545.70{\"mesDaParcela\":201809,\"vencimentoDoDas\":2018092\"dataDeArrecadacao\":20180928,\"valorPago\":548.76}]}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Parcelamento - PERTSN](../../../generated/source/solucoes/integra-parcelamento/pertsn/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertsn/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertsn/servicos/exemplos/retorno_consulta_parcelamento/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertsn/servicos/consulta_parcelamento/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertsn/servicos/exemplos/retorno_consulta_parcelamento/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `0f945623aef3df47a2e6ab569632d3ab0b222b34b65ac0e73fbf7591e48e9a78`
