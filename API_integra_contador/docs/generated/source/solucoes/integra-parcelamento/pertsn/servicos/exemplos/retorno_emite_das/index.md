---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertsn/servicos/exemplos/retorno_emite_das/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "e1aefd4556b1ff2c61985b2756436c2910eb121f452b3992d266e2d843e8c441"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertsn/servicos/exemplos/retorno_emite_das/).

# Exemplo de Json de retorno

Emissão de DAS para a modalidade PERTSN

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
"idSistema": "PERTSN",
"idServico": "GERARDAS181",
"versaoSistema": "1.0",
"dados": "{ \"parcelaParaEmitir\": 202301 }"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PERTSN]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"docArrecadacaoPdfB64\":\"<BASE64_REMOVIDO_TAMANHO_183616>\"}"
}
```
