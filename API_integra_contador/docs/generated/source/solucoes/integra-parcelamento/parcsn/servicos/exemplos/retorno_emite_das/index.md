---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn/servicos/exemplos/retorno_emite_das/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "a61e56ba1df196cc0b0d5f99789914c426a329505e5554554b45d0f43794c481"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn/servicos/exemplos/retorno_emite_das/).

# Exemplo de Json de retorno

Emissão de DAS para a modalidade PARCSN ORDINÁRIO

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
"idSistema": "PARCSN",
"idServico": "GERARDAS161",
"versaoSistema": "1.0",
"dados": "{ \"parcelaParaEmitir\": 202306 }"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PARCSN]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"docArrecadacaoPdfB64\":\"<BASE64_REMOVIDO_TAMANHO_216776>\"}"
}
```
