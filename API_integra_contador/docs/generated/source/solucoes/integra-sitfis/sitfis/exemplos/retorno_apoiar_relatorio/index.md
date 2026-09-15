---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sitfis/sitfis/exemplos/retorno_apoiar_relatorio/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "c9768f87bf4b3bdd751eeac90878d49ee093bf44c35a0230a80abc0d01344e58"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sitfis/sitfis/exemplos/retorno_apoiar_relatorio/).

# Exemplo de Json de retorno

Solicitar o relatório de situação fiscal.

## Json de retorno completo

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
"idSistema": "SITFIS",
"idServico": "SOLICITARPROTOCOLO91",
"versaoSistema": "2.0",
"dados": ""
},
"status": 200,
"dados": "{\"protocoloRelatorio\":+S7N6c04XNZUVzmxWT7SzpkZA4xeDQC9Z2T2GBJ5usn8LyouyWXbsy6mKsLyEImRkDjF4NAL25KiSXOLjnzAaZu/FC+G1pYOtTMYqokKYYr/yZ6aqUiCuWPfujDQ2/udw+Dyh56GSe28B5Ev25jDnzpvVJPhiebO5hpy1YESP5gnEhaP3bocCiZZrYG26F8avRRBJhRTsfv3op+bxvYJZsVym270eO8oZTDIr3OJj==\", \"tempoEspera\":30}",
"mensagens":
[{
"codigo": "[Sucesso-Sitfis-SC01]",
"texto": "A requisição foi efetuada com sucesso"
}]
}
```
