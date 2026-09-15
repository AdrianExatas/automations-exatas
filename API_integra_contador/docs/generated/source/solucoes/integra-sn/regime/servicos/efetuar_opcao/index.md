---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/servicos/efetuar_opcao/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "cfe06d91674a4e09af1c3f596585ac21786d0252ed8358189a5c2196ddeee183"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/servicos/efetuar_opcao/).

# Efetuar Opção pelo Regime de Apuração de Receitas

Efetuar a opção pelo regime de apuração que deve ser feito anualmente pelas empresas optantes pelo Simples Nacional

PedidoDados

idSistema: REGIMEAPURACAO idServico: EFETUAROPCAOREGIME101 versaoSistema: "1.0"

**Dados de Entrada**

Objeto Dados:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| anoOpcao | Ano Opção | Number | SIM |
| tipoRegime | Tipo da opção | Number | SIM |
| descritivoRegime | Descritivo do Regime . Este campo é para reforçar a escolha do campo tipoRegime | String | SIM |
| deAcordoResolucao | Este campo deve ser enviado como True para ser efetivada a opção. | Boolean | SIM |

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
"idServico": "EFETUAROPCAOREGIME101",
"versaoSistema": "1.0",
"dados": "{ \"anoOpcao\": 2023, \"tipoRegime\": 1, \"descritivoRegime\"CAIXA\", \"deAcordoResolucao\": true }"
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

Json de exemplo: [efetuarOpcaoRegime](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/exemplos/retorno_efetuar_opcao/)
