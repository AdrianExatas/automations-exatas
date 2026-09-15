---
key: "RELPSN.OBTERPARC194"
family: "integra-parcelamento"
systemId: "RELPSN"
serviceId: "OBTERPARC194"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar um determinado parcelamento na modalidade RELPSN

Consultar um parcelamento específico na modalidade RELPSN.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `RELPSN.OBTERPARC194` |
| Família | `integra-parcelamento` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 11/11/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00210, 10036) |

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
| Dados de Saída — Objeto Consolidacao: | dataConsolidacao | Número (AAAAMMDDHHMMSS) | — | — | Data da consolidação |
| Dados de Saída — Objeto Consolidacao: | parcelaDeEntrada | Número | — | — | Valor da parcela básica de entrada |
| Dados de Saída — Objeto Consolidacao: | quantidadeParcelasDeEntrada | Número | — | — | Quantidade de parcelas |
| Dados de Saída — Objeto Consolidacao: | valorConsolidadoDivida | Número | — | — | Valor consolidado |
| Dados de Saída — Objeto Consolidacao: | detalhesConsolidacao | Lista de DetalhesConsolidacao | — | — | Detalhes da consolidação |
| Dados de Saída — Objeto DetalhesConsolidacao: | periodoApuracao | Número (AAAAMM) | — | — | Período de apuração |
| Dados de Saída — Objeto DetalhesConsolidacao: | vencimento | Número (AAAAMMDD) | — | — | Data de vencimento |
| Dados de Saída — Objeto DetalhesConsolidacao: | numeroProcesso | Texto | — | — | Número do processo |
| Dados de Saída — Objeto DetalhesConsolidacao: | saldoDevedorOriginal | Número | — | — | Valor do saldo devedor original |
| Dados de Saída — Objeto DetalhesConsolidacao: | valorAtualizado | Número | — | — | Valor atualizado |
| Dados de Saída — Objeto AlteracaoDivida: | dataAlteracaoDivida | Número (AAAAMMDDHHMM) | — | — | Data da alteração de dívida |
| Dados de Saída — Objeto AlteracaoDivida: | identificadorConsolidacao | Número | — | — | 1=Consolidação do restante da dívida; 2=Reconsolidação por alteração de débitos no sistema de cobrança. |
| Dados de Saída — Objeto AlteracaoDivida: | saldoDevedorOriginalSemReducoes | Número | — | — | Saldo devedor original sem reduções |
| Dados de Saída — Objeto AlteracaoDivida: | valorRemanescenteComReducoes | Número | — | — | Valor remanescente com reduções |
| Dados de Saída — Objeto AlteracaoDivida: | partePrevidenciaria | Número | — | — | Valor dos débitos previdenciários |
| Dados de Saída — Objeto AlteracaoDivida: | demaisDebitos | Número | — | — | Valor dos demais débitos (exceto previdenciários) |
| Dados de Saída — Objeto AlteracaoDivida: | detalhesConsolidacao | Lista de DetalhesConsolidacao | — | — | Detalhes da consolidação |
| Dados de Saída — Objeto AlteracaoDivida: | parcelasAlteracao | Lista de ParcelaAlteracao | — | — | Detalhes de alteração de parcela |
| Dados de Saída — Objeto ParcelaAlteracao: | faixaParcelas | Texto | — | — | Faixa do número de parcelas. |
| Dados de Saída — Objeto ParcelaAlteracao: | parcelaInicial | Número (AAAAMM) | — | — | Data da parcela inicial |
| Dados de Saída — Objeto ParcelaAlteracao: | vencimentoInicial | Número (AAAAMMDD) | — | — | Data de vencimento inicial |
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
      "idSistema": "RELPSN",
      "idServico": "OBTERPARC174",
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
    "idSistema": "RELPSN",
    "idServico": "OBTERPARC174",
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
        "idSistema": "RELPSN",
        "idServico": "OBTERPARC194",
        "versaoSistema": "1.0", 
        "dados": "{ \"numeroParcelamento\": 9131}"
    },
    "status": 200,
    "mensagens": [
     {
      "codigo": "[Sucesso-RELPSN]",
      "texto": "Requisição efetuada com sucesso."
     }
    ],
     "dados": "{\"numero\":9131,\"dataDoPedido\":20220520,\"situacao\":\"Eparcelamento\",\"dataDaSituacao\":20220526,\"consolidacaoOriginal\{\"valorTotalConsolidadoDeEntrada\":2801.5\"quantidadeParcelasDeEntrada\":8,\"parcelaDeEntrada\":350.1\"dataConsolidacao\":20220520164440,\"valorConsolidadoDivida\":22412.0\"detalhesConsolidacao\":[{\"periodoApuracao\":20181\"vencimento\":20190121,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":10380.29,\"valorAtualizado\":14176.31{\"periodoApuracao\":201905,\"vencimento\":20190621,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":6142.47,\"valorAtualizado\":8235.77}]\"alteracoesDivida\":[{\"dataAlteracaoDivida\":20230120162\"identificadorConsolidacao\":1,\"saldoDevedorOriginalSemReducoes\":144577,\"valorRemanescenteComReducoes\":20810.71,\"partePrevidenciaria\":90379,\"demaisDebitos\":11778.92,\"detalhesConsolidacao\[{\"periodoApuracao\":201812,\"vencimento\":2019012\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":8310.3\"valorAtualizado\":12054.06},{\"periodoApuracao\":20190\"vencimento\":20190621,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":6142.47,\"valorAtualizado\":8756.65}\"parcelasAlteracao\":[{\"faixaParcelas\":\"1ª a 12ª\\"parcelaInicial\":202301,\"vencimentoInicial\":2023013\"parcelaBasica\":300.00},{\"faixaParcelas\":\"13ª a 24ª\\"parcelaInicial\":202401,\"vencimentoInicial\":2024013\"parcelaBasica\":300.00},{\"faixaParcelas\":\"25ª a 36ª\\"parcelaInicial\":202501,\"vencimentoInicial\":2025013\"parcelaBasica\":300.00},{\"faixaParcelas\":\"37ª a 60ª\\"parcelaInicial\":202601,\"vencimentoInicial\":2026013\"parcelaBasica\":300.00},{\"faixaParcelas\":\"61ª a 69ª\\"parcelaInicial\":202801,\"vencimentoInicial\":2028013\"parcelaBasica\":312.30}]},{\"dataAlteracaoDivida\":20230127124\"identificadorConsolidacao\":2,\"saldoDevedorOriginalSemReducoes\":144577,\"valorRemanescenteComReducoes\":16247.78,\"partePrevidenciaria\":70549,\"demaisDebitos\":9196.29,\"detalhesConsolidacao\[{\"periodoApuracao\":201812,\"vencimento\":2019012\"numeroProcesso\":\"\",\"saldoDevedorOriginal\":8310.3\"valorAtualizado\":9373.16},{\"periodoApuracao\":20190\"vencimento\":20190621,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":6142.47,\"valorAtualizado\":6874.62}\"parcelasAlteracao\":[{\"faixaParcelas\":\"1ª a 12ª\\"parcelaInicial\":202301,\"vencimentoInicial\":2023013\"parcelaBasica\":300.00},{\"faixaParcelas\":\"13ª a 24ª\\"parcelaInicial\":202401,\"vencimentoInicial\":2024013\"parcelaBasica\":300.00},{\"faixaParcelas\":\"25ª a 36ª\\"parcelaInicial\":202501,\"vencimentoInicial\":2025013\"parcelaBasica\":300.00},{\"faixaParcelas\":\"37ª a 54ª\\"parcelaInicial\":202601,\"vencimentoInicial\":2026013\"parcelaBasica\":302.65}]}],\"demonstrativoPagamentos\[{\"mesDaParcela\":202205,\"vencimentoDoDas\":2022052\"dataDeArrecadacao\":20220523,\"valorPago\":350.19{\"mesDaParcela\":202206,\"vencimentoDoDas\":2022063\"dataDeArrecadacao\":20220629,\"valorPago\":353.69{\"mesDaParcela\":202207,\"vencimentoDoDas\":2022072\"dataDeArrecadacao\":20220729,\"valorPago\":357.26{\"mesDaParcela\":202208,\"vencimentoDoDas\":2022083\"dataDeArrecadacao\":20220830,\"valorPago\":360.87{\"mesDaParcela\":202209,\"vencimentoDoDas\":2022093\"dataDeArrecadacao\":20220930,\"valorPago\":364.96{\"mesDaParcela\":202210,\"vencimentoDoDas\":2022103\"dataDeArrecadacao\":20221031,\"valorPago\":368.71{\"mesDaParcela\":202211,\"vencimentoDoDas\":2022113\"dataDeArrecadacao\":20221130,\"valorPago\":372.28{\"mesDaParcela\":202212,\"vencimentoDoDas\":2022122\"dataDeArrecadacao\":20221229,\"valorPago\":375.85{\"mesDaParcela\":202301,\"vencimentoDoDas\":2023013\"dataDeArrecadacao\":20230131,\"valorPago\":325.34{\"mesDaParcela\":202302,\"vencimentoDoDas\":2023022\"dataDeArrecadacao\":20230228,\"valorPago\":328.70{\"mesDaParcela\":202303,\"vencimentoDoDas\":2023033\"dataDeArrecadacao\":20230331,\"valorPago\":331.46{\"mesDaParcela\":202304,\"vencimentoDoDas\":2023042\"dataDeArrecadacao\":20230428,\"valorPago\":334.97{\"mesDaParcela\":202305,\"vencimentoDoDas\":2023053\"dataDeArrecadacao\":20230531,\"valorPago\":337.73{\"mesDaParcela\":202306,\"vencimentoDoDas\":2023063\"dataDeArrecadacao\":20230630,\"valorPago\":341.09{\"mesDaParcela\":202307,\"vencimentoDoDas\":2023073\"dataDeArrecadacao\":20230731,\"valorPago\":344.30{\"mesDaParcela\":202308,\"vencimentoDoDas\":2023083\"dataDeArrecadacao\":20230830,\"valorPago\":347.51{\"mesDaParcela\":202309,\"vencimentoDoDas\":2023092\"dataDeArrecadacao\":20230929,\"valorPago\":350.93{\"mesDaParcela\":202310,\"vencimentoDoDas\":2023103\"dataDeArrecadacao\":20231031,\"valorPago\":353.84}]}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Parcelamento - RELPSN](../../../generated/source/solucoes/integra-parcelamento/relpsn/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpsn/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpsn/servicos/exemplos/retorno_consulta_parcelamento/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpsn/servicos/consulta_parcelamento/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpsn/servicos/exemplos/retorno_consulta_parcelamento/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `a07ad4246f68d4ea409349a520ac33085fb64435e0889628f8e104fec9a432e5`
