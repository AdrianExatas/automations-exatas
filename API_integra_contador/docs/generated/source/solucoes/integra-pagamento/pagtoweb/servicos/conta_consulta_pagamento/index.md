---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/servicos/conta_consulta_pagamento/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "aea7e2044af2b40620cfda8af287fbc539d36f22bc407a4c106f7023c7361270"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/servicos/conta_consulta_pagamento/).

# Conta Consulta Pagamento

Essa consulta retorna um quantitativo de documentos de arrecadação pagos.

PedidoDados

idSistema: PAGTOWEB idServico: CONTACONSDOCARRPG73 versaoSistema: "1.0"

**Dados de Entrada**

Objeto IntervaloData:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| dataInicial | Formato AAAA-MM-DD | String | NÃO |
| dataFinal | Formato AAAA-MM-DD | String | NÃO |

Objeto IntervaloValor:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| valorInicial | Número com o valor inicial | Number | NÃO |
| valorFinal | Número com o valor final | Number | NÃO |

Objeto ParametroEmissaoComprovanteIC:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| numeroDocumento | Número do documento. | String (até 17 bytes) | NÃO |

Objeto ParametroContaConsultaDocumentoIC:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| numeroDocumentoLista | Lista com números de documentos, cada número tem até 17 posições. | Array | NÃO |
| codigoReceitaLista | Lista com códigos de receita. Tamanho máx. do código: 4. | Array | NÃO |
| intervaloDataArrecadacao | Intervalo de data de arrecadação a ser pesquisado. A data de arrecadação é a data contábil da efetivação do pagamento. | IntervaloData | NÃO |
| intervaloValorTotalDocumento | Intervalo de valor total a ser pesquisado. | IntervaloValor | NÃO |
| codigoTipoDocumentoLista | Tipos de documento que serão retornados. Numérico. Tamanho máx. do código: 2 | Array | NÃO |

**Exemplo: conteúdo body json de entrada**

Quando pesquisado por intervaloDataArrecadacao

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
"idSistema": "PAGTOWEB",
"idServico": "CONTACONSDOCARRPG73",
"dados": "{ \"intervaloDataArrecadacao\": {\"dataInicial\"\"2019-09-01\", \"dataFinal\": \"2019-11-30\"}}"
}
}
```

Quando pesquisado por codigoReceitaLista:

```text
{
"contratante": {
"numero": "99999999999999",
"tipo": 2
},
"autorPedidoDados": {
"numero": "99999999999999",
"tipo": 2
},
"contribuinte": {
"numero": "99999999999999",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PAGTOWEB",
"idServico": "CONTACONSDOCARRPG73",
"dados": "{\"codigoReceitaLista\": [\"9999\", \"9999\"]}"
}
}
```

Quando pesquisado por intervaloValorTotalDocumento:

```text
{
"contratante": {
"numero": "99999999999999",
"tipo": 2
},
"autorPedidoDados": {
"numero": "99999999999999",
"tipo": 2
},
"contribuinte": {
"numero": "99999999999999",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PAGTOWEB",
"idServico": "CONTACONSDOCARRPG73",
"dados": "{ \"intervaloDataArrecadacao\": {\"dataInicial\"\"2022-01-01\", \"dataFinal\": \"2022-01-31\"}\"intervaloValorTotalDocumento\": {\"valorInicial\": 600\"valorFinal\": 13000}}"
}
}
```

Os parâmetros de consulta, podem ser combinados. A consulta sempre retorna quantidade de documentos do contribuinte informado em "contribuinte".

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é uma string de tamanho 5 que representa um código interno do negócio. | Array |
| dados | Estrutura de dados de retorno. | String |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [Conta Consulta Pagamento](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/exemplos/retorno_conta_consulta_pagamento/)
