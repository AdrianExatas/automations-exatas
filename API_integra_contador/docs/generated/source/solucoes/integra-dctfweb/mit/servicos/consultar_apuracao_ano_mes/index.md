---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/mit/servicos/consultar_apuracao_ano_mes/"
sourceUpdatedAt: "10 de abril de 2026 14:58:42 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "4bddd4261d7731ff52758abc95f2e5da8b2f260c9ad31c3f56257fa30e05e968"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/mit/servicos/consultar_apuracao_ano_mes/).

# Consultar apuração por ano ou mês

O serviço permite listar todas as apurações MIT por ano ou mês.

Identificação no Pedido de Dados

idSistema: MIT idServico: LISTAAPURACOES317

**Dados de Entrada**

Objeto dados:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| anoApuracao | Ano da apuração para o qual se deseja consultar todas apurações MIT. | Number | S |
| mesApuracao | Mês da apuração. Se este campo for informado serão consultados apenas as apurações referentes a este ano e mês. | Number | N |
| situacaoApuracao | Situação da apuração. | Number | N |

**Exemplo objeto "dados":**

```text
"dados": "{\"mesApuracao\":2,\"anoApuracao\":2025,\"situacaoApuracao\":3}"
```

**Exemplo: conteúdo body json de entrada**

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
"idSistema": "MIT",
"idServico": "LISTAAPURACOES317",
"dados": "{\"mesApuracao\":2,\"anoApuracao\":2025,\"situacaoApuracao\":3}"
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Código HTTP retornado no acionamento do serviço. | String |
| mensagens | Mensagens retornadas no acionamento do serviço. É um array de objetos compostos de código e texto da mensagem. | Array de Object |
| dados | Estrutura de dados de retorno. | String |

Estrutura do objeto dados:

| Campo | Descrição | Tipo |
| --- | --- | --- |
| Apuracoes | Lista as apurações do período consultado. | Array de Object |
| periodoApuracao | Período da apuração (AAAAMM). | String |
| idApuracao | Identificador da apuração fornecido no serviço de encerramento ( identEFD ). | Number |
| situacao | Situação da apuração. | Number |
| dataEncerramento | Data de encerramento da apuração (AAAAMMDD). | String |
| eventoEspecial | Existência ou não de evento especial na apuração. | Boolean |
| valorTotalApurado | Valor do total apurado. | Number |

**Exemplo: json retorno**

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
"idSistema": "MIT",
"idServico": "LISTAAPURACOES317",
"versaoSistema": "1.0",
"dados":"{\"mesApuracao\":2,\"anoApuracao\":2025,\"situacaoApuracao\":3}"
},
"status": 200,
"responseId": "8f770ff8-6079-4765-b430-c7fd65t7e8c1",
"responseDateTime": "2025-03-27T19:07:02.925Z",
"mensagens": [
{
"codigo": "[Sucesso-MIT]",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"Apuracoes\": [{\"periodoApuracao\":202512,\"idApuracao\":0,\"situacao\":3,\"dataEncerramento\":\"20250218\",\"eventoEspecial\":false,\"valorTotalApurado\":1000.0},{\"periodoApuracao\":202512,\"idApuracao\":1,\"situacao\":3,\"dataEncerramento\":\"20250219\",\"eventoEspecial\":false,\"valorTotalApurado\":1500.0}]}"
}
```

**Layout de mensagens**

Códigos de retorno para o campo *status* (Status HTTP):

| HTTP Code | HTTP Description | Descrição |
| --- | --- | --- |
| 200 | OK | Tudo funcionou como esperado e a validação dos dados foi realizada com sucesso. |
| 400 | Requisição inválida | Falha: Dados inválidos na execução ( Bad Request ). |
| 404 | Não Encontrado | Falha: URL não encontrada ( Not Found ). |
| 500 | Erro no servidor | Erro: Houve um erro interno não previsto ( Internal Server Error ). |
