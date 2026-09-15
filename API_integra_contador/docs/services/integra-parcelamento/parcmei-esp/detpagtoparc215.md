---
key: "PARCMEI-ESP.DETPAGTOPARC215"
family: "integra-parcelamento"
systemId: "PARCMEI-ESP"
serviceId: "DETPAGTOPARC215"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar detalhes de pagamento na modalidade PARCMEI ESPECIAL

Consultar detalhe de pagamento de DAS de PARCMEI especial.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PARCMEI-ESP.DETPAGTOPARC215` |
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
| Dados de Entrada | anoMesParcela | Número | SIM | — | Mês da parcela paga (AAAAMM) |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Número(3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Lista de Texto | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. |
| Dados de Saída | dados | Texto (SCAPED Texto JSON) | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto: dados | numeroDas | Texto | — | — | Número do DAS pago |
| Dados de Saída — Objeto: dados | dataVencimento | Número (AAAAMMDD) | — | — | Data de vencimento do DAS |
| Dados de Saída — Objeto: dados | paDasGerado | Número (AAAAMM) | — | — | Período de apuração do DAS Gerado |
| Dados de Saída — Objeto: dados | geradoEm | Texto (AAAAMMDDHHMMSS) | — | — | Data de geração do DAS |
| Dados de Saída — Objeto: dados | numeroParcelamento | Texto | — | — | Número do parcelamento |
| Dados de Saída — Objeto: dados | numeroParcela | Texto | — | — | Número da parcela |
| Dados de Saída — Objeto: dados | dataLimiteAcolhimento | Número (AAAAMMDD) | — | — | Data limite para acolhimento |
| Dados de Saída — Objeto: dados | pagamentoDebitos | Lista de PagamentoDebito | — | — | Detalhes dos débitos |
| Dados de Saída — Objeto: dados | dataPagamento | Número (AAAAMMDD) | — | — | Data do pagamento |
| Dados de Saída — Objeto: dados | bancoAgencia | Texto | — | — | Banco/agência do pagamento |
| Dados de Saída — Objeto: dados | valorPagoArrecadacao | Número | — | — | Valor arrecadado |
| Dados de Saída — Objeto PagamentoDebito: | paDebito | Número (AAAAMM) | — | — | Período de apuração do débito |
| Dados de Saída — Objeto PagamentoDebito: | processo | Texto | — | — | Número do processo |
| Dados de Saída — Objeto PagamentoDebito: | discriminacoesDebito | Lista de DiscriminacaoDebito | — | — | Detalhes dos débitos |
| Dados de Saída — Objeto DiscriminacaoDebito: | tributo | Texto | — | — | Nome do tributo |
| Dados de Saída — Objeto DiscriminacaoDebito: | principal | Número | — | — | Valor do principal |
| Dados de Saída — Objeto DiscriminacaoDebito: | multa | Número | — | — | Valor da multa |
| Dados de Saída — Objeto DiscriminacaoDebito: | juros | Número | — | — | Valor dos juros |
| Dados de Saída — Objeto DiscriminacaoDebito: | total | Número | — | — | Valor total |
| Dados de Saída — Objeto DiscriminacaoDebito: | enteFederadoDestino | Texto | — | — | Discriminação do ente do destino |

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
    "idServico": "DETPAGTOPARC215",
    "versaoSistema": "1.0", 
    "dados": "{ \"numeroParcelamento\": 9001, \"anoMesParcela\": 202111 }"
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
    "idServico": "DETPAGTOPARC215",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroParcelamento\": 9001, \"anoMesParcela\": 202111 }"
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
        "idServico": "DETPAGTOPARC215",
        "versaoSistema": "1.0", 
        "dados": "{ \"numeroParcelamento\": 9001, \"anoMesParcela\": 202111 }"
    },
      "status": 200,
      "mensagens": [
        {
          "codigo": "[Sucesso-PARCMEI-ESP]",
          "texto": "Requisição efetuada com sucesso."
        }
      ],
      "dados": "{\"numeroDas\":\"07182133406733697\",\"dataVencimento\":2021113\"paDasGerado\":202111,\"geradoEm\":\"20211130180801\\"numeroParcelamento\":\"9001\",\"numeroParcela\":\"50\\"dataLimiteAcolhimento\":20211130,\"pagamentoDebitos\[{\"paDebito\":201502,\"processo\":\"\",\"discriminacoesDebito\[{\"tributo\":\"INSS\",\"principal\":29.25,\"multa\":5.85,\"juros\":14.9\"total\":50.07,\"enteFederadoDestino\":\"União\"}]},{\"paDebito\":20150\"processo\":\"\",\"discriminacoesDebito\":[{\"tributo\":\"INSS\\"principal\":5.88,\"multa\":1.18,\"juros\":2.96,\"total\":10.0\"enteFederadoDestino\":\"União\"},{\"tributo\":\"ICMS\",\"principal\":15,\"multa\":0.03,\"juros\":0.07,\"total\":0.2\"enteFederadoDestino\":\"MG\"}]}],\"dataPagamento\":2021113\"bancoAgencia\":\"104/3988\",\"valorPagoArrecadacao\":60.34}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Parcelamento - PARCMEI ESPECIAL](../../../generated/source/solucoes/integra-parcelamento/parcmei_esp/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei_esp/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei_esp/servicos/exemplos/retorno_consulta_detalhe_pagamento/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei_esp/servicos/consulta_detalhe_pagamento/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei_esp/servicos/exemplos/retorno_consulta_detalhe_pagamento/)

- Última atualização informada pela fonte: 10 de abril de 2026 14:58:42 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `b41207d4b33b9cf610aaf1f701a1d3bbf9a3b235084f81825d66a76fc6a9f294`
