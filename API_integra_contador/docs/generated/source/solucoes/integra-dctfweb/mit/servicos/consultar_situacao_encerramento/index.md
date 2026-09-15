---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/mit/servicos/consultar_situacao_encerramento/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "d05f66cb9c52bec491bf922ca5d1c2fe00510dd6c2df6543f42e857300741edb"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/mit/servicos/consultar_situacao_encerramento/).

# Consultar situação encerramento

Este serviço oferece uma solução para a consulta assíncrona do encerramento de uma apuração, no Módulo de Inclusão de Tributos do sistema DCTFWeb.

Identificação no Pedido de Dados

idSistema: MIT idServico: SITUACAOENC315

**Dados de Entrada**

Objeto Dados:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| protocoloEncerramento | Protocolo de encerramento da apuração fornecido no serviço Encerrar Apuração . | String | S |

**Exemplo objeto "dados":**

```text
"Dados": "{\"protocoloEncerramento\":\"2fc4NTscrGXWTl4xbCX9rw==\"}"
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
"idServico": "SITUACAOENC315",
"dados": "{\"protocoloEncerramento\":\"2fc4NTscrGXWTl4xbCX9rw==\"}"
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Código HTTP retornado no acionamento do serviço. | String |
| mensagens | Mensagens retornadas no acionamento do serviço. É um array de objetos compostos de código e texto da mensagem. | Array de Object |
| dados | Estrutura de dados de retorno. | String |

Objeto dados:

| Campo | Descrição | Tipo |
| --- | --- | --- |
| idApuracao | Identificador da apuração. | Number |
| situacaoApuracao | Número de situação da apuração. | Number |
| textoSituacao | Situação da apuração. | String |
| avisosDctf | Mensagens retornadas pela DCTFWeb no momento do encerramento. | Array de String |
| dataEncerramento | Data do encerramento no formato AAAAMMDD. | String |

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
"idServico": "SITUACAOENC315",
"versaoSistema": "1.0",
"dados": "{\"protocoloEncerramento\":\"2fc4NTscrGXWTl4xbCX9rw==\"}"
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
"dados": "{\"idApuracao\":0,\"situacaoApuracao\":3,\"textoSituacao\":\"ENCERRADA\",\"avisosDctf\":null,\"dataEncerramento\":\"20250305\"}"
}
```
