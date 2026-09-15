---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/servicos/gerar_dasprocesso/"
sourceUpdatedAt: "9 de setembro de 2026 15:07:52 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "cdd97c8d4bc7643ffb566ee66750ab63c17d11acb5a315a630652a4c7b145c04"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/servicos/gerar_dasprocesso/).

# Emitir DAS de Processo

Esta funcionalidade gera um DAS (Documento de Arrecadação) com os débitos de processo em sistema de cobrança.

PedidoDados

idSistema: PGDASD idServico: GERARDASPROCESSO18 versaoSistema: "1.0"

**Dados de Entrada**

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| numeroProcesso | Número do processo no formato 99999999999999999 | Number | SIM |

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
"idServico": "GERARDASPROCESSO18",
"versaoSistema": "1.0",
"dados": "{ \"numeroProcesso\": \"00000000000000000\" }"
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
| periodoApuracao | Período de Apuração no formato AAAAMM. No caso de mais de um período contido no DAS será retornado o texto Diversos | String (6) |
| numeroDocumento | Número do documento gerado | String (17) |
| dataVencimento | Data de vencimento no formato AAAAMMDD. No caso de mais de um período contido no DAS este campo poderá estar em branco. | String (8) |
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

Json de exemplo: [retorno gerar DAS de Processo](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/pgdasd/exemplos/retorno_gerar_dasprocesso/)
