---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn/servicos/consulta_parcelas_impressao/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "4b2b0bd16cef57e469b4cf3f5a5ac3b9666321e80596cc85e8691d896ba70cb7"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn/servicos/consulta_parcelas_impressao/).

# Consultar as parcelas disponíveis para impressão de DAS na modalidade PARCSN ORDINÁRIO

Esta consulta retorna uma lista contendo os números das parcelas disponíveis para geração do DAS.

PedidoDados

idSistema: PARCSN idServico: PARCELASPARAGERAR162 versaoSistema: "1.0"

**Dados de Entrada**

Não há necessidade de parâmetro de entrada para este serviço. Serão consultadas todas as parcelas para o parcelamento ativo do contribuinte.

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
"idServico": "PARCELASPARAGERAR162",
"versaoSistema": "1.0",
"dados":""
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Número(3) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. | Lista de Texto |
| dados | Estrutura de dados de retorno. | Texto (SCAPED Texto JSON) |

Objeto: listaParcela

| Campo | Descrição | Tipo |
| --- | --- | --- |
| listaParcela | Informações da parcela | Lista de Parcela |

Objeto Parcela:

| Campo | Descrição | Tipo |
| --- | --- | --- |
| parcela | Número da parcela | Número (AAAAMM) |
| valor | Valor da parcela | Número |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: clique [aqui](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn/servicos/exemplos/retorno_consulta_parcelas_impressao/)
