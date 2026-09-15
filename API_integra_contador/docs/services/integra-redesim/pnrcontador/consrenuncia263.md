---
key: "PNRCONTADOR.CONSRENUNCIA263"
family: "integra-redesim"
systemId: "PNRCONTADOR"
serviceId: "CONSRENUNCIA263"
version: null
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar Renúncias

Consultar Renúncias.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PNRCONTADOR.CONSRENUNCIA263` |
| Família | `integra-redesim` |
| Caminho físico | `POST /Consultar` |
| Versão | Não informada |
| Situação oficial | 2/12/2025 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Não indicada |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto Dados: | dtInicio | Texto (AAAA-MM-DD) | NÃO | — | Data início da consulta por período. É necessário informar tanto dtInicio quanto dtFim para que a consulta seja feita em um período específico. Por padrão, o período é indeterminado. |
| Dados de Entrada — Objeto Dados: | dtFim | Texto (AAAA-MM-DD) | NÃO | — | Data fim da consulta por período É necessário informar tanto dtInicio quanto dtFim para que a consulta seja feita em um período específico. Por padrão, o período é indeterminado. |
| Dados de Entrada — Objeto Dados: | page | Número | NÃO | — | Número que indica a página. A primeira página tem índice 0. Valor padrão: 0 |
| Dados de Entrada — Objeto Dados: | pageSize | Número | NÃO | — | Quantidade de registros por página. Valor padrão: 10. Valor máximo: 50. |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Texto (3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Lista de Objetos Mensagem | — | — | Mensagem explicativa retornada no acionamento do serviço. É uma lista composta de código e texto da mensagem. O campo código é um texto que representa um código interno do negócio. |
| Dados de Saída | dados | Objeto Página | — | — | JSON serializado contendo uma página de empresas. |
| Dados de Saída | codigo | Texto | — | — | Código da mensagem retornada pelo serviço. |
| Dados de Saída | texto | Texto | — | — | Texto explicativo da mensagem. |
| Dados de Saída | content | Lista de Objetos Renúncia | — | — | Lista de empresas na página atual. |
| Dados de Saída | empty | Booleano | — | — | Indica se a página está vazia. |
| Dados de Saída | first | Booleano | — | — | Indica se é a primeira página. |
| Dados de Saída | last | Booleano | — | — | Indica se é a última página. |
| Dados de Saída | number | Número | — | — | Número da página atual. |
| Dados de Saída | numberOfElements | Número | — | — | Número de elementos na página atual. |
| Dados de Saída | pageable | Objeto Pageable | — | — | Informações de paginação. |
| Dados de Saída | size | Número | — | — | Quantidade de elementos por página. |
| Dados de Saída | sort | Objeto Sort | — | — | Informações sobre ordenação. |
| Dados de Saída | totalElements | Número | — | — | Total de elementos na resposta. |
| Dados de Saída | totalPages | Número | — | — | Total de páginas disponíveis. |
| Dados de Saída | id | Número | — | — | Identificador único da renúncia. |
| Dados de Saída | cnpjRenunciada | Texto | — | — | CNPJ da empresa que foi renunciada. |
| Dados de Saída | dataRenuncia | Número (timestamp) | — | — | Data da renúncia em milissegundos (timestamp). |
| Dados de Saída | cnpjSolicitante | Texto | — | — | CNPJ do solicitante da renúncia (pode ser nulo). |
| Dados de Saída | cnpjRenunciante | Texto | — | — | CNPJ do renunciante (pode ser nulo). |
| Dados de Saída | cpfSolicitante | Texto | — | — | CPF do solicitante da renúncia (pode ser nulo). |
| Dados de Saída | cpfRenunciante | Texto | — | — | CPF do renunciante (pode ser nulo). |
| Dados de Saída | cpfLogado | Texto | — | — | CPF do usuário logado que realizou a requisição. |
| Dados de Saída | offset | Inteiro | — | — | Deslocamento do primeiro elemento. |
| Dados de Saída | paged | Booleano | — | — | Indica se a paginação está ativada. |
| Dados de Saída | pageNumber | Inteiro | — | — | Número da página atual. |
| Dados de Saída | pageSize | Inteiro | — | — | Quantidade de elementos por página. |
| Dados de Saída | unpaged | Booleano | — | — | Indica se a paginação está desativada. |
| Dados de Saída | sorted | Booleano | — | — | Indica se está ordenado. |
| Dados de Saída | unsorted | Booleano | — | — | Indica se não está ordenado. |

## Exemplos oficiais e normalizados

### Exemplo 1 — request

Fonte oficial:

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

### Exemplo 2 — response

Fonte oficial:

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
    },
    "status": 200,
    "mensagens": [
        {
            "codigo": "Sucesso-PNRCONTADOR",
            "texto": "Requisição efetuada com sucesso."
        }
    ],
    "dados": "{\"content\":[{\"id\":1234,\"cnpjRenunciada\":\"99999999999999\",\"dataRenuncia\":\"1739242800000\",\"cnpjSolicitante\":null,\"cnpjRenunciante\":null,\"cpfSolicitante\":\"00000000011\",\"cpfRenunciante\":\"00000000011\",\"cpfLogado\":\"00000000011\"}],\"pageable\":{\"pageNumber\":0,\"pageSize\":10,\"sort\":{\"sorted\":false,\"empty\":true,\"unsorted\":true},\"offset\":0,\"paged\":true,\"unpaged\":false},\"last\":false,\"totalElements\":1,\"totalPages\":1,\"size\":10,\"number\":0,\"sort\":{\"sorted\":false,\"empty\":true,\"unsorted\":true},\"numberOfElements\":1,\"first\":true,\"empty\":false}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-redesim/pnrcontador/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-redesim/pnrcontador/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/dados_de_dominio/)

## Anomalias

- **warning / official-pedido-dados-invalid-json:** O envelope oficial é JSON válido, mas o JSON escapado em pedidoDados.dados é inválido. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/servicos/consultar_renuncias/))
- **warning / official-pedido-dados-invalid-json:** O envelope oficial é JSON válido, mas o JSON escapado em pedidoDados.dados é inválido. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_consultar_renuncias/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/servicos/consultar_renuncias/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_consultar_renuncias/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `6c82b8965333aeea8ab4eac51b921e3eeaed34e41679ef5a192a31a197f13dfd`
