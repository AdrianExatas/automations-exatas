---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/servicos/consultar_declaracoes/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "c8e92cb74e8013b18b2d90a9f91ae81cb3f96e6693c99b23f5018b9f9ded7ec2"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/servicos/consultar_declaracoes/).

# Consultar Declarações Transmitidas na Defis

Consultar todas as declarações transmitidas

PedidoDados

idSistema: DEFIS idServico: CONSDECLARACAO142 versaoSistema: "1.0"

**Dados de Entrada**

Não é necessário passar nenhum conteúdo no campo Dados, uma vez que serão consultadas todas as DEFIS transmitidas do contribuinte, dentro do período não decadente.

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
"IdServico": "CONSDECLARACAO142",
"Dados": ""
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. | Array |
| dados | Estrutura de dados de retorno, contendo uma lista com o objeto Declarações. | String |

Objeto: Declarações

| Campo | Descrição | Tipo |
| --- | --- | --- |
| anoCalendario | Ano calendário da declaração transmitida | Number |
| idDefis | ID da Defis transmitida | String (15) |
| tipo | Tipo da declaração 1-Original Normal; 2-Retificadora Normal; 3-Original de Situação Especial; 4-Retificadora de Situação Especial | String |
| dataHora | Data e hora da transmissão no formato AAAAMMDDHHMMSS (24 hrs) | Number |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [consultarDeclaracoes](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/exemplos/retorno_consultar_declaracoes/)
