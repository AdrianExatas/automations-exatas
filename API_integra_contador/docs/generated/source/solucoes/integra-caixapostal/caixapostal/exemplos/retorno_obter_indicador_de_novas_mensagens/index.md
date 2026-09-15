---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/exemplos/retorno_obter_indicador_de_novas_mensagens/"
sourceUpdatedAt: "10 de abril de 2026 14:58:42 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "cab76cb4f3a6a1d74ffbbd139a457181924cf77ea8fba64a61657abf48f27375"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/exemplos/retorno_obter_indicador_de_novas_mensagens/).

# Exemplo de Json de retorno

Indicador de novas mensagens

## Json de retorno completo

```text
{
"contratante": {
"numero": "99999999999",
"tipo": 1
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
"idSistema": "CAIXAPOSTAL",
"idServico": "INNOVAMSG63",
"versaoSistema": "1.0",
"dados": ""
},
"status": 200,
"dados": "{\"codigo\":\"00\",\"conteudo\":[{\"indicadorMensagensNovas\":\"2\"}]}",
"mensagens": [
{
"codigo": "00",
"texto": "Operação realizada com sucesso."
}
]
}
```

## Json do campo "dados"

Nesse exemplo o json está formatado e sem o scaped string. O exemplo completo é demonstrado acima.

```text
{
"codigo": "00",
"conteudo": [{
"indicadorMensagensNovas": "2"
}]
}
```
