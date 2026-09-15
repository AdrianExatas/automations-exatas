---
key: "PGDASD.GERARDASPROCESSO18"
family: "integra-sn"
systemId: "PGDASD"
serviceId: "GERARDASPROCESSO18"
version: "1.0"
operationPath: "Emitir"
sourceStatus: "fetched"
---

# Emitir DAS de Processo

Gerar um DAS referente a um processo no sistema de Cobrança da RFB.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PGDASD.GERARDASPROCESSO18` |
| Família | `integra-sn` |
| Caminho físico | `POST /Emitir` |
| Versão | `1.0` |
| Situação oficial | 27/11/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Não conclusivo |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada | numeroProcesso | Number | SIM | — | Número do processo no formato 99999999999999999 |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. |
| Dados de Saída | dados | String | — | — | Estrutura de dados de retorno, contendo uma lista em SCAPED Texto JSON com o objeto Das . |
| Dados de Saída — Objeto: Das | pdf | String | — | — | Pdf do DAS no formato Texto Base 64 |
| Dados de Saída — Objeto: Das | cnpjCompleto | String | — | — | Número do cnpj sem formatação |
| Dados de Saída — Objeto: Das | detalhamento | Object | — | — | Detalhamento do DAS |
| Dados de Saída — Objeto: DetalhamentoDas | periodoApuracao | String (6) | — | — | Período de Apuração no formato AAAAMM. No caso de mais de um período contido no DAS será retornado o texto Diversos |
| Dados de Saída — Objeto: DetalhamentoDas | numeroDocumento | String (17) | — | — | Número do documento gerado |
| Dados de Saída — Objeto: DetalhamentoDas | dataVencimento | String (8) | — | — | Data de vencimento no formato AAAAMMDD. No caso de mais de um período contido no DAS este campo poderá estar em branco. |
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
    "idServico": "GERARDASPROCESSO18",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroProcesso\": \"00000000000000000\" }"
  }
}
```

Forma normalizada:

```json
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
    "idServico": "GERARDASPROCESSO18",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroProcesso\": \"00000000000000000\" }"
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
    "idServico": "GERARDASPROCESSO18",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroProcesso\": \"00000000000000000\" }"
  },
    "status": 200,
  "mensagens": [
  {
      "codigo": "[Sucesso-PGDASD]",
      "texto": "Requisição efetuada com sucesso."
  }
  ],
  "dados": "{\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_183696>\",\"cnpjCompleto\":\"00000000000000\",\"detalhamentoDas\":{\"periodoApuracao\":\"202201\",\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"20220530\",\"dataLimiteAcolhimento\":\"20240305\",\"valores\":{\"principal\":24.80,\"multa\":4.96,\"juros\":5.59,\"total\":35.35},\"observacao1\":\"Nrº Processo: 00000.000.000/0000-00\",\"observacao2\":null,\"observacao3\":null,\"composicao\":[{\"periodoApuracao\":\"202201\",\"codigo\":\"1004\",\"denominacao\":\"01/2022\",\"valores\":{\"principal\":20.38,\"multa\":4.08,\"juros\":4.60,\"total\":29.06}},{\"periodoApuracao\":\"202201\",\"codigo\":\"1005\",\"denominacao\":\"01/2022\",\"valores\":{\"principal\":4.42,\"multa\":0.88,\"juros\":0.99,\"total\":6.29}}]}}"
}
```

Forma normalizada:

```json
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
    "idServico": "GERARDASPROCESSO18",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroProcesso\": \"00000000000000000\" }"
  },
  "status": 200,
  "mensagens": [
    {
      "codigo": "[Sucesso-PGDASD]",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "{\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_183696>\",\"cnpjCompleto\":\"00000000000000\",\"detalhamentoDas\":{\"periodoApuracao\":\"202201\",\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"20220530\",\"dataLimiteAcolhimento\":\"20240305\",\"valores\":{\"principal\":24.80,\"multa\":4.96,\"juros\":5.59,\"total\":35.35},\"observacao1\":\"Nrº Processo: 00000.000.000/0000-00\",\"observacao2\":null,\"observacao3\":null,\"composicao\":[{\"periodoApuracao\":\"202201\",\"codigo\":\"1004\",\"denominacao\":\"01/2022\",\"valores\":{\"principal\":20.38,\"multa\":4.08,\"juros\":4.60,\"total\":29.06}},{\"periodoApuracao\":\"202201\",\"codigo\":\"1005\",\"denominacao\":\"01/2022\",\"valores\":{\"principal\":4.42,\"multa\":0.88,\"juros\":0.99,\"total\":6.29}}]}}"
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

- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_gerar_dasprocesso/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/servicos/gerar_dasprocesso/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_gerar_dasprocesso/)

- Última atualização informada pela fonte: 9 de setembro de 2026 15:07:52 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `c7cfd8204302dbf5f82225c2192fba8594451074e5cac2bd384c7e754b95d631`
