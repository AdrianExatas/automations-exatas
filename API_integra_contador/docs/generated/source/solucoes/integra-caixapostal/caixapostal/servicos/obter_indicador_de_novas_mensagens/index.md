---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/servicos/obter_indicador_de_novas_mensagens/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "1860b78c110d821b6ec46df2ad6b2fd9ac1aebfa4665949f00852b3ba2b879de"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/servicos/obter_indicador_de_novas_mensagens/).

# Obter Indicador de Novas Mensagens

Obtém informação que indica se há mensagens novas.

**Obs:** *Uma mensagem é considerada**nova**enquanto não for lida por ninguém. Ou seja, enquanto não for aberta, continuará sendo classificada como**nova**.*

Em cada chamada do serviço, serão informados os dados a respeito do autor da consulta e do contribuinte da mensagem. Haverá um retorno on-line, indicando o sucesso ou falha da consulta.

PedidoDados

idSistema: CAIXAPOSTAL idServico: INNOVAMSG63 versaoSistema: "1.0"

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
"idSistema": "CAIXAPOSTAL",
"idServico": "INNOVAMSG63",
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
| codigo | Resultado da Requisição. | Number (2) | Tabela: Lista códigos de retorno |
| indicadorMensagensNovas | Indicador de mensagens novas. | Number (1) | 0 – Contribuinte não possui mensagens novas. 1 – Contribuinte possui uma mensagem nova. 2 – Contribuinte possui mensagens novas. |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [lista de mensagens por contribuintes](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/exemplos/retorno_obter_indicador_de_novas_mensagens/)
