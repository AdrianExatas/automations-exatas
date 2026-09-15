---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/servicos/gerar_dasavulso/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "1786badab1ea7d6441bc51c4a0756e08be0681e8eed90e33f66899d419916e44"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/servicos/gerar_dasavulso/).

# Emitir DAS Avulso

Esta funcionalidade gera um DAS Avulso.

PedidoDados

idSistema: PGDASD idServico: GERARDASAVULSO19 versaoSistema: "1.0"

**Dados de Entrada**

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| periodoApuracao | Período de apuração que se deseja gerar o DAS Avulso no formato AAAAMM | String (6) | SIM |
| listaTributos | Lista de tributos para serem incluídos no DAS Avulso. | Array de Object Tributo | SIM |
| dataConsolidacao | Data que se deseja emitir o DAS. Caso a emissão seja no próprio dia não informar este campo. | Number | NÃO |
| prorrogacaoEspecial | Indicador de Prorrogação Especial . Somente utilizar para os períodos prorrogados entre 03/2020 e 05/2020 ou 03/2021 e 05/2021 | Number | NÃO |

Objeto: Tributo

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| codigo | Código do tributo | Number | SIM |
| valor | Valor do tributo para ser gerado o DAS | Number | SIM |
| codMunicipio | Código de município TOM. Obrigatório para tributo ISS | Number | NÃO |
| uf | Destino da UF. Obrigatório para ICMS | String (2) | NÃO |

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
"idSistema": "PGDASD",
"idServico": "GERARDASAVULSO19",
"versaoSistema": "1.0",
"dados": "{\"PeriodoApuracao\":202401,\"ListaTributos\":[{\"Codigo\":1\"Valor\":111.22,\"CodMunicipio\":0375,\"uf\":\"PA\"},{\"Codigo\":1\"Valor\":20.50,\"uf\":\"RJ\"},{\"Codigo\":1001,\"Valor\":100}]}"
}
}
```

**Dados de Saída**

São retornados os dados do DAS emitido.

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. | Array |
| dados | Estrutura de dados de retorno, contendo uma lista em SCAPED Texto JSON com o objeto Das . | String |

Objeto: Das

| Campo | Descrição | Tipo |
| --- | --- | --- |
| pdf | Pdf do DAS no formato Texto Base 64 | String |
| cnpjCompleto | Número do cnpj sem formatação | String |
| detalhamento | Detalhamento do DAS | Object |

Objeto: DetalhamentoDas

| Campo | Descrição | Tipo |
| --- | --- | --- |
| periodoApuracao | Período de Apuração no formato AAAAMM | String (6) |
| numeroDocumento | Número do documento gerado | String (17) |
| dataVencimento | Data de vencimento no formato AAAAMMDD | String (8) |
| dataLimiteAcolhimento | Data limite para acolhimento no formato AAAAMMDD | String (8) |
| valores | Discriminação dos Valores | Object |
| observacao1 | Observação 1 | String |
| observacao2 | Observação 2 | String |
| observacao3 | Observação 3 | String |
| composicao | Composição do DAS gerado. | Array de Object Composicao |

Objeto: Valores

| Campo | Descrição | Tipo |
| --- | --- | --- |
| principal | Valor do principal | Number |
| multa | Valor da multa | Number |
| juros | Valor dos juros | Number |
| total | Valor total | Number |

Objeto: Composicao

| Campo | Descrição | Tipo |
| --- | --- | --- |
| periodoApuracao | Período de apuração do tributo no formato AAAAMM | String (6) |
| codigo | Código do tributo | String |
| denominacao | Descrição do nome/destino do tributo | String |
| valores | Discriminação dos valores do tributo | Object |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno gerar DAS avulso](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_gerar_dasavulso/)
