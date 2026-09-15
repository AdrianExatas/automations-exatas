---
key: "PGDASD.GERARDASCOBRANCA17"
family: "integra-sn"
systemId: "PGDASD"
serviceId: "GERARDASCOBRANCA17"
version: "1.0"
operationPath: "Emitir"
sourceStatus: "fetched"
---

# Emitir DAS Cobrança

Gerar um DAS referente a um período no sistema de Cobrança da RFB.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `PGDASD.GERARDASCOBRANCA17` |
| Família | `integra-sn` |
| Caminho físico | `POST /Emitir` |
| Versão | `1.0` |
| Situação oficial | 27/11/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Não conclusivo |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada | periodoApuracao | Number | SIM | — | Período de apuração que se deseja gerar o DAS de Cobrança no formato AAAAMM |

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
| Dados de Saída — Objeto: DetalhamentoDas | valores | Object | — | — | Discriminação dos Valores . |
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
    "idServico": "GERARDASCOBRANCA17",
    "versaoSistema": "1.0",
    "dados": "{ \"periodoApuracao\": \"202301\" }"
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
    "idServico": "GERARDASCOBRANCA17",
    "versaoSistema": "1.0",
    "dados": "{ \"periodoApuracao\": \"202301\" }"
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
    "idServico": "GERARDASCOBRANCA17",
    "versaoSistema": "1.0",
    "dados": "{ \"periodoApuracao\": \"202301\" }"
  },
    "status": 200,
  "mensagens": [
  {
      "codigo": "[Sucesso-PGDASD]",
      "texto": "Requisição efetuada com sucesso."
  }
  ],
  "dados": "{\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_217248>\",\"cnpjCompleto\":\"00000000000000\",\"detalhamentoDas\":{\"periodoApuracao\":\"202301\",\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"20230222\",\"dataLimiteAcolhimento\":\"20240228\",\"valores\":{\"principal\":1548.20,\"multa\":309.64,\"juros\":189.50,\"total\":2047.34},\"observacao1\":null,\"observacao2\":null,\"observacao3\":null,\"composicao\":[{\"periodoApuracao\":\"202301\",\"codigo\":\"1001\",\"denominacao\":\"01/2023\",\"valores\":{\"principal\":88.0,\"multa\":17.59,\"juros\":10.77,\"total\":116.36}},{\"periodoApuracao\":\"202301\",\"codigo\":\"1004\",\"denominacao\":\"01/2023\",\"valores\":{\"principal\":203.84,\"multa\":40.76,\"juros\":24.95,\"total\":269.55}},{\"periodoApuracao\":\"202301\",\"codigo\":\"1002\",\"denominacao\":\"01/2023\",\"valores\":{\"principal\":4.20,\"multa\":0.84,\"juros\":0.51,\"total\":5.55}},{\"periodoApuracao\":\"202301\",\"codigo\":\"1006\",\"denominacao\":\"01/2023\",\"valores\":{\"principal\":664.0,\"multa\":132.83,\"juros\":81.29,\"total\":878.12}},{\"periodoApuracao\":\"202301\",\"codigo\":\"1007\",\"denominacao\":\"SP - 01/2023\",\"valores\":{\"principal\":544.0,\"multa\":108.79,\"juros\":66.58,\"total\":719.37}},{\"periodoApuracao\":\"202301\",\"codigo\":\"1005\",\"denominacao\":\"01/2023\",\"valores\":{\"principal\":44.16,\"multa\":8.83,\"juros\":5.4,\"total\":58.39}}]}}"
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
    "idServico": "GERARDASCOBRANCA17",
    "versaoSistema": "1.0",
    "dados": "{ \"periodoApuracao\": \"202301\" }"
  },
  "status": 200,
  "mensagens": [
    {
      "codigo": "[Sucesso-PGDASD]",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "{\"pdf\":\"<BASE64_REMOVIDO_TAMANHO_217248>\",\"cnpjCompleto\":\"00000000000000\",\"detalhamentoDas\":{\"periodoApuracao\":\"202301\",\"numeroDocumento\":\"00000000000000000\",\"dataVencimento\":\"20230222\",\"dataLimiteAcolhimento\":\"20240228\",\"valores\":{\"principal\":1548.20,\"multa\":309.64,\"juros\":189.50,\"total\":2047.34},\"observacao1\":null,\"observacao2\":null,\"observacao3\":null,\"composicao\":[{\"periodoApuracao\":\"202301\",\"codigo\":\"1001\",\"denominacao\":\"01/2023\",\"valores\":{\"principal\":88.0,\"multa\":17.59,\"juros\":10.77,\"total\":116.36}},{\"periodoApuracao\":\"202301\",\"codigo\":\"1004\",\"denominacao\":\"01/2023\",\"valores\":{\"principal\":203.84,\"multa\":40.76,\"juros\":24.95,\"total\":269.55}},{\"periodoApuracao\":\"202301\",\"codigo\":\"1002\",\"denominacao\":\"01/2023\",\"valores\":{\"principal\":4.20,\"multa\":0.84,\"juros\":0.51,\"total\":5.55}},{\"periodoApuracao\":\"202301\",\"codigo\":\"1006\",\"denominacao\":\"01/2023\",\"valores\":{\"principal\":664.0,\"multa\":132.83,\"juros\":81.29,\"total\":878.12}},{\"periodoApuracao\":\"202301\",\"codigo\":\"1007\",\"denominacao\":\"SP - 01/2023\",\"valores\":{\"principal\":544.0,\"multa\":108.79,\"juros\":66.58,\"total\":719.37}},{\"periodoApuracao\":\"202301\",\"codigo\":\"1005\",\"denominacao\":\"01/2023\",\"valores\":{\"principal\":44.16,\"multa\":8.83,\"juros\":5.4,\"total\":58.39}}]}}"
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

- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_gerar_dascobranca/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/servicos/gerar_dascobranca/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_gerar_dascobranca/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `06f3811ffaea3a980a5ff4bbbfab0f5a9f0fa9ad3b703fe196389fa5f91acc93`
