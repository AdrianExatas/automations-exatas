---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/exemplos/retorno_atualizar_beneficio/"
sourceUpdatedAt: "25 de junho de 2026 20:41:22 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "4924927e9857c87230eeb0b593c96431d4192a74f142599da09017439b6e2abb"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/exemplos/retorno_atualizar_beneficio/).

# Exemplo de Json de retorno

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
"idSistema": "PGMEI",
"idServico": "ATUBENEFICIO23",
"versaoSistema": "1.0",
"dados": "{\"anoCalendario\":2026,\"infoBeneficio\":[{\"periodoApuracao\":\"202601\",\"indicadorBeneficio\":true},{\"periodoApuracao\":\"202602\",\"indicadorBeneficio\":true}]}"
},
"status": 200,
"mensagens": [
{
"codigo": "Sucesso-PGMEI",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "[{\"paOriginal\":\"202601\",\"indicadorBeneficio\":true,\"paAgrupado\":\"202602\"},{\"paOriginal\":\"202602\",\"indicadorBeneficio\":true,\"paAgrupado\":\"202601\"}]"
}
```
