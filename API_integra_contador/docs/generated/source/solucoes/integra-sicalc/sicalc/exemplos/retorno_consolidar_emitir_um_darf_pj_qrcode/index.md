---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_consolidar_emitir_um_darf_pj_qrcode/"
sourceUpdatedAt: "24 de junho de 2026 13:59:00 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "8237ba03b2ebe547ee27eefbcf17b972e36289f06fc3ab22f21e2034c818d7d4"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_consolidar_emitir_um_darf_pj_qrcode/).

# Exemplo de JSON de retorno

Exemplo de consolidação com a emissão de DARF de pessoa jurídica com código de barras e QR code.

## JSON de retorno completo

```text
{
"contratante": {
"numero": "99999999999999",
"tipo": 2
},
"autorPedidoDados": {
"numero": "99999999999999",
"tipo": 2
},
"contribuinte": {
"numero": "99999999999999",
"tipo": 2
},
"pedidoDados": {
"idSistema": "SICALC",
"idServico": "CONSOLIDARGERARDARF51",
"versaoSistema": "2.9",
"dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\": \"1162\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"ME\", \"dataPA\": \"01/2022\", \"vencimento\": \"2022-02-18T00:00:00\", \"valorImposto\": \"1000.00\", \"dataConsolidacao\": \"2022-08-08T00:00:00\", \"observacao\": \"Darf calculado\"}"
},
"status": 200,
"dados": "{\"consolidado\": {\"valorPrincipalMoedaCorrente\":1000.00,\"valorTotalConsolidado\":1258.40,\"valorMultaMora\":200.00,\"percentualMultaMora\":20.00,\"valorJuros\":58.40,\"percentualJuros\":5.84,\"termoInicialJuros\":\"2022-03-01T00:00:00\",\"dataArrecadacaoConsolidacao\":\"2022-08-08T00:00:00\",\"dataValidadeCalculo\":\"2022-08-31T00:00:00\"}, \"darf\": \"<dados do Darf no formato base64>","numeroDocumento\":\"9999999999999999\"}"
}
```
