---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/dte/servicos/obter_indicador_dte/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "460d4d17ef34423f77baec2468eabf5f231d29e014486e66c806dccb723b95dc"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/dte/servicos/obter_indicador_dte/).

# Obter Indicador DTE

Obtém informação que indica se há adesão ao DTE de um contribuinte.

Em cada chamada do serviço, serão informados os dados a respeito do autor da consulta e do contribuinte. Haverá um retorno on-line, indicando o sucesso ou falha da consulta.

PedidoDados

idSistema: DTE idServico: CONSULTASITUACAODTE111 versaoSistema: "1.0"

**Dados de Entrada**

Objeto Dados:

Não tem informação a ser preenchida no campo "dados", o campo deve ser enviado vazio (ex.: "dados":"")

| Campo | Descrição | Tipo | Domínio | Obrigatório |
| --- | --- | --- | --- | --- |
| -- | -- | -- | -- | -- |

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
"idSistema": "DTE",
"idServico": "CONSULTASITUACAODTE111",
"versaoSistema": "1.0",
"dados": ""
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number(3) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é uma string de tamanho 5 que representa um código interno do negócio. | Array of String |
| dados | Estrutura de dados de retorno. | String (SCAPED STRING JSON: Dados) |

Objeto: Dados

| Campo | Descrição | Tipo | Domínio |
| --- | --- | --- | --- |
| indicadorEnquadramento | Indicador de enquadramento do NI consultado. | Number (1) | -2: NI inválido. -1: NI Não optante. 0: NI Optante DTE. 1: NI Optante Simples. 2: NI Optante DTE e Simples. |
| statusEnquadramento | Texto do status de enquadramento do NI consultado. | String (300) | -- |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [lista de Obter Indicador DTE](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/dte/exemplos/retorno_obter_indicador_dte/)
