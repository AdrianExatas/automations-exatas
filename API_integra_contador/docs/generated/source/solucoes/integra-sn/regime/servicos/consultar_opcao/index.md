---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/servicos/consultar_opcao/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "d9384d1bc91133dbeb14ccb0c3ad1e0821b39ceff53e5eb53f9dac9df061c2bf"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/servicos/consultar_opcao/).

# Consultar Opção pelo Regime de Apuração de Receitas

Consultar a opção pelo regime de apuração de receitas a partir de um ano calendário.

PedidoDados

idSistema: REGIMEAPURACAO idServico: CONSULTAROPCAOREGIME103 versaoSistema: "1.0"

**Dados de Entrada**

Objeto Dados:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| anoCalendario | Ano Opção | Number | SIM |

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
"idServico": "CONSULTAROPCAOREGIME103",
"versaoSistema": "1.0",
"dados": "{ \"anoCalendario\": 2023 }"
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
| cnpjMatriz | CNPJ da matriz | Number |
| anoCalendario | Ano Calendário solicitado | Number |
| regimeEscolhido | Texto com o regime escolhido: "COMPETENCIA" ou "CAIXA" | String |
| dataHoraOpcao | Data e horário da opção no formato AAAAMMDDHHMMSS | Number |
| demonstrativoPdf | Demonstrativo de opção de Regime em formato base 64 | String |
| textoResolucao | Texto da resolução (no caso de regime de CAIXA) em formato base 64 | String |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [consultarOpcao](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/exemplos/retorno_consultar_opcao/)
