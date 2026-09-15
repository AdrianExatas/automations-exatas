---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/servicos/emitir_ccmei/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "b69f593fc832f5548716f6e4860d6887af240961419db26d32b932f254231a8a"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/servicos/emitir_ccmei/).

# Emissão do Certificado de Condição de MEI

Este serviço permite a emissão do PDF CCMEI para um contribuinte MEI.

Identificação no Pedido de Dados

idSistema: CCMEI idServico: EMITIRCCMEI121

**Dados de Entrada**

Objeto Dados:

Não se aplica

**Exemplo: conteúdo body json de entrada**

```text
{
"contratante": {
"numero": "00000000000000",
"tipo": 2
},
"autorPedidoDados": {
"cpfCnpj": "00000000000000",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000000",
"tipo": 2
},
"pedidoDados": {
"idSistema": "CCMEI",
"idServico": "EMITIRCCMEI121",
"dados": ""
}
}
```

**Dados de Saída**

São retornados os dados com o cnpj e o PDF gerado.

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number(3) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. | Array de String |
| dados | Estrutura de dados de retorno. | String (String escapada: Object dados ) |

Objeto: Dados

| Campo | Descrição | Tipo |
| --- | --- | --- |
| cnpj | Número do cnpj sem formatação | String |
| pdf | Pdf do DAS no formato Texto Base 64 | String |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno Emitir CCMEI](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/exemplos/retorno_emitir_ccmei/)
