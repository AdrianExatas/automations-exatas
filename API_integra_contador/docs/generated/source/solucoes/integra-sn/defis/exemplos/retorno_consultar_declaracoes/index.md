---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/exemplos/retorno_consultar_declaracoes/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "67d42805cb6cc532edb0df8933bd094900375efce9d542fcb9993c8267b9cf46"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/exemplos/retorno_consultar_declaracoes/).

# Exemplo de Json de retorno

```text
{
"Contratante": {
"numero": "00000000000000",
"tipo": 2
},
"AutorPedidoDados": {
"Numero": "00000000000000",
"Tipo": 2
},
"Contribuinte": {
"numero": "00000000000000",
"tipo": 2
},
"PedidoDados": {
"IdSistema": "DEFIS",
"IdServico": "CONSDECLARACAO142",
"Dados": ""
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-DEFIS]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "[{\"anoCalendario\":2019,\"idDefis\":\"000000002019001\\"tipo\":1,\"dataHora\":\"20230725102410\"},{\"anoCalendario\":201\"idDefis\":\"000000002018003\",\"tipo\":2,\"dataHora\":\"20230801145404\"{\"anoCalendario\":2018,\"idDefis\":\"000000002019002\",\"tipo\":\"dataHora\":\"20230728112244\"}]"
}
```
