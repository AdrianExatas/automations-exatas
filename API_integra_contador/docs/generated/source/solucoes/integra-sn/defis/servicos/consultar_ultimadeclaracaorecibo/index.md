---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/servicos/consultar_ultimadeclaracaorecibo/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "48d63a8a3c4dfaacdde47779f4e2ee4516a828f25fb34725f927a21ec1811b78"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/servicos/consultar_ultimadeclaracaorecibo/).

# Consultar a Última Declaração Transmitidas na Defis

Consultar a última declaração transmitida no ano calendário

PedidoDados

idSistema: DEFIS idServico: CONSULTIMADECREC143 versaoSistema: "1.0"

**Dados de Entrada**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| ano | Ano calendário, dentro do periodo não decadente, que se deseja consultar a última declaração transmitida | Number |

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
"IdServico": "CONSULTIMADECREC143",
"Dados": "{\"ano\":2021}"
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
| idDefis | Id da última DEFIS transmitida para o ano calendário | Number |
| recibo | PDF do recibo no formato base 64 | String |
| declaracao | PDF da declaração no formato base 64 | String |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [consultarUltimaDeclaracaoRecibo](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/exemplos/retorno_consultar_ultimadeclaracaorecibo/)
