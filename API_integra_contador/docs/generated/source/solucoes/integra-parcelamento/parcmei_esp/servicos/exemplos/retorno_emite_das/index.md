---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei_esp/servicos/exemplos/retorno_emite_das/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "61b8018985e20d80a87f3a04d8d99c4424d554c9c3ad1e31caa155d031f216d3"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei_esp/servicos/exemplos/retorno_emite_das/).

# Exemplo de Json de retorno

Emissão de DAS para a modalidade PARCMEI ESPECIAL

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
"idSistema": "PARCMEI-ESP",
"idServico": "GERARDAS211",
"versaoSistema": "1.0",
"dados": "{ \"parcelaParaEmitir\": 202301 }"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PARCMEI-ESP]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"docArrecadacaoPdfB64\":\"<BASE64_REMOVIDO_TAMANHO_182612>\"}"
}
```
