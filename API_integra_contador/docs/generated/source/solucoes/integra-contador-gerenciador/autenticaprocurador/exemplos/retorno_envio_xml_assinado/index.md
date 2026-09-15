---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/autenticaprocurador/exemplos/retorno_envio_xml_assinado/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "291a7133882676df5378057e0ec3ac3df49496a917f48b7750100dda572c4094"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/autenticaprocurador/exemplos/retorno_envio_xml_assinado/).

# Exemplo de Json de retorno

Retorna o token de autorização de acesso por parte do Autor Pedido de Dados.

## Json de retorno completo

```text
{
"contratante": {
"numero": "99999999999999",
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
"idSistema": "AUTENTICAPROCURADOR",
"idServico": "ENVIOXMLASSINADO81",
"versaoSistema": "1.0",
"dados": "{\"xml\": \"<BASE64_REMOVIDO_TAMANHO_3259>\"}"
},
"status": 200,
"dados":{\"autenticar_procurador_token\":\"b06feea3-1ca8-49f4-bdb4-211ab006cb92\\"data_hora_expiracao\":\"2022-08-12T00:00:01\"}",
"mensagens": [
{
"codigo": "200",
"texto": "Sucesso na execução."
}
]
}
```

## Json do campo "dados"

Nesse exemplo o json está formatado e sem o scaped string. O exemplo completo é demonstrado acima.

```text
{
"autenticar_procurador_token": "b06feea3-1ca8-49f4-bdb4-211ab006cb92",
"data_hora_expiracao": "2022-08-12T00:00:01"
}
```
