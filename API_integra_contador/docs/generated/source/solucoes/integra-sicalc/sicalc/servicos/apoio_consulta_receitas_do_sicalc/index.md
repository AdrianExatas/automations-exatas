---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/servicos/apoio_consulta_receitas_do_sicalc/"
sourceUpdatedAt: "23 de junho de 2026 19:14:31 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "cac2ab59a88cdf44896643b2107fad52ec1cdd147643f3a91d89fc82a8ea641a"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/servicos/apoio_consulta_receitas_do_sicalc/).

# Consultar código receita sicalc

**Descrição**: retorna as extensões e informações de parâmetros de entrada para uma receita específica.

Baseado nos parâmetros de entrada fornecidos pelo chamador, o serviço:

• monta uma chamada ao serviço que consulta a base do cadastro de receitas administradas pela Receita Federal do Brasil

• devolve ao chamador um objeto contendo 3 estruturas (obrigatórios, opcionais e informações) informando quais são os atributos de cada categoria em relação ao serviço "Consolidar e emitir um DARF"

Identificação no Pedido de Dados

idSistema: SICALC idServico: CONSULTAAPOIORECEITAS52 versão: 2.9

**Status HTTP**:

- 200 : Informações e parâmetros da receita retornados com sucesso
- 404 : A receita consultada não existe

**Dados de entrada**

Objeto dados:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| codigoReceita | Código da Receita | String | SIM |

**Exemplo: conteúdo body JSON de entrada**

```text
{
"contratante": {
"numero": "00000000000000",
"tipo": "2"
},
"autorPedidoDados": {
"numero": "00000000000",
"tipo": "1"
},
"contribuinte": {
"numero": "00000000000",
"tipo": "1"
},
"pedidoDados": {
"idSistema": "SICALC",
"idServico": "CONSULTAAPOIORECEITAS52",
"versaoSistema": "2.9",
"dados": "{\"codigoReceita\": \"6106\"}"
}
}
```

**Dados de saída**

**Estrutura da resposta**:

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | String |
| mensagens | Array de mensagens explicativas retornadas no acionamento do serviço. Cada mensagem contém os campos codigo (String) e texto (String). | Array |
| dados | Estrutura de dados de retorno contendo as informações da receita. | String |

**Observação**: o campo `dados` contém string com texto em formato JSON com caracteres de escape, que precisam ser interpretadas para acessar o objeto `receita`, dentro do qual estão os objetos `obrigatorios`, `opcionais` e `informacoes` no array `extensoes`.

No atributo dados, será retornado os seguintes objetos:

Objeto: receita

| Campo | Descrição | Tipo |
| --- | --- | --- |
| codigoReceita | Código de receita informado na chamada | String |
| descricaoReceita | Nome descritivo do código de receita | String |
| extensoes | Array contendo 3 objetos: obrigatorios , opcionais e informacoes , que descrevem os atributos necessários para utilizar esta receita no serviço "Consolidar e emitir um DARF" | Array |

(1) Objeto: obrigatórios

| Campo | Descrição | Tipo |
| --- | --- | --- |
| codigoReceita | Indica se o envio do campo é obrigatório. | boolean |
| codigoReceitaExtensao | Indica se o envio do campo é obrigatório. | boolean |
| cota | Indica se o envio do campo é obrigatório. | boolean |
| dataConsolidacao | Indica se o envio do campo é obrigatório. | boolean |
| dataPA | Indica se o envio do campo é obrigatório. | boolean |
| referencia | Indica se o envio do campo é obrigatório. | boolean |
| tipoPA | Indica se o envio do campo é obrigatório. | boolean |
| valorImposto | Indica se o envio do campo é obrigatório. | boolean |
| vencimento | Indica se o envio do campo é obrigatório. | boolean |

(2) Objeto: opcionais

| Campo | Descrição | Tipo |
| --- | --- | --- |
| cno | Indica se o envio do campo é opcional | boolean |
| cnpjPrestador | Indica se o envio do campo é opcional | boolean |
| dataAlienacao | Indica se o envio do campo é opcional | boolean |
| ganhoCapital | Indica se o envio do campo é opcional | boolean |
| municipio | Indica se o envio do campo é opcional | boolean |
| observacao | Indica se o envio do campo é opcional | boolean |
| referencia | Indica se o envio do campo é opcional | boolean |
| uf | Indica se o envio do campo é opcional | boolean |
| valorJuros | Indica se o envio do campo é opcional | boolean |
| valorMulta | Indica se o envio do campo é opcional | boolean |

(3) Objeto: informacoes

| Campo | Descrição | Tipo |
| --- | --- | --- |
| calculado | Informa que o débito pode ter os acréscimos legais calculados pelo sistema de cálculo | boolean |
| codigoBarras | Informa se a receita permite a emissão do DARF com código de barras | Boolean |
| codigoReceitaExtensao | Informa a extensão da receita | String |
| criacao | Informa a data de criação da receita | String |
| descricaoReceitaExtensao | Informa a descrição do código de extensão da receita | String |
| descricaoReferencia | Informa que tipo de dado é aguardado pelo atributo referência | String |
| exigeMatriz | Informa que somente pode ser utilizado o CNPJ da Matriz para débito | Boolean |
| manual | Informa que o débito não pode ter os acréscimos legais calculados pelo sistema de cálculo e deve ter todos os seus atributos preenchidos pelo usuário (incluindo os de valores) | Boolean |
| pf | Informa que o código de receita pode ser utilizado num débito de pessoa física | Boolean |
| pj | Informa que o código de receita pode ser utilizado num débito de pessoa jurídica | Boolean |
| vedaValor | Informa se o valor total do DARF pode ser inferior a R$ 10,00 | Boolean |

**Exemplo: conteúdo payload JSON de saída**

```text
{
"status": 200,
"dados": "{\"receita\": {\"codigoReceita\": \"6106\", \"descricaoReceita\": \"IRPF - Ganhos de Capital\", \"extensoes\": [{\"obrigatorios\": {\"codigoReceita\": true, \"codigoReceitaExtensao\": true, \"dataPA\": true, \"valorImposto\": true, \"dataConsolidacao\": true}}, {\"opcionais\": {\"dataAlienacao\": true, \"ganhoCapital\": true, \"observacao\": true}}, {\"informacoes\": {\"calculado\": true, \"codigoBarras\": true, \"pf\": true, \"pj\": false}}]}}",
"mensagens": [
{
"codigo": "[Sucesso-SICALC]",
"texto": "Requisição efetuada com sucesso."
}
]
}
```

**Observação**: para mais exemplos detalhados, consulte: [Apoio Consultar Código Receita Sicalc](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/exemplos/retorno_apoio_consulta_receitas_do_sicalc/)

## Observações importantes

### Tipos de contribuinte

- Tipo "1" : CPF (pessoa física)
- Tipo "2" : CNPJ (pessoa jurídica)

### Uso do serviço

Este serviço deve ser utilizado **antes** de chamar os serviços de consolidação/geração de DARF para:

- verificar se o código de receita existe
- identificar quais campos são obrigatórios para aquela receita específica
- identificar quais campos são opcionais
- obter informações sobre as características da receita (permite código de barras, cálculo automático, etc.)

### Estrutura do array extensoes

O array `extensoes` retornado sempre contém 3 objetos na seguinte ordem:

- Primeiro objeto : campos obrigatórios ( obrigatorios )
- Segundo objeto : campos opcionais ( opcionais )
- Terceiro objeto : informações sobre a receita ( informacoes )

**Versão da API**: 2.9
