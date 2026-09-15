---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/servicos/consultar_anos_calendarios/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "a987ca0e417c3a26fc35ea575f81158fc32ffbe2071ae3fa362624a0523f1795"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/servicos/consultar_anos_calendarios/).

# Consultar Anos Calendários

Consultar todas as opções pelo Regime de Apuração de Receitas efetivadas.

PedidoDados

idSistema: REGIMEAPURACAO idServico: CONSULTARANOSCALENDARIOS102 versaoSistema: "1.0"

**Dados de Entrada**

Este serviço não requer parâmetros de entrada no campo dados. Serão consultados todos os anos.

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
"idServico": "CONSULTARANOSCALENDARIOS102",
"versaoSistema": "1.0",
"dados": ""
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
| anoCalendario | Ano Calendário | Number |
| regimeApurado | Texto com o regime efetivado: "COMPETENCIA" ou "CAIXA" | String |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [consultarAnos](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/exemplos/retorno_consultar_anos/)
