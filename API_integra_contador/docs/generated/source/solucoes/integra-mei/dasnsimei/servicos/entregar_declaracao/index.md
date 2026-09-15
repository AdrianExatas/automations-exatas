---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/servicos/entregar_declaracao/"
sourceUpdatedAt: "26 de agosto de 2026 19:58:59 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "7d52f96e1223e96cf1d1facb9a62958d284e7d2fe02bb74108480abb4f20939d"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/servicos/entregar_declaracao/).

# Entregar Declaração

**ATENÇÃO: A FUNCIONALIDADE AINDA NÃO ESTÁ DISPONÍVEL PARA CONTRATAÇÃO E PODE SOFRER ALTERAÇÕES**

A funcionalidade Entregar DASN-Simei permite a entrega e transmissão da declaração anual do MEI (DASN-Simei) através de um serviço, sem a necessidade de preenchimento dos dados de forma manual.

Identificação no Pedido de Dados

idSistema: DASNSIMEI idServico: TRANSDECLARACAO151

## Dados de Entrada

*Object dados:*

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| cnpjCompleto | CNPJ completo do contribuinte. Deve-se informar o CNPJ sem máscara de formatação. | String (14) [AAAAAAAAAAAAAA] | SIM |
| anoCalendario | Ano-calendário para o qual se deseja entregar a declaração. | Number (4) | SIM |
| declaracao | Estrutura com os dados da declaração | Object declaracaoEntrega | SIM |

*Object declaracaoEntrega:*

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| valorReceitaComercio | Valor da receita bruta anual para comércio, indústria, receitas de transporte intermunicipal e interestadual e fornecimento de refeições. | Number (0 a 99999999.99) | SIM |
| valorReceitaServico | Valor da receita bruta anual para prestação de serviços, locação e demais receitas da atividade sem incidência de ICMS e ISS, exceto transporte intermunicipal e interestadual. | Number (0 a 99999999.99) | SIM |
| indicadorEmpregado | Indica se possuiu empregado durante o período abrangido pela declaração. | Boolean | SIM |

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
"idServico": "TRANSDECLARACAO151",
"versaoSistema": "1.0",
"dados": "{\"cnpjCompleto\":\"11111111111111\",\"anoCalendario\":\"2025\",\"declaracao\":{\"valorReceitaComercio\":82000.0,\"valorReceitaServico\":0.0,\"indicadorEmpregado\":false}}"
}
}
```

## Dados de Saída

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Código retornado no acionamento do serviço. | String (3) |
| dados | Estrutura de dados de retorno. | Object declaracaoTransmitida |
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

Json de exemplo: [retorno Entregar Declaração](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/exemplos/retorno_entregar_declaracao/)
