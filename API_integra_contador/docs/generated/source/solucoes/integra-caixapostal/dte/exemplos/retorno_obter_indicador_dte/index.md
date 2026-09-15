---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/dte/exemplos/retorno_obter_indicador_dte/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "2929b81003607a04a3ead4152cfc4c1496bf39917111d8bf95f4e24237f13a7b"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/dte/exemplos/retorno_obter_indicador_dte/).

# Exemplo de Json de retorno

Obter Indicador DTE

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
"idSistema": "DTE",
"idServico": "CONSULTASITUACAODTE111",
"versaoSistema": "1.0",
"dados": ""
},
"status": 200,
"dados": "{\"indicadorEnquadramento\":0,\"statusEnquadramento\":\"CNPJ OptaDTE\"}",
"mensagens": [
{
"codigo": "Sucesso-DTE-00",
"texto": "Requisição efetuada com sucesso."
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
"indicadorEnquadramento": 0,
"indicadorEnquadramento": "CNPJ Optante DTE"
}]
}
```
