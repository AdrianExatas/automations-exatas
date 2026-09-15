---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/servicos/consultar_declaracao/"
sourceUpdatedAt: "26 de agosto de 2026 19:58:59 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "c4e1d8314f73ce2696b7c6a243f1d402533fc90ff2366d98570b53745f56edb6"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/servicos/consultar_declaracao/).

# Consultar Declaração

**ATENÇÃO: A FUNCIONALIDADE AINDA NÃO ESTÁ DISPONÍVEL PARA CONTRATAÇÃO E PODE SOFRER ALTERAÇÕES**

A funcionalidade Consultar Declaração permite a consulta do histórico das declarações transmitidas.

Identificação no Pedido de Dados

idSistema: DASNSIMEI idServico: CONSULTIMADECREC152

## Dados de Entrada

*Object dados:*

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| cnpjCompleto | CNPJ completo do contribuinte. Deve-se informar o CNPJ sem máscara de formatação. | String (14) [AAAAAAAAAAAAAA] | SIM |
| anoCalendario | Ano-calendário para o qual se deseja entregar a declaração. | Number (4) | SIM |

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
"idServico": "CONSULTIMADECREC152",
"versaoSistema": "1.0",
"dados": "{\"cnpjCompleto\":\"11111111111111\", anoCalendario\":\"2022\"}"
}
}
```

## Dados de Saída

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Código retornado no acionamento do serviço. | String (3) |
| dados | Estrutura de dados de retorno. | Array de object declaracaoTransmitida |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. | Array de object mensagens |

*Object declaracaoTransmitida:*

| Campo | Descrição | Tipo |
| --- | --- | --- |
| cnpjCompleto | CNPJ completo do contribuinte. | String (14) [AAAAAAAAAAAAAA] |
| anoCalendario | Ano-calendário da declaração transmitida. | Number (4) |
| nomeEmpresarial | Razão social do contribuinte | String |
| ocupacaoProfissional | Texto informativo de ocupação profissional do contribuinte MEI TAC. | String |
| idDeclaracao | ID da declaração transmitida. | String (15) [AAAAAAAAYYYYSSS] |
| dataTransmissao | Data e hora da transmissão da declaração | Datetime [yyyy-mm-dd hh:mm:ss.fff] |
| codigoTipoDeclaracao | Tipo da declaração transmitida: 1) Original 2) Retificadora 3) Original com Situação Especial 4) Retificadora com Situação Especial 5) Retificadora automática | Number (1) |
| reciboEntrega | Estrutura para o PDF do recibo da declaração. | Object reciboEntrega |
| excessoReceitaBruta | Estrutura com o detalhamento sobre o DAS de excesso de receita bruta. | Object excessoReceita |
| multaAtrasoEntrega | Estrutura com PDF da notificação por atraso de entrega (MAED), PDF do DARF da multa e detalhamento do documento de arrecadação (DARF-MAED). | Object multaAtrasoEntrega |

*Object reciboEntrega:*

| Campo | Descrição | Tipo |
| --- | --- | --- |
| numeroRecibo | Número do recibo da declaração. | String (17) |
| recibo | Estrutura para o PDF do recibo de entrega. | Object arquivoPdf |

*Object excessoReceita:*

| Campo | Descrição | Tipo |
| --- | --- | --- |
| valorLimite | Valor do Limite da Receita Bruta. | Number (0 a 99999999.99) |
| valorExcedido | Valor que excedeu o limite de Receita Bruta. | Number (0 a 99999999.99) |
| apurado | Estrutura que detalha os valores apurados para o DAS de excesso de receita bruta. | Array de object valoresApurado |
| dasExcessoReceita | Estrutura com o detalhamento do documento de arrecadação (DAS de excesso de receita bruta). | Object documentoArrecadacao |

*Object multaAtrasoEntrega:*

| Campo | Descrição | Tipo |
| --- | --- | --- |
| notificacaoMaed | Estrutura para o PDF da notificação MAED. | Object arquivoPdf |
| darf | Estrutura com o detalhamento do documento de arrecadação (DARF MAED). | Object documentoArrecadacao |

*Object arquivoPdf:*

| Campo | Descrição | Tipo |
| --- | --- | --- |
| nomeArquivo | Nome do arquivo para o PDF | String |
| pdf | Conteúdo do PDF codificado em base 64. | String |

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

*Object valoresApurado:*

| Campo | Descrição | Tipo |
| --- | --- | --- |
| valorInss | Valor apurado para o tributo INSS. | Number (0 a 99999999.99) |
| valorIcms | Valor apurado para o tributo ICMS | Number (0 a 99999999.99) |
| valorIss | Valor apurado para o tributo ICMS. | Number (0 a 99999999.99) |
| valorTotal | Valor total apurado. | Number (0 a 99999999.99) |

*Object composicao:*

| Campo | Descrição | Tipo |
| --- | --- | --- |
| periodoApuracao | Período de apuração no formato AAAAMM | Number (6) |
| codigo | Código de receita. | Number (4) |
| denominacao | Denominação do código de receita. | String (50) |
| valores | Estrutura com os valores do documento. | Object valores |

*Object mensagens:*

| Campo | Descrição | Tipo |
| --- | --- | --- |
| codigo | Código da mensagem. | String |
| texto | Texto da mensagem. | String |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno Consultar Declaração](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/exemplos/retorno_consultar_declaracao/)
