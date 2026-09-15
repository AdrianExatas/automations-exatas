---
key: "PARCMEI.OBTERPARC204"
family: "integra-parcelamento"
systemId: "PARCMEI"
serviceId: "OBTERPARC204"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar um determinado parcelamento na modalidade PARCMEI

Consultar um parcelamento específico na modalidade PARCMEI convencional.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PARCMEI.OBTERPARC204` |
| Família | `integra-parcelamento` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 11/11/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00134) |

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
      "idSistema": "PARCMEI",
      "idServico": "OBTERPARC204",
      "versaoSistema": "1.0",   
      "dados": "{ \"numeroParcelamento\": 1}"
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
    "idSistema": "PARCMEI",
    "idServico": "OBTERPARC204",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroParcelamento\": 1}"
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
        "idSistema": "PARCMEI",
        "idServico": "OBTERPARC204",
        "versaoSistema": "1.0", 
        "dados": "{ \"numeroParcelamento\": 1}"
    },
    "status": 200,
    "mensagens": [
     {
      "codigo": "[Sucesso-PARCMEI]",
      "texto": "Requisição efetuada com sucesso."
     }
    ],
    "dados": "{\"numero\":1,\"dataDoPedido\":20200325,\"situacao\":\"Encerradpor Rescisão\",\"dataDaSituacao\":20211114,\"consolidacaoOriginal\{\"valorTotalConsolidado\":1773.86,\"quantidadeParcelas\":3\"primeiraParcela\":0.0,\"parcelaBasica\":50.6\"dataConsolidacao\":20200325131244,\"detalhesConsolidacao\[{\"periodoApuracao\":201711,\"vencimento\":20171220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":51.85,\"valorAtualizado\":69.31{\"periodoApuracao\":201712,\"vencimento\":20180122,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":51.85,\"valorAtualizado\":69.01{\"periodoApuracao\":201801,\"vencimento\":20180220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":69.90{\"periodoApuracao\":201802,\"vencimento\":20180320,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":69.62{\"periodoApuracao\":201803,\"vencimento\":20180420,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":69.35{\"periodoApuracao\":201804,\"vencimento\":20180521,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":69.07{\"periodoApuracao\":201805,\"vencimento\":20180620,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":68.79{\"periodoApuracao\":201806,\"vencimento\":20180720,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":68.51{\"periodoApuracao\":201807,\"vencimento\":20180820,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":68.21{\"periodoApuracao\":201808,\"vencimento\":20180920,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":67.96{\"periodoApuracao\":201809,\"vencimento\":20181022,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":67.68{\"periodoApuracao\":201810,\"vencimento\":20181120,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":67.42{\"periodoApuracao\":201811,\"vencimento\":20181220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":67.16{\"periodoApuracao\":201812,\"vencimento\":20190121,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":52.70,\"valorAtualizado\":66.88{\"periodoApuracao\":201901,\"vencimento\":20190220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":69.40{\"periodoApuracao\":201902,\"vencimento\":20190320,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":69.14{\"periodoApuracao\":201903,\"vencimento\":20190422,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":68.86{\"periodoApuracao\":201904,\"vencimento\":20190520,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":68.56{\"periodoApuracao\":201905,\"vencimento\":20190621,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":68.31{\"periodoApuracao\":201906,\"vencimento\":20190722,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":67.99{\"periodoApuracao\":201907,\"vencimento\":20190820,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":67.71{\"periodoApuracao\":201908,\"vencimento\":20190920,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":67.46{\"periodoApuracao\":201909,\"vencimento\":20191021,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":67.20{\"periodoApuracao\":201910,\"vencimento\":20191121,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":66.99{\"periodoApuracao\":201911,\"vencimento\":20191220,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":66.79{\"periodoApuracao\":201912,\"vencimento\":20200120,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":54.90,\"valorAtualizado\":66.58}]\"alteracoesDivida\":[],\"demonstrativoPagamentos\[{\"mesDaParcela\":202003,\"vencimentoDoDas\":2020032\"dataDeArrecadacao\":20200325,\"valorPago\":50.68},{\"mesDaParcela\":20200\"vencimentoDoDas\":20200430,\"dataDeArrecadacao\":20200420,\"valorPago\":518},{\"mesDaParcela\":202005,\"vencimentoDoDas\":2020052\"dataDeArrecadacao\":20200521,\"valorPago\":51.32},{\"mesDaParcela\":20200\"vencimentoDoDas\":20200630,\"dataDeArrecadacao\":20200626,\"valorPago\":545},{\"mesDaParcela\":202007,\"vencimentoDoDas\":2020073\"dataDeArrecadacao\":20200721,\"valorPago\":51.55},{\"mesDaParcela\":20200\"vencimentoDoDas\":20200831,\"dataDeArrecadacao\":20200820,\"valorPago\":565},{\"mesDaParcela\":202009,\"vencimentoDoDas\":2020093\"dataDeArrecadacao\":20201020,\"valorPago\":51.81},{\"mesDaParcela\":20201\"vencimentoDoDas\":20201030,\"dataDeArrecadacao\":20201020,\"valorPago\":581},{\"mesDaParcela\":202011,\"vencimentoDoDas\":2020113\"dataDeArrecadacao\":20201126,\"valorPago\":51.89},{\"mesDaParcela\":20201\"vencimentoDoDas\":20201230,\"dataDeArrecadacao\":20201228,\"valorPago\":597},{\"mesDaParcela\":202101,\"vencimentoDoDas\":2021012\"dataDeArrecadacao\":20210129,\"valorPago\":52.05},{\"mesDaParcela\":20210\"vencimentoDoDas\":20210226,\"dataDeArrecadacao\":20210301,\"valorPago\":519},{\"mesDaParcela\":202103,\"vencimentoDoDas\":2021033\"dataDeArrecadacao\":20210330,\"valorPago\":52.19},{\"mesDaParcela\":20210\"vencimentoDoDas\":20210430,\"dataDeArrecadacao\":20210430,\"valorPago\":529},{\"mesDaParcela\":202105,\"vencimentoDoDas\":2021053\"dataDeArrecadacao\":20210531,\"valorPago\":52.40},{\"mesDaParcela\":20210\"vencimentoDoDas\":20210630,\"dataDeArrecadacao\":20210702,\"valorPago\":569},{\"mesDaParcela\":202107,\"vencimentoDoDas\":2021073\"dataDeArrecadacao\":20210811,\"valorPago\":52.87}]}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Parcelamento - PARCMEI](../../../generated/source/solucoes/integra-parcelamento/parcmei/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/servicos/exemplos/retorno_consulta_parcelamento/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/servicos/consulta_parcelamento/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/servicos/exemplos/retorno_consulta_parcelamento/)

- Última atualização informada pela fonte: 10 de abril de 2026 14:58:42 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `4e3ac754bf515e9d3e264b8a6d5d2a8f3fee75b9aa35d0a3227b9aebdabfcbcc`
