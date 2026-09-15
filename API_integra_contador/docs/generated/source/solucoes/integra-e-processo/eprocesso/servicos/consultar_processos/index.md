---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-e-processo/eprocesso/servicos/consultar_processos/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "140eca94b9c6c48a3ec80cb01571436a8eb79670c16f81f69ae6ac23ad28a0df"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-e-processo/eprocesso/servicos/consultar_processos/).

# Consultar Processos por Interessado

Este serviço permite consultar todos os processos do contribuinte

Identificação no Pedido de Dados

idSistema: EPROCESSO idServico: CONSPROCPORINTER271 versaoSistema: 2.0

**Dados de Entrada**

Não é necessário passar nenhum conteúdo no campo Dados, uma vez que serão consultadas todos os processos do contribuinte.

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
"idSistema": "EPROCESSO",
"idServico": "CONSPROCPORINTER271",
"versaoSistema": "2.0",
"dados": ""
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | String (3) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de código e texto da mensagem. O campo código é um texto que representa um código interno do negócio. | Array Mensagem |
| dados | Estrutura de dados de retorno, contendo uma lista com o objeto processo. | String (String escapada: Array de Processo |

#### Objeto: Mensagem

| Campo | Descrição | Tipo |
| --- | --- | --- |
| codigo | Código da mensagem retornada pelo serviço. | Texto |
| texto | Texto explicativo da mensagem. | Texto |

#### Objeto: Processo

| Campo | Descrição | Tipo |
| --- | --- | --- |
| numeroDoProcesso | Número do processo. | String |
| relacaoDoInteressadoComOProcesso | Tipo de relação do interessado com o processo | String |
| dataDeProtocolo | Data de protocolo do processo no formato data (DD/MM/YYYY) | String |
| tipoDoProcesso | Tipo do processo. | String |
| subtipoDoProcesso | Subtipo do processo. | String |
| localizacao | Localização do processo | String |
| situacao | Situação do processo | String |
| ultimoEncaminhamentoExterno | Último encaminhamento externo do processo. | String |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno Consultar Processos por Interessado](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-e-processo/eprocesso/exemplos/retorno_consultar_processos/)
