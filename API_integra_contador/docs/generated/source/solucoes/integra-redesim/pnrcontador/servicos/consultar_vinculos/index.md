---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/servicos/consultar_vinculos/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "e3f56db631d69a890a4c2715a71e3cdb7450490bf985b74a07b960c27a399c6e"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/servicos/consultar_vinculos/).

# Consultar Vínculos

Este serviço permite consultar as empresas com as quais o contribuinte possui vínculo contabilista.

Identificação no Pedido de Dados

idSistema: PNRCONTADOR idServico: CONSVINCULOS261

**Dados de Entrada**

Para realizar a consulta, é necessário que o `autorPedidoDados` informado na requisição, seja um contador pessoa física ou jurídica que possui vínculo contalista com as empresas que deseja consultar.

Objeto Dados:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| size | Quantidade de registros por página. Valor padrão: 10. Valor máximo: 50. | Número | SIM |
| lastCnpj | Cursor de paginação. Parâmetro opcional pra a primeira requisição. Caso ainda exista CNPJs vinculados, a busca da próxima página é realizada a partir do CNPJ informado neste parâmetro. | Texto | NÃO |

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
"idServico": "CONSVINCULOS261",
"versaoSistema": "1.0",
"dados": "{ \"pagination\": { \"size\": 50 } }"
OU
"dados": "{ \"pagination\": { \"size\": 50, \"lastCnpj\"\"99999999999999\"} }"
}
}
```

**Dados de Saída**

O retorno é a lista das empresas com as quais o contador possui vínculo ativo.

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
| cnpjs | Lista de empresas na página atual. | Lista de Objetos Empresa |
| totalInThePage | Total de registros retornados na página atual. | Número |
| totalInTheDatabase | Total de registros existentes na base de dados. | Número |
| lastCnpj | Cursor de paginação. Caso ainda exista CNPJs vinculados, a busca da próxima página é realizada a partir do CNPJ informado neste campo. | Texto |

#### Objeto: Empresa

| Campo | Descrição | Tipo |
| --- | --- | --- |
| cnpj | Cadastro Nacional da Pessoa Jurídica da empresa. | Texto |
| tipoEstabelecimento | Tipo de estabelecimento da empresa. | Texto |
| situacaoCadastral | Situação cadastral da empresa. | Objeto SituacaoCadastral |
| uf | Unidade federativa da empresa. | Texto (2) |
| codigoMunicipio | Código do município onde a empresa está cadastrada. | Texto |
| nomeMunicipio | Nome do município onde a empresa está cadastrada. | Texto |

#### Objeto: SituacaoCadastral

| Campo | Descrição | Tipo |
| --- | --- | --- |
| codigo | Código da situação cadastral. | Texto |
| descricao | Descrição da situação cadastral. Pode ser nulo. | Texto |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno Consultar Vínculos](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_consultar_vinculos/)
