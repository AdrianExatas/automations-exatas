---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_consultar_renuncias/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "2fb971fa7663647eb56bd6986d08e8e9cbc07e65f5a14d4ba296261badd543c7"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_consultar_renuncias/).

# Exemplo de Json de retorno

Exemplo de retorno da consulta de renúncias de vínculo.

## Json de retorno completo

```text
{
"contratante": {
"numero": "00000000000101",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000101",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000101",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PNRCONTADOR",
"idServico": "CONSRENUNCIA263",
"versaoSistema": "1.0",
"dados": "{\"page\": 0, \"pageSize\": 10, \"dtInicio\":\"2000-01-30\"\"dtFim\":\"2000-01-30\"}"
},
"status": 200,
"mensagens": [
{
"codigo": "Sucesso-PNRCONTADOR",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"content\":[{\"id\":1234,\"cnpjRenunciada\":\"99999999999999\",\"dataRenuncia\":\"1739242800000\",\"cnpjSolicitante\":null,\"cnpjRenunciante\":null,\"cpfSolicitante\":\"00000000011\",\"cpfRenunciante\":\"00000000011\",\"cpfLogado\":\"00000000011\"}],\"pageable\":{\"pageNumber\":0,\"pageSize\":10,\"sort\":{\"sorted\":false,\"empty\":true,\"unsorted\":true},\"offset\":0,\"paged\":true,\"unpaged\":false},\"last\":false,\"totalElements\":1,\"totalPages\":1,\"size\":10,\"number\":0,\"sort\":{\"sorted\":false,\"empty\":true,\"unsorted\":true},\"numberOfElements\":1,\"first\":true,\"empty\":false}"
}
```
