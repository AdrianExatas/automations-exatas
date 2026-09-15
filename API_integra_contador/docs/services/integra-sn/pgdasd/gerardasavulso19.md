---
key: "PGDASD.GERARDASAVULSO19"
family: "integra-sn"
systemId: "PGDASD"
serviceId: "GERARDASAVULSO19"
version: "1.0"
operationPath: "Emitir"
sourceStatus: "fetched"
---

# Emitir DAS Avulso

Gerar um DAS Avulso para declarações transmitidas no período de apuração.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PGDASD.GERARDASAVULSO19` |
| Família | `integra-sn` |
| Caminho físico | `POST /Emitir` |
| Versão | `1.0` |
| Situação oficial | 27/11/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Não conclusivo |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada | periodoApuracao | String (6) | SIM | — | Período de apuração que se deseja gerar o DAS Avulso no formato AAAAMM |
| Dados de Entrada | listaTributos | Array de Object Tributo | SIM | — | Lista de tributos para serem incluídos no DAS Avulso. |
| Dados de Entrada | dataConsolidacao | Number | NÃO | — | Data que se deseja emitir o DAS. Caso a emissão seja no próprio dia não informar este campo. |
| Dados de Entrada | prorrogacaoEspecial | Number | NÃO | — | Indicador de Prorrogação Especial . Somente utilizar para os períodos prorrogados entre 03/2020 e 05/2020 ou 03/2021 e 05/2021 |
| Dados de Entrada — Objeto: Tributo | codigo | Number | SIM | — | Código do tributo |
| Dados de Entrada — Objeto: Tributo | valor | Number | SIM | — | Valor do tributo para ser gerado o DAS |
| Dados de Entrada — Objeto: Tributo | codMunicipio | Number | NÃO | — | Código de município TOM. Obrigatório para tributo ISS |
| Dados de Entrada — Objeto: Tributo | uf | String (2) | NÃO | — | Destino da UF. Obrigatório para ICMS |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. |
| Dados de Saída | dados | String | — | — | Estrutura de dados de retorno, contendo uma lista em SCAPED Texto JSON com o objeto Das . |
| Dados de Saída — Objeto: Das | pdf | String | — | — | Pdf do DAS no formato Texto Base 64 |
| Dados de Saída — Objeto: Das | cnpjCompleto | String | — | — | Número do cnpj sem formatação |
| Dados de Saída — Objeto: Das | detalhamento | Object | — | — | Detalhamento do DAS |
| Dados de Saída — Objeto: DetalhamentoDas | periodoApuracao | String (6) | — | — | Período de Apuração no formato AAAAMM |
| Dados de Saída — Objeto: DetalhamentoDas | numeroDocumento | String (17) | — | — | Número do documento gerado |
| Dados de Saída — Objeto: DetalhamentoDas | dataVencimento | String (8) | — | — | Data de vencimento no formato AAAAMMDD |
| Dados de Saída — Objeto: DetalhamentoDas | dataLimiteAcolhimento | String (8) | — | — | Data limite para acolhimento no formato AAAAMMDD |
| Dados de Saída — Objeto: DetalhamentoDas | valores | Object | — | — | Discriminação dos Valores |
| Dados de Saída — Objeto: DetalhamentoDas | observacao1 | String | — | — | Observação 1 |
| Dados de Saída — Objeto: DetalhamentoDas | observacao2 | String | — | — | Observação 2 |
| Dados de Saída — Objeto: DetalhamentoDas | observacao3 | String | — | — | Observação 3 |
| Dados de Saída — Objeto: DetalhamentoDas | composicao | Array de Object Composicao | — | — | Composição do DAS gerado. |
| Dados de Saída — Objeto: Valores | principal | Number | — | — | Valor do principal |
| Dados de Saída — Objeto: Valores | multa | Number | — | — | Valor da multa |
| Dados de Saída — Objeto: Valores | juros | Number | — | — | Valor dos juros |
| Dados de Saída — Objeto: Valores | total | Number | — | — | Valor total |
| Dados de Saída — Objeto: Composicao | periodoApuracao | String (6) | — | — | Período de apuração do tributo no formato AAAAMM |
| Dados de Saída — Objeto: Composicao | codigo | String | — | — | Código do tributo |
| Dados de Saída — Objeto: Composicao | denominacao | String | — | — | Descrição do nome/destino do tributo |
| Dados de Saída — Objeto: Composicao | valores | Object | — | — | Discriminação dos valores do tributo |

## Exemplos oficiais e normalizados

### Exemplo 1 — request

Fonte oficial:

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

### Exemplo 2 — response

Fonte oficial:

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
    "dados": "{\"PeriodoApuracao\":202401,\"ListaTributos\[{\"Codigo\":101\"Valor\":111.22,\"CodMunicipio\":0375,\"uf\":\"PA\"{\"Codigo\":100\"Valor\":20.50,\"uf\":\"RJ\"},{\"Codigo\":1001,\"Valor\":100}]}"
  },
    "status": 200,
    "mensagens": [
    {
      "codigo": "[Sucesso-PGDASD]",
      "texto": "Requisição efetuada com sucesso."
    }
    ],
    "dados": "{\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_182788>\",\"cnpjCompleto\":\"00000333000110\",\"detalhamentoDas\":{\"periodoApuracao\":\"202401\",\"numeroDocumento\":\"07202408201918950\",\"dataVencimento\":\"20240220\",\"dataLimiteAcolhimento\":\"20240322\",\"valores\":{\"principal\":231.72,\"multa\":23.69,\"juros\":2.31,\"total\":257.72},\"observacao1\":null,\"observacao2\":\"\",\"observacao3\":null,\"composicao\":[{\"periodoApuracao\":\"202401\",\"codigo\":\"1001\",\"denominacao\":\"01/2024\",\"valores\":{\"principal\":100.0,\"multa\":10.23,\"juros\":1.0,\"total\":111.23}},{\"periodoApuracao\":\"202401\",\"codigo\":\"1007\",\"denominacao\":\"RJ - 01/2024\",\"valores\":{\"principal\":20.50,\"multa\":2.09,\"juros\":0.2,\"total\":22.79}},{\"periodoApuracao\":\"202401\",\"codigo\":\"1010\",\"denominacao\":\"ABEL FIGUEIREDO (PA) - 01/2024\",\"valores\":{\"principal\":111.22,\"multa\":11.37,\"juros\":1.11,\"total\":123.70}}]}}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Simples Nacional](../../../generated/source/solucoes/integra-sn/pgdasd/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-sn/pgdasd/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/dados_de_dominio/)

## Anomalias

- **warning / official-pedido-dados-invalid-json:** O envelope oficial é JSON válido, mas o JSON escapado em pedidoDados.dados é inválido. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/servicos/gerar_dasavulso/))
- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_gerar_dasavulso/))
- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_gerar_dasavulso/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/servicos/gerar_dasavulso/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_gerar_dasavulso/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `220e7c4904c1e2f6809ed64d3411fabc62d292f9bd419529635e78bd20c27813`
