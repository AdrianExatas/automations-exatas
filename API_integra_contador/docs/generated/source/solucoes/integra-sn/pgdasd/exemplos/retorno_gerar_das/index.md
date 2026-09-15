---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_gerar_das/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "bbeb85ee10bc05a12e3c06d488c7966bb82774597c749da71b0c33feadbebafd"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_gerar_das/).

# Exemplo de Json de retorno

Exemplo de uma emissão de DAS (Documento de Arrecadação do Simples Nacional).

## Json de retorno completo

```text
{
"contratante": {
"numero": "00000000000100",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000100",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000100",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PGDASD",
"idServico": "GERARDAS12",
"versaoSistema": "1.0",
"dados": "{ \"periodoApuracao\": \"201801\", \"dataConsolidacao\": \"20220831\" }"
},
"status": 200,
"dados": "[{\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_209052>\",\"cnpjCompleto\":\"00000000000100\",\"detalhamentoDas\":{\"periodoApuracao\":\"201801\",\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"20180220\",\"dataLimiteAcolhimento\":\"20220831\",\"valores\":{\"principal\":40.00,\"multa\":8.00,\"juros\":10.15,\"total\":58.15},\"observacao1\":\"Esta empresa NÃO É OPTANTE pelo Simples Nacional.\",\"observacao2\":\"\",\"observacao3\":\"\",\"composicao\":[{\"periodoApuracao\":\"201801\",\"codigo\":\"1001\",\"denominacao\":\"01/2018\",\"valores\":{\"principal\":2.20,\"multa\":0.44,\"juros\":0.56,\"total\":3.20}},{\"periodoApuracao\":\"201801\",\"codigo\":\"1002\",\"denominacao\":\"01/2018\",\"valores\":{\"principal\":1.40,\"multa\":0.28,\"juros\":0.36,\"total\":2.04}},{\"periodoApuracao\":\"201801\",\"codigo\":\"1004\",\"denominacao\":\"01/2018\",\"valores\":{\"principal\":5.10,\"multa\":1.02,\"juros\":1.29,\"total\":7.41}},{\"periodoApuracao\":\"201801\",\"codigo\":\"1005\",\"denominacao\":\"01/2018\",\"valores\":{\"principal\":1.10,\"multa\":0.22,\"juros\":0.28,\"total\":1.60}},{\"periodoApuracao\":\"201801\",\"codigo\":\"1006\",\"denominacao\":\"01/2018\",\"valores\":{\"principal\":16.60,\"multa\":3.32,\"juros\":4.21,\"total\":24.13}},{\"periodoApuracao\":\"201801\",\"codigo\":\"1007\",\"denominacao\":\"SP - 01/2018\",\"valores\":{\"principal\":13.60,\"multa\":2.72,\"juros\":3.45,\"total\":19.77}}]}}]",
"mensagens": [
{
"codigo": "Sucesso-PGDASD",
"texto": "Requisição efetuada com sucesso."
}
],
}
```

## Json do campo "dados"

Nesse exemplo o json está formatado e sem o scaped string. O exemplo completo é demonstrado acima.

```text
[{
"pdf": "<BASE64_REMOVIDO_TAMANHO_209052>",
"cnpjCompleto": "00000000000100",
"detalhamentoDas": {
"periodoApuracao": "201801",
"numeroDocumento": "00000000000000000",
"dataVencimento": "20180220",
"dataLimiteAcolhimento": "20220831",
"valores": {
"principal": 40.00,
"multa": 8.00,
"juros": 10.15,
"total": 58.15
},
"observacao1": "Esta empresa NÃO É OPTANTE pelo Simples Nacional.",
"observacao2": "",
"observacao3": "",
"composicao": [{
"periodoApuracao": "201801",
"codigo": "1001",
"denominacao": "01/2018",
"valores": {
"principal": 2.20,
"multa": 0.44,
"juros": 0.56,
"total": 3.20
}
}, {
"periodoApuracao": "201801",
"codigo": "1002",
"denominacao": "01/2018",
"valores": {
"principal": 1.40,
"multa": 0.28,
"juros": 0.36,
"total": 2.04
}
}, {
"periodoApuracao": "201801",
"codigo": "1004",
"denominacao": "01/2018",
"valores": {
"principal": 5.10,
"multa": 1.02,
"juros": 1.29,
"total": 7.41
}
}, {
"periodoApuracao": "201801",
"codigo": "1005",
"denominacao": "01/2018",
"valores": {
"principal": 1.10,
"multa": 0.22,
"juros": 0.28,
"total": 1.60
}
}, {
"periodoApuracao": "201801",
"codigo": "1006",
"denominacao": "01/2018",
"valores": {
"principal": 16.60,
"multa": 3.32,
"juros": 4.21,
"total": 24.13
}
}, {
"periodoApuracao": "201801",
"codigo": "1007",
"denominacao": "SP - 01/2018",
"valores": {
"principal": 13.60,
"multa": 2.72,
"juros": 3.45,
"total": 19.77
}
}]
}
}]
```
