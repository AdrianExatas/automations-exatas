---
key: "RELPMEI.DETPAGTOPARC235"
family: "integra-parcelamento"
systemId: "RELPMEI"
serviceId: "DETPAGTOPARC235"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar detalhes de pagamento na modalidade RELPMEI

Consultar detalhe de pagamento de DAS de parcelamento RELPMEI.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `RELPMEI.DETPAGTOPARC235` |
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
| Dados de Entrada | anoMesParcela | Número | SIM | — | Mês da parcela paga (AAAAMM) |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Número(3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Lista de Texto | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. |
| Dados de Saída | dados | Texto (SCAPED Texto JSON) | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto: dados | numeroDas | Texto | — | — | Número do DAS pago |
| Dados de Saída — Objeto: dados | dataVencimento | Número (AAAAMMDD) | — | — | Data de vencimento do DAS |
| Dados de Saída — Objeto: dados | paDasGerado | Texto (AAAAMM) | — | — | Período de apuração do DAS Gerado |
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
    "idSistema": "RELPMEI",
    "idServico": "DETPAGTOPARC235",
    "versaoSistema": "1.0", 
        "dados": "{ \"numeroParcelamento\": 9131, \"anoMesParcela\": 202303 }"
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
    "idServico": "DETPAGTOPARC235",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroParcelamento\": 9131, \"anoMesParcela\": 202303 }"
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
        "idServico": "DETPAGTOPARC225",
        "versaoSistema": "1.0", 
        "dados": "{ \"numeroParcelamento\": 9131, \"anoMesParcela\": 202303 }"
    },
      "status": 200,
      "mensagens": [
        {
          "codigo": "[Sucesso-RELPMEI]",
          "texto": "Requisição efetuada com sucesso."
        }
      ],
      "dados": "{\"numeroDas\":\"07182308868350189\",\"dataVencimento\":2023033\"paDasGerado\":202303,\"geradoEm\":\"20230329211200\\"numeroParcelamento\":\"9131\",\"numeroParcela\":\"05\\"dataLimiteAcolhimento\":20230331,\"pagamentoDebitos\[{\"paDebito\":201908,\"processo\":\"\",\"discriminacoesDebito\[{\"tributo\":\"INSS\",\"principal\":49.13,\"multa\":2.45,\"juros\":2.6\"total\":54.21,\"enteFederadoDestino\":\"União\"}]},{\"paDebito\":20190\"processo\":\"\",\"discriminacoesDebito\":[{\"tributo\":\"ICMS\\"principal\":0.92,\"multa\":0.05,\"juros\":0.05,\"total\":1.0\"enteFederadoDestino\":\"SP\"}]}],\"dataPagamento\":2023033\"bancoAgencia\":\"237/504\",\"valorPagoArrecadacao\":55.23}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Parcelamento - RELPMEI](../../../generated/source/solucoes/integra-parcelamento/relpmei/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpmei/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpmei/servicos/exemplos/retorno_consulta_detalhe_pagamento/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpmei/servicos/consulta_detalhe_pagamento/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpmei/servicos/exemplos/retorno_consulta_detalhe_pagamento/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `31b059b31a9e748343457fafee7812a302a39a73cc5f11618bf98d896bc6e2ca`
