---
key: "PARCSN-ESP.DETPAGTOPARC175"
family: "integra-parcelamento"
systemId: "PARCSN-ESP"
serviceId: "DETPAGTOPARC175"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar detalhes de pagamento na modalidade PARCSN ESPECIAL

Consultar detalhe de pagamento de DAS de parcelamento especial.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PARCSN-ESP.DETPAGTOPARC175` |
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
    "idSistema": "PARCSN-ESP",
    "idServico": "DETPAGTOPARC175",
    "versaoSistema": "1.0", 
    "dados": "{ \"numeroParcelamento\": 9001, \"anoMesParcela\": 201612 }"
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
    "idServico": "DETPAGTOPARC175",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroParcelamento\": 9001, \"anoMesParcela\": 201612 }"
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
        "idServico": "DETPAGTOPARC175",
        "versaoSistema": "1.0", 
        "dados": "{ \"numeroParcelamento\": 9001, \"anoMesParcela\": 201612 }"
    },
    "status": 200,
    "mensagens": [
        {
          "codigo": "[Sucesso-PARCSN-ESP]",
          "texto": "Requisição efetuada com sucesso."
        }
    ],
    "dados": "{\"numeroDas\":\"00000000000000000\",\"dataVencimento\":20161229,\"paDasGerado\":201612,\"geradoEm\":\"20161213125856\",\"numeroParcelamento\":\"0001\",\"numeroParcela\":\"11\",\"dataLimiteAcolhimento\":20161229,\"pagamentoDebitos\":[{\"paDebito\":201512,\"processo\":\"\",\"discriminacoesDebito\":[{\"tributo\":\"IRPJ\",\"principal\":17.68,\"multa\":3.54,\"juros\":2.12,\"total\":23.34,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"CSLL\",\"principal\":17.68,\"multa\":3.54,\"juros\":2.12,\"total\":23.34,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"COFINS\",\"principal\":53.05,\"multa\":10.61,\"juros\":6.38,\"total\":70.04,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"PIS\",\"principal\":12.63,\"multa\":2.53,\"juros\":1.52,\"total\":16.68,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"INSS\",\"principal\":152.58,\"multa\":30.52,\"juros\":18.34,\"total\":201.44,\"enteFederadoDestino\":\"União\"}]}],\"dataPagamento\":20161228,\"bancoAgencia\":\"0/49\",\"valorPagoArrecadacao\":334.84}"
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
    "idServico": "DETPAGTOPARC175",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroParcelamento\": 9001, \"anoMesParcela\": 201612 }"
  },
  "status": 200,
  "mensagens": [
    {
      "codigo": "[Sucesso-PARCSN-ESP]",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "{\"numeroDas\":\"00000000000000000\",\"dataVencimento\":20161229,\"paDasGerado\":201612,\"geradoEm\":\"20161213125856\",\"numeroParcelamento\":\"0001\",\"numeroParcela\":\"11\",\"dataLimiteAcolhimento\":20161229,\"pagamentoDebitos\":[{\"paDebito\":201512,\"processo\":\"\",\"discriminacoesDebito\":[{\"tributo\":\"IRPJ\",\"principal\":17.68,\"multa\":3.54,\"juros\":2.12,\"total\":23.34,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"CSLL\",\"principal\":17.68,\"multa\":3.54,\"juros\":2.12,\"total\":23.34,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"COFINS\",\"principal\":53.05,\"multa\":10.61,\"juros\":6.38,\"total\":70.04,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"PIS\",\"principal\":12.63,\"multa\":2.53,\"juros\":1.52,\"total\":16.68,\"enteFederadoDestino\":\"União\"},{\"tributo\":\"INSS\",\"principal\":152.58,\"multa\":30.52,\"juros\":18.34,\"total\":201.44,\"enteFederadoDestino\":\"União\"}]}],\"dataPagamento\":20161228,\"bancoAgencia\":\"0/49\",\"valorPagoArrecadacao\":334.84}"
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

- Nenhuma anomalia detectada automaticamente.

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn_esp/servicos/consulta_detalhe_pagamento/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn_esp/servicos/exemplos/retorno_consulta_detalhe_pagamento/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `6b669b082d20e3d55320c167e21c49722381da3f1780c910c06fde4fbe504dea`
