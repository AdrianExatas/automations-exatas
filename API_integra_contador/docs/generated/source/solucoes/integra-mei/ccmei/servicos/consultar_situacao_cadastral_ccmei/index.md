---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/servicos/consultar_situacao_cadastral_ccmei/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "751bd7799956ec4328440f1c3ca9af8939ea6b486dfae3977d046fdefc6b42e3"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/servicos/consultar_situacao_cadastral_ccmei/).

# Consulta a situação cadastral dos CNPJ MEI vinculados ao CPF

Este serviço permite consultar os CNPJs (que tenham sido MEI), com respectiva situação cadastral, a partir do CPF de um contribinte.

Identificação no Pedido de Dados

idSistema: CCMEI idServico: CCMEISITCADASTRAL123

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
"numero": "00000000000000",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000000",
"tipo": 2
},
"pedidoDados": {
"idSistema": "CCMEI",
"idServico": "CCMEISITCADASTRAL123",
"versaoSistema": "1.0",
"dados": ""
}
}
```

**Dados de Saída**

O retorno é a confirmação que os benefícios foram inseridos com sucesso.

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number(3) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. | Array de String |
| dados | Estrutura de dados de retorno. | String (String escapada: Array de Object dados ) |

Objeto: Lista de Objeto

| Campo | Descrição | Tipo |
| --- | --- | --- |
| cnpj | Número do cnpj sem formatação | String |
| situacao | Atual situação cadastral do CNPJ | String |
| enquadradoMei | Atual situação de enquadramento MEI | Boolean |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno Consultar Situação Cadastral CCMEI](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/exemplos/retorno_consultar_situacao_cadastral_ccmei/)
