---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei_esp/servicos/exemplos/retorno_consulta_parcelas_impressao/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "4eb898f61b752715eff5fe05211e2d53a7600fb7308d2bd6cc4cce3800118da9"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcmei_esp/servicos/exemplos/retorno_consulta_parcelas_impressao/).

# Exemplo de Json de retorno

Consultar parcelas disponíveis para impressão do DAS na modalidade PARCMEI ESPECIAL

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
"idSistema": "PARCMEI-ESP",
"idServico": "PARCELASPARAGERAR212",
"versaoSistema": "1.0",
"dados": ""
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PARCMEI-ESP]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"listaParcelas\":[{\"parcela\":202203,\"valor\":71.71{\"parcela\":202204,\"valor\":71.71},{\"parcela\":202205,\"valor\":71.71{\"parcela\":202206,\"valor\":71.71},{\"parcela\":202207,\"valor\":71.71{\"parcela\":202208,\"valor\":71.71},{\"parcela\":202209,\"valor\":71.71{\"parcela\":202210,\"valor\":71.71},{\"parcela\":202211,\"valor\":71.71{\"parcela\":202212,\"valor\":71.71},{\"parcela\":202301,\"valor\":16.14}]}"
}
```
