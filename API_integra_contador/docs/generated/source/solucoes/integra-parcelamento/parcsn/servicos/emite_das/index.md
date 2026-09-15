---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn/servicos/emite_das/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "5d8264e45823561be29731c3f873fa959c510d02d736380af43cb28a3fafa7ee"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn/servicos/emite_das/).

# Emitir documento de arrecadação na modalidade PARCSN ORDINÁRIO

PedidoDados

idSistema: PARCSN idServico: GERARDAS161 versaoSistema: "1.0"

**Dados de Entrada**

Campo: dados

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| parcelaParaEmitir | Ano e mês da parcela para emitir o DAS | Número (AAAAMM) | SIM |

**Exemplo: conteúdo body json de entrada**

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
"idSistema": "PARCSN",
"idServico": "GERARDAS161",
"versaoSistema": "1.0",
"dados": "{ \"parcelaParaEmitir\": 202306 }"
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Número(3) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. | Lista de Texto |
| dados | Estrutura de dados de retorno. | Texto (SCAPED Texto JSON) |

Objeto: dados

| Campo | Descrição | Tipo |
| --- | --- | --- |
| docArrecadacaoPdfB64 | PDF DAS em formato base 64 | Texto |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: clique [aqui](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn/servicos/exemplos/retorno_emite_das/)
