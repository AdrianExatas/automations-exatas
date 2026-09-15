---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpsn/servicos/exemplos/retorno_consulta_parcelas_impressao/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "9d30c7f6755e690a82d0a9a1818c23133b8dd49ca0926402071cd6759c4febab"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/relpsn/servicos/exemplos/retorno_consulta_parcelas_impressao/).

# Exemplo de Json de retorno

Consultar parcelas disponíveis para impressão do DAS na modalidade RELPSN

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
"idServico": "PARCELASPARAGERAR192",
"versaoSistema": "1.0",
"dados": ""
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-RELPSN]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"listaParcelas\":[{\"parcela\":\"202308\",\"valor\":788.26{\"parcela\":\"202309\",\"valor\":788.26},{\"parcela\":\"202310\\"valor\":788.26}]}"
}
```
