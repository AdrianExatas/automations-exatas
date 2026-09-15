---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/exemplos/retorno_emitir_das_excesso/"
sourceUpdatedAt: "5 de maio de 2026 19:36:11 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "ca39e369f23eeed9713b75159eb991397a08d4b345e776b4841eece8e6a30491"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/exemplos/retorno_emitir_das_excesso/).

# Exemplo de Json de retorno

**ATENÇÃO: A FUNCIONALIDADE AINDA NÃO ESTÁ DISPONÍVEL PARA CONTRATAÇÃO E PODE SOFRER ALTERAÇÕES**

## Json de retorno completo

```text
{
"contratante": {
"numero": "11111111111111",
"tipo": 2
},
"autorPedidoDados": {
"numero": "11111111111111",
"tipo": 2
},
"contribuinte": {
"numero": "11111111111111",
"tipo": 2
},
"pedidoDados": {
"idSistema": "DASNSIMEI",
"idServico": "GERARDASEXCESSO153",
"versaoSistema": "1.0",
"dados": "{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":\"2022\"}"
},
"status": 200,
"responseId": "a0aaaa0a-0a0a-00a0-a0aa-00000aa00a00",
"responseDateTime": "2025-12-19T15:59:05.356Z",
"dados": "{\"periodoApuracao\":\"202212\",\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"22/02/2023\",\"dataLimiteAcolhimento\":\"30/12/2025\",\"observacao1\":\"CPF: 000.000.000-00\",\"observacao2\":\"INSS: 2.352,63 ICMS: 0,00 ISS: 1.734,66\",\"observacao3\":\"\",\"valores\":{\"valorPrincipal\":4087.29,\"valorMulta\":817.46,\"valorJuros\":1385.59,\"valorTotal\":6290.34},\"composicao\":[{\"periodoApuracao\":\"202212\",\"codigo\":\"0151\",\"denominacao\":\"INSS - SIMPLES NACIONAL - MEI\",\"valores\":{\"valorPrincipal\":2352.63,\"valorMulta\":470.53,\"valorJuros\":797.54,\"valorTotal\":3620.70}},{\"periodoApuracao\":\"202212\",\"codigo\":\"0125\",\"denominacao\":\"ISS - SIMPLES NACIONAL - MEI\",\"valores\":{\"valorPrincipal\":1734.66,\"valorMulta\":346.93,\"valorJuros\":588.05,\"valorTotal\":2669.64}}],\"documento\":{\"nomeArquivo\":\"DAS-DASNSIMEI-00000000000000000.pdf\",\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_291020>\"}}",
"mensagens": [
{
"codigo": "[Aviso-DASNSIMEI-00000]",
"texto": "Emissão de DAS de excesso de receita realizada com sucesso."
}
]
}
```

## Json do campo "dados"

Nesse exemplo, o json está formatado e sem o scaped string. O exemplo completo é demonstrado acima.

```text
{
"periodoApuracao": "202212",
"numeroDocumento": "00000000000000000",
"dataVencimento": "22/02/2023",
"dataLimiteAcolhimento": "30/12/2025",
"observacao1": "CPF: 000.000.000-00",
"observacao2": "INSS: 2.352,63 ICMS: 0,00 ISS: 1.734,66",
"observacao3": "",
"valores": {
"valorPrincipal": 4087.29,
"valorMulta": 817.46,
"valorJuros": 1385.59,
"valorTotal": 6290.34
},
"composicao": [
{
"periodoApuracao": "202212",
"codigo": "0151",
"denominacao": "INSS - SIMPLES NACIONAL - MEI",
"valores": {
"valorPrincipal": 2352.63,
"valorMulta": 470.53,
"valorJuros": 797.54,
"valorTotal": 3620.70
}
},
{
"periodoApuracao": "202212",
"codigo": "0125",
"denominacao": "ISS - SIMPLES NACIONAL - MEI",
"valores": {
"valorPrincipal": 1734.66,
"valorMulta": 346.93,
"valorJuros": 588.05,
"valorTotal": 2669.64
}
}
],
"documento": {
"nomeArquivo": "DAS-DASNSIMEI-00000000000000000.pdf",
"pdf": "<BASE64_REMOVIDO_TAMANHO_291020>"
}
}
```

**Layout de Mensagens**

Códigos de retorno para o campo "status" (Status HTTP)

| HTTP Code | HTTP Description | Descrição |
| --- | --- | --- |
| 200 | OK | Tudo funcionou como esperado e a validação dos dados foi realizada com sucesso. |
| 400 | Requisição inválida | Falha - dados inválidos na execução (Bad Request). |
| 404 | Não Encontrado | Falha - URL não encontrada (Not Found). |
| 500 | Erro no servidor | Erro - houve um erro interno não previsto (Internal Server Error). |

**Protocolos de Comunicação**

É possível integrar utilizando os seguintes protocolos para requisição/solicitação e resposta:

- RESTFUL/JSON;
- HTTPS.
