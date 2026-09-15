---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_gerar_dasprocesso/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "cb81b329b4c981ea71e8d8f47d5cd5dd56fd83954de950e1b4a0504d74fcda39"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_gerar_dasprocesso/).

# Exemplo de Json de retorno

Exemplo de uma emissão de DAS de Processo (Documento de Arrecadação do Simples Nacional).

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
"idServico": "GERARDASPROCESSO18",
"versaoSistema": "1.0",
"dados": "{ \"numeroProcesso\": \"00000000000000000\" }"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PGDASD]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_183696>\",\"cnpjCompleto\":\"00000000000000\",\"detalhamentoDas\":{\"periodoApuracao\":\"202201\",\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"20220530\",\"dataLimiteAcolhimento\":\"20240305\",\"valores\":{\"principal\":24.80,\"multa\":4.96,\"juros\":5.59,\"total\":35.35},\"observacao1\":\"Nrº Processo: 00000.000.000/0000-00\",\"observacao2\":null,\"observacao3\":null,\"composicao\":[{\"periodoApuracao\":\"202201\",\"codigo\":\"1004\",\"denominacao\":\"01/2022\",\"valores\":{\"principal\":20.38,\"multa\":4.08,\"juros\":4.60,\"total\":29.06}},{\"periodoApuracao\":\"202201\",\"codigo\":\"1005\",\"denominacao\":\"01/2022\",\"valores\":{\"principal\":4.42,\"multa\":0.88,\"juros\":0.99,\"total\":6.29}}]}}"
}
```
