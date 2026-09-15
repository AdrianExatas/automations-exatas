---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/exemplos/retorno_gerar_das_cod_barras/"
sourceUpdatedAt: "10 de abril de 2026 14:58:42 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "57e911b0fade8a3fff500d3d0a074e9d89313c80ca32a19c198e9e9a889353ee"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/exemplos/retorno_gerar_das_cod_barras/).

# Exemplos

Exemplos de emissão de DAS somente com código de barras, sem o PDF.

## Emissão de DAS no PA jan/2019 - DAS Vencido

Esse cenário de exemplo demonstra a emissão de um DAS no dia 31/08/2022. Observe que o sistema PGMEI da RFB calculou os acréscimos legais de multa de mora e juros.

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
"idSistema": "PGMEI",
"idServico": "GERARDASCODBARRA22",
"dados": "{ \"periodoApuracao\": \"201901\" }"
},
"status": 200,
"mensagens": [
{
"codigo": "Sucesso-PGMEI",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "[{\"cnpjCompleto\":\"00000000000100\",\"razaoSocial\":\"EXEMPLO\",\"detalhamento\":[{\"periodoApuracao\":\"201901\",\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"20190220\",\"dataLimiteAcolhimento\":\"20220831\",\"valores\":{\"principal\":55.90,\"multa\":11.18,\"juros\":10.71,\"total\":77.79},\"codigoDeBarras\":[\"000000000000\",\"000000000000\",\"000000000000\",\"000000000000\"],\"observacao1\":\"CPF: 000.000.000-00\",\"observacao2\":\"Tributos (R$): INSS 49,90 ICMS 1,00 ISS 5,00\",\"observacao3\":\"PGMEI(Versao:3.8.0)\",\"composicao\":[{\"periodoApuracao\":201901,\"codigo\":\"0151\",\"denominacao\":\"INSS - SIMPLES NACIONAL - MEI - 01/2019\",\"valores\":{\"principal\":49.90,\"multa\":9.98,\"juros\":9.56,\"total\":69.44}},{\"periodoApuracao\":201901,\"codigo\":\"0083\",\"denominacao\":\"ICMS - SIMPLES NACIONAL - MEI - PB - 01/2019\",\"valores\":{\"principal\":1.00,\"multa\":0.20,\"juros\":0.19,\"total\":1.39}},{\"periodoApuracao\":201901,\"codigo\":\"0125\",\"denominacao\":\"ISS - SIMPLES NACIONAL - MEI - SUME (PB) - 01/2019\",\"valores\":{\"principal\":5.00,\"multa\":1.00,\"juros\":0.96,\"total\":6.96}}]}]}]"
}
```

### Json do campo "dados"

Nesse exemplo, o json está formatado e sem o scaped string. O exemplo completo é demonstrado acima.

```text
[{
"cnpjCompleto": "00000000000100",
"razaoSocial": "EXEMPLO",
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
"codigoDeBarras": ["000000000000", "000000000000", "000000000000""000000000000"],
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

## Emissão de DAS no PA jan/2026 - DAS vencido

Esse cenário de exemplo demonstra a emissão de um DAS no dia 13/03/2026 para um período de apuração de janeiro de 2026. Observe que o sistema PGMEI da RFB calculou os acréscimos legais de multa de mora e juros.

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
"numero": "11111111111111",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PGMEI",
"idServico": "GERARDASCODBARRA22",
"versaoSistema": "1.0",
"dados": "{ \"periodoApuracao\": \"202601\" }"
},
"status": 200,
"responseId": "e9da1ea7-6c3b-4f22-a57e-7a90b9c41b01",
"responseDateTime": "2026-03-13T07:55:09.121Z",
"dados": "[{\"cnpjCompleto\":\"11111111111111\",\"razaoSocial\":\"AAUVAAAIWWAA 00000000000\",\"detalhamento\":[{\"periodoApuracao\":\"202601\\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"20260220\\"dataLimiteAcolhimento\":\"20260313\",\"valores\":{\"principal\":86.0\"multa\":5.39,\"juros\":0.86,\"total\":92.30},\"codigoDeBarras\[\"000000000000\",\"000000000000\",\"000000000000\",\"000000000000\"\"observacao1\":\"CPF: 000.000.000-00\",\"observacao2\":\"Tributos (R$)INSS 81,05 ICMS 0,00 ISS 5,00\",\"observacao3\":\"PGMEI(Versao:3.16.2)\\"composicao\":[{\"periodoApuracao\":202601,\"codigo\":\"0151\\"denominacao\":\"INSS - SIMPLES NACIONAL - MEI - 01/2026\",\"valores\{\"principal\":81.05,\"multa\":5.08,\"juros\":0.81,\"total\":86.94}{\"periodoApuracao\":202601,\"codigo\":\"0125\",\"denominacao\":\"ISS SIMPLES NACIONAL - MEI - LUCAS DO RIO VERDE (MT) - 01/2026\",\"valores\{\"principal\":5.00,\"multa\":0.31,\"juros\":0.05,\"total\":5.36}}]}]}]",
"mensagens": [
{
"codigo": "[Sucesso-PGMEI]",
"texto": "Requisição efetuada com sucesso."
}
]
}
```

### Json do campo "dados"

Nesse exemplo, o json está formatado e sem o scaped string. O exemplo completo é demonstrado acima.

```text
[
{
"cnpjCompleto": "11111111111111",
"razaoSocial": "AAUVAA AAIWWAA",
"detalhamento": [
{
"periodoApuracao": "202601",
"valores": {
"juros": 0.86,
"multa": 5.39,
"principal": 86.05,
"total": 92.3
},
"dataLimiteAcolhimento": "20260313",
"dataVencimento": "20260220",
"numeroDocumento": "00000000000000000",
"codigoDeBarras": [
"000000000000",
"000000000000",
"000000000000",
"000000000000"
],
"observacao1": "CPF: 000.000.000-00",
"observacao2": "Tributos (R$): INSS 81,05 ICMS 0,00 ISS 5,00",
"observacao3": "PGMEI(Versao:3.16.2)",
"composicao": [
{
"codigo": "0151",
"denominacao": "INSS - SIMPLES NACIONAL - MEI - 01/2026",
"periodoApuracao": 202601,
"valores": {
"juros": 0.81,
"multa": 5.08,
"principal": 81.05,
"total": 86.94
}
},
{
"codigo": "0125",
"denominacao": "ISS - SIMPLES NACIONAL - MEI - LUCAS DRIO VERDE (MT) - 01/2026",
"periodoApuracao": 202601,
"valores": {
"juros": 0.05,
"multa": 0.31,
"principal": 5.0,
"total": 5.36
}
}
]
}
]
}
]
```

## Emissão de DAS no PA fev/2026 - DAS no mês vigente

Esse cenário de exemplo demonstra a emissão de um DAS no dia 13/03/2026 para um período de apuração de fevereiro de 2026 antes da data do vencimento. Não há acréscimos legais de multa de mora e juros.

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
"numero": "11111111111111",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PGMEI",
"idServico": "GERARDASCODBARRA22",
"versaoSistema": "1.0",
"dados": "{ \"periodoApuracao\": \"202602\" }"
},
"status": 200,
"responseId": "114f5398-a75e-4cb4-9235-bea779cf317f",
"responseDateTime": "2026-03-13T08:10:27.751Z",
"dados": "[{\"cnpjCompleto\":\"11111111111111\",\"razaoSocial\":\"AAUVAAAIWWAA\",\"detalhamento\":[{\"periodoApuracao\":\"202602\\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"20260320\\"dataLimiteAcolhimento\":\"20260320\",\"valores\":{\"principal\":86.0\"multa\":0.0,\"juros\":0.0,\"total\":86.05},\"codigoDeBarras\[\"000000000000\",\"000000000000\",\"000000000000\",\"000000000000\"\"observacao1\":\"CPF: 000.000.000-00\",\"observacao2\":\"Tributos (R$)INSS 81,05 ICMS 0,00 ISS 5,00\",\"observacao3\":\"PGMEI(Versao:3.16.2)\\"composicao\":[{\"periodoApuracao\":202602,\"codigo\":\"0151\\"denominacao\":\"INSS - SIMPLES NACIONAL - MEI - 02/2026\",\"valores\{\"principal\":81.05,\"multa\":0.0,\"juros\":0.0,\"total\":81.05}{\"periodoApuracao\":202602,\"codigo\":\"0125\",\"denominacao\":\"ISS SIMPLES NACIONAL - MEI - LUCAS DO RIO VERDE (MT) - 02/2026\",\"valores\{\"principal\":5.00,\"multa\":0.0,\"juros\":0.0,\"total\":5.00}}]}]}]",
"mensagens": [
{
"codigo": "[Sucesso-PGMEI]",
"texto": "Requisição efetuada com sucesso."
}
]
}
```

### Json do campo "dados"

Nesse exemplo, o json está formatado e sem o scaped string. O exemplo completo é demonstrado acima.

```text
[
{
"cnpjCompleto": "11111111111111",
"razaoSocial": "AAUVAA AAIWWAA"
"detalhamento": [
{
"periodoApuracao": "202602",
"dataLimiteAcolhimento": "20260320",
"dataVencimento": "20260320",
"numeroDocumento": "00000000000000000",
"valores": {
"juros": 0.0,
"multa": 0.0,
"principal": 86.05,
"total": 86.05
},
"observacao1": "CPF: 000.000.000-00",
"observacao2": "Tributos (R$): INSS 81,05 ICMS 0,00 ISS 5,00",
"observacao3": "PGMEI(Versao:3.16.2)",
"codigoDeBarras": [
"000000000000",
"000000000000",
"000000000000",
"000000000000"
],
"composicao": [
{
"codigo": "0151",
"denominacao": "INSS - SIMPLES NACIONAL - MEI - 02/2026",
"periodoApuracao": 202602,
"valores": {
"juros": 0.0,
"multa": 0.0,
"principal": 81.05,
"total": 81.05
}
},
{
"codigo": "0125",
"denominacao": "ISS - SIMPLES NACIONAL - MEI - LUCAS DRIO VERDE (MT) - 02/2026",
"periodoApuracao": 202602,
"valores": {
"juros": 0.0,
"multa": 0.0,
"principal": 5.0,
"total": 5.0
}
}
]
}
]
}
]
```

## Emissão de DAS no PA mar/2026 - DAS de mês futuro

Este cenário de exemplo demonstra a emissão de um DAS em 13/03/2026, referente a um período de apuração futuro em março de 2026. Observe que a dataLimiteAcolhimento corresponde à data de validade do próprio DAS. Esse comportamento, ilustrado no exemplo de março/2026, mantém-se inalterado até dezembro/2026, desde que a empresa permaneça ativa e enquadrada como optante do SIMEI durante todo esse período.

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
"numero": "11111111111111",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PGMEI",
"idServico": "GERARDASCODBARRA22",
"versaoSistema": "1.0",
"dados": "{ \"periodoApuracao\": \"202603\" }"
},
"status": 200,
"responseId": "143fb23f-0f8b-4590-9920-9ceed24d0df1",
"responseDateTime": "2026-03-13T08:12:53.370Z",
"dados": "[{\"cnpjCompleto\":\"11111111111111\",\"razaoSocial\":\"AAUVAAAIWWAA 00000000000\",\"detalhamento\":[{\"periodoApuracao\":\"202603\\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"20260420\\"dataLimiteAcolhimento\":\"20260420\",\"valores\":{\"principal\":86.0\"multa\":0.0,\"juros\":0.0,\"total\":86.05},\"codigoDeBarras\[\"000000000000\",\"000000000000\",\"000000000000\",\"000000000000\"\"observacao1\":\"CPF: 000.000.000-00\",\"observacao2\":\"Tributos (R$)INSS 81,05 ICMS 0,00 ISS 5,00\",\"observacao3\":\"PGMEI(Versao:3.16.2)\\"composicao\":[{\"periodoApuracao\":202603,\"codigo\":\"0151\\"denominacao\":\"INSS - SIMPLES NACIONAL - MEI - 03/2026\",\"valores\{\"principal\":81.05,\"multa\":0.0,\"juros\":0.0,\"total\":81.05}{\"periodoApuracao\":202603,\"codigo\":\"0125\",\"denominacao\":\"ISS SIMPLES NACIONAL - MEI - LUCAS DO RIO VERDE (MT) - 03/2026\",\"valores\{\"principal\":5.00,\"multa\":0.0,\"juros\":0.0,\"total\":5.00}}]}]}]",
"mensagens": [
{
"codigo": "[Sucesso-PGMEI]",
"texto": "Requisição efetuada com sucesso."
}
]
}
```

### Json do campo "dados"

Neste exemplo, o json está formatado e sem o scaped string. O exemplo completo é demonstrado acima.

```text
[
{
"cnpjCompleto": "11111111111111",
"razaoSocial": "AAUVAA AAIWWAA"
"detalhamento": [
{
"periodoApuracao": "202603",
"dataLimiteAcolhimento": "20260420",
"dataVencimento": "20260420",
"numeroDocumento": "00000000000000000",
"valores": {
"juros": 0.0,
"multa": 0.0,
"principal": 86.05,
"total": 86.05
},
"codigoDeBarras": [
"000000000000",
"000000000000",
"000000000000",
"000000000000"
],
"observacao1": "CPF: 000.000.000-00",
"observacao2": "Tributos (R$): INSS 81,05 ICMS 0,00 ISS 5,00",
"observacao3": "PGMEI(Versao:3.16.2)",
"composicao": [
{
"codigo": "0151",
"denominacao": "INSS - SIMPLES NACIONAL - MEI - 03/2026",
"periodoApuracao": 202603,
"valores": {
"juros": 0.0,
"multa": 0.0,
"principal": 81.05,
"total": 81.05
}
},
{
"codigo": "0125",
"denominacao": "ISS - SIMPLES NACIONAL - MEI - LUCAS DRIO VERDE (MT) - 03/2026",
"periodoApuracao": 202603,
"valores": {
"juros": 0.0,
"multa": 0.0,
"principal": 5.0,
"total": 5.0
}
}
]
}
]
}
]
```

## Emissão de DAS no PA jan/2027 - DAS ainda não vigente

Este cenário de exemplo demonstra a emissão de um DAS em 13/03/2026, referente a um período de apuração futuro em janeiro de 2026. Observe que o sistema emite uma mensagem tratada para este cenário.

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
"numero": "11111111111111",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PGMEI",
"idServico": "GERARDASCODBARRA22",
"versaoSistema": "1.0",
"dados": "{ \"periodoApuracao\": \"202701\" }"
},
"status": 400,
"responseId": "200967e9-9519-45e8-a30c-00eca70539ea",
"responseDateTime": "2026-03-13T08:39:44.237Z",
"dados": "",
"mensagens": [
{
"codigo": "[EntradaIncorreta-PGMEI-MSG_23030]",
"texto": "Parâmetro de entrada inválido. Período de Apuração futuro."
}
]
}
```

### Json do campo "dados"

Nesse exemplo, o objeto dados está vazio.
