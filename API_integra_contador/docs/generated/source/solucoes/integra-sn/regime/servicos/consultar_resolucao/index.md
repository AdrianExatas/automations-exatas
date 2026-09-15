---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/servicos/consultar_resolucao/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "8f76d123b47157abee689562c4b8ea380e596b0be991962dbd837df13ae7dcfd"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/servicos/consultar_resolucao/).

# Consultar a resolução para o regime de Caixa

Consultar a resolução para o regime de Caixa

PedidoDados

idSistema: REGIMEAPURACAO idServico: CONSULTARRESOLUCAO104 versaoSistema: "1.0"

**Dados de Entrada**

Objeto Dados:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| anoCalendario | Ano | Number | SIM |

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
"idSistema": "REGIMEAPURACAO",
"idServico": "CONSULTARRESOLUCAO104",
"versaoSistema": "1.0",
"dados": "{\"anoCalendario\":2021}"
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto de tamanho 5 que representa um código interno do negócio. | Array |
| dados | Estrutura de dados de retorno, contendo uma lista em SCAPED Texto JSON com o objeto RegimeApuracao. | String |

Objeto: RegimeApuracao

| Campo | Descrição | Tipo |
| --- | --- | --- |
| textoResolucao | Texto fixo da resolução pelo Regime de Caixa em base 64 | String |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [consultarResolucao](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/exemplos/retorno_consultar_resolucao/)
