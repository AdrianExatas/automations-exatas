---
key: "PERTSN.DETPAGTOPARC185"
family: "integra-parcelamento"
systemId: "PERTSN"
serviceId: "DETPAGTOPARC185"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar detalhes de pagamento na modalidade PERTSN

Consultar detalhe de pagamento de DAS de parcelamento PERTSN.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PERTSN.DETPAGTOPARC185` |
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
| Dados de Saída — Objeto: dados | geradoEm | Número (AAAAMMDDHHMMSS) | — | — | Data de geração do DAS |
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
    "idSistema": "PERTSN",
    "idServico": "DETPAGTOPARC185",
    "versaoSistema": "1.0", 
    "dados": "{ \"numeroParcelamento\": 9102, \"anoMesParcela\": 201806 }"
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
    "idServico": "DETPAGTOPARC185",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroParcelamento\": 9102, \"anoMesParcela\": 201806 }"
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
        "idServico": "DETPAGTOPARC185",
        "versaoSistema": "1.0", 
        "dados": "{ \"numeroParcelamento\": 9102, \"anoMesParcela\": 201806 }"
    },
    "status": 200,
    "mensagens": [
        {
          "codigo": "[Sucesso-RELPSN]",
          "texto": "Requisição efetuada com sucesso."
        }
    ],
    "dados": "{\"numeroDas\":\"07181817050461249\",\"dataVencimento\":20180629,\"paDasGerado\":201806,\"geradoEm\":\"20180619155840\",\"numeroParcelamento\":\"9102\",\"numeroParcela\":\"01\",\"dataLimiteAcolhimento\":20180629,\"pagamentoDebitos\":[{\"paDebito\":201511,\"processo\":\"\",\"discriminacoesDebito\":[{\"tributo\":\"IRPJ\",\"principal\":17.11,\"multa\":3.42,\"juros\":4.51,\"total\":25.04,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"CSLL\",\"principal\":17.42,\"multa\":3.48,\"juros\":4.59,\"total\":25.49,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"COFINS\",\"principal\":55.45,\"multa\":11.09,\"juros\":14.61,\"total\":81.15,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"PIS\",\"principal\":13.50,\"multa\":2.70,\"juros\":3.56,\"total\":19.76,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"INSS\",\"principal\":159.24,\"multa\":31.85,\"juros\":41.96,\"total\":233.05,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"ICMS\",\"principal\":40.29,\"multa\":8.06,\"juros\":10.62,\"total\":58.97,\"enteFederadoDestino\":\"RS\"},{\"tributo\":\"ISS\",\"principal\":64.21,\"multa\":12.84,\"juros\":16.92,\"total\":93.97,\"enteFederadoDestino\":\"PORTO ALEGRE\"}]}],\"dataPagamento\":20180629,\"bancoAgencia\":\"41/70\",\"valorPagoArrecadacao\":537.43}"
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
    "idServico": "DETPAGTOPARC185",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroParcelamento\": 9102, \"anoMesParcela\": 201806 }"
  },
  "status": 200,
  "mensagens": [
    {
      "codigo": "[Sucesso-RELPSN]",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "{\"numeroDas\":\"07181817050461249\",\"dataVencimento\":20180629,\"paDasGerado\":201806,\"geradoEm\":\"20180619155840\",\"numeroParcelamento\":\"9102\",\"numeroParcela\":\"01\",\"dataLimiteAcolhimento\":20180629,\"pagamentoDebitos\":[{\"paDebito\":201511,\"processo\":\"\",\"discriminacoesDebito\":[{\"tributo\":\"IRPJ\",\"principal\":17.11,\"multa\":3.42,\"juros\":4.51,\"total\":25.04,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"CSLL\",\"principal\":17.42,\"multa\":3.48,\"juros\":4.59,\"total\":25.49,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"COFINS\",\"principal\":55.45,\"multa\":11.09,\"juros\":14.61,\"total\":81.15,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"PIS\",\"principal\":13.50,\"multa\":2.70,\"juros\":3.56,\"total\":19.76,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"INSS\",\"principal\":159.24,\"multa\":31.85,\"juros\":41.96,\"total\":233.05,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"ICMS\",\"principal\":40.29,\"multa\":8.06,\"juros\":10.62,\"total\":58.97,\"enteFederadoDestino\":\"RS\"},{\"tributo\":\"ISS\",\"principal\":64.21,\"multa\":12.84,\"juros\":16.92,\"total\":93.97,\"enteFederadoDestino\":\"PORTO ALEGRE\"}]}],\"dataPagamento\":20180629,\"bancoAgencia\":\"41/70\",\"valorPagoArrecadacao\":537.43}"
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

- Nenhuma anomalia detectada automaticamente.

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertsn/servicos/consulta_detalhe_pagamento/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertsn/servicos/exemplos/retorno_consulta_detalhe_pagamento/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `bdeb41254fe998b5065e2356cb50fdd6d7a0547711ec81eb73ce916169185448`
