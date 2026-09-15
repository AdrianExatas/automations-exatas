---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/servicos/exemplos/retorno_emite_das/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "e6f294cd0f8d17381dbca5886c23fa37e1110141be39a22c92ce58cd8242b68e"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/pertmei/servicos/exemplos/retorno_emite_das/).

# Exemplo de Json de retorno

Emissão de DAS para a modalidade PERTMEI

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
"idSistema": "PERTMEI",
"idServico": "GERARDAS221",
"versaoSistema": "1.0",
"dados": "{ \"parcelaParaEmitir\": 202306 }"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PERTMEI]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"docArrecadacaoPdfB64\":\"<BASE64_REMOVIDO_TAMANHO_182028>\"}"
}
```
