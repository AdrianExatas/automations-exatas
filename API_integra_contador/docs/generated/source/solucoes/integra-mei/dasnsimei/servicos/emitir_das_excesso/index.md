---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/servicos/emitir_das_excesso/"
sourceUpdatedAt: "26 de agosto de 2026 19:58:59 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "cde77993178037cb1fe177f1af3a3564c9596add88d2592d01aaef4cf35c04ce"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/servicos/emitir_das_excesso/).

# Emitir DAS de Excesso de Receita Bruta

**ATENÇÃO: A FUNCIONALIDADE AINDA NÃO ESTÁ DISPONÍVEL PARA CONTRATAÇÃO E PODE SOFRER ALTERAÇÕES**

A funcionalidade EmitirDasExcesso DASN-Simei permite realizar a emissão do DAS de excesso de receita bruta para a última declaração transmitida e com estouro de receita bruta anual em até 20%.

Identificação no Pedido de Dados

idSistema: DASNSIMEI idServico: GERARDASEXCESSO153

## Dados de Entrada

*Object dados:*

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| cnpjCompleto | CNPJ completo do contribuinte. Deve-se informar o CNPJ sem máscara de formatação. | String (14) [AAAAAAAAAAAAAA] | SIM |
| anoCalendario | Ano-calendário da declaração para a qual se deseja emitir o DAS de Excesso de receita bruta. | Number (4) | SIM |

**Exemplo: conteúdo body json de entrada**

```text
{
"contratante": {
"numero": "11111111111111",
"tipo": 2
},
"autorPedidoDados": {
"numero": "11111111111111",
"tipo": 2
},
"contribuinte": {
"numero": "11111111111111",
"tipo": 2
},
"pedidoDados": {
"idSistema": "DASNSIMEI",
"idServico": "GERARDASEXCESSO153",
"versaoSistema": "1.0",
"dados": "{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":\"2022\"}"
}
}
```

## Dados de Saída

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Código retornado no acionamento do serviço. | String (3) |
| dados | Estrutura de dados de retorno. | Object documentoArrecadacao |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. | Array de object mensagens |

*Object documentoArrecadacao:*

| Campo | Descrição | Tipo |
| --- | --- | --- |
| periodoApuracao | Período de apuração no formato AAAAMM | String (6) |
| numeroDocumento | Número do documento de arrecadação. | String (17) |
| dataVencimento | Data de vencimento no formato data (DD/MM/YYYY) | String |
| dataLimiteAcolhimento | Data de validade no formato data (DD/MM/YYYY) | String |
| observacao1 | Campo observação 1 | String (50) |
| observacao2 | Campo observação 2 | String (50) |
| observacao3 | Campo observação 3 | String (50) |
| valores | Estrutura com os valores do documento. | Object valores |
| composicao | Estrutura com as composições do documento. | Array de object composicao |
| documento | Estrutura para o PDF do Documento de Arrecadação. | Object arquivoPdf |

*Object valores:*

| Campo | Descrição | Tipo |
| --- | --- | --- |
| valorPrincipal | Valor principal. | Number (0 a 99999999.99) |
| valorMulta | Valor da multa. | Number (0 a 99999999.99) |
| valorJuros | Valor dos juros. | Number (0 a 99999999.99) |
| valorTotal | Valor total. | Number (0 a 99999999.99) |

*Object composicao:*

| Campo | Descrição | Tipo |
| --- | --- | --- |
| periodoApuracao | Período de apuração no formato AAAAMM | Number (6) |
| codigo | Código de receita. | Number (4) |
| denominacao | Denominação do código de receita. | String (50) |
| valores | Estrutura com os valores do documento. | Object valores |

*Object arquivoPdf:*

| Campo | Descrição | Tipo |
| --- | --- | --- |
| nomeArquivo | Nome do arquivo para o PDF | String |
| pdf | Conteúdo do PDF codificado em base 64. | String |

*Object mensagens:*

| Campo | Descrição | Tipo |
| --- | --- | --- |
| codigo | Código da mensagem. | String |
| texto | Texto da mensagem. | String |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno Emitir DAS de Excesso de Receita Bruta](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/exemplos/retorno_emitir_das_excesso/)
