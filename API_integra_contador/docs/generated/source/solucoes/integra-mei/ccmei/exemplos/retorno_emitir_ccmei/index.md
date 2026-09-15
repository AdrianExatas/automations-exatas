---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/exemplos/retorno_emitir_ccmei/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "b4535be03d18fdfc389cdaaf1b6611e97f80c1e261b085e7f02f5b6545b112c4"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/exemplos/retorno_emitir_ccmei/).

# Exemplo de Json de retorno

Exemplo da emissão de um CCMEI (Certificado da Condição do Microempreendedor Individual).

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
"dados": "",
"idServico": "EMITIRCCMEI121",
"idSistema": "CCMEI"
},
"mensagens": [
{
"codigo": "[Sucesso-CCMEI-SUC-00010]",
"texto": "Requisição efetuada com sucesso."
}
],
"status": 200,
"dados": "[{\"cnpj\":\"00000000000000\"\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_74136>\"}]"
}
```
