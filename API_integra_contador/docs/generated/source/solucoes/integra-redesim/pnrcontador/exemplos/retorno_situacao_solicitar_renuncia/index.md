---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_situacao_solicitar_renuncia/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "8ffcb9ef8e16fce736c37befc9934e20e6ed6017924ed6a4545373a22ac6b5f5"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_situacao_solicitar_renuncia/).

# Exemplo de Json de retorno

Exemplo de retorno da consulta de situação da solicitação de renúncia de vínculo.

## Json de retorno completo

```text
{
"contratante": {
"numero": "00000000000100",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000100",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000100",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PNRCONTADOR",
"idServico": "SITSOLICRENUNCIA265",
"versaoSistema": "1.0",
"dados": "{ \"idSolicitacao\"\"PNRCONTADOR-20250212-af81730aeb29c9fdac15\" }"
},
"status": 200,
"mensagens": [
{
"codigo": "Sucesso-PNRCONTADOR",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"resultado\":true,\"mensagemRetorno\":\"Sua renúncia à empres99999999999999 foi efetuada com sucesso!\",\"renuncia\":{\"id\":123\"cnpjRenunciada\":\"99999999999999\",\"dataRenuncia\":\"1740682249338\\"cnpjSolicitante\":null,\"cnpjRenunciante\":nul\"cpfSolicitante\":\"00000000011\",\"cpfRenunciante\":\"00000000011\\"cpfLogado\":\"00000000011\"}}"
}
```
