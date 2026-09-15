---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sitfis/sitfis/servicos/emitir_relatorio/"
sourceUpdatedAt: "1 de setembro de 2026 14:07:36 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "6a92811e6abe0d38375d482b5273d89fe11156f2d1cd87faef8c8194a1d58669"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sitfis/sitfis/servicos/emitir_relatorio/).

# Emitir Relatório de Situação Fiscal

Essa funcionalidade permite emitir o relatório de situação fiscal.

Identificação no Pedido de Dados

idSistema: SITFIS idServico: RELATORIOSITFIS92 versaoSistema: "2.0"

**Dados de Entrada**

Objeto Dados:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| protocoloRelatorio | Protocolo retornado no serviço apoiar , que deve ser utilizado para recuperar o relatório de situação fiscal. | Texto | SIM |

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
"numero": "99999999999",
"tipo": 1
},
"pedidoDados": {
"idSistema": "SITFIS",
"idServico": "RELATORIOSITFIS92",
"versaoSistema": "2.0",
"dados": "{ \"protocoloRelatorio\":\"+S7N6c04XNZUVzmxWT7SzpkZA4xeDQC9Z2T2GBJ5usn8LyouyWXbsy6mKsEImRkDjF4NAL25KiSXOLjnzAaZu/FC+G1pYOtTMYqokKYYr/yZ6aqUiCuWPfujDQ2/u+Dyh56GSe28B5Ev25jDnzpvVJPhiebO5hpy1YESP5gnEhaP3bocCiZZrYG26F8avRRBJhRTsfop+bxvYJZsVym270eO8oZTDIr3OJj==\" }"
}
}
```

Para testar com mais exemplos, substitua o campo contribuinte.numero e contribuinte.tipo por um dos seguintes valores:

| Tipo de Contribuinte | Número de Identificação do Contribuinte |
| --- | --- |
| 1 | 99999999999 |
| 2 | E0000161000121 |
| 2 | A0000177000110 |
| 2 | U0000169000166 |

**Dados de Saída**

São retornados os dados do DAS emitido.

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Número(3) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. | Lista de Texto |
| dados | Estrutura de dados de retorno. | Texto (SCAPED Texto JSON) |

No atributo dados, será retornado com os seguintes campos:

| Campo | Descrição | Tipo |
| --- | --- | --- |
| pdf | Documento PDF do relatório de situação fiscal. Este campo é retornado quando o status é 200. | Texto (base64) |
| tempoEspera | Tempo de espera estimado para acionar o serviço para obter o relatório. Este campo é retornado quando o status é 202. | Inteiro |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno emitir relatório](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sitfis/sitfis/exemplos/retorno_emitir_relatorio/)
