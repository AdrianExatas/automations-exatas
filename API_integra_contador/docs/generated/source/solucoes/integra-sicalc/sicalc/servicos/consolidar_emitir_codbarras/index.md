---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/servicos/consolidar_emitir_codbarras/"
sourceUpdatedAt: "23 de junho de 2026 19:14:31 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "0d96e07ffba7cc56895cd1cce1aefbbbb78b9f1a37bf666124a880f05e67ccd1"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/servicos/consolidar_emitir_codbarras/).

# Consolidar e emitir o código de barras do Darf calculado

**Descrição**: consolida o crédito tributário e gera o código de barras do Darf retornando os campos do código de barras e os valores consolidados.

**Status HTTP**:

- 200 : Darf gerado com sucesso

Regras

**a)** Só é possível emitir código de barras caso a receita e extensão estejam habilitadas para emissão, esta ação é de responsabilidade única da Receita Federal. Em caso de dúvidas, acionar os canais de atendimento da Receita Federal.

**b)** É possivel verificar se determinado código de receita e extensão permite a emissão do código de barras através do serviço [CONSULTAAPOIORECEITAS52.](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/servicos/apoio_consulta_receitas_do_sicalc/)

Baseado nos parâmetros de entrada fornecidos pelo chamador, o serviço:

• monta uma chamada para a funcionalidade de consolidação (cálculo de multa e juros) • gera o código de barras do Darf a partir do resultado da consolidação • devolve ao chamador:

a) o resultado do cálculo em uma propriedade de nome *consolidado* b) a propriedade *codigoDeBarras*, com os campos do código de barras c) a propriedade *numeroDocumento*, com o número do documento do Darf

Observação

Este serviço retorna apenas o código de barras. Caso precise do PDF, é preciso acionar o serviço [CONSOLIDARGERARDARF51.](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/servicos/consolidar_emitir_um_darf/)

Identificação no Pedido de Dados

idSistema: SICALC idServico: GERARDARFCODBARRA53 versaoSistema: "2.9"

**Dados de entrada**

**Campos do objeto `dados` (texto em formato JSON com caracteres de escape)**:

| Campo | Descrição | Tipo | Obrigatório | Observação |
| --- | --- | --- | --- | --- |
| uf | Unidade Federativa | texto | Não | Quando não informado, o sistema pode usar dados cadastrais do contribuinte |
| município | Município de domicílio | numérico | Não | Código baseado na Tabela de Órgãos e Municípios da RFB (veja o item: Dados de dominio ). Quando não informado, o sistema pode usar dados cadastrais do contribuinte |
| codigoReceita | Código da receita | numérico | Sim | Código baseado na Tabela de Receitas da RFB (veja o item: Dados de dominio ) |
| codigoReceitaExtensao | Código da extensão da receita | numérico | Sim | Código baseado na Tabela de Receitas da RFB (veja o item: Dados de dominio ) |
| numeroReferencia | Número de referência utilizado no preenchimento do Darf | numérico | Não | veja o item: Dados de dominio |
| tipoPA | Tipo do período de apuração | texto | Não | veja o item: Dados de dominio |
| dataPA | Data do período de apuração | texto | Sim | veja o item: Dados de dominio |
| vencimento | Data de vencimento do tributo | texto | Não | Utilizar o formato ISO 8601 ( aaaa-mm-ddThh:mm:ss ), não enviar simultaneamente com o parâmetro cota |
| cota | Número da cota (para os débitos que possuem cotas) | numérico | Não | não enviar simultaneamente com o parâmetro vencimento |
| valorImposto | Valor do imposto | numérico | Sim |  |
| valorMulta | Valor da multa - Preenchido somente no caso de Darf manual | numérico | Não |  |
| valorJuros | Valor dos juros - Preenchido somente no caso de Darf manual | numérico | Não |  |
| ganhoCapital | Indicador de ganho de capital | boolean | Não |  |
| dataAlienacao | Data da alienação referente ao ganho de capital | boolean | Não | Utilizar o formato ISO 8601 ( aaaa-mm-ddThh:mm:ss ) |
| dataConsolidacao | Data da consolidação/arrecadação | texto | Sim | Utilizar o formato ISO 8601 ( aaaa-mm-ddThh:mm:ss ) |
| observacao | Texto adicionado ao Darf | texto | Não |  |
| cno | Número do cadastro nacional de obras | numérico | Não |  |
| cnpjPrestador |  | texto | Não |  |

*** Campos condicionais - regras de obrigatoriedade**:

- cota vs vencimento : são mutuamente excludentes
- se a receita/extensão usa quota : cota ou vencimento podem ser informados
- se a receita/extensão não usa quota : vencimento é obrigatório , cota não deve ser informada
- numeroReferencia : obrigatório quando a receita exige número de referência (ex: ITR, Imposto de Importação)
- ganhoCapital e dataAlienacao : obrigatórios para 4600-02 (ganho de capital)

**Exemplo: conteúdo body JSON de entrada**

