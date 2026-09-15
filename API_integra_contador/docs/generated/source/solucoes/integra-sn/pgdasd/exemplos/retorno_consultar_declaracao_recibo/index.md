---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_consultar_declaracao_recibo/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "3531962dcb24e89c1c2d2a8a59f56a0a9da5f06742a425c0d9c31d7c82ef8623"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_consultar_declaracao_recibo/).

# Exemplo de Json de retorno

Consulta declaração e recibo com os arquivos pdf codificados em base64.

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
"idServico": "CONSDECREC15",
"versaoSistema": "1.0",
"dados": "{ \"numeroDeclaracao\": \"00000000201801001\" }"
},
"status": 200,
"mensagens": [
{
"codigo": "Sucesso-PGDASD",
"texto": "Requisição efetuada com sucesso."
}
]
"dados": "{\"numeroDeclaracao\": \"00000000201801001\", \"recibo\": {\"nomeArquivo\": \"PGDASD-RECIBO-00000000201801001.pdf\", \"pdf\": \"<BASE64_REMOVIDO_TAMANHO_423040>\"},\"declaracao\": {\"nomeArquivo\": \"PGDASD-DECLARACAO-00000000201801001.pdf\", \"pdf\": \"<BASE64_REMOVIDO_TAMANHO_494476>\" },\"maed\": {\"nomeArquivoNotificacao\": \"PGDASD-NOTIFICACAO-MAED-00000000201801001.pdf\", \"pdfNotificacao\": \"<BASE64_REMOVIDO_TAMANHO_250936>\", \"nomeArquivoDarf\": \"PGDASD-DARF-MAED-00000000201801001.pdf\", \"pdfDarf\": \"<BASE64_REMOVIDO_TAMANHO_282328>\"}}"
}
```

## Json do campo "dados"

Nesse exemplo o json está formatado e sem o scaped string. O exemplo completo é demonstrado acima.

```text
{
"numeroDeclaracao": "00000000201801001",
"recibo": {
"nomeArquivo": "PGDASD-RECIBO-00000000201801001.pdf",
"pdf": "<BASE64_REMOVIDO_TAMANHO_423040>"
},
"declaracao": {
"nomeArquivo": "PGDASD-DECLARACAO-00000000201801001.pdf",
"pdf": "<BASE64_REMOVIDO_TAMANHO_494476>"
},
"maed": {
"nomeArquivoNotificacao": "PGDASD-NOTIFICACAO-MAED-00000000201801001.pdf",
"pdfNotificacao": "<BASE64_REMOVIDO_TAMANHO_250936>",
"nomeArquivoDarf": "PGDASD-DARF-MAED-00000000201801001.pdf",
"pdfDarf": "<BASE64_REMOVIDO_TAMANHO_282328>"
}
}
```
