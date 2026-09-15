---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_consolidado_alfa/"
sourceUpdatedAt: "24 de junho de 2026 13:59:00 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "475183b32542dc0cdedaa5a0aff121554c31c3ed3fe7985f5e2e6f050c7a2724"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_consolidado_alfa/).

# Exemplo de JSON de retorno

Exemplo de uma consolidação sem emissão de Darf, apenas com cálculo dos acréscimos legais, usando o novo CNPJ alfanumérico.

## JSON de retorno completo

```text
{
"contratante": {
"numero": "99999999999999",
"tipo": 2
},
"autorPedidoDados": {
"numero": "99999999999",
"tipo": 1
},
"contribuinte": {
"numero": "YV9IAOAXNTRV65",
"tipo": 2
},
"pedidoDados": {
"idSistema": "SICALC",
"idServico": "CONSOLIDAR54",
"versaoSistema": "2.9",
"dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\": \"1162\", \"codigoReceitaExtensao\": \"1\", \"dataPA\": \"01/2021\", \"valorImposto\": \"1000.00\", \"cnpjPrestador\": \"QZRC7JM7205500\", \"dataConsolidacao\": \"2026-06-22T00:00:00\"}"
},
"status": 200,
"dados": "{\"consolidado\": {\"dataArrecadacaoConsolidacao\":\"2026-06-22T00:00:00\",\"dataValidadeCalculo\":\"2026-06-30T00:00:00\",\"percentualJuros\":\"58.49\",\"percentualMultaMora\":\"20.00\",\"termoInicialJuros\":\"2021-03-01T00:00:00\",\"valorJuros\":\"584.90\",\"valorMultaMora\":\"200.00\",\"valorPrincipalMoedaCorrente\":\"1000.00\",\"valorTotalConsolidado\":\"1784.90\"}}",
"mensagens":[{"codigo":"[Sucesso-SICALC]","texto":"Requisição efetuada com sucesso."}]
}
```

## JSON do campo "dados"

Nesse exemplo o JSON está formatado e sem os caracteres de escape. O exemplo completo é demonstrado acima.

```text
{
"dados": {
"consolidado": {
"valorPrincipalMoedaCorrente": 1000.00,
"valorTotalConsolidado": 1784.90,
"valorMultaMora": 200.00,
"percentualMultaMora": 20.00,
"valorJuros": 584.90,
"percentualJuros": 58.49,
"termoInicialJuros":"2021-03-01T00:00:00",
"dataArrecadacaoConsolidacao": "2026-06-22T00:00:00",
"dataValidadeCalculo": "2026-06-30T00:00:00"
}
}
}
```