```text
{
"contratante": {
"numero": "99999999999999",
"tipo": "2"
},
"autorPedidoDados": {
"numero": "99999999999999",
"tipo": "2"
},
"contribuinte": {
"numero": "99999999999999",
"tipo": "2"
},
"pedidoDados": {
"idSistema": "SICALC",
"idServico": "GERARDARFCODBARRA53",
"versaoSistema": "2.9",
"dados": "{\"uf\": \"SP\", \"municipio\": \"7107\", \"codigoReceita\": \"1162\", \"codigoReceitaExtensao\": \"01\", \"tipoPA\": \"ME\", \"dataPA\": \"01/2022\", \"vencimento\": \"2022-02-18T00:00:00\", \"valorImposto\": \"1000.00\", \"dataConsolidacao\": \"2022-08-08T00:00:00\", \"observacao\": \"Darf calculado\"}"
}
}
```

**Dados de saída**

**Estrutura da resposta**:

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | String |
| mensagens | Array de mensagens explicativas retornadas no acionamento do serviço. Cada mensagem contém os campos codigo (String) e texto (String). | Array |
| dados | Estrutura de dados de retorno contendo os valores consolidados, código de barras e número do documento. | String |

**Observação**: o campo `dados` contém string com texto em formato JSON com caracteres de escape, que precisam ser interpretadas para acessar os objetos `consolidado`, `codigoDeBarras` e `numeroDocumento`.

No atributo dados, será retornado os seguintes objetos:

**Objeto `consolidado` (dentro do campo `dados`)**:

| Campo | Descrição | Tipo |
| --- | --- | --- |
| valorPrincipalMoedaCorrente | Valor principal atualizado | texto |
| valorTotalConsolidado | Valor total atualizado | texto |
| valorMultaMora | Valor de multa de mora calculada | texto |
| percentualMultaMora | Percentual de multa de mora calculada | numérico |
| valorJuros | Valor de juros calculada | texto |
| percentualJuros | Percentual de juros calculado | numérico |
| termoInicialJuros | Data em que começa a incidência de juros | texto |
| dataArrecadacaoConsolidacao | Data de consolidação do cálculo | texto |
| dataValidadeCalculo | Data limite em que o Darf pode ser pago na rede bancária | texto |

**Objeto `codigoDeBarras` (dentro do campo `dados`)**:

| Campo | Tipo | Descrição |
| --- | --- | --- |
| codigo44 | String | Código de barras com 44 posições |
| campo1ComDV | String | Campo 1 do código de barras com dígito verificador |
| campo2ComDV | String | Campo 2 do código de barras com dígito verificador |
| campo3ComDV | String | Campo 3 do código de barras com dígito verificador |
| campo4ComDV | String | Campo 4 do código de barras com dígito verificador |

**Campo `numeroDocumento` (dentro do campo `dados`)**:

- numeroDocumento : String contendo o número do documento gerado

**Exemplo: conteúdo payload JSON de saída**

```text
{
"status": 200,
"dados": "{\"consolidado\": {\"valorPrincipalMoedaCorrente\": 1000.00, \"valorTotalConsolidado\": 1150.00, \"valorMultaMora\": 100.00, \"percentualMultaMora\": 10.00, \"valorJuros\": 50.00, \"percentualJuros\": 5.00, \"termoInicialJuros\": \"2022-02-19T00:00:00\", \"dataArrecadacaoConsolidacao\": \"2022-08-08T00:00:00\", \"dataValidadeCalculo\": \"2022-08-09T00:00:00\"}, \"codigoDeBarras\": {\"codigo44\": \"11620000011500071071162019202201\", \"campo1ComDV\": \"11620.00001\", \"campo2ComDV\": \"11500.007107\", \"campo3ComDV\": \"71162.019202\", \"campo4ComDV\": \"201\"}, \"numeroDocumento\": \"22080812345678901234\"}",
"mensagens": [
{
"codigo": "[Sucesso-SICALC]",
"texto": "Requisição efetuada com sucesso."
}
]
}
```

**Descrição dos Objetos de Saída**:

- consolidado : objeto JSON contendo os valores consolidados do crédito tributário
- codigoDeBarras : objeto JSON contendo os campos do código de barras para impressão/leitura
- numeroDocumento : string contendo o número do documento gerado

**Observação**: para mais exemplos detalhados, consulte: [Darf com código de barras](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_consolidar_emitir_um_darf_codbarras/)

## Observações importantes

### Tipos de contribuinte

- Tipo "1" : CPF (pessoa física)
- Tipo "2" : CNPJ (pessoa jurídica)

### Formato de datas

- dataPA : MM/AAAA para mensal ou AAAA para anual
- dataConsolidacao, vencimento, dataAlienacao : ISO 8601 ( YYYY-MM-DDTHH:mm:ss ou YYYY-MM-DDTHH:mm:ss.SSSZ )

### Código de município

- deve utilizar o código TOM (Tabela de Órgãos e Municípios)
- códigos IBGE não são aceitos e resultarão em erro 400 (Bad Request)

### Validações

- receitas inexistentes resultarão em erro
- apenas receitas habilitadas para código de barras pela RFB podem utilizar este serviço
- use o serviço [CONSULTAAPOIORECEITAS52](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/servicos/apoio_consulta_receitas_do_sicalc/) para verificar se a receita permite código de barras
- datas de consolidação inválidas (ex: feriados, finais de semana) podem causar rejeição
- valores devem respeitar os limites máximos estabelecidos

### Diferença entre serviços

- GERARDARFCODBARRA53 : retorna consolidado , codigoDeBarras e numeroDocumento
- CONSOLIDARGERARDARF51 : retorna consolidado , darf (PDF) e numeroDocumento
- Se precisar tanto do PDF quanto do código de barras, faça duas chamadas separadas

**Versão da API**: 2.9
