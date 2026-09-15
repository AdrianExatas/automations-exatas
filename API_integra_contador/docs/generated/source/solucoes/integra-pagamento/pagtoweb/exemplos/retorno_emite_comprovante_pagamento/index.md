---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/exemplos/retorno_emite_comprovante_pagamento/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "19648b62acd09bd48b3852fa280d1e8cfd80986455c5022db201f1e5a012fe18"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/exemplos/retorno_emite_comprovante_pagamento/).

# Exemplos

## Emissão de comprovante de arrecadação.

Cenário: Emitir o PDF (base64) do Comprovante de Pagamento.

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
"numero": "99999999999",
"tipo": 1
},
"pedidoDados": {
"idSistema": "PAGTOWEB",
"idServico": "COMPARRECADACAO72",
"versaoSistema": "1.0",
"dados": "{\"numeroDocumento\": \"99999999999999999\"}"
},
"status": 200,
"dados": {\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_102889>\"}",
"mensagens": [
{
"codigo": "Sucesso-PAGTOWEB-00000",
"texto": "Requisição efetuada com sucesso."
}
]
}
```

### Json do campo "dados"

Nesse exemplo o json está formatado e sem o scaped string. O exemplo completo é demonstrado acima.

```text
{
"pdf":"<BASE64_REMOVIDO_TAMANHO_102868>"
}
```

## Emissão de comprovante de arrecadação de um pagamento de DAS do MEI.

Cenário: Emitir o PDF (base64) do Comprovante de Pagamento.

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
"numero": "11111111111111",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PAGTOWEB",
"idServico": "COMPARRECADACAO72",
"versaoSistema": "1.0",
"dados": "{\"numeroDocumento\": \"07082216654265000\"}"
},
"status": 200,
"responseId": "70c8b0eb-87c7-4263-9079-e58f1e88eb1e",
"responseDateTime": "2026-03-13T11:36:22.811Z",
"dados": {\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_81471>\"}",
"mensagens": [
{
"codigo": "Sucesso-PAGTOWEB-00000",
"texto": "Requisição efetuada com sucesso."
}
]
}
```

### Json do campo "dados"

Nesse exemplo o json está formatado e sem o scaped string. O exemplo completo é demonstrado acima.

```text
{
"pdf":"<BASE64_REMOVIDO_TAMANHO_81458>"
}
```
