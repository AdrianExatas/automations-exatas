---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_gerar_dasavulso/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "497d8d9faf9ac7267cfcaa0d3fdfb243e0a9285590cdc6acdafbb88b85434160"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_gerar_dasavulso/).

# Exemplo de Json de retorno

Exemplo de uma emissão de DAS Avulso (Documento de Arrecadação do Simples Nacional).

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
"idSistema": "PGDASD",
"idServico": "GERARDASAVULSO19",
"versaoSistema": "1.0",
"dados": "{\"PeriodoApuracao\":202401,\"ListaTributos\[{\"Codigo\":101\"Valor\":111.22,\"CodMunicipio\":0375,\"uf\":\"PA\"{\"Codigo\":100\"Valor\":20.50,\"uf\":\"RJ\"},{\"Codigo\":1001,\"Valor\":100}]}"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PGDASD]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_182788>\",\"cnpjCompleto\":\"00000333000110\",\"detalhamentoDas\":{\"periodoApuracao\":\"202401\",\"numeroDocumento\":\"07202408201918950\",\"dataVencimento\":\"20240220\",\"dataLimiteAcolhimento\":\"20240322\",\"valores\":{\"principal\":231.72,\"multa\":23.69,\"juros\":2.31,\"total\":257.72},\"observacao1\":null,\"observacao2\":\"\",\"observacao3\":null,\"composicao\":[{\"periodoApuracao\":\"202401\",\"codigo\":\"1001\",\"denominacao\":\"01/2024\",\"valores\":{\"principal\":100.0,\"multa\":10.23,\"juros\":1.0,\"total\":111.23}},{\"periodoApuracao\":\"202401\",\"codigo\":\"1007\",\"denominacao\":\"RJ - 01/2024\",\"valores\":{\"principal\":20.50,\"multa\":2.09,\"juros\":0.2,\"total\":22.79}},{\"periodoApuracao\":\"202401\",\"codigo\":\"1010\",\"denominacao\":\"ABEL FIGUEIREDO (PA) - 01/2024\",\"valores\":{\"principal\":111.22,\"multa\":11.37,\"juros\":1.11,\"total\":123.70}}]}}"
}
```
