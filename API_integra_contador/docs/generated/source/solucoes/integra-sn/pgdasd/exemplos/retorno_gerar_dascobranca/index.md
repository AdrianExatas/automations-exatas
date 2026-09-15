---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_gerar_dascobranca/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "399bc47b66c7ea39a2526a0141014722c710edb9977ad9aef939b49d01a5eff9"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_gerar_dascobranca/).

# Exemplo de Json de retorno

Exemplo de uma emissão de DAS (Documento de Arrecadação do Simples Nacional).

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
"idServico": "GERARDASCOBRANCA17",
"versaoSistema": "1.0",
"dados": "{ \"periodoApuracao\": \"202301\" }"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PGDASD]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_217248>\",\"cnpjCompleto\":\"00000000000000\",\"detalhamentoDas\":{\"periodoApuracao\":\"202301\",\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"20230222\",\"dataLimiteAcolhimento\":\"20240228\",\"valores\":{\"principal\":1548.20,\"multa\":309.64,\"juros\":189.50,\"total\":2047.34},\"observacao1\":null,\"observacao2\":null,\"observacao3\":null,\"composicao\":[{\"periodoApuracao\":\"202301\",\"codigo\":\"1001\",\"denominacao\":\"01/2023\",\"valores\":{\"principal\":88.0,\"multa\":17.59,\"juros\":10.77,\"total\":116.36}},{\"periodoApuracao\":\"202301\",\"codigo\":\"1004\",\"denominacao\":\"01/2023\",\"valores\":{\"principal\":203.84,\"multa\":40.76,\"juros\":24.95,\"total\":269.55}},{\"periodoApuracao\":\"202301\",\"codigo\":\"1002\",\"denominacao\":\"01/2023\",\"valores\":{\"principal\":4.20,\"multa\":0.84,\"juros\":0.51,\"total\":5.55}},{\"periodoApuracao\":\"202301\",\"codigo\":\"1006\",\"denominacao\":\"01/2023\",\"valores\":{\"principal\":664.0,\"multa\":132.83,\"juros\":81.29,\"total\":878.12}},{\"periodoApuracao\":\"202301\",\"codigo\":\"1007\",\"denominacao\":\"SP - 01/2023\",\"valores\":{\"principal\":544.0,\"multa\":108.79,\"juros\":66.58,\"total\":719.37}},{\"periodoApuracao\":\"202301\",\"codigo\":\"1005\",\"denominacao\":\"01/2023\",\"valores\":{\"principal\":44.16,\"multa\":8.83,\"juros\":5.4,\"total\":58.39}}]}}"
}
```
