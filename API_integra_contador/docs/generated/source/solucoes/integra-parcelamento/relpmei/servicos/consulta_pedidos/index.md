---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpmei/servicos/consulta_pedidos/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "63d4a42aa49cad756e589d48fa2c6b28ab669a626984c051b7415e7160fb4aa3"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpmei/servicos/consulta_pedidos/).

# Consultar todos os pedidos de parcelamento na modalidade RELPMEI para um contribuinte

Esta consulta retorna uma lista contendo todos os parcelamentos do tipo RELPMEI para o contribuinte

PedidoDados

idSistema: RELPMEI idServico: PEDIDOSPARC233 versaoSistema: "1.0"

**Dados de Entrada**

Não há necessidade de parâmetro de entrada para este serviço.

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
"idSistema": "RELPMEI",
"idServico": "PEDIDOSPARC233",
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

Objeto: parcelamentos

| Campo | Descrição | Tipo |
| --- | --- | --- |
| parcelamentos | Lista dos parcelamentos | Lista de Parcelamento |

Objeto Parcelamento:

| Campo | Descrição | Tipo |
| --- | --- | --- |
| numero | Número do parcelamento | Número |
| dataDoPedido | Data do pedido do parcelamento | Número (AAAAMMDD) |
| situacao | Situação do parcelamento | Texto |
| dataDaSituacao | Data da situação do parcelamento | Número (AAAAMMDD) |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: clique [aqui](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpmei/servicos/exemplos/retorno_consulta_pedidos/)
