---
key: "PERTMEI.DETPAGTOPARC225"
family: "integra-parcelamento"
systemId: "PERTMEI"
serviceId: "DETPAGTOPARC225"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar detalhes de pagamento na modalidade PERTMEI

Consultar detalhe de pagamento de DAS de parcelamento PERTMEI.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PERTMEI.DETPAGTOPARC225` |
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
| Dados de Entrada | anoMesParcela | Número | SIM | — | Mês da parcela paga (AAAAMM) |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Número(3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Lista de Texto | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. |
| Dados de Saída | dados | Texto (SCAPED Texto JSON) | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto: dados | numeroDas | Texto | — | — | Número do DAS pago |
| Dados de Saída — Objeto: dados | dataVencimento | Número (AAAAMMDD) | — | — | Data de vencimento do DAS |
| Dados de Saída — Objeto: dados | paDasGerado | Número | — | — | Período de apuração do DAS Gerado |
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
    "idSistema": "PERTMEI",
    "idServico": "DETPAGTOPARC225",
    "versaoSistema": "1.0", 
      "dados": "{ \"numeroParcelamento\": 9101, \"anoMesParcela\": 201907 }"
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
    "idServico": "DETPAGTOPARC225",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroParcelamento\": 9101, \"anoMesParcela\": 201907 }"
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
        "idServico": "DETPAGTOPARC225",
        "versaoSistema": "1.0", 
        "dados": "{ \"numeroParcelamento\": 9101, \"anoMesParcela\": 201907 }"
    },
    "status": 200,
    "mensagens": [
        {
          "codigo": "[Sucesso-PERTMEI]",
          "texto": "Requisição efetuada com sucesso."
        }
    ],
    "dados": "{\"numeroDas\":\"07181922816516181\",\"dataVencimento\":20190731,\"paDasGerado\":201907,\"geradoEm\":\"20190816084003\",\"numeroParcelamento\":\"9101\",\"numeroParcela\":\"13\",\"dataLimiteAcolhimento\":20190830,\"pagamentoDebitos\":[{\"paDebito\":201308,\"processo\":\"\",\"discriminacoesDebito\":[{\"tributo\":\"INSS\",\"principal\":18.95,\"multa\":1.89,\"juros\":2.23,\"total\":23.07,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"ISS\",\"principal\":2.80,\"multa\":0.28,\"juros\":0.33,\"total\":3.41,\"enteFederadoDestino\":\"SAO PAULO\"}]},{\"paDebito\":201309,\"processo\":\"\",\"discriminacoesDebito\":[{\"tributo\":\"INSS\",\"principal\":20.17,\"multa\":2.02,\"juros\":2.34,\"total\":24.53,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"ISS\",\"principal\":2.98,\"multa\":0.30,\"juros\":0.35,\"total\":3.63,\"enteFederadoDestino\":\"SAO PAULO\"}]}],\"dataPagamento\":20190816,\"bancoAgencia\":\"341/367\",\"valorPagoArrecadacao\":54.64}"
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
    "idServico": "DETPAGTOPARC225",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroParcelamento\": 9101, \"anoMesParcela\": 201907 }"
  },
  "status": 200,
  "mensagens": [
    {
      "codigo": "[Sucesso-PERTMEI]",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "{\"numeroDas\":\"07181922816516181\",\"dataVencimento\":20190731,\"paDasGerado\":201907,\"geradoEm\":\"20190816084003\",\"numeroParcelamento\":\"9101\",\"numeroParcela\":\"13\",\"dataLimiteAcolhimento\":20190830,\"pagamentoDebitos\":[{\"paDebito\":201308,\"processo\":\"\",\"discriminacoesDebito\":[{\"tributo\":\"INSS\",\"principal\":18.95,\"multa\":1.89,\"juros\":2.23,\"total\":23.07,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"ISS\",\"principal\":2.80,\"multa\":0.28,\"juros\":0.33,\"total\":3.41,\"enteFederadoDestino\":\"SAO PAULO\"}]},{\"paDebito\":201309,\"processo\":\"\",\"discriminacoesDebito\":[{\"tributo\":\"INSS\",\"principal\":20.17,\"multa\":2.02,\"juros\":2.34,\"total\":24.53,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"ISS\",\"principal\":2.98,\"multa\":0.30,\"juros\":0.35,\"total\":3.63,\"enteFederadoDestino\":\"SAO PAULO\"}]}],\"dataPagamento\":20190816,\"bancoAgencia\":\"341/367\",\"valorPagoArrecadacao\":54.64}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Parcelamento - PERTMEI](../../../generated/source/solucoes/integra-parcelamento/pertmei/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- Nenhuma anomalia detectada automaticamente.

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/servicos/consulta_detalhe_pagamento/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/servicos/exemplos/retorno_consulta_detalhe_pagamento/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `ecf0f1584aa0a2aad999f8dfd6a342575e368c30606cba34ea3e236de3ad2690`
