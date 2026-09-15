---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/servicos/consultar_renuncias/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "7f1d042c0b211834c8b3477bf54465d70cf48c022498b099b6952b08caf736da"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/servicos/consultar_renuncias/).

# Consultar Renúncias

Este serviço permite consultar as renúncias de vínculo contabilista realizadas pelo contribuinte.

Identificação no Pedido de Dados

idSistema: PNRCONTADOR idServico: CONSRENUNCIA263

**Dados de Entrada**

Para a consulta por datas, os campos `pedidoDados.dados.dtInicio` e `pedidoDados.dados.dtFim` devem obedecer ao formato `AAAA-MM-DD`. Também é necessário certificar-se de que a data fim (`dtFim`) seja posterior à data início (`dtInicio`).

Objeto Dados:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| dtInicio | Data início da consulta por período. É necessário informar tanto dtInicio quanto dtFim para que a consulta seja feita em um período específico. Por padrão, o período é indeterminado. | Texto (AAAA-MM-DD) | NÃO |
| dtFim | Data fim da consulta por período É necessário informar tanto dtInicio quanto dtFim para que a consulta seja feita em um período específico. Por padrão, o período é indeterminado. | Texto (AAAA-MM-DD) | NÃO |
| page | Número que indica a página. A primeira página tem índice 0. Valor padrão: 0 | Número | NÃO |
| pageSize | Quantidade de registros por página. Valor padrão: 10. Valor máximo: 50. | Número | NÃO |

**Exemplo: conteúdo body json de entrada**

```text
{
"contratante": {
"numero": "00000000000101",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000101",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000101",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PNRCONTADOR",
"idServico": "CONSRENUNCIA263",
"versaoSistema": "1.0",
"dados": "{\"page\": 0, \"pageSize\": 10, \"dtInicio\":\"2000-01-30\"\"dtFim\":\"2000-01-30\"}"
}
}
```

**Dados de Saída**

O retorno é a lista das renúncias efetuadas pelo contribuinte, dentro do período informado.

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Texto (3) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É uma lista composta de código e texto da mensagem. O campo código é um texto que representa um código interno do negócio. | Lista de Objetos Mensagem |
| dados | JSON serializado contendo uma página de empresas. | Objeto Página |

#### Objeto: Mensagem

| Campo | Descrição | Tipo |
| --- | --- | --- |
| codigo | Código da mensagem retornada pelo serviço. | Texto |
| texto | Texto explicativo da mensagem. | Texto |

#### Objeto: Página

| Campo | Descrição | Tipo |
| --- | --- | --- |
| content | Lista de empresas na página atual. | Lista de Objetos Renúncia |
| empty | Indica se a página está vazia. | Booleano |
| first | Indica se é a primeira página. | Booleano |
| last | Indica se é a última página. | Booleano |
| number | Número da página atual. | Número |
| numberOfElements | Número de elementos na página atual. | Número |
| pageable | Informações de paginação. | Objeto Pageable |
| size | Quantidade de elementos por página. | Número |
| sort | Informações sobre ordenação. | Objeto Sort |
| totalElements | Total de elementos na resposta. | Número |
| totalPages | Total de páginas disponíveis. | Número |

#### Objeto: Renúncia

Os campos `cnpjSolicitante`, `cnpjRenunciante`, `cpfSolicitante` e `cpfRenunciante` podem ser nulos. No entanto, pelo menos um dos campos `Solicitante` será sempre preenchido, e pelo menos um dos campos `Renunciante` será sempre preenchido. Isso indica se o autor da renúncia foi uma pessoa física ou jurídica.

| Campo | Descrição | Tipo |
| --- | --- | --- |
| id | Identificador único da renúncia. | Número |
| cnpjRenunciada | CNPJ da empresa que foi renunciada. | Texto |
| dataRenuncia | Data da renúncia em milissegundos (timestamp). | Número (timestamp) |
| cnpjSolicitante | CNPJ do solicitante da renúncia (pode ser nulo). | Texto |
| cnpjRenunciante | CNPJ do renunciante (pode ser nulo). | Texto |
| cpfSolicitante | CPF do solicitante da renúncia (pode ser nulo). | Texto |
| cpfRenunciante | CPF do renunciante (pode ser nulo). | Texto |
| cpfLogado | CPF do usuário logado que realizou a requisição. | Texto |

#### Objeto: Pageable

| Campo | Descrição | Tipo |
| --- | --- | --- |
| offset | Deslocamento do primeiro elemento. | Inteiro |
| paged | Indica se a paginação está ativada. | Booleano |
| pageNumber | Número da página atual. | Inteiro |
| pageSize | Quantidade de elementos por página. | Inteiro |
| sort | Informações sobre ordenação. | Objeto Sort |
| unpaged | Indica se a paginação está desativada. | Booleano |

#### Objeto: Sort

| Campo | Descrição | Tipo |
| --- | --- | --- |
| sorted | Indica se está ordenado. | Booleano |
| unsorted | Indica se não está ordenado. | Booleano |
| empty | Indica se a ordenação está vazia. | Booleano |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno Consultar Renúncias](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_consultar_renuncias/)
