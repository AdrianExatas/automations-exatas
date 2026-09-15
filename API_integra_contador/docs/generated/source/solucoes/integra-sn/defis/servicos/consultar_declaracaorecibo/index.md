---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/servicos/consultar_declaracaorecibo/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "7b889da041341ad267b7987f5b8f433213a1fa95d0797dbf33f9b52621442258"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/servicos/consultar_declaracaorecibo/).

# Consultar Declaração Específica Transmitida na Defis

Consultar uma determinada declaração

PedidoDados

idSistema: DEFIS idServico: CONSDECREC144 versaoSistema: "1.0"

**Dados de Entrada**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| idDefis | Id Defis de uma declaração contida entre o primeiro ano após decadência e o ano atual | Number |

**Exemplo: conteúdo body json de entrada**

```text
{
"Contratante": {
"numero": "00000000000000",
"tipo": 2
},
"AutorPedidoDados": {
"Numero": "00000000000000",
"Tipo": 2
},
"Contribuinte": {
"numero": "00000000000000",
"tipo": 2
},
"PedidoDados": {
"IdSistema": "DEFIS",
"IdServico": "CONSDECREC144",
"Dados": "{\"idDefis\":\"000000002021002\"}"
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. | Array |
| dados | Estrutura de dados de retorno, contendo uma lista com o objeto UltimaDeclaracao. | String |

Objeto: UltimaDeclaracao

| Campo | Descrição | Tipo |
| --- | --- | --- |
| recibo | PDF do recibo no formato base 64 | String |
| declaracao | PDF da declaração no formato base 64 | String |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [consultarDeclaracaoRecibo](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/exemplos/retorno_consultar_declaracaorecibo/)
