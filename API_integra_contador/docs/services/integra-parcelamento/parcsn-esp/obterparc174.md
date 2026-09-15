---
key: "PARCSN-ESP.OBTERPARC174"
family: "integra-parcelamento"
systemId: "PARCSN-ESP"
serviceId: "OBTERPARC174"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar um determinado parcelamento na modalidade PARCSN ESPECIAL

Consultar um parcelamento específico na modalidade especial.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PARCSN-ESP.OBTERPARC174` |
| Família | `integra-parcelamento` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 11/11/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00125) |

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
| Dados de Saída — Objeto AlteracaoDivida: | parcelasRemanescentes | Número | — | — | Número de parcelas remanescentes |
| Dados de Saída — Objeto AlteracaoDivida: | parcelaBasica | Número | — | — | Valor da parcela básica |
| Dados de Saída — Objeto AlteracaoDivida: | dataAlteracaoDivida | Número (AAAAMMDD) | — | — | Data da alteração de dívida |
| Dados de Saída — Objeto AlteracaoDivida: | detalhesConsolidacao | Lista de DetalhesConsolidacao | — | — | Detalhes da consolidação |
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
          "idSistema": "PARCSN-ESP",
            "idServico": "OBTERPARC174",
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
    "idSistema": "PARCSN-ESP",
    "idServico": "OBTERPARC174",
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
        "idSistema": "PARCSN-ESP",
        "idServico": "OBTERPARC174",
        "versaoSistema": "1.0", 
        "dados": "{ \"numeroParcelamento\": 9001}"
    },
    "status": 200,
    "mensagens": [
     {
      "codigo": "[Sucesso-PARCSN-ESP]",
      "texto": "Requisição efetuada com sucesso."
     }
    ],
    "dados": "{\"numero\":9001,\"dataDoPedido\":2016021\"situacao\":\"Encerrado a Pedido do Contribuinte\\"dataDaSituacao\":20170125,\"consolidacaoOriginal\{\"valorTotalConsolidado\":5127.39,\"quantidadeParcelas\":1\"primeiraParcela\":301.61,\"parcelaBasica\":301.6\"dataConsolidacao\":20160211124844,\"detalhesConsolidacao\[{\"periodoApuracao\":201511,\"vencimento\":20151221,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":2296.80,\"valorAtualizado\":2803.42{\"periodoApuracao\":201512,\"vencimento\":20160120,\"numeroProcesso\":\"\\"saldoDevedorOriginal\":1920.68,\"valorAtualizado\":2323.97}]\"alteracoesDivida\":[],\"demonstrativoPagamentos\[{\"mesDaParcela\":201602,\"vencimentoDoDas\":2016021\"dataDeArrecadacao\":20160212,\"valorPago\":301.61{\"mesDaParcela\":201603,\"vencimentoDoDas\":2016033\"dataDeArrecadacao\":20160318,\"valorPago\":304.62{\"mesDaParcela\":201604,\"vencimentoDoDas\":2016042\"dataDeArrecadacao\":20160428,\"valorPago\":308.12{\"mesDaParcela\":201605,\"vencimentoDoDas\":2016053\"dataDeArrecadacao\":20160630,\"valorPago\":314.66{\"mesDaParcela\":201606,\"vencimentoDoDas\":2016063\"dataDeArrecadacao\":20160630,\"valorPago\":314.66{\"mesDaParcela\":201607,\"vencimentoDoDas\":2016072\"dataDeArrecadacao\":20160728,\"valorPago\":318.16{\"mesDaParcela\":201608,\"vencimentoDoDas\":2016083\"dataDeArrecadacao\":20160816,\"valorPago\":321.51{\"mesDaParcela\":201609,\"vencimentoDoDas\":2016093\"dataDeArrecadacao\":20160928,\"valorPago\":325.19{\"mesDaParcela\":201610,\"vencimentoDoDas\":2016103\"dataDeArrecadacao\":20161028,\"valorPago\":328.54{\"mesDaParcela\":201611,\"vencimentoDoDas\":2016113\"dataDeArrecadacao\":20161125,\"valorPago\":331.71{\"mesDaParcela\":201612,\"vencimentoDoDas\":2016122\"dataDeArrecadacao\":20161228,\"valorPago\":334.84}]}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Parcelamento - PARCSN ESPECIAL](../../../generated/source/solucoes/integra-parcelamento/parcsn_esp/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn_esp/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn_esp/servicos/exemplos/retorno_consulta_parcelamento/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn_esp/servicos/consulta_parcelamento/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn_esp/servicos/exemplos/retorno_consulta_parcelamento/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `13a5fa85bc13efce22da881e421da6a2fbee952e6257598c861f29bf9d4ab471`
