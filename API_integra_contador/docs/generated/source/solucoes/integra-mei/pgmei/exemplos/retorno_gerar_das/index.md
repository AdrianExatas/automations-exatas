---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/exemplos/retorno_gerar_das/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "5de36eee51c987d97937e6c68345333246d4d6b7a0886348bd309da63dfaf04f"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/exemplos/retorno_gerar_das/).

# Exemplo de Json de retorno

Exemplo de uma emissão de DAS (Documento de Arrecadação do Simples Nacional).

## Json de retorno completo

```text
{
"contratante": {
"numero": "00000000000101",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000101",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000101",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PGMEI",
"idServico": "GERARDASPDF21",
"dados": "{ \"periodoApuracao\": \"201901\" }"
},
"status": 200,
"mensagens": [
{
"codigo": "Sucesso-PGMEI",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "[{\"cnpjCompleto\":\"00000000000100\",\"razaoSocial\":\"EXEMPLO\"\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_209706>\"\"detalhamento\":[{\"periodoApuracao\":\"201901\"\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"20190220\"\"dataLimiteAcolhimento\":\"20220831\",\"valores\":{\"principal\":55.90\"multa\":11.18,\"juros\":10.71,\"total\":77.79},\"observacao1\":\"CPF: 000.000000-00\",\"observacao2\":\"Tributos (R$): INSS 49,90 ICMS 1,00 ISS 5,00\"\"observacao3\":\"PGMEI(Versao:3.8.0)\",\"composicao\"[{\"periodoApuracao\":201901,\"codigo\":\"0151\",\"denominacao\":\"INSS -SIMPLES NACIONAL - MEI - 01/2019\",\"valores\":{\"principal\":49.90,\"multa\":998,\"juros\":9.56,\"total\":69.44}},{\"periodoApuracao\":201901\"codigo\":\"0083\",\"denominacao\":\"ICMS - SIMPLES NACIONAL - MEI - PB - 012019\",\"valores\":{\"principal\":1.00,\"multa\":0.20,\"juros\":0.19,\"total\":139}},{\"periodoApuracao\":201901,\"codigo\":\"0125\",\"denominacao\":\"ISS -SIMPLES NACIONAL - MEI - SUME (PB) - 01/2019\",\"valores\":{\"principal\":5.00\"multa\":1.00,\"juros\":0.96,\"total\":6.96}}]}]}]"
}
```

## Json do campo "dados"

Nesse exemplo o json está formatado e sem o scaped string. O exemplo completo é demonstrado acima.

```text
[{
"cnpjCompleto": "00000000000100",
"razaoSocial": "EXEMPLO",
"pdf""<BASE64_REMOVIDO_TAMANHO_206141>",
"detalhamento": [{
"periodoApuracao": "201901",
"numeroDocumento": "00000000000000000",
"dataVencimento": "20190220",
"dataLimiteAcolhimento": "20220831",
"valores": {
"principal": 55.90,
"multa": 11.18,
"juros": 10.71,
"total": 77.79
},
"observacao1": "CPF: 000.000.000-00",
"observacao2": "Tributos (R$): INSS 49,90 ICMS 1,00 ISS 5,00",
"observacao3": "PGMEI(Versao:3.8.0)",
"composicao": [{
"periodoApuracao": 201901,
"codigo": "0151",
"denominacao": "INSS - SIMPLES NACIONAL - MEI - 01/2019",
"valores": {
"principal": 49.90,
"multa": 9.98,
"juros": 9.56,
"total": 69.44
}
}, {
"periodoApuracao": 201901,
"codigo": "0083",
"denominacao": "ICMS - SIMPLES NACIONAL - MEI - PB - 01/2019",
"valores": {
"principal": 1.00,
"multa": 0.20,
"juros": 0.19,
"total": 1.39
}
}, {
"periodoApuracao": 201901,
"codigo": "0125",
"denominacao": "ISS - SIMPLES NACIONAL - MEI - SUME (PB) - 01/2019",
"valores": {
"principal": 5.00,
"multa": 1.00,
"juros": 0.96,
"total": 6.96
}
}]
}]
}]
```
