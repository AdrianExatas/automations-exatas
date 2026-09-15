---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpsn/servicos/exemplos/retorno_emite_das/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "ac4bcac179efda239c52eb65e84e87266a0641046b5a68c45e6b0a4786ca1ae7"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpsn/servicos/exemplos/retorno_emite_das/).

# Exemplo de Json de retorno

Emissão de DAS para a modalidade RELPSN

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
"idSistema": "RELPSN",
"idServico": "GERARDAS191",
"versaoSistema": "1.0",
"dados": "{ \"parcelaParaEmitir\": 202308 }"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-RELPSN]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"docArrecadacaoPdfB64\":\"<BASE64_REMOVIDO_TAMANHO_184088>\"}"
}
```
