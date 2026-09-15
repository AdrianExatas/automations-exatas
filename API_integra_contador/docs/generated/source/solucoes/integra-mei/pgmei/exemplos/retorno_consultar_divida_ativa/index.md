---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/exemplos/retorno_consultar_divida_ativa/"
sourceUpdatedAt: "25 de junho de 2026 20:49:14 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "11c5554da8e98c2858757321a7c8ffc00e72e18c3f5ce093959f3da1d00a9d46"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/exemplos/retorno_consultar_divida_ativa/).

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
"idServico": "DIVIDAATIVA24",
"versaoSistema": "1.0",
"dados": "{ \"anoCalendario\": \"2019\" }"
},
"status": 200,
"mensagens": [
{
"codigo": "Sucesso-PGMEI",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "[{\"periodoApuracao\":\"201901\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201902\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201903\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201904\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201905\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201906\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201907\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201908\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201909\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201910\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201911\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"},{\"periodoApuracao\":\"201912\",\"tributo\":\"INSS\",\"valor\":49.90,\"enteFederado\":\"Uniao\",\"situacaoDebito\":\"ENVIADO A  PFN\"}]"
}
```
