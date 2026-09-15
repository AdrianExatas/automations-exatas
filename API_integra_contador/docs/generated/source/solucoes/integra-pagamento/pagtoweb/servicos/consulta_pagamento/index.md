---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/servicos/consulta_pagamento/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "fec9607f6ad19bb7f515ed3ce83d3585dbb7424d005c3feeee8ee44e0d59f3e0"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/servicos/consulta_pagamento/).

# Consulta Pagamento

Essa consulta retorna os detalhes de documentos de arrecadação pagos.

PedidoDados

idSistema: PAGTOWEB idServico: PAGAMENTOS71 versaoSistema: "1.0"

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

Objeto ParametroConsultaDocumentoIC:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| numeroDocumentoLista | Lista com números de documentos, cada número tem até 17 posições. | Array | NÃO |
| codigoReceitaLista | Lista com códigos de receita. Tamanho máx. do código: 4. | Array | NÃO |
| intervaloDataArrecadacao | Intervalo de data de arrecadação a ser pesquisado. A data de arrecadação é a data contábil da efetivação do pagamento. | IntervaloData | NÃO |
| intervaloValorTotalDocumento | Intervalo de valor total a ser pesquisado. | IntervaloValor | NÃO |
| codigoTipoDocumentoLista | Tipos de documento que serão retornados. Numérico. Tamanho máx. do código: 2 | Array | NÃO |
| tamanhoDaPagina | Tamanho máx.: 100 | Number | SIM |
| primeiroDaPagina | Começa em 0 | Number | SIM |

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
"idServico": "PAGAMENTOS71",
"dados": "{ \"intervaloDataArrecadacao\": {\"dataInicial\"\"2019-09-01\", \"dataFinal\": \"2019-11-30\"}, \"primeiroDaPagina\": \"tamanhoDaPagina\": 100}"
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
"idServico": "PAGAMENTOS71",
"dados": "{\"codigoReceitaLista\": [\"9999\", \"9999\"]\"primeiroDaPagina\": 0,\"tamanhoDaPagina\": 100}"
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
"idServico": "PAGAMENTOS71",
"dados": "{ \"intervaloDataArrecadacao\": {\"dataInicial\"\"2022-01-01\", \"dataFinal\": \"2022-01-31\"}\"intervaloValorTotalDocumento\": {\"valorInicial\": 600\"valorFinal\": 13000}, \"primeiroDaPagina\": 0,\"tamanhoDaPagina\": 10"
}
}
```

Os parâmetros de consulta, podem ser combinados. A consulta sempre retorna documentos do contribuinte informado em "contribuinte".

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é uma string de tamanho 5 que representa um código interno do negócio. | Array |
| dados | Estrutura de dados de retorno. | String escapada Object : DocumentoArrecadacaoIC ) |

Objeto: ExtensaoReceita

| Campo | Descrição | Tipo |
| --- | --- | --- |
| codigo | Código da extensão de receita | String |
| descricao | Descrição da extensão de receita | String |

Objeto: Receita

| Campo | Descrição | Tipo |
| --- | --- | --- |
| codigo | Código da receita | String |
| descricao | Descrição da receita | String |
| extensaoReceita | Extensão do código de receita que identifica datas de vencimentos ou aliquotas de um tributo dentro de um mesmo código de receita | ExtensaoReceita |

Objeto: TipoDocumento

| Campo | Descrição | Tipo |
| --- | --- | --- |
| codigo | Código do tipo de documento | String |
| descricao | Descrição do tipo de documento | String |
| descricaoAbreviada | Descrição abreviada do tipo de documento | String |

Objeto: DesmembramentoIC

| Campo | Descrição | Tipo |
| --- | --- | --- |
| sequencial | Sequencial do desmembramento | String |
| receitaPrincipal | Receita principal | Receita |
| periodoApuracao | Período de apuração do débito/tributo do desmembramento (Formato: AAAA-MM-DDTHH:MI:SSZ Exemplo: "2019-01-01T00:00:00-03:00") | String |
| dataVencimento | Período de vencimento do desmembramento (Formato: AAAA-MM-DDTHH:MI:SSZ Exemplo: "2019-01-01T00:00:00-03:00") | String |
| valorTotal | Valor total do desmembramento | Number |
| valorPrincipal | Valor principal do desmembramento | Number |
| valorMulta | Valor multa do desmembramento | Number |
| valorJuros | Valor juros do desmembramento | Number |
| valorSaldoTotal | Saldo total do desmembramento | Number |
| valorSaldoPrincipal | Saldo principal do desmembramento | Number |
| valorSaldoMulta | Saldo multa do desmembramento | Number |
| valorSaldoJuros | Saldo juros do desmembramento | Number |
| cib | Cadastro Imobiliário Brasileiro | String |

Objeto: DocumentoArrecadacaoIC

| Campo | Descrição | Tipo |
| --- | --- | --- |
| numeroDocumento | Número do documento de arrecadação | String |
| tipo | Tipo do documento de arrecadação (DARF, DAS, DAE, DJE) | TipoDocumento |
| periodoApuracao | Período de apuração do débito/tributo do pagamento (Formato: AAAA-MM-DDTHH:MI:SSZ Exemplo: "2019-01-01T00:00:00-03:00") | String |
| dataArrecadacao | Data contábil da efetivação do pagamento (Formato: AAAA-MM-DDTHH:MI:SSZ Exemplo: "2019-01-01T00:00:00-03:00") | String |
| dataVencimento | Data de vencimento do pagamento (Formato: AAAA-MM-DDTHH:MI:SSZ Exemplo: "2019-01-01T00:00:00-03:00") | String |
| receitaPrincipal | Receita principal do pagamento | Receita |
| referencia | Número de referência do pagamento | String |
| valorTotal | Valor total do pagamento | Number |
| valorPrincipal | Valor principal do pagamento | Number |
| valorMulta | Valor multa do pagamento | Number |
| valorJuros | Valor juros do pagamento | Number |
| valorSaldoTotal | Saldo total do pagamento | Number |
| valorSaldoPrincipal | Saldo principal do pagamento | Number |
| valorSaldoMulta | Saldo multa do pagamento | Number |
| valorSaldoJuros | Saldo juros do pagamento | Number |
| desmembramentos | Contém informações referentes a composição de um documento de arrecadação | Array Object: DesmembramentoIC |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [Consulta Pagamento](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-pagamento/pagtoweb/exemplos/retorno_consulta_pagamento/)
