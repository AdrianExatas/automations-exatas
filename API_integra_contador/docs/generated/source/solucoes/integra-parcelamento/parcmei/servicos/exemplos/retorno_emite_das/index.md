---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/servicos/exemplos/retorno_emite_das/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "b7e419203a1276fbab8005437409edd324410ae4003d4c0e56d45fb2724814cd"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei/servicos/exemplos/retorno_emite_das/).

# Exemplo de Json de retorno

Emissão de DAS para a modalidade PARCMEI

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
"idSistema": "PARCMEI",
"idServico": "GERARDAS201",
"versaoSistema": "1.0",
"dados": "{ \"parcelaParaEmitir\": 202107 }"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PARCMEI]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados":{\"docArrecadacaoPdfB64\":\"<BASE64_REMOVIDO_TAMANHO_177681>\"}"
}
```
