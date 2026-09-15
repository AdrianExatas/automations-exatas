---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_solicitar_renuncia/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "34343979dad57bd6a025e2f571e2a118a6db19b4093c2aa2687f541a44c42448"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_solicitar_renuncia/).

# Exemplo de Json de retorno

Exemplo de retorno da solicitação de renúncia de vínculo.

## Json de retorno completo

```text
{
"contratante": {
"numero": "00000000000100",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000100",
"tipo": 2,
"cpfResponsavel": "00000000011"
},
"contribuinte": {
"numero": "00000000011",
"tipo": 1
},
"pedidoDados": {
"idSistema": "PNRCONTADOR",
"idServico": "SOLICRENUNCIA262",
"versaoSistema": "1.0",
"dados": "{ \"solicitacaoRenunciaContador\": { \"cnpj\": \"99999999999999\", \"cpfContador\": \"00000000011\", \"cnpjEmpresaContabil\": \"00000000000100\", \"cpfPreenchedor\": \"00000000011\" }, \"cienciaDeclaracoes\": true }"
},
"status": 200,
"mensagens": [
{
"codigo": "[Sucesso-PNRCONTADOR]",
"texto": "Requisição efetuada com sucesso."
},
{
"codigo": "[Aviso-PNRCONTADOR-304]",
"texto": "Utilize o serviço 'Situação Solicitar Renúncia' para consultar a situação da solicitação. É recomendado um intervalo de pelo menos 30 segundos entre essas requisições, para garantir que a renúncia já tenha sido processada."
}
],
"dados": "{\"idSolicitacao\": \"PNRCONTADOR-20250212-af81730aeb29c9fdac15\"}"
}
```
