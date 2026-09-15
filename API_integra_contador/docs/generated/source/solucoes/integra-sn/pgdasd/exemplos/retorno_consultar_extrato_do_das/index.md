---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_consultar_extrato_do_das/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "2a88a3cc3e93e8378d8f4d5e13dbf6b28103567e233d8bf742af2f0510bfc28a"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_consultar_extrato_do_das/).

# Exemplo de Json de retorno

Consultar o extrato da apuração do DAS.

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
"idServico": "CONSEXTRATO16",
"versaoSistema": "1.0",
"dados": "{ \"numeroDas\": \"07202136999997159\" }"
},
"status": 200,
"dados": "{\"numeroDas\":\"07202136999997159\",\"extrato\":{\"nomeArquivo\":\"PGDASD-EXTRATO-07202136999997159.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_273348>\"}}",
"mensagens": [
{
"codigo": "Sucesso-PGDASD",
"texto": "Requisição efetuada com sucesso."
}
]
}
```

## Json do campo "dados"

Nesse exemplo o json está formatado e sem o scaped string. O exemplo completo é demonstrado acima.

```text
{
"numeroDas": "07202136999997159",
"extrato": {
"nomeArquivo": "PGDASD-EXTRATO-07202136999997159.pdf",
"pdf": "<BASE64_REMOVIDO_TAMANHO_273348>"
}
}
```
