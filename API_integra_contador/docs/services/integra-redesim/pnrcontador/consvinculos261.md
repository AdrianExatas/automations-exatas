---
key: "PNRCONTADOR.CONSVINCULOS261"
family: "integra-redesim"
systemId: "PNRCONTADOR"
serviceId: "CONSVINCULOS261"
version: null
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consultar Vínculos

Consultar Vínculos.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PNRCONTADOR.CONSVINCULOS261` |
| Família | `integra-redesim` |
| Caminho físico | `POST /Consultar` |
| Versão | Não informada |
| Situação oficial | 2/12/2025 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Não indicada |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto Dados: | size | Número | SIM | — | Quantidade de registros por página. Valor padrão: 10. Valor máximo: 50. |
| Dados de Entrada — Objeto Dados: | lastCnpj | Texto | NÃO | — | Cursor de paginação. Parâmetro opcional pra a primeira requisição. Caso ainda exista CNPJs vinculados, a busca da próxima página é realizada a partir do CNPJ informado neste parâmetro. |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Texto (3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Lista de Objetos Mensagem | — | — | Mensagem explicativa retornada no acionamento do serviço. É uma lista composta de código e texto da mensagem. O campo código é um texto que representa um código interno do negócio. |
| Dados de Saída | dados | Objeto Página | — | — | JSON serializado contendo uma página de empresas. |
| Dados de Saída | codigo | Texto | — | — | Código da mensagem retornada pelo serviço. |
| Dados de Saída | texto | Texto | — | — | Texto explicativo da mensagem. |
| Dados de Saída | cnpjs | Lista de Objetos Empresa | — | — | Lista de empresas na página atual. |
| Dados de Saída | totalInThePage | Número | — | — | Total de registros retornados na página atual. |
| Dados de Saída | totalInTheDatabase | Número | — | — | Total de registros existentes na base de dados. |
| Dados de Saída | lastCnpj | Texto | — | — | Cursor de paginação. Caso ainda exista CNPJs vinculados, a busca da próxima página é realizada a partir do CNPJ informado neste campo. |
| Dados de Saída | cnpj | Texto | — | — | Cadastro Nacional da Pessoa Jurídica da empresa. |
| Dados de Saída | tipoEstabelecimento | Texto | — | — | Tipo de estabelecimento da empresa. |
| Dados de Saída | situacaoCadastral | Objeto SituacaoCadastral | — | — | Situação cadastral da empresa. |
| Dados de Saída | uf | Texto (2) | — | — | Unidade federativa da empresa. |
| Dados de Saída | codigoMunicipio | Texto | — | — | Código do município onde a empresa está cadastrada. |
| Dados de Saída | nomeMunicipio | Texto | — | — | Nome do município onde a empresa está cadastrada. |
| Dados de Saída | descricao | Texto | — | — | Descrição da situação cadastral. Pode ser nulo. |

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
        "idServico": "CONSVINCULOS261",
        "versaoSistema": "1.0",
        "dados": "{ \"pagination\": { \"size\": 50 } }"
        OU
        "dados": "{ \"pagination\": { \"size\": 50, \"lastCnpj\"\"99999999999999\"} }"
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
        "idServico": "CONSVINCULOS261",
        "versaoSistema": "1.0",
        "dados": "{ \"pagination\": { \"size\": 5 } }"
    },
    "status": 200,
    "mensagens": [
        {
            "codigo": "Sucesso-PNRCONTADOR",
            "texto": "Requisição efetuada com sucesso."
        }
    ],
    "dados": "{\"cnpjs\":[{\"cnpj\":\"99999999999999\\"tipoEstabelecimento\":\"Matriz\",\"situacaoCadastral\":{\"codigo\":\"02\\"descricao\":\"Ativa\"},\"uf\":\"BA\",\"codigoMunicipio\":\"3287\\"nomeMunicipio\":null},{\"cnpj\":\"99999999999999\\"tipoEstabelecimento\":\"Matriz\",\"situacaoCadastral\":{\"codigo\":\"02\\"descricao\":\"Ativa\"},\"uf\":\"AP\",\"codigoMunicipio\":\"0667\\"nomeMunicipio\":null},{\"cnpj\":\"99999999999999\\"tipoEstabelecimento\":\"Matriz\",\"situacaoCadastral\":{\"codigo\":\"02\\"descricao\":\"Ativa\"},\"uf\":\"AP\",\"codigoMunicipio\":\"0667\\"nomeMunicipio\":null},{\"cnpj\":\"99999999999999\\"tipoEstabelecimento\":\"Matriz\",\"situacaoCadastral\":{\"codigo\":\"02\\"descricao\":\"Ativa\"},\"uf\":\"AM\",\"codigoMunicipio\":\"0255\\"nomeMunicipio\":null},{\"cnpj\":\"99999999999999\\"tipoEstabelecimento\":\"Matriz\",\"situacaoCadastral\":{\"codigo\":\"02\\"descricao\":\"Ativa\"},\"uf\":\"AM\",\"codigoMunicipio\":\"0255\\"nomeMunicipio\":null}],\"totalInThePage\":5,\"totalInTheDatabase\":16\"lastCnpj\":\"99999999999999\"}"
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

- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/servicos/consultar_vinculos/))
- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_consultar_vinculos/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/servicos/consultar_vinculos/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_consultar_vinculos/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `7885e47f4262a6bf2348fe28a3bbf606c452317acb82a9f1de74a1aa29ecb135`
