---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sitfis/sitfis/exemplos/retorno_emitir_relatorio/"
sourceUpdatedAt: "10 de abril de 2026 14:58:42 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "28b0a804690ffb07add2d950ef4687cd43c787accd45a35f97497896308908f9"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sitfis/sitfis/exemplos/retorno_emitir_relatorio/).

# Exemplo de Json de retorno

Exemplo de uma emissão de relatório de Situação Fiscal.

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
"numero": "99999999999",
"tipo": 1
},
"pedidoDados": {
"idSistema": "SITFIS",
"idServico": "RELATORIOSITFIS92",
"versaoSistema": "2.0",
"dados": "{ \"protocoloRelatorio\"+S7N6c04XNZUVzmxWT7SzpkZA4xeDQC9Z2T2GBJ5usn8LyouyWXbsy6mKsEImRkDjF4NAL25KiSXOLjnzAaZu/FC+G1pYOtTMYqokKYYr/yZ6aqUiCuWPfujDQ2/u+Dyh56GSe28B5Ev25jDnzpvVJPhiebO5hpy1YESP5gnEhaP3bocCiZZrYG26F8avRRBJhRTsfv3+bxvYJZsVym270eO8oZTDIr3OJj==\" }"
},
"status": 200,
"dados": "[{\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_107008>\"}]",
"mensagens":
[
{
"codigo": "[Sucesso-Sitfis-SC01]",
"texto": "A requisição foi efetuada com sucesso."
}
]
}
```
