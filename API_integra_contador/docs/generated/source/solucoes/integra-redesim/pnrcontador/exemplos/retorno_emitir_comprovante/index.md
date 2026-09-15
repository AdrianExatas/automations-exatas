---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_emitir_comprovante/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "97eae0911718a1bc88c447813102f25be1de0b82759bc973768a052f4d300a59"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_emitir_comprovante/).

# Exemplo de Json de retorno

Exemplo do retorno da emissão de comprovante de renúncia.

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
"idServico": "COMPRENUNCIA264",
"versaoSistema": "1.0",
"dados": "{ \"idRenuncia\": 2558 }"
}
"status": 200,
"mensagens": [
{
"codigo": "Sucesso-PNRCONTADOR",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "<BASE64_REMOVIDO_TAMANHO_25080>"
}
```
